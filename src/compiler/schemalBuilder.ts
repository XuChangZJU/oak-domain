import path from 'path';
import assert from 'assert';
import { execSync } from 'child_process';
import { writeFileSync, readdirSync, mkdirSync, fstat } from 'fs';
import { emptydirSync } from 'fs-extra';
import { assign, cloneDeep, identity, intersection, keys, uniq, uniqBy } from 'lodash';
import * as ts from 'typescript';
const { factory } = ts;
import {
    ENTITY_PATH_IN_OAK_DOMAIN,
    ACTION_CONSTANT_IN_OAK_DOMAIN,
    TYPE_PATH_IN_OAK_DOMAIN,
    RESERVED_ENTITIES,
    STRING_LITERAL_MAX_LENGTH,
    NUMERICAL_LITERL_DEFAULT_PRECISION,
    NUMERICAL_LITERL_DEFAULT_SCALE,
} from './env';
import { firstLetterLowerCase } from './utils';

const EntitiesInOakDomain: string[] = [];


const Schema: Record<string, {
    schemaAttrs: Array<ts.PropertySignature>;
    fulltextIndex?: true;
    indexes?: ts.ArrayLiteralExpression;
    states: string[];
    sourceFile: ts.SourceFile;
}> = {};
const OneToMany: Record<string, Array<[string, string]>> = {};
const ManyToOne: Record<string, Array<[string, string]>> = {};
const ReversePointerEntities: Record<string, 1> = {};
const ReversePointerRelations: Record<string, string[]> = {};

const ActionImportStatements = () => [
    factory.createImportDeclaration(
        undefined,
        undefined,
        factory.createImportClause(
            false,
            undefined,
            factory.createNamedImports([factory.createImportSpecifier(
                false,
                undefined,
                factory.createIdentifier("ActionDef")
            )])
        ),
        factory.createStringLiteral(`${TYPE_PATH_IN_OAK_DOMAIN(2)}Action`),
        undefined
    ),
    factory.createImportDeclaration(
        undefined,
        undefined,
        factory.createImportClause(
            false,
            undefined,
            factory.createNamedImports([factory.createImportSpecifier(
                false,
                undefined,
                factory.createIdentifier("GenericAction")
            )])
        ),
        factory.createStringLiteral(ACTION_CONSTANT_IN_OAK_DOMAIN(2)),
        undefined
    )
];

const ActionAsts: {
    [module: string]: {
        statements: Array<ts.Statement>;
        sourceFile: ts.SourceFile;
        importedFrom: Record<string, string>;
    };
} = {};

function addRelationship(many: string, one: string, key: string) {
    const { [many]: manySet } = ManyToOne;
    const one2 = one === 'Schema' ? many : one;
    if (manySet) {
        manySet.push([one2, key]);
    }
    else {
        assign(ManyToOne, {
            [many]: [[one2, key]],
        });
    }

    const { [one2]: oneSet } = OneToMany;
    if (oneSet) {
        oneSet.push([many, key]);
    }
    else {
        assign(OneToMany, {
            [one2]: [[many, key]],
        });
    }
}

function createForeignRef(entity: string, foreignKey: string, ref: string) {
    if (entity === foreignKey) {
        return factory.createIdentifier(ref)
    }
    return factory.createQualifiedName(
        factory.createIdentifier(foreignKey),
        factory.createIdentifier(ref)
    );
}

function pushStatementIntoActionAst(
    moduleName: string,
    node: ts.TypeAliasDeclaration | ts.VariableStatement,
    sourceFile: ts.SourceFile) {
    if (ActionAsts[moduleName]) {
        ActionAsts[moduleName].statements.push(node);
    }
    else {
        assign(ActionAsts, {
            [moduleName]: {
                statements: [...ActionImportStatements(), node],
                sourceFile,
                importedFrom: {},
            }
        });
    }
}

/**
 * 检查ActionDef是否满足合法的定义
 * 1、ActionDef, Action, State三者命名是否一致
 * @param actionDefNode 
 */
function checkActionDefNameConsistent(filename: string, actionDefNode: ts.VariableDeclaration) {
    const { name, type } = actionDefNode;
    assert(ts.isTypeReferenceNode(type!));
    const { typeArguments } = type!;
    assert(typeArguments!.length === 2);
    const [actionNode, stateNode] = typeArguments!;

    assert(ts.isIdentifier(name), `文件${filename}中的ActionDef${(<ts.Identifier>name).text}不是一个有效的变量`);
    assert(name.text.endsWith('ActionDef'), `文件${filename}中的ActionDef${name.text}未以ActionDef结尾`);
    assert(ts.isTypeReferenceNode(actionNode) && ts.isTypeReferenceNode(stateNode), `文件${filename}中的ActionDef${name.text}类型声明中的action和state非法`);
    assert(ts.isIdentifier(actionNode.typeName) && ts.isIdentifier(stateNode.typeName));
    assert(actionNode.typeName.text.endsWith('Action'), `文件${filename}中的ActionDef${name.text}所引用的Action${actionNode.typeName}未以Action结尾`);
    assert(stateNode.typeName.text.endsWith('State'), `文件${filename}中的ActionDef${name.text}所引用的Action${stateNode.typeName}未以Action结尾`);
    const adfName = name.text.slice(0, name.text.length - 9);
    const aName = actionNode.typeName.text.slice(0, actionNode.typeName.text.length - 6);
    const sName = stateNode.typeName.text.slice(0, stateNode.typeName.text.length - 5);

    assert(adfName === aName && aName === sName, `文件${filename}中的ActionDef${name.text}中ActionDef, Action和State的命名规则不一致`);
}

function addActionSource(moduleName: string, name: ts.Identifier, node: ts.ImportDeclaration) {
    const ast = ActionAsts[moduleName];
    const { moduleSpecifier } = node;

    // 目前应该只会引用oak-domain/src/actions/action里的公共action
    assert(ts.isStringLiteral(moduleSpecifier) &&
        (moduleSpecifier.text === ACTION_CONSTANT_IN_OAK_DOMAIN(1)
            || (EntitiesInOakDomain.includes(moduleName) && moduleSpecifier.text === '../actions/action')));
    assign(ast.importedFrom, {
        [name.text]: ACTION_CONSTANT_IN_OAK_DOMAIN(2),
    });
}

function getStringTextFromUnionStringLiterals(moduleName: string, filename: string, node: ts.TypeReferenceNode, program: ts.Program) {
    const checker = program.getTypeChecker();
    const symbol = checker.getSymbolAtLocation(node.typeName);
    const typee = checker.getDeclaredTypeOfSymbol(symbol!);

    // const [symbol] = checker.getSymbolsInScope(node.typeName, ts.SymbolFlags.Type | ts.SymbolFlags.TypeAlias);
    const declaration = typee.aliasSymbol!.getDeclarations()![0];

    assert(ts.isTypeAliasDeclaration(declaration));
    const { type, name } = declaration;
    assert(ts.isUnionTypeNode(type!), `${filename}中引用的action「${(<ts.Identifier>name).text}」的定义不是union类型`);

    // 如果这个action是从外部导入的，在这里要记下来此entity和这个导入之间的关系
    if (ts.isImportSpecifier(symbol!.getDeclarations()![0]!)) {
        const importDeclartion = symbol!.getDeclarations()![0]!.parent.parent.parent;

        assert(ts.isImportDeclaration(importDeclartion));
        addActionSource(moduleName, name, importDeclartion);
    }
    else {
        assert(ts.isTypeAliasDeclaration(symbol!.getDeclarations()![0]!));
        const ast = ActionAsts[moduleName];
        assign(ast.importedFrom, {
            [name.text]: 'local',
        });
    }

    const actions = type!.types!.map(
        ele => {
            assert(ts.isLiteralTypeNode(ele) && ts.isStringLiteral(ele.literal), `${filename}中引用的action${(<ts.Identifier>name).text}中存在不是stringliteral的类型`);
            assert(!ele.literal.text.includes('$'), `${filename}中引用的action${(<ts.Identifier>name).text}中的action「${ele.literal.text}」包含非法字符$`);
            assert(ele.literal.text.length > 0, `${filename}中引用的action${(<ts.Identifier>name).text}中的action「${ele.literal.text}」长度非法`);
            assert(ele.literal.text.length < STRING_LITERAL_MAX_LENGTH, `${filename}中引用的action${(<ts.Identifier>name).text}中的action「${ele.literal.text}」长度过长`);
            return ele.literal.text;
        }
    );
    return {
        name: name.text,
        actions,
    };
}

const RESERVED_ACTION_NAMES = ['GenericAction', 'ParticularAction'];
import { genericActions } from '../actions/action';
import { unIndexedTypes } from '../types/DataType';
function dealWithActions(moduleName: string, filename: string, node: ts.TypeNode, program: ts.Program, schemaAttrs: ts.TypeElement[]) {
    const ActionDict: Record<string, string> = {};
    const actionss = [{
        name: 'GenericAction',
        actions: genericActions
    }];
    if (ts.isUnionTypeNode(node)) {
        const actionNames = node.types.map(
            ele => {
                if (ts.isTypeReferenceNode(ele) && ts.isIdentifier(ele.typeName)) {
                    return ele.typeName.text;
                }
            }
        ).filter(
            ele => !!ele
        );
        assert(intersection(actionNames, RESERVED_ENTITIES).length === 0,
            `${filename}中的Action命名不能是「${RESERVED_ACTION_NAMES.join(',')}」之一`);

        actionss.push(...node.types.map(
            ele => getStringTextFromUnionStringLiterals(moduleName, filename, ele as ts.TypeReferenceNode, program)
        ));
    }
    else {
        assert(ts.isTypeReferenceNode(node));
        if (ts.isIdentifier(node.typeName)) {
            assert(!RESERVED_ACTION_NAMES.includes(node.typeName.text),
                `${filename}中的Action命名不能是「${RESERVED_ACTION_NAMES.join(',')}」之一`);
        }
        actionss.push(getStringTextFromUnionStringLiterals(moduleName, filename, node, program));
    }

    // 所有的action定义不能有重名
    actionss.forEach(
        ({ actions, name }) => {
            actions.forEach(
                (action) => {
                    assert(action.length <= STRING_LITERAL_MAX_LENGTH, `${filename}中的Action「${action}」命名长度大于${STRING_LITERAL_MAX_LENGTH}`);
                    if (ActionDict.hasOwnProperty(action)) {
                        throw new Error(`文件${filename}中，Action定义上的${name}和${ActionDict[action]}存在同名的action「${action}」`);
                    }
                    else {
                        assign(ActionDict, {
                            [action]: name,
                        });
                    }
                }
            );
        }
    );

    // 为每个action在schema中建立相应的state域(除了genericState)
    actionss.slice(1).forEach(
        ({ name }) => {
            const attr = name.slice(0, 1).toLowerCase().concat(name.slice(1, name.length - 6)).concat('State');
            schemaAttrs.push(
                factory.createPropertySignature(
                    undefined,
                    factory.createIdentifier(attr),
                    factory.createToken(ts.SyntaxKind.QuestionToken),
                    factory.createTypeReferenceNode(
                        factory.createIdentifier(attr.slice(0, 1).toUpperCase().concat(attr.slice(1))),
                    )
                )
            );
        }
    );
}

function getEntityImported(declaration: ts.ImportDeclaration, filename: string) {
    const { moduleSpecifier, importClause } = declaration;
    let entityImported: string | undefined;
    if (ts.isStringLiteral(moduleSpecifier)) {
        if (moduleSpecifier.text.startsWith('./') && process.env.COMPILING_BASE_DOMAIN) {
            entityImported = moduleSpecifier.text.slice(2);
        }
        else if (moduleSpecifier.text.startsWith(ENTITY_PATH_IN_OAK_DOMAIN()) && !process.env.COMPILING_BASE_DOMAIN) {
            entityImported = moduleSpecifier.text.slice(ENTITY_PATH_IN_OAK_DOMAIN().length);
        }
    }

    if (entityImported) {
        const { namedBindings } = importClause!;
        assert(ts.isNamedImports(namedBindings!));
        const { elements } = namedBindings!;
        assert(elements.find(
            ele => ts.isImportSpecifier(ele) && ele.name.text === entityImported && ele.propertyName!.text === 'Schema'
        ), `「${filename}」导入的对象名称和对象所在的文件名称「${entityImported}」不符`);
        return entityImported;
    }
}

function analyzeEntity(filename: string, path: string, program: ts.Program) {
    const fullPath = `${path}/${filename}`;
    const sourceFile = program.getSourceFile(fullPath);
    const moduleName = filename.split('.')[0];

    const referencedSchemas: string[] = [];
    const schemaAttrs: ts.TypeElement[] = [];
    let hasFulltextIndex: boolean = false;
    let indexes: ts.ArrayLiteralExpression;
    ts.forEachChild(sourceFile!, (node) => {
        if (ts.isImportDeclaration(node)) {
            const entityImported = getEntityImported(node, filename);
            if (entityImported) {
                referencedSchemas.push(entityImported);
            }
        }

        if (ts.isTypeAliasDeclaration(node)) {
            // schema 定义
            if (node.name.text === 'Schema') {
                let hasEntityAttr = false;
                let hasEntityIdAttr = false;
                const { members } = <ts.TypeLiteralNode>(node.type);
                members.forEach(
                    (attrNode) => {
                        const { type, name } = <ts.PropertySignature>attrNode;
                        const attrName = (<ts.Identifier>name).text;
                        if (ts.isTypeReferenceNode(type!)
                            && ts.isIdentifier(type.typeName)) {
                            if ((referencedSchemas.includes(type.typeName.text) || type.typeName.text === 'Schema')) {
                                addRelationship(moduleName, type.typeName.text, attrName);
                                schemaAttrs.push(attrNode);
                            }
                            else if (type.typeName.text === 'Array') {
                                // 这是一对多的反向指针的引用，需要特殊处理
                                const { typeArguments } = type;
                                assert(typeArguments!.length === 1
                                    && ts.isTypeReferenceNode(typeArguments![0])
                                    && ts.isIdentifier(typeArguments![0].typeName)
                                    && referencedSchemas.includes(typeArguments![0].typeName.text),
                                    `「${filename}」非法的属性定义「${attrName}」`);
                                const reverseEntity = typeArguments![0].typeName.text;
                                if (ReversePointerRelations[reverseEntity]) {
                                    ReversePointerRelations[reverseEntity].push(moduleName);
                                }
                                else {
                                    assign(ReversePointerRelations, {
                                        [reverseEntity]: [moduleName],
                                    });
                                }
                            }
                            else {
                                schemaAttrs.push(attrNode);
                            }
                        }
                        else {
                            schemaAttrs.push(attrNode);
                        }

                        if (attrName === 'entity'
                            && ts.isTypeReferenceNode(type!)
                            && ts.isIdentifier(type.typeName)) {
                            const { typeArguments } = type;
                            if (type.typeName.text === 'String'
                                && typeArguments
                                && typeArguments.length === 1) {
                                const [node] = typeArguments;
                                if (ts.isLiteralTypeNode(node) && ts.isNumericLiteral(node.literal)) {
                                    if (parseInt(node.literal.text) > 32) {
                                        console.warn(`「」中entity属性定义的长度大于32，请确认它不是一个反指对象`);
                                    }
                                    else {
                                        hasEntityAttr = true;
                                    }
                                }
                            }
                        }

                        if (attrName === 'entityId'
                            && ts.isTypeReferenceNode(type!)
                            && ts.isIdentifier(type.typeName)) {
                            const { typeArguments } = type;
                            if (type.typeName.text === 'String'
                                && typeArguments
                                && typeArguments.length === 1) {
                                const [node] = typeArguments;
                                if (ts.isLiteralTypeNode(node) && ts.isNumericLiteral(node.literal)) {
                                    if (parseInt(node.literal.text) !== 64) {
                                        console.warn(`「${filename}」中entityId属性定义的长度不等于64，请确认它不是一个反指对象`);
                                    }
                                    else {
                                        hasEntityIdAttr = true;
                                    }
                                }
                            }
                        }
                    }
                );
                if (hasEntityAttr && hasEntityIdAttr) {
                    assign(ReversePointerEntities, {
                        [moduleName]: 1,
                    });
                }
            }

            // action 定义
            if (node.name.text === 'Action') {
                const modifiers = [factory.createModifier(ts.SyntaxKind.ExportKeyword)];
                pushStatementIntoActionAst(
                    moduleName,
                    factory.updateTypeAliasDeclaration(
                        node,
                        node.decorators,
                        modifiers,
                        factory.createIdentifier('ParticularAction'),
                        node.typeParameters,
                        node.type
                    ),
                    sourceFile!
                );
                pushStatementIntoActionAst(
                    moduleName,
                    factory.createTypeAliasDeclaration(
                        undefined,
                        [factory.createModifier(ts.SyntaxKind.ExportKeyword)],
                        factory.createIdentifier("Action"),
                        undefined,
                        factory.createUnionTypeNode([
                            factory.createTypeReferenceNode(
                                factory.createIdentifier("GenericAction"),
                                undefined
                            ),
                            factory.createTypeReferenceNode(
                                factory.createIdentifier("ParticularAction"),
                                undefined
                            )
                        ])
                    ),
                    sourceFile!
                );
                dealWithActions(moduleName, filename, node.type, program, schemaAttrs);
            }

            if (node.name.text === 'Relation') {
                // 增加userXXX对象的描述
                if (ts.isLiteralTypeNode(node.type)) {
                    assert(ts.isStringLiteral(node.type.literal));
                    assert(node.type.literal.text.length < STRING_LITERAL_MAX_LENGTH, `Relation定义的字符串长度不长于${STRING_LITERAL_MAX_LENGTH}（${filename}，${node.type.literal.text}）`);
                }
                else {
                    assert(ts.isUnionTypeNode(node.type), `Relation的定义只能是string类型（${filename}）`);
                    node.type.types.forEach(
                        (ele) => {
                            assert(ts.isLiteralTypeNode(ele) && ts.isStringLiteral(ele.literal), `Relation的定义只能是string类型（${filename}）`);
                            assert(ele.literal.text.length < STRING_LITERAL_MAX_LENGTH, `Relation定义的字符串长度不长于${STRING_LITERAL_MAX_LENGTH}（${filename}，${ele.literal.text}）`);
                        }
                    );
                }
                const entityLc = firstLetterLowerCase(moduleName);
                const relationEntityName = `User${moduleName}`;
                const relationSchemaAttrs: ts.TypeElement[] = [
                    factory.createPropertySignature(
                        undefined,
                        factory.createIdentifier("user"),
                        undefined,
                        factory.createTypeReferenceNode(
                            factory.createIdentifier("User"),
                            undefined
                        )
                    ),
                    factory.createPropertySignature(
                        undefined,
                        factory.createIdentifier(entityLc),
                        undefined,
                        factory.createTypeReferenceNode(
                            factory.createIdentifier(moduleName),
                            undefined
                        )
                    ),
                    factory.createPropertySignature(
                        undefined,
                        factory.createIdentifier('relation'),
                        undefined,
                        node.type
                    ),
                ];
                assign(Schema, {
                    [relationEntityName]: {
                        schemaAttrs: relationSchemaAttrs,
                        sourceFile,
                    },
                });
                addRelationship(relationEntityName, 'User', 'user');
                addRelationship(relationEntityName, moduleName, entityLc);
            }
        }

        if (ts.isVariableStatement(node)) {
            const { declarationList: { declarations } } = node;
            declarations.forEach(
                (declaration) => {
                    if (declaration.type && ts.isTypeReferenceNode(declaration.type) && ts.isIdentifier(declaration.type.typeName) && declaration.type.typeName.text === 'ActionDef') {
                        // actionDef定义
                        checkActionDefNameConsistent(filename, declaration);
                        const { typeArguments } = declaration.type;
                        assert(typeArguments!.length === 2);
                        const [actionNode, stateNode] = typeArguments!;

                        const checker = program.getTypeChecker();
                        let symbol = checker.getSymbolAtLocation((<ts.TypeReferenceNode>actionNode).typeName);

                        let declaration2 = symbol!.getDeclarations()![0];
                        if (declaration2.getSourceFile() === sourceFile) {
                            pushStatementIntoActionAst(moduleName, <ts.TypeAliasDeclaration>declaration2, sourceFile);
                        }

                        symbol = checker.getSymbolAtLocation((<ts.TypeReferenceNode>stateNode).typeName);

                        declaration2 = symbol!.getDeclarations()![0];
                        if (declaration2.getSourceFile() === sourceFile) {
                            // 检查state的定义合法
                            assert(ts.isTypeAliasDeclaration(declaration2) && ts.isUnionTypeNode(declaration2.type), `「${filename}」State「${(<ts.TypeAliasDeclaration>declaration2).name}」的定义只能是或结点`);
                            declaration2.type.types.forEach(
                                (type) => {
                                    assert(ts.isLiteralTypeNode(type) && ts.isStringLiteral(type.literal), `「${filename}」State「${(<ts.TypeAliasDeclaration>declaration2).name}」的定义只能是字符串`);
                                    assert(type.literal.text.length < STRING_LITERAL_MAX_LENGTH, `「${filename}」State「${type.literal.text}」的长度大于「${STRING_LITERAL_MAX_LENGTH}」`);
                                }
                            );
                            pushStatementIntoActionAst(moduleName,
                                factory.updateTypeAliasDeclaration(
                                    declaration2,
                                    declaration2.decorators,
                                    [factory.createModifier(ts.SyntaxKind.ExportKeyword)],
                                    declaration2.name,
                                    declaration2.typeParameters,
                                    declaration2.type
                                ),
                                sourceFile);
                        }

                        pushStatementIntoActionAst(moduleName, node, sourceFile!);
                    }
                    else if (declaration.type && (ts.isArrayTypeNode(declaration.type!)
                        && ts.isTypeReferenceNode(declaration.type.elementType)
                        && ts.isIdentifier(declaration.type.elementType.typeName)
                        && declaration.type.elementType.typeName.text === 'Index'
                        || ts.isTypeReferenceNode(declaration.type!)
                        && ts.isIdentifier(declaration.type.typeName)
                        && declaration.type.typeName.text === 'Array'
                        && ts.isTypeReferenceNode(declaration.type.typeArguments![0])
                        && ts.isIdentifier(declaration.type.typeArguments![0].typeName)
                        && declaration.type.typeArguments![0].typeName.text === 'Index')) {
                        // 对索引Index的定义
                        const indexNameDict: Record<string, true> = {};
                        assert(ts.isArrayLiteralExpression(declaration.initializer!), `「${filename}」Index「${declaration.name.getText()}」的定义必须符合规范`);

                        // todo 这里应该先做一个类型检查的，但不知道怎么写  by Xc
                        // 检查索引的属性是否合法
                        const { elements } = declaration.initializer;
                        elements.forEach(
                            (ele) => {
                                let isFulltextIndex = false;
                                assert(ts.isObjectLiteralExpression(ele));
                                const { properties } = ele;
                                const attrProperty = properties.find(
                                    (ele2) => {
                                        assert(ts.isPropertyAssignment(ele2));
                                        return ele2.name.getText() === 'attributes';
                                    }
                                ) as ts.PropertyAssignment;
                                assert(ts.isArrayLiteralExpression(attrProperty.initializer));

                                const nameProperty = properties.find(
                                    (ele2) => {
                                        assert(ts.isPropertyAssignment(ele2));
                                        return ele2.name.getText() === 'name';
                                    }
                                ) as ts.PropertyAssignment;
                                assert(ts.isStringLiteral(nameProperty.initializer));
                                const indexName = nameProperty.initializer.text;
                                if (indexNameDict[indexName]) {
                                    throw new Error(`「${filename}」索引定义重名「${indexName}」`);
                                }
                                assign(indexNameDict, {
                                    [indexName]: true,
                                });

                                const configProperty = properties.find(
                                    (ele2) => {
                                        assert(ts.isPropertyAssignment(ele2));
                                        return ele2.name.getText() === 'config';
                                    }
                                ) as ts.PropertyAssignment;
                                if (configProperty) {
                                    assert(ts.isObjectLiteralExpression(configProperty.initializer));
                                    const { properties: properties2 } = configProperty.initializer;
                                    const typeProperty = properties2.find(
                                        (ele2) => {
                                            assert(ts.isPropertyAssignment(ele2));
                                            return ele2.name.getText() === 'type';
                                        }
                                    ) as ts.PropertyAssignment;

                                    if (typeProperty && (<ts.Identifier>typeProperty.initializer!).text === 'fulltext') {
                                        // 定义了全文索引
                                        if (hasFulltextIndex) {
                                            throw new Error(`「${filename}」只能定义一个全文索引`);
                                        }
                                        hasFulltextIndex = true;
                                        isFulltextIndex = true;
                                    }
                                }

                                const { elements } = attrProperty.initializer;

                                // 每个属性都应该在schema中有值，且对象类型是可索引值
                                elements.forEach(
                                    (ele2) => {
                                        assert(ts.isObjectLiteralExpression(ele2));
                                        const { properties: properties2 } = ele2;

                                        const nameProperty = properties2.find(
                                            (ele3) => {
                                                assert(ts.isPropertyAssignment(ele3));
                                                return ele3.name.getText() === 'name';
                                            }
                                        ) as ts.PropertyAssignment;

                                        const indexAttrName = (<ts.Identifier>nameProperty.initializer!).text;
                                        const schemaNode = schemaAttrs.find(
                                            (ele3) => {
                                                assert(ts.isPropertySignature(ele3));
                                                return (<ts.Identifier>ele3.name).text === indexAttrName;
                                            }
                                        ) as ts.PropertySignature;
                                        if (!schemaNode) {
                                            throw new Error(`「${filename}」中索引「${indexName}」的属性「${indexAttrName}」定义非法`);
                                        }

                                        const { type, name } = schemaNode;
                                        const entity = firstLetterLowerCase(moduleName);
                                        const { [entity]: manyToOneSet } = ManyToOne;
                                        if (ts.isTypeReferenceNode(type!)) {
                                            const { typeName } = type;
                                            if (ts.isIdentifier(typeName)) {
                                                const { text } = typeName;
                                                const text2 = text === 'Schema' ? entity : text;
                                                const manyToOneItem = manyToOneSet && manyToOneSet.find(
                                                    ([refEntity, attrName]) => refEntity === text2 && attrName === (<ts.Identifier>name).text
                                                );
                                                if (!manyToOneItem) {
                                                    // 如果不是外键，则不能是Text, File 
                                                    if (isFulltextIndex) {
                                                        assert(['Text', 'String'].includes(text2), `「${filename}」中全文索引「${indexName}」定义的属性「${indexAttrName}」类型非法，只能是Text/String`);
                                                    }
                                                    else {
                                                        assert(!unIndexedTypes.includes(text2), `「${filename}」中索引「${indexName}」的属性「${indexAttrName}」的类型为「${text2}」，不可索引`);
                                                    }
                                                }
                                                else {
                                                    assert(!isFulltextIndex, `「${filename}」中全文索引「${indexName}」的属性「${indexAttrName}」类型非法，只能为Text/String`);
                                                }
                                            }
                                            else {
                                                assert(false);          // 这是什么case，不确定
                                            }
                                        }
                                        else {
                                            assert(!isFulltextIndex, `「${filename}」中全文索引「${indexName}」的属性「${indexAttrName}」类型只能为Text/String`);
                                            assert(ts.isUnionTypeNode(type!) || ts.isLiteralTypeNode(type!), `${entity}中索引「${indexName}」的属性${(<ts.Identifier>name).text}有定义非法`);
                                        }
                                    }
                                );
                            }
                        );

                        indexes = declaration.initializer;
                    }
                    else {
                        throw new Error(`不能理解的定义内容${declaration.name.getText()}`);
                    }
                }
            );
        }
    });
    assert(schemaAttrs.length > 0);
    const schema = {
        schemaAttrs,
        sourceFile,
    };
    if (hasFulltextIndex) {
        assign(schema, {
            fulltextIndex: true,
        });
    }
    if (indexes!) {
        assign(schema, {
            indexes,
        });
    }

    assign(Schema, {
        [moduleName]: schema,
    });
}

/**
 * 生成Schema
 * @param statements 
 * @param schemaAttrs 
 * @param entity 
 */
function constructSchema(statements: Array<ts.Statement>, entity: string) {
    const { schemaAttrs } = Schema[entity];
    const members: Array<ts.TypeElement> = [
        // id: String<64>
        factory.createPropertySignature(
            undefined,
            factory.createIdentifier('id'),
            undefined,
            factory.createTypeReferenceNode(
                factory.createIdentifier('PrimaryKey'),
            )
        ),
        // $$createAt$$: Datetime
        factory.createPropertySignature(
            undefined,
            factory.createIdentifier('$$createAt$$'),
            factory.createToken(ts.SyntaxKind.QuestionToken),
            factory.createTypeReferenceNode(
                factory.createIdentifier('Datetime'),
            )
        ),
        // $$updateAt$$: Datetime
        factory.createPropertySignature(
            undefined,
            factory.createIdentifier('$$updateAt$$'),
            factory.createToken(ts.SyntaxKind.QuestionToken),
            factory.createTypeReferenceNode(
                factory.createIdentifier('Datetime'),
            )
        ),
        // $$updateAt$$: Datetime
        factory.createPropertySignature(
            undefined,
            factory.createIdentifier('$$removeAt$$'),
            factory.createToken(ts.SyntaxKind.QuestionToken),
            factory.createTypeReferenceNode(
                factory.createIdentifier('Datetime'),
            )
        )
    ];
    const members2: Array<ts.TypeElement> = [];

    const { [entity]: manyToOneSet } = ManyToOne;
    const { [entity]: oneToManySet } = OneToMany;
    const referenceEntities: string[] = [];
    for (const attr of schemaAttrs) {
        const { type, name, questionToken } = attr;
        const attrName = (<ts.Identifier>name).text;
        if (ts.isTypeReferenceNode(type!)) {
            const { typeName } = type;
            if (ts.isIdentifier(typeName)) {
                const { text } = typeName;
                const text2 = text === 'Schema' ? entity : text;
                const manyToOneItem = manyToOneSet && manyToOneSet.find(
                    ([refEntity, attrName]) => refEntity === text2 && attrName === attrName
                );
                if (manyToOneItem) {
                    referenceEntities.push(text2);
                    members2.push(
                        factory.createPropertySignature(
                            undefined,
                            name,
                            questionToken,
                            factory.createTypeReferenceNode(
                                createForeignRef(entity, text2, 'Schema')
                            )
                        )
                    );
                    const foreignKey = `${attrName}Id`;
                    members.push(
                        factory.createPropertySignature(
                            undefined,
                            factory.createIdentifier(foreignKey),
                            questionToken,
                            factory.createTypeReferenceNode(
                                factory.createIdentifier('ForeignKey'),
                                [
                                    factory.createLiteralTypeNode(
                                        factory.createStringLiteral(firstLetterLowerCase(text2))
                                    )
                                ]
                            )
                        )
                    );
                }
                else {
                    // assert(types.includes(text), `${entity}中的属性${name.toString()}有非法的属性类型定义`);
                    // 处理entity这种特殊情况
                    if (ReversePointerRelations[entity] && attrName === 'entity') {
                        members.push(
                            factory.createPropertySignature(
                                undefined,
                                name,
                                questionToken,
                                factory.createUnionTypeNode(
                                    ReversePointerRelations[entity].map(
                                        ele => factory.createLiteralTypeNode(
                                            factory.createStringLiteral(firstLetterLowerCase(ele))
                                        )
                                    )
                                )
                            )
                        );
                    }
                    else {
                        members.push(
                            factory.createPropertySignature(
                                undefined,
                                name,
                                questionToken,
                                type
                            )
                        );
                    }
                }
            }
            else {
                assert(false);          // 这是什么case，不确定
                members.push(attr);
            }
        }
        else {
            assert(ts.isUnionTypeNode(type!) || ts.isLiteralTypeNode(type!), `${entity}中的属性${(<ts.Identifier>name).text}有非法的属性类型定义`);
            members.push(
                factory.createPropertySignature(
                    undefined,
                    name,
                    questionToken,
                    type
                )
            );
        }
    }
    // 处理reverserPointer
    const reverseOnes = ReversePointerRelations[entity];
    if (reverseOnes) {
        reverseOnes.forEach(
            (one) => {
                referenceEntities.push(one);
                members2.push(
                    factory.createPropertySignature(
                        undefined,
                        firstLetterLowerCase(one),
                        factory.createToken(ts.SyntaxKind.QuestionToken),
                        factory.createTypeReferenceNode(
                            createForeignRef(entity, one, 'Schema')
                        )
                    )
                );
            }
        )
    }

    const foreignKeySet: Record<string, string[]> = {};
    if (oneToManySet) {
        for (const oneToManyItem of oneToManySet) {
            const [entityName, foreignKey] = oneToManyItem;
            if (referenceEntities.indexOf(entityName) === -1) {
                referenceEntities.push(entityName);
            }

            if (foreignKeySet.hasOwnProperty(entityName)) {
                foreignKeySet[entityName].push(foreignKey);
            }
            else {
                foreignKeySet[entityName] = [foreignKey];
            }
        }
        for (const entityName in foreignKeySet) {
            const entityNameLc = firstLetterLowerCase(entityName);
            foreignKeySet[entityName].forEach(
                (foreignKey) => {
                    const identifier = `${entityNameLc}$${foreignKey}`;
                    members2.push(
                        factory.createPropertySignature(
                            undefined,
                            identifier,
                            factory.createToken(ts.SyntaxKind.QuestionToken),
                            factory.createTypeReferenceNode(
                                factory.createIdentifier("Array"),
                                [factory.createTypeReferenceNode(
                                    createForeignRef(entity, entityName, 'Schema'),
                                    undefined
                                )]
                            ),
                        )
                    );
                }
            );
        }
    }


    uniq(referenceEntities).forEach(
        (ele) => {
            if (ele !== entity) {
                statements.push(factory.createImportDeclaration(
                    undefined,
                    undefined,
                    factory.createImportClause(
                        false,
                        undefined,
                        factory.createNamespaceImport(
                            factory.createIdentifier(ele)
                        )
                    ),
                    factory.createStringLiteral(`../${ele}/Schema`)
                ));
            }
        }
    );

    // if (keys(foreignKeySet).length > 0) {
    //     for (const fkItem in foreignKeySet) {
    //         const entityLc = fkItem.slice(0, 1).toLowerCase().concat(fkItem.slice(1));
    //         const foreignKeys = [];
    //         /* statements.push(
    //             factory.createTypeAliasDeclaration(
    //                 undefined,
    //                 undefined,
    //                 factory.createIdentifier(`${fkItem}s`),
    //                 undefined,
    //                 factory.createTemplateLiteralType(
    //                     factory.createTemplateHead(
    //                         `${entityLc}s$`,
    //                         `${entityLc}s$`
    //                     ),
    //                     [factory.createTemplateLiteralTypeSpan(
    //                         factory.createKeywordTypeNode(ts.SyntaxKind.StringKeyword),
    //                         factory.createTemplateTail(
    //                             "",
    //                             ""
    //                         )
    //                     )]
    //                 )
    //             )
    //         ); */

    //         for (let iter = 1; iter < 11; iter++) {
    //             foreignKeys.push(`${entityLc}s$${iter}`);
    //         }

    //         statements.push(
    //             factory.createTypeAliasDeclaration(
    //                 undefined,
    //                 undefined,
    //                 factory.createIdentifier(`${fkItem}s`),
    //                 undefined,
    //                 factory.createUnionTypeNode(
    //                     foreignKeys.map(
    //                         ele => factory.createLiteralTypeNode(factory.createStringLiteral(ele))
    //                     )
    //                 )
    //             )
    //         );
    //     }
    // }
    statements.push(
        factory.createTypeAliasDeclaration(
            undefined,
            [
                factory.createModifier(ts.SyntaxKind.ExportKeyword)
            ],
            factory.createIdentifier('OpSchema'),
            undefined,
            factory.createTypeLiteralNode(members)
        ),
        factory.createTypeAliasDeclaration(
            undefined,
            [factory.createModifier(ts.SyntaxKind.ExportKeyword)],
            factory.createIdentifier("OpAttr"),
            undefined,
            factory.createTypeOperatorNode(
                ts.SyntaxKind.KeyOfKeyword,
                factory.createTypeReferenceNode(
                    factory.createIdentifier("OpSchema"),
                    undefined
                )
            )
        )
    );

    statements.push(
        factory.createTypeAliasDeclaration(
            undefined,
            [
                factory.createModifier(ts.SyntaxKind.ExportKeyword)
            ],
            factory.createIdentifier('Schema'),
            undefined,
            factory.createIntersectionTypeNode(
                [
                    factory.createTypeLiteralNode(members.concat(members2)),
                    factory.createMappedTypeNode(
                        undefined,
                        factory.createTypeParameterDeclaration(
                            factory.createIdentifier("A"),
                            factory.createTypeReferenceNode(
                                factory.createIdentifier("ExpressionKey"),
                                undefined
                            ),
                            undefined
                        ),
                        undefined,
                        factory.createToken(ts.SyntaxKind.QuestionToken),
                        factory.createKeywordTypeNode(ts.SyntaxKind.AnyKeyword),
                        undefined
                    )
                ]
            )
        )
    );
}

/**
 * 生成Query
 * @param statements 
 * @param schemaAttrs 
 * @param entity 
 */
function constructFilter(statements: Array<ts.Statement>, entity: string) {
    const { schemaAttrs, fulltextIndex } = Schema[entity];
    const members: Array<ts.TypeElement> = [
        // id: Q_StringValue
        factory.createPropertySignature(
            undefined,
            factory.createIdentifier('id'),
            undefined,
            factory.createUnionTypeNode([
                factory.createTypeReferenceNode(
                    factory.createIdentifier('Q_StringValue'),
                ),
                factory.createTypeReferenceNode(
                    factory.createQualifiedName(
                        factory.createIdentifier("SubQuery"),
                        factory.createIdentifier(`${entity}IdSubQuery`)
                    )
                )
            ])
        ),
        // $$createAt$$: Q_DateValue
        factory.createPropertySignature(
            undefined,
            factory.createIdentifier('$$createAt$$'),
            undefined,
            factory.createTypeReferenceNode(
                factory.createIdentifier('Q_DateValue'),
            )
        ),
        // $$updateAt$$: Q_DateValue
        factory.createPropertySignature(
            undefined,
            factory.createIdentifier('$$updateAt$$'),
            undefined,
            factory.createTypeReferenceNode(
                factory.createIdentifier('Q_DateValue'),
            )
        )
    ];

    const { [entity]: manyToOneSet } = ManyToOne;

    for (const attr of schemaAttrs) {
        const { type, name } = <ts.PropertySignature>attr;
        const attrName = (<ts.Identifier>name).text;
        if (ts.isTypeReferenceNode(type!)) {
            const { typeName } = type;
            if (ts.isIdentifier(typeName)) {
                const { text } = typeName;
                let type2: ts.TypeNode;
                switch (text) {
                    case 'String':
                    case 'Text':
                    case 'Image':
                    case 'File': {
                        if (ReversePointerRelations[entity] && attrName === 'entity') {
                            type2 = factory.createTypeReferenceNode('E');
                        }
                        else {
                            type2 = factory.createTypeReferenceNode(
                                factory.createIdentifier('Q_StringValue'),
                            );
                        }
                        break;
                    }
                    case 'Int':
                    case 'Float':
                    case 'Double': {
                        type2 = factory.createTypeReferenceNode(
                            factory.createIdentifier('Q_NumberValue'),
                        );
                        break;
                    }
                    case 'Boolean': {
                        type2 = factory.createTypeReferenceNode(
                            factory.createIdentifier('Q_BooleanValue'),
                        );
                        break;
                    }
                    case 'Datetime': {
                        type2 = factory.createTypeReferenceNode(
                            factory.createIdentifier('Q_DateValue'),
                        );
                        break;
                    }
                    case 'Object': {
                        // object类型暂不支持查询
                        break;
                    }
                    default: {
                        const text2 = text === 'Schema' ? entity : text;
                        const manyToOneItem = manyToOneSet && manyToOneSet.find(
                            ([refEntity]) => refEntity === text2
                        );
                        if (manyToOneItem) {
                            // 外键可能落到相应的子查询中
                            members.push(
                                factory.createPropertySignature(
                                    undefined,
                                    `${(<ts.Identifier>name).text}Id`,
                                    undefined,
                                    factory.createUnionTypeNode([
                                        factory.createTypeReferenceNode(
                                            factory.createIdentifier('Q_StringValue'),
                                        ),
                                        factory.createTypeReferenceNode(
                                            factory.createQualifiedName(
                                                factory.createIdentifier("SubQuery"),
                                                factory.createIdentifier(`${text2}IdSubQuery`)
                                            ),
                                            undefined
                                        )
                                    ])
                                )
                            );
                            type2 = factory.createTypeReferenceNode(
                                createForeignRef(entity, text2, 'Filter')
                            );
                        }
                        else {
                            assert(text.endsWith('State'));
                            type2 = factory.createTypeReferenceNode(
                                factory.createIdentifier('Q_EnumValue'),
                                [
                                    factory.createTypeReferenceNode(
                                        factory.createIdentifier(text),
                                        undefined
                                    )
                                ]
                            );
                        }
                    }
                }
                if (type2!) {
                    members.push(
                        factory.createPropertySignature(
                            undefined,
                            name,
                            undefined,
                            type2
                        )
                    );
                }
            }
        }
        else {
            assert(ts.isUnionTypeNode(type!) && ts.isLiteralTypeNode(type.types[0]) || ts.isLiteralTypeNode(type!));

            members.push(
                factory.createPropertySignature(
                    undefined,
                    name,
                    undefined,
                    factory.createTypeReferenceNode(
                        factory.createIdentifier('Q_EnumValue'),
                        [
                            type
                        ]
                    )
                )
            );
        }
    }

    // type AttrFilter = {};
    statements.push(
        factory.createTypeAliasDeclaration(
            undefined,
            undefined,
            factory.createIdentifier('AttrFilter'),
            ReversePointerRelations[entity] ? [
                factory.createTypeParameterDeclaration(
                    factory.createIdentifier("E"),
                    undefined,
                    factory.createTypeReferenceNode(
                        factory.createIdentifier("Q_EnumValue"),
                        [
                            factory.createUnionTypeNode(
                                ReversePointerRelations[entity].map(
                                    ele => factory.createLiteralTypeNode(
                                        factory.createStringLiteral(firstLetterLowerCase(ele))
                                    )
                                )
                            )
                        ]
                    )
                )
            ] : undefined,
            factory.createTypeLiteralNode(members)
        )
    );

    /**
     * 
    export type Filter = AttrFilter | Partial<ExprOp<OpSchema> | {
            [F in Q_LogicKey]: Filter[];
        } | {
            [F in Q_FullTextKey]: Q_FullTextValue;
        }>;

     */
    const types: ts.TypeNode[] = [
        factory.createTypeReferenceNode(
            factory.createIdentifier("AttrFilter"),
            ReversePointerRelations[entity] ? [factory.createTypeReferenceNode('E')] : undefined
        ),
        factory.createTypeReferenceNode(
            factory.createIdentifier("ExprOp"),
            [
                factory.createTypeReferenceNode(
                    factory.createIdentifier('OpAttr')
                )
            ]
        ),
    ];

    // 如果还有其它类型的查询如全文，则加在types数组中
    if (fulltextIndex) {
        types.push(
            factory.createTypeReferenceNode('FulltextFilter')
        );
    }

    statements.push(
        factory.createTypeAliasDeclaration(
            undefined,
            [factory.createModifier(ts.SyntaxKind.ExportKeyword)],
            factory.createIdentifier("Filter"),
            ReversePointerRelations[entity] ? [
                factory.createTypeParameterDeclaration(
                    factory.createIdentifier("E"),
                    undefined,
                    factory.createTypeReferenceNode(
                        factory.createIdentifier("Q_EnumValue"),
                        [
                            factory.createUnionTypeNode(
                                ReversePointerRelations[entity].map(
                                    ele => factory.createLiteralTypeNode(
                                        factory.createStringLiteral(firstLetterLowerCase(ele))
                                    )
                                )
                            )
                        ]
                    )
                )
            ] : undefined,
            factory.createTypeReferenceNode(
                factory.createIdentifier("MakeFilter"),
                [factory.createIntersectionTypeNode(types)]
            )
        )
    );
}

/**
 * 构造Projection和OneAttrProjection
 * @param statements 
 * @param entity 
 */
function constructProjection(statements: Array<ts.Statement>, entity: string) {
    const { schemaAttrs } = Schema[entity];
    const properties: Array<[string | ts.PropertyName, boolean, ts.TypeNode?, ts.TypeNode?]> = [
        ['id', true],
        ['$$createAt$$', false],
        ['$$updateAt$$', false],
    ];
    const foreignKeyProperties: {
        [k: string]: [string]
    } = {
        [entity]: [''],
    };

    const { [entity]: manyToOneSet } = ManyToOne;

    for (const attr of schemaAttrs) {
        const { type, name } = <ts.PropertySignature>attr;
        const attrName = (<ts.Identifier>name).text;
        if (ts.isTypeReferenceNode(type!)) {
            const { typeName } = type;
            if (ts.isIdentifier(typeName)) {
                const { text } = typeName;
                switch (text) {
                    case 'String':
                    case 'Text':
                    case 'Int':
                    case 'Float':
                    case 'Double':
                    case 'Boolean':
                    case 'Datetime':
                    case 'Image':
                    case 'File':
                    case 'Object': {
                        properties.push(
                            [name, false]
                        )
                        break;
                    }
                    default: {
                        const text2 = text === 'Schema' ? entity : text;
                        const manyToOneItem = manyToOneSet && manyToOneSet.find(
                            ([refEntity]) => refEntity === text2
                        );
                        if (manyToOneItem) {
                            // 外键投影
                            properties.push(
                                [`${attrName}Id`, false, undefined],
                                [name, false, factory.createTypeReferenceNode(
                                    createForeignRef(entity, text2, 'Projection')
                                ), factory.createTypeReferenceNode(
                                    createForeignRef(entity, text2, 'ExportProjection')
                                )]
                            );
                            if (foreignKeyProperties.hasOwnProperty(text2)) {
                                foreignKeyProperties[text2].push(attrName);
                            }
                            else {
                                assign(foreignKeyProperties, {
                                    [text2]: [attrName],
                                });
                            }
                        }
                        else {
                            // todo 此处是对State的专门处理
                            assert(text.endsWith('State'));
                            properties.push(
                                [name, false, undefined]
                            )
                        }
                    }
                }
            }
            else {
                assert(false);
            }
        }
        else {
            assert(ts.isUnionTypeNode(type!) && ts.isLiteralTypeNode(type.types[0]) || ts.isLiteralTypeNode(type!));
            properties.push(
                [name, false, undefined]
            )
        }
    }

    if (ReversePointerRelations[entity]) {
        ReversePointerRelations[entity].forEach(
            (one) => {
                const text2 = one === 'Schema' ? entity : one;
                properties.push(
                    [firstLetterLowerCase(one), false, factory.createTypeReferenceNode(
                        createForeignRef(entity, one, 'Projection')
                    ), factory.createTypeReferenceNode(
                        createForeignRef(entity, one, 'ExportProjection')
                    )]
                );
                if (foreignKeyProperties.hasOwnProperty(one)) {
                    foreignKeyProperties[text2].push('entity');
                }
                else {
                    assign(foreignKeyProperties, {
                        [text2]: ['entity'],
                    });
                }
            }
        )
    }

    // 一对多的projection
    const { [entity]: oneToManySet } = OneToMany;
    if (oneToManySet) {
        const foreignKeySet: Record<string, string[]> = {};
        for (const oneToManyItem of oneToManySet) {
            const [entityName, foreignKey] = oneToManyItem;

            if (foreignKeySet.hasOwnProperty(entityName)) {
                foreignKeySet[entityName].push(foreignKey);
            }
            else {
                foreignKeySet[entityName] = [foreignKey];
            }
        }

        for (const entityName in foreignKeySet) {
            const entityNameLc = firstLetterLowerCase(entityName);
            foreignKeySet[entityName].forEach(
                (foreignKey) => {
                    const identifier = `${entityNameLc}$${foreignKey}`;
                    properties.push(
                        [identifier, false,
                            factory.createTypeReferenceNode(
                                createForeignRef(entity, entityName, 'Selection'),
                                undefined
                            ),
                            factory.createTypeReferenceNode(
                                createForeignRef(entity, entityName, 'Exportation'),
                                undefined
                            )
                        ]
                    );
                }
            );
        }
    }

    const exprNode = factory.createTypeReferenceNode(
        factory.createIdentifier("Partial"),
        [
            factory.createTypeReferenceNode(
                factory.createIdentifier("ExprOp"),
                [
                    factory.createTypeReferenceNode(
                        factory.createIdentifier("OpAttr"),
                        undefined
                    )
                ]
            )
        ]
    );

    const MetaPropertySignaturs = [
        factory.createPropertySignature(
            undefined,
            factory.createStringLiteral("#id"),
            factory.createToken(ts.SyntaxKind.QuestionToken),
            factory.createTypeReferenceNode(
                'NodeId'
            )
        )
    ];
    // Projection，正常查询的投影
    statements.push(
        factory.createTypeAliasDeclaration(
            undefined,
            [factory.createModifier(ts.SyntaxKind.ExportKeyword)],
            factory.createIdentifier("Projection"),
            undefined,
            factory.createIntersectionTypeNode([
                factory.createTypeLiteralNode(
                    MetaPropertySignaturs.concat(
                        properties.map(
                            ([n, q, v]) => {
                                return factory.createPropertySignature(
                                    undefined,
                                    n,
                                    q ? undefined : factory.createToken(ts.SyntaxKind.QuestionToken),
                                    v || factory.createLiteralTypeNode(factory.createNumericLiteral("1"))
                                )
                            }
                        )
                    )
                ),
                exprNode,
            ])
        )
    );

    // ExportProjection，下载查询的投影
    statements.push(
        factory.createTypeAliasDeclaration(
            undefined,
            [factory.createModifier(ts.SyntaxKind.ExportKeyword)],
            factory.createIdentifier("ExportProjection"),
            undefined,
            factory.createIntersectionTypeNode([
                factory.createTypeLiteralNode(
                    MetaPropertySignaturs.concat(
                        properties.map(
                            ([n, q, v, v2]) => {
                                return factory.createPropertySignature(
                                    undefined,
                                    n,
                                    factory.createToken(ts.SyntaxKind.QuestionToken),
                                    v2 || factory.createKeywordTypeNode(ts.SyntaxKind.StringKeyword)
                                )
                            }
                        )
                    )
                ),
                exprNode,
            ])
        )
    );

    // ${Entity}Projection，外键查询的专用投影
    for (const foreignKey in foreignKeyProperties) {
        const identifier = `${foreignKey}IdProjection`;
        statements.push(
            factory.createTypeAliasDeclaration(
                undefined,
                undefined,
                factory.createIdentifier(identifier),
                undefined,
                factory.createTypeReferenceNode(
                    factory.createIdentifier("OneOf"),
                    [
                        factory.createTypeLiteralNode(
                            foreignKeyProperties[foreignKey].map(
                                (attr) => factory.createPropertySignature(
                                    undefined,
                                    attr ? factory.createIdentifier(`${attr}Id`) : 'id',
                                    undefined,
                                    factory.createLiteralTypeNode(factory.createNumericLiteral("1"))
                                )
                            )
                        )
                    ]
                )
            )
        );
    }
}

/**
 * 构造Query
 * @param statements 
 * @param entity 
 */
function constructQuery(statements: Array<ts.Statement>, entity: string) {
    const entityLc = firstLetterLowerCase(entity);

    /* statements.push(
        factory.createTypeAliasDeclaration(
            undefined,
            [factory.createModifier(ts.SyntaxKind.ExportKeyword)],
            factory.createIdentifier("Query"),
            undefined,
            factory.createIntersectionTypeNode([
                factory.createTypeLiteralNode([
                    // 这里可以不写entity了
                    factory.createPropertySignature(
                        undefined,
                        factory.createIdentifier("projection"),
                        undefined,
                        factory.createTypeReferenceNode(
                            factory.createIdentifier("Projection"),
                            undefined
                        )
                    ),
                    factory.createPropertySignature(
                        undefined,
                        factory.createIdentifier("sort"),
                        factory.createToken(ts.SyntaxKind.QuestionToken),
                        factory.createTypeReferenceNode(
                            factory.createIdentifier("Sorter"),
                            undefined
                        )
                    )
                ]),
                factory.createTypeReferenceNode(
                    factory.createIdentifier("OakFilter"),
                    [
                        factory.createLiteralTypeNode(factory.createStringLiteral("select")),
                        factory.createTypeReferenceNode(
                            factory.createIdentifier("Filter"),
                            undefined
                        )
                    ]
                ),
                factory.createTypeReferenceNode(
                    factory.createIdentifier("OakOperation"),
                    [
                        factory.createTypeReferenceNode(
                            factory.createIdentifier("Operation"),
                            undefined
                        )
                    ]
                )
            ])
        )
    ); */

    /**
      * export type ExportQuery = {
         entity: 'user';
         projection: ExportProjection;
         filter?: Filter;
         sort?: Sorter;
         indexFrom?: number;
         count?: number;
     };
      */
    /* statements.push(
        factory.createTypeAliasDeclaration(
            undefined,
            [factory.createModifier(ts.SyntaxKind.ExportKeyword)],
            factory.createIdentifier("ExportQuery"),
            undefined,
            factory.createIntersectionTypeNode([
                factory.createTypeLiteralNode([
                    factory.createPropertySignature(
                        undefined,
                        factory.createIdentifier("projection"),
                        undefined,
                        factory.createTypeReferenceNode(
                            factory.createIdentifier("ExportProjection"),
                            undefined
                        )
                    ),
                    factory.createPropertySignature(
                        undefined,
                        factory.createIdentifier("sort"),
                        factory.createToken(ts.SyntaxKind.QuestionToken),
                        factory.createTypeReferenceNode(
                            factory.createIdentifier("Sorter"),
                            undefined
                        )
                    )
                ]),
                factory.createTypeReferenceNode(
                    factory.createIdentifier("OakFilter"),
                    [
                        factory.createLiteralTypeNode(factory.createStringLiteral("select")),
                        factory.createTypeReferenceNode(
                            factory.createIdentifier("Filter"),
                            undefined
                        )
                    ]
                )
            ])
        )
    ); */

    // 对每个可能的外键的子查询，建立相应的${Entity}IdSubQuery    
    const { [entity]: manyToOneSet } = ManyToOne;
    let manyToSelf = false;
    if (manyToOneSet) {
        uniqBy(manyToOneSet, ([a]) => a).forEach(
            ([oneEntity, foreignKey]) => {
                statements.push(
                    factory.createTypeAliasDeclaration(
                        undefined,
                        [factory.createModifier(ts.SyntaxKind.ExportKeyword)],
                        factory.createIdentifier(`${oneEntity}IdSubQuery`),
                        undefined,
                        factory.createTypeReferenceNode(
                            factory.createIdentifier("Selection"),
                            [factory.createTypeReferenceNode(
                                factory.createIdentifier(`${oneEntity}IdProjection`),
                                undefined
                            )]
                        )
                    )
                );

                if (oneEntity === entity) {
                    manyToSelf = true;
                }
            }
        );
    }

    // 主键可能产生的子查询
    if (!manyToSelf) {
        statements.push(
            factory.createTypeAliasDeclaration(
                undefined,
                [factory.createModifier(ts.SyntaxKind.ExportKeyword)],
                factory.createIdentifier(`${entity}IdSubQuery`),
                undefined,
                factory.createTypeReferenceNode(
                    factory.createIdentifier("Selection"),
                    [factory.createTypeReferenceNode(
                        factory.createIdentifier(`${entity}IdProjection`),
                        undefined
                    )]
                )
            )
        );
    }
}

/**
 * 构造Sort
 * @param statements 
 * @param entity 
 */
function constructSorter(statements: Array<ts.Statement>, entity: string) {
    const { schemaAttrs } = Schema[entity];
    const members: Array<ts.TypeElement> = [
        // id: 1
        factory.createPropertySignature(
            undefined,
            factory.createIdentifier("id"),
            undefined,
            factory.createLiteralTypeNode(factory.createNumericLiteral("1"))
        ),
        // $$createAt$$: 1
        factory.createPropertySignature(
            undefined,
            factory.createIdentifier('$$createAt$$'),
            undefined,
            factory.createLiteralTypeNode(factory.createNumericLiteral("1"))
        ),
        // $$updateAt$$: 1
        factory.createPropertySignature(
            undefined,
            factory.createIdentifier('$$updateAt$$'),
            undefined,
            factory.createLiteralTypeNode(factory.createNumericLiteral("1"))
        )
    ];

    const { [entity]: manyToOneSet } = ManyToOne;

    for (const attr of schemaAttrs) {
        const { type, name, questionToken } = <ts.PropertySignature>attr;
        if (ts.isTypeReferenceNode(type!)) {
            const { typeName } = type;
            if (ts.isIdentifier(typeName)) {
                const { text } = typeName;
                let type2: ts.TypeNode;
                switch (text) {
                    case 'String':
                    case 'Text':
                    case 'Int':
                    case 'Float':
                    case 'Double':
                    case 'Boolean':
                    case 'Datetime':
                    case 'Image':
                    case 'File': {
                        type2 = factory.createLiteralTypeNode(factory.createNumericLiteral("1"));
                        break;
                    }
                    default: {
                        const text2 = text === 'Schema' ? entity : text;
                        const manyToOneItem = manyToOneSet && manyToOneSet.find(
                            ([refEntity]) => refEntity === text2
                        );
                        if (manyToOneItem) {
                            type2 = factory.createTypeReferenceNode(
                                <ts.EntityName>createForeignRef(entity, text2, 'SortAttr')
                            );

                            members.push(
                                factory.createPropertySignature(
                                    undefined,
                                    `${(<ts.Identifier>name).text}Id`,
                                    undefined,
                                    factory.createLiteralTypeNode(factory.createNumericLiteral("1"))
                                )
                            );
                        }
                        else if (!['Object'].includes(text)) {
                            // todo 对State的专门处理
                            type2 = factory.createLiteralTypeNode(factory.createNumericLiteral("1"));
                        }
                    }
                }
                if (type2!) {
                    members.push(
                        factory.createPropertySignature(
                            undefined,
                            name,
                            undefined,
                            type2
                        )
                    );
                }
            }
        }
        else {
            assert(ts.isUnionTypeNode(type!) && ts.isLiteralTypeNode(type.types[0]) || ts.isLiteralTypeNode(type!));
            members.push(
                factory.createPropertySignature(
                    undefined,
                    name,
                    undefined,
                    factory.createLiteralTypeNode(factory.createNumericLiteral("1"))
                )
            );
        }
    }

    if (ReversePointerRelations[entity]) {
        ReversePointerRelations[entity].forEach(
            (one) => {
                members.push(
                    factory.createPropertySignature(
                        undefined,
                        firstLetterLowerCase(one),
                        undefined,
                        factory.createTypeReferenceNode(
                            <ts.EntityName>createForeignRef(entity, one, 'SortAttr')
                        )
                    )
                );
            }
        )
    }
    /**
     * 
        export type SortAttr = OneOf<{
            id: 1;
            name: 1;
            nickname: 1;
            age: 1;
            gender: 1;
            $$createAt$$: 1;
            $$updateAt$$: 1;
        } & Record<FnCallKey, 1 | FnCallValue<AttrFilter>>>;
     */
    statements.push(
        factory.createTypeAliasDeclaration(
            undefined,
            [factory.createModifier(ts.SyntaxKind.ExportKeyword)],
            factory.createIdentifier("SortAttr"),
            undefined,
            factory.createTypeReferenceNode(
                factory.createIdentifier("OneOf"),
                [factory.createIntersectionTypeNode([
                    factory.createTypeLiteralNode(
                        members),
                    factory.createTypeReferenceNode(
                        factory.createIdentifier("ExprOp"),
                        [
                            factory.createTypeReferenceNode(
                                factory.createIdentifier('OpAttr')
                            )
                        ]
                    )
                ])]
            )
        )
    );

    /**
     * export type SortNode = {
        $attr: SortAttr;
        $direction?: 'asc' | 'desc';
    };
     */
    statements.push(
        factory.createTypeAliasDeclaration(
            undefined,
            [factory.createModifier(ts.SyntaxKind.ExportKeyword)],
            factory.createIdentifier("SortNode"),
            undefined,
            factory.createTypeLiteralNode([
                factory.createPropertySignature(
                    undefined,
                    factory.createIdentifier("$attr"),
                    undefined,
                    factory.createTypeReferenceNode(
                        factory.createIdentifier("SortAttr"),
                        undefined
                    )
                ),
                factory.createPropertySignature(
                    undefined,
                    factory.createIdentifier("$direction"),
                    factory.createToken(ts.SyntaxKind.QuestionToken),
                    factory.createUnionTypeNode([
                        factory.createLiteralTypeNode(factory.createStringLiteral("asc")),
                        factory.createLiteralTypeNode(factory.createStringLiteral("desc"))
                    ])
                )
            ])
        )
    );

    /**
     * export type Sorter = SortNode[];
     */
    statements.push(
        factory.createTypeAliasDeclaration(
            undefined,
            [factory.createModifier(ts.SyntaxKind.ExportKeyword)],
            factory.createIdentifier("Sorter"),
            undefined,
            factory.createArrayTypeNode(factory.createTypeReferenceNode(
                factory.createIdentifier("SortNode"),
                undefined
            ))
        )
    )
}

function constructFullAttrs(statements: Array<ts.Statement>, entity: string) {
    const { [entity]: manyToOneSet } = ManyToOne;
    const { [entity]: oneToManySet } = OneToMany;

    if (manyToOneSet && manyToOneSet.length) {
        const mtoAttrs: ts.TypeNode[] = [];
        for (const item of manyToOneSet) {
            const [one, key] = item;
            if (one === entity) {
                // 递归引用自身，因为typescript本身不支持递归，因此这里做一个显式的三层递归应该够用了
                mtoAttrs.push(
                    factory.createTemplateLiteralType(
                        factory.createTemplateHead(
                            `${key}.`,
                            `${key}.`
                        ),
                        [factory.createTemplateLiteralTypeSpan(
                            factory.createTypeReferenceNode(
                                factory.createIdentifier("OpAttr"),
                                undefined
                            ),
                            factory.createTemplateTail(
                                "",
                                ""
                            )
                        )]
                    ),
                    factory.createTemplateLiteralType(
                        factory.createTemplateHead(
                            `${key}.${key}.`,
                            `${key}.${key}.`
                        ),
                        [factory.createTemplateLiteralTypeSpan(
                            factory.createTypeReferenceNode(
                                factory.createIdentifier("OpAttr"),
                                undefined
                            ),
                            factory.createTemplateTail(
                                "",
                                ""
                            )
                        )]
                    ),
                    factory.createTemplateLiteralType(
                        factory.createTemplateHead(
                            `${key}.${key}.${key}.`,
                            `${key}.${key}.${key}.`
                        ),
                        [factory.createTemplateLiteralTypeSpan(
                            factory.createTypeReferenceNode(
                                factory.createIdentifier("OpAttr"),
                                undefined
                            ),
                            factory.createTemplateTail(
                                "",
                                ""
                            )
                        )]
                    )
                )
            }
            else {
                mtoAttrs.push(
                    factory.createTemplateLiteralType(
                        factory.createTemplateHead(
                            `${key}.`,
                            `${key}.`
                        ),
                        [factory.createTemplateLiteralTypeSpan(
                            factory.createTypeReferenceNode(
                                factory.createQualifiedName(
                                    factory.createIdentifier(one),
                                    factory.createIdentifier("NativeAttr")
                                ),
                                undefined
                            ),
                            factory.createTemplateTail(
                                "",
                                ""
                            )
                        )
                        ]
                    )
                );
            }
        }
        statements.push(
            factory.createTypeAliasDeclaration(
                undefined,
                [factory.createModifier(ts.SyntaxKind.ExportKeyword)],
                factory.createIdentifier("NativeAttr"),
                undefined,
                factory.createUnionTypeNode(
                    [
                        factory.createTypeReferenceNode(
                            factory.createIdentifier("OpAttr"),
                            undefined
                        )
                        ,
                        ...mtoAttrs
                    ]
                )
            )
        );
    }
    else {
        statements.push(factory.createTypeAliasDeclaration(
            undefined,
            [factory.createModifier(ts.SyntaxKind.ExportKeyword)],
            factory.createIdentifier("NativeAttr"),
            undefined,
            factory.createTypeReferenceNode(
                factory.createIdentifier("OpAttr"),
                undefined
            )
        ));
    }

    const foreignKeySet: Record<string, string[]> = {};
    if (oneToManySet && oneToManySet.length > 0) {
        for (const oneToManyItem of oneToManySet) {
            const [entityName, foreignKey] = oneToManyItem;
            if (foreignKeySet.hasOwnProperty(entityName)) {
                foreignKeySet[entityName].push(foreignKey);
            }
            else {
                foreignKeySet[entityName] = [foreignKey];
            }
        }
        const otmAttrs: ts.TemplateLiteralTypeNode[] = [];
        for (const entityName in foreignKeySet) {
            const entityNameLc = firstLetterLowerCase(entityName);
            if (foreignKeySet[entityName].length > 1) {
                foreignKeySet[entityName].forEach(
                    (foreignKey) => {
                        const head = `${entityNameLc}s$${foreignKey}`;
                        otmAttrs.push(
                            factory.createTemplateLiteralType(
                                factory.createTemplateHead(
                                    `${head}$`,
                                    `${head}$`
                                ),
                                [
                                    factory.createTemplateLiteralTypeSpan(
                                        factory.createKeywordTypeNode(ts.SyntaxKind.NumberKeyword),
                                        factory.createTemplateMiddle(
                                            ".",
                                            "."
                                        )
                                    ),
                                    factory.createTemplateLiteralTypeSpan(
                                        factory.createTypeReferenceNode(
                                            entityName === entity
                                                ? factory.createIdentifier("NativeAttr")
                                                : factory.createQualifiedName(
                                                    factory.createIdentifier(entityName),
                                                    factory.createIdentifier("NativeAttr")
                                                ),
                                            undefined
                                        ),
                                        factory.createTemplateTail(
                                            "",
                                            ""
                                        )
                                    )
                                ]
                            )
                        );
                    }
                );
            }
            else {
                otmAttrs.push(
                    factory.createTemplateLiteralType(
                        factory.createTemplateHead(
                            `${entityNameLc}s$`,
                            `${entityNameLc}s$`
                        ),
                        [
                            factory.createTemplateLiteralTypeSpan(
                                factory.createKeywordTypeNode(ts.SyntaxKind.NumberKeyword),
                                factory.createTemplateMiddle(
                                    ".",
                                    "."
                                )
                            ),
                            factory.createTemplateLiteralTypeSpan(
                                factory.createTypeReferenceNode(
                                    entityName === entity
                                        ? factory.createIdentifier("NativeAttr")
                                        : factory.createQualifiedName(
                                            factory.createIdentifier(entityName),
                                            factory.createIdentifier("NativeAttr")
                                        ),
                                    undefined
                                ),
                                factory.createTemplateTail(
                                    "",
                                    ""
                                )
                            )
                        ]
                    )
                );
            }
        }

        statements.push(
            factory.createTypeAliasDeclaration(
                undefined,
                [factory.createModifier(ts.SyntaxKind.ExportKeyword)],
                factory.createIdentifier("FullAttr"),
                undefined,
                factory.createUnionTypeNode([
                    factory.createTypeReferenceNode(
                        factory.createIdentifier("NativeAttr"),
                        undefined
                    ),
                    ...otmAttrs
                ])
            )
        );
    }
    else {
        statements.push(factory.createTypeAliasDeclaration(
            undefined,
            [factory.createModifier(ts.SyntaxKind.ExportKeyword)],
            factory.createIdentifier("FullAttr"),
            undefined,
            factory.createTypeReferenceNode(
                factory.createIdentifier("NativeAttr"),
                undefined
            )
        ));
    }

}

function constructActions(statements: Array<ts.Statement>, entity: string) {
    // Selection
    statements.push(
        factory.createTypeAliasDeclaration(
            undefined,
            [factory.createModifier(ts.SyntaxKind.ExportKeyword)],
            factory.createIdentifier("SelectOperation"),
            [
                factory.createTypeParameterDeclaration(
                    factory.createIdentifier("P"),
                    undefined,
                    factory.createTypeReferenceNode(
                        factory.createIdentifier("Projection"),
                        undefined
                    )
                )
            ],
            factory.createTypeReferenceNode(
                factory.createIdentifier("OakOperation"),
                [
                    factory.createLiteralTypeNode(factory.createStringLiteral("select")),
                    factory.createTypeReferenceNode(
                        factory.createIdentifier("P"),
                        undefined
                    ),
                    factory.createTypeReferenceNode(
                        factory.createIdentifier("Filter"),
                        undefined
                    ),
                    factory.createTypeReferenceNode(
                        factory.createIdentifier("Sorter"),
                        undefined
                    )
                ]
            )
        ),
        factory.createTypeAliasDeclaration(
            undefined,
            [factory.createModifier(ts.SyntaxKind.ExportKeyword)],
            factory.createIdentifier("Selection"),
            [
                factory.createTypeParameterDeclaration(
                    factory.createIdentifier("P"),
                    undefined,
                    factory.createTypeReferenceNode(
                        factory.createIdentifier("Projection"),
                        undefined
                    )
                )
            ],
            factory.createTypeReferenceNode(
                factory.createIdentifier("Omit"),
                [
                    factory.createTypeReferenceNode(
                        factory.createIdentifier("SelectOperation"),
                        [
                            factory.createTypeReferenceNode(
                                factory.createIdentifier("P"),
                                undefined
                            )
                        ]
                    ),
                    factory.createLiteralTypeNode(factory.createStringLiteral("action"))
                ]
            )
        )
    );

    // Exportation
    statements.push(
        factory.createTypeAliasDeclaration(
            undefined,
            [factory.createModifier(ts.SyntaxKind.ExportKeyword)],
            factory.createIdentifier("Exportation"),
            undefined,
            factory.createTypeReferenceNode(
                factory.createIdentifier("OakOperation"),
                [
                    factory.createLiteralTypeNode(factory.createStringLiteral("export")),
                    factory.createTypeReferenceNode(
                        factory.createIdentifier("ExportProjection"),
                        undefined
                    ),
                    factory.createTypeReferenceNode(
                        factory.createIdentifier("Filter"),
                        undefined
                    ),
                    factory.createTypeReferenceNode(
                        factory.createIdentifier("Sorter"),
                        undefined
                    )
                ]
            )
        )
    );

    const { [entity]: manyToOneSet } = ManyToOne;
    const { [entity]: oneToManySet } = OneToMany;
    const foreignKeySet: Record<string, string[]> = {};
    if (oneToManySet) {
        for (const oneToManyItem of oneToManySet) {
            const [entityName, foreignKey] = oneToManyItem;

            if (foreignKeySet.hasOwnProperty(entityName)) {
                foreignKeySet[entityName].push(foreignKey);
            }
            else {
                foreignKeySet[entityName] = [foreignKey];
            }
        }
    }
    // CreateOperationData
    let adNodes: ts.TypeNode[] = [
        manyToOneSet
            ? factory.createTypeReferenceNode(
                factory.createIdentifier("Omit"),
                [
                    factory.createTypeReferenceNode(
                        factory.createIdentifier("OpSchema"),
                        undefined
                    ),
                    factory.createUnionTypeNode(
                        manyToOneSet.map(
                            (ele) => factory.createLiteralTypeNode(factory.createStringLiteral(`${ele[1]}Id`))
                        )
                    )
                ]
            )
            : factory.createTypeReferenceNode(
                factory.createIdentifier("OpSchema"),
                undefined
            )
    ];
    if (manyToOneSet) {
        if (ReversePointerRelations[entity]) {
            // 反指对象特殊处理，应当是要么传{ entity, entityId }, 要么直接传反接对象之一
            adNodes.push(
                factory.createUnionTypeNode(
                    [
                        factory.createTypeLiteralNode(
                            [
                                factory.createPropertySignature(
                                    undefined,
                                    factory.createIdentifier('entity'),
                                    undefined,
                                    factory.createUnionTypeNode(
                                        ReversePointerRelations[entity].map(
                                            ele => factory.createLiteralTypeNode(
                                                factory.createStringLiteral(`${firstLetterLowerCase(ele)}`)
                                            )
                                        )
                                    )
                                ),
                                factory.createPropertySignature(
                                    undefined,
                                    factory.createIdentifier('entityId'),
                                    undefined,
                                    factory.createTypeReferenceNode(
                                        factory.createIdentifier("String"),
                                        [factory.createLiteralTypeNode(factory.createNumericLiteral("64"))]
                                    )
                                )
                            ].concat(
                                ReversePointerRelations[entity].map(
                                    (ele) => factory.createPropertySignature(
                                        undefined,
                                        factory.createIdentifier(`${firstLetterLowerCase(ele)}`),
                                        factory.createToken(ts.SyntaxKind.QuestionToken),
                                        factory.createKeywordTypeNode(ts.SyntaxKind.UndefinedKeyword)
                                    )
                                )
                            )
                        ),
                        factory.createParenthesizedType(
                            factory.createIntersectionTypeNode(
                                [
                                    factory.createTypeLiteralNode(
                                        [
                                            factory.createPropertySignature(
                                                undefined,
                                                factory.createIdentifier('entity'),
                                                factory.createToken(ts.SyntaxKind.QuestionToken),
                                                factory.createKeywordTypeNode(ts.SyntaxKind.UndefinedKeyword)
                                            ),
                                            factory.createPropertySignature(
                                                undefined,
                                                factory.createIdentifier('entityId'),
                                                factory.createToken(ts.SyntaxKind.QuestionToken),
                                                factory.createKeywordTypeNode(ts.SyntaxKind.UndefinedKeyword)
                                            )
                                        ]
                                    ),
                                    factory.createTypeReferenceNode(
                                        factory.createIdentifier("OneOf"),
                                        [
                                            factory.createTypeLiteralNode(
                                                ReversePointerRelations[entity].map(
                                                    (ele) => factory.createPropertySignature(
                                                        undefined,
                                                        factory.createIdentifier(`${firstLetterLowerCase(ele)}`),
                                                        undefined,
                                                        factory.createUnionTypeNode([
                                                            factory.createTypeReferenceNode(
                                                                createForeignRef(entity, ele, 'CreateSingleOperation'),
                                                                undefined
                                                            ),
                                                            factory.createParenthesizedType(factory.createIntersectionTypeNode([
                                                                factory.createTypeReferenceNode(
                                                                    createForeignRef(entity, ele, 'UpdateOperation'),
                                                                    undefined
                                                                ),
                                                                factory.createTypeLiteralNode([factory.createPropertySignature(
                                                                    undefined,
                                                                    factory.createIdentifier("id"),
                                                                    undefined,
                                                                    factory.createTypeReferenceNode(
                                                                        factory.createIdentifier("String"),
                                                                        [factory.createLiteralTypeNode(factory.createNumericLiteral("64"))]
                                                                    )
                                                                )])
                                                            ]))
                                                        ])
                                                    )
                                                )
                                            )
                                        ]
                                    )
                                ]
                            )
                        )
                    ]
                )
            );
        }
        else {
            adNodes.push(
                ...manyToOneSet.map(
                    ([refEntity, attr]) => factory.createParenthesizedType(
                        factory.createUnionTypeNode(
                            [
                                factory.createTypeLiteralNode(
                                    [
                                        factory.createPropertySignature(
                                            undefined,
                                            factory.createIdentifier(attr),
                                            factory.createToken(ts.SyntaxKind.QuestionToken),
                                            factory.createUnionTypeNode([
                                                factory.createTypeReferenceNode(
                                                    createForeignRef(entity, refEntity, 'CreateSingleOperation')
                                                ),
                                                factory.createIntersectionTypeNode([
                                                    factory.createTypeReferenceNode(
                                                        createForeignRef(entity, refEntity, 'UpdateOperation'),
                                                        undefined
                                                    ),
                                                    factory.createTypeLiteralNode([factory.createPropertySignature(
                                                        undefined,
                                                        factory.createIdentifier("id"),
                                                        undefined,
                                                        factory.createTypeReferenceNode(
                                                            factory.createIdentifier("String"),
                                                            [factory.createLiteralTypeNode(factory.createNumericLiteral("64"))]
                                                        )
                                                    )])
                                                ])
                                            ])
                                        ),
                                        factory.createPropertySignature(
                                            undefined,
                                            factory.createIdentifier(`${attr}Id`),
                                            factory.createToken(ts.SyntaxKind.QuestionToken),
                                            factory.createKeywordTypeNode(ts.SyntaxKind.UndefinedKeyword)
                                        )
                                    ]
                                ),
                                factory.createTypeLiteralNode(
                                    [
                                        factory.createPropertySignature(
                                            undefined,
                                            factory.createIdentifier(attr),
                                            factory.createToken(ts.SyntaxKind.QuestionToken),
                                            factory.createKeywordTypeNode(ts.SyntaxKind.UndefinedKeyword)
                                        ),
                                        factory.createPropertySignature(
                                            undefined,
                                            factory.createIdentifier(`${attr}Id`),
                                            factory.createToken(ts.SyntaxKind.QuestionToken),
                                            factory.createTypeReferenceNode(
                                                factory.createIdentifier("String"),
                                                [factory.createLiteralTypeNode(factory.createNumericLiteral("64"))]
                                            )
                                        )
                                    ]
                                )
                            ]
                        )
                    )
                )
            );
        }
    }
    if (oneToManySet) {
        const propertySignatures: ts.PropertySignature[] = [];

        for (const entityName in foreignKeySet) {
            const entityNameLc = firstLetterLowerCase(entityName);
            foreignKeySet[entityName].forEach(
                (foreignKey) => {
                    const identifier = `${entityNameLc}$${foreignKey}`;
                    propertySignatures.push(
                        factory.createPropertySignature(
                            undefined,
                            factory.createIdentifier(identifier),
                            factory.createToken(ts.SyntaxKind.QuestionToken),
                            factory.createUnionTypeNode([
                                factory.createTypeReferenceNode(
                                    createForeignRef(entity, entityName, 'CreateOperation'),
                                    undefined
                                ),
                                factory.createTypeReferenceNode(
                                    createForeignRef(entity, entityName, 'UpdateOperation'),
                                    undefined
                                )
                            ])
                        )
                    );
                }
            );
        }
        adNodes.push(
            factory.createTypeLiteralNode(
                propertySignatures
            )
        );
    }
    statements.push(
        factory.createTypeAliasDeclaration(
            undefined,
            undefined,
            factory.createIdentifier("CreateOperationData"),
            undefined,
            factory.createIntersectionTypeNode(adNodes)
        )
    );

    // CreateOperation
    statements.push(
        factory.createTypeAliasDeclaration(
            undefined,
            [factory.createModifier(ts.SyntaxKind.ExportKeyword)],
            factory.createIdentifier("CreateSingleOperation"),
            undefined,
            factory.createTypeReferenceNode(
                factory.createIdentifier("OakOperation"),
                [
                    factory.createLiteralTypeNode(factory.createStringLiteral("create")),
                    factory.createTypeReferenceNode(
                        factory.createIdentifier("CreateOperationData"),
                        undefined
                    )
                ]
            )
        ),
        factory.createTypeAliasDeclaration(
            undefined,
            [factory.createModifier(ts.SyntaxKind.ExportKeyword)],
            factory.createIdentifier("CreateMultipleOperation"),
            undefined,
            factory.createTypeReferenceNode(
                factory.createIdentifier("OakOperation"),
                [
                    factory.createLiteralTypeNode(factory.createStringLiteral("create")),
                    factory.createTypeReferenceNode(
                        factory.createIdentifier("Array"),
                        [factory.createTypeReferenceNode(
                            factory.createIdentifier("CreateOperationData"),
                            undefined
                        )]
                    )
                ]
            )
        ),
        factory.createTypeAliasDeclaration(
            undefined,
            [factory.createModifier(ts.SyntaxKind.ExportKeyword)],
            factory.createIdentifier("CreateOperation"),
            undefined,
            factory.createUnionTypeNode([
                factory.createTypeReferenceNode(
                    factory.createIdentifier("CreateSingleOperation"),
                    undefined
                ),
                factory.createTypeReferenceNode(
                    factory.createIdentifier("CreateMultipleOperation"),
                    undefined
                )
            ])
        )
    );

    // UpdateOperationData
    adNodes = [
        factory.createTypeReferenceNode(
            factory.createIdentifier("Partial"),
            [factory.createTypeReferenceNode(
                factory.createIdentifier("Omit"),
                [
                    factory.createTypeReferenceNode(
                        factory.createIdentifier("OpSchema"),
                        undefined
                    ),
                    manyToOneSet ? factory.createUnionTypeNode(
                        [
                            factory.createLiteralTypeNode(factory.createStringLiteral("id")),
                        ].concat(
                            manyToOneSet.map(ele => factory.createLiteralTypeNode(
                                factory.createStringLiteral(`${ele[1]}Id`))
                            )
                        )
                    ) : factory.createLiteralTypeNode(factory.createStringLiteral("id")),
                ]
            )]
        )
    ];
    if (manyToOneSet) {
        if (ReversePointerRelations[entity]) {
            // 反指对象特殊处理，应当是要么传{ entity, entityId }, 要么直接传反接对象之一
            adNodes.push(
                factory.createUnionTypeNode(
                    [
                        factory.createTypeLiteralNode(
                            [
                                factory.createPropertySignature(
                                    undefined,
                                    factory.createIdentifier('entity'),
                                    factory.createToken(ts.SyntaxKind.QuestionToken),
                                    factory.createUnionTypeNode(
                                        ReversePointerRelations[entity].map(
                                            ele => factory.createLiteralTypeNode(
                                                factory.createStringLiteral(`${firstLetterLowerCase(ele)}`)
                                            )
                                        )
                                    )
                                ),
                                factory.createPropertySignature(
                                    undefined,
                                    factory.createIdentifier('entityId'),
                                    factory.createToken(ts.SyntaxKind.QuestionToken),
                                    factory.createTypeReferenceNode(
                                        factory.createIdentifier("String"),
                                        [factory.createLiteralTypeNode(factory.createNumericLiteral("64"))]
                                    )
                                )
                            ].concat(
                                ReversePointerRelations[entity].map(
                                    (ele) => factory.createPropertySignature(
                                        undefined,
                                        factory.createIdentifier(`${firstLetterLowerCase(ele)}`),
                                        factory.createToken(ts.SyntaxKind.QuestionToken),
                                        factory.createKeywordTypeNode(ts.SyntaxKind.UndefinedKeyword)
                                    )
                                )
                            )
                        ),
                        factory.createParenthesizedType(
                            factory.createIntersectionTypeNode(
                                [
                                    factory.createTypeLiteralNode(
                                        [
                                            factory.createPropertySignature(
                                                undefined,
                                                factory.createIdentifier('entity'),
                                                factory.createToken(ts.SyntaxKind.QuestionToken),
                                                factory.createKeywordTypeNode(ts.SyntaxKind.UndefinedKeyword)
                                            ),
                                            factory.createPropertySignature(
                                                undefined,
                                                factory.createIdentifier('entityId'),
                                                factory.createToken(ts.SyntaxKind.QuestionToken),
                                                factory.createKeywordTypeNode(ts.SyntaxKind.UndefinedKeyword)
                                            )
                                        ]
                                    ),
                                    factory.createTypeReferenceNode(
                                        factory.createIdentifier("OneOf"),
                                        [
                                            factory.createTypeLiteralNode(
                                                ReversePointerRelations[entity].map(
                                                    (ele) => factory.createPropertySignature(
                                                        undefined,
                                                        factory.createIdentifier(`${firstLetterLowerCase(ele)}`),
                                                        undefined,
                                                        factory.createUnionTypeNode([
                                                            factory.createTypeReferenceNode(
                                                                createForeignRef(entity, ele, 'CreateSingleOperation'),
                                                                undefined
                                                            ),
                                                            factory.createTypeReferenceNode(
                                                                factory.createIdentifier("Omit"),
                                                                [
                                                                    factory.createTypeReferenceNode(
                                                                        createForeignRef(entity, ele, 'UpdateOperation'),
                                                                        undefined
                                                                    ),
                                                                    factory.createUnionTypeNode([
                                                                        factory.createLiteralTypeNode(factory.createStringLiteral("id")),
                                                                        factory.createLiteralTypeNode(factory.createStringLiteral("ids")),
                                                                        factory.createLiteralTypeNode(factory.createStringLiteral("filter"))
                                                                    ])
                                                                ]
                                                            )
                                                        ])
                                                    )
                                                )
                                            )
                                        ]
                                    )
                                ]
                            )
                        )
                    ]
                )
            );
        }
        else {
            adNodes.push(
                ...manyToOneSet.map(
                    ([refEntity, attr]) => factory.createParenthesizedType(
                        factory.createUnionTypeNode(
                            [
                                factory.createTypeLiteralNode(
                                    [
                                        factory.createPropertySignature(
                                            undefined,
                                            factory.createIdentifier(attr),
                                            factory.createToken(ts.SyntaxKind.QuestionToken),
                                            factory.createUnionTypeNode([
                                                factory.createTypeReferenceNode(
                                                    createForeignRef(entity, refEntity, 'CreateSingleOperation')
                                                ),
                                                factory.createTypeReferenceNode(
                                                    factory.createIdentifier("Omit"),
                                                    [
                                                        factory.createTypeReferenceNode(
                                                            createForeignRef(entity, refEntity, 'UpdateOperation'),
                                                            undefined
                                                        ),
                                                        factory.createUnionTypeNode([
                                                            factory.createLiteralTypeNode(factory.createStringLiteral("id")),
                                                            factory.createLiteralTypeNode(factory.createStringLiteral("ids")),
                                                            factory.createLiteralTypeNode(factory.createStringLiteral("filter"))
                                                        ])
                                                    ]
                                                ),
                                            ])
                                        ),
                                        factory.createPropertySignature(
                                            undefined,
                                            factory.createIdentifier(`${attr}Id`),
                                            factory.createToken(ts.SyntaxKind.QuestionToken),
                                            factory.createKeywordTypeNode(ts.SyntaxKind.UndefinedKeyword)
                                        )
                                    ]
                                ),
                                factory.createTypeLiteralNode(
                                    [
                                        factory.createPropertySignature(
                                            undefined,
                                            factory.createIdentifier(attr),
                                            factory.createToken(ts.SyntaxKind.QuestionToken),
                                            factory.createKeywordTypeNode(ts.SyntaxKind.UndefinedKeyword)
                                        ),
                                        factory.createPropertySignature(
                                            undefined,
                                            factory.createIdentifier(`${attr}Id`),
                                            factory.createToken(ts.SyntaxKind.QuestionToken),
                                            factory.createTypeReferenceNode(
                                                factory.createIdentifier("String"),
                                                [factory.createLiteralTypeNode(factory.createNumericLiteral("64"))]
                                            )
                                        )
                                    ]
                                )
                            ]
                        )
                    )
                )
            );
        }
    }
    if (oneToManySet) {
        const propertySignatures: ts.PropertySignature[] = [];
        for (const entityName in foreignKeySet) {
            const entityNameLc = firstLetterLowerCase(entityName);
            foreignKeySet[entityName].forEach(
                (foreignKey) => {
                    const identifier = `${entityNameLc}s$${foreignKey}`;
                    propertySignatures.push(
                        factory.createPropertySignature(
                            undefined,
                            factory.createIdentifier(identifier),
                            factory.createToken(ts.SyntaxKind.QuestionToken),
                            factory.createUnionTypeNode([
                                factory.createTypeReferenceNode(
                                    createForeignRef(entity, entityName, 'CreateOperation'),
                                    undefined
                                ),
                                factory.createTypeReferenceNode(
                                    factory.createIdentifier("Omit"),
                                    [
                                        factory.createTypeReferenceNode(
                                            createForeignRef(entity, entityName, 'UpdateOperation'),
                                            undefined
                                        ),
                                        factory.createUnionTypeNode([
                                            factory.createLiteralTypeNode(factory.createStringLiteral("id")),
                                            factory.createLiteralTypeNode(factory.createStringLiteral("ids")),
                                            factory.createLiteralTypeNode(factory.createStringLiteral("filter"))
                                        ])
                                    ]
                                )
                            ])
                        )
                    );
                }
            );
        }
        adNodes.push(
            factory.createTypeLiteralNode(
                propertySignatures
            )
        );
    }
    statements.push(
        factory.createTypeAliasDeclaration(
            undefined,
            undefined,
            factory.createIdentifier("UpdateOperationData"),
            undefined,
            factory.createIntersectionTypeNode(adNodes)
        )
    );

    // UpdateOperation
    statements.push(
        factory.createTypeAliasDeclaration(
            undefined,
            [factory.createModifier(ts.SyntaxKind.ExportKeyword)],
            factory.createIdentifier("UpdateOperation"),
            undefined,
            factory.createTypeReferenceNode(
                factory.createIdentifier("OakOperation"),
                [
                    ActionAsts[entity] ?
                        factory.createUnionTypeNode([
                            factory.createTypeReferenceNode('ParticularAction'),
                            factory.createLiteralTypeNode(factory.createStringLiteral("update"))
                        ]) :
                        factory.createLiteralTypeNode(factory.createStringLiteral("update")),
                    factory.createTypeReferenceNode(
                        factory.createIdentifier("UpdateOperationData"),
                        undefined
                    ),
                    factory.createTypeReferenceNode(
                        factory.createIdentifier("Filter"),
                        undefined
                    )
                ]
            )
        )
    );

    // RemoveOperationData
    adNodes = [
        factory.createTypeLiteralNode([])
    ];
    if (manyToOneSet) {
        if (ReversePointerRelations[entity]) {
            adNodes.push(
                factory.createTypeReferenceNode(
                    'OneOf',
                    [
                        factory.createTypeLiteralNode(
                            ReversePointerRelations[entity].map(
                                (ele) => factory.createPropertySignature(
                                    undefined,
                                    factory.createIdentifier(firstLetterLowerCase(ele)),
                                    factory.createToken(ts.SyntaxKind.QuestionToken),
                                    factory.createTypeReferenceNode(
                                        factory.createIdentifier("Omit"),
                                        [
                                            factory.createUnionTypeNode([
                                                factory.createTypeReferenceNode(
                                                    createForeignRef(entity, ele, 'UpdateOperation'),
                                                    undefined
                                                ),
                                                factory.createTypeReferenceNode(
                                                    createForeignRef(entity, ele, 'RemoveOperation'),
                                                    undefined
                                                )
                                            ]),
                                            factory.createUnionTypeNode([
                                                factory.createLiteralTypeNode(factory.createStringLiteral("id")),
                                                factory.createLiteralTypeNode(factory.createStringLiteral("ids")),
                                                factory.createLiteralTypeNode(factory.createStringLiteral("filter"))
                                            ])
                                        ]
                                    )
                                )
                            )
                        )
                    ]
                )
            )
        }
        else {
            adNodes.push(
                factory.createTypeLiteralNode(
                    manyToOneSet.map(
                        ([refEntity, attr]) => factory.createPropertySignature(
                            undefined,
                            factory.createIdentifier(attr),
                            factory.createToken(ts.SyntaxKind.QuestionToken),
                            factory.createTypeReferenceNode(
                                factory.createIdentifier("Omit"),
                                [
                                    factory.createUnionTypeNode([
                                        factory.createTypeReferenceNode(
                                            createForeignRef(entity, refEntity, 'UpdateOperation'),
                                            undefined
                                        ),
                                        factory.createTypeReferenceNode(
                                            createForeignRef(entity, refEntity, 'RemoveOperation'),
                                            undefined
                                        )
                                    ]),
                                    factory.createUnionTypeNode([
                                        factory.createLiteralTypeNode(factory.createStringLiteral("id")),
                                        factory.createLiteralTypeNode(factory.createStringLiteral("ids")),
                                        factory.createLiteralTypeNode(factory.createStringLiteral("filter"))
                                    ])
                                ]
                            )
                        )
                    )
                )
            );
        }
    }
    if (oneToManySet) {
        const propertySignatures: ts.PropertySignature[] = [];
        for (const entityName in foreignKeySet) {
            const entityNameLc = firstLetterLowerCase(entityName);
            foreignKeySet[entityName].forEach(
                (foreignKey) => {
                    const identifier = `${entityNameLc}s$${foreignKey}`;
                    propertySignatures.push(
                        factory.createPropertySignature(
                            undefined,
                            factory.createIdentifier(identifier),
                            factory.createToken(ts.SyntaxKind.QuestionToken),
                            factory.createTypeReferenceNode(
                                factory.createIdentifier("Omit"),
                                [
                                    factory.createUnionTypeNode([
                                        factory.createTypeReferenceNode(
                                            createForeignRef(entity, entityName, 'UpdateOperation'),
                                            undefined
                                        ),
                                        factory.createTypeReferenceNode(
                                            createForeignRef(entity, entityName, 'RemoveOperation'),
                                            undefined
                                        )
                                    ]),
                                    factory.createUnionTypeNode([
                                        factory.createLiteralTypeNode(factory.createStringLiteral("id")),
                                        factory.createLiteralTypeNode(factory.createStringLiteral("ids")),
                                        factory.createLiteralTypeNode(factory.createStringLiteral("filter"))
                                    ])
                                ]
                            )
                        )
                    );
                }
            );
        }
        adNodes.push(
            factory.createTypeLiteralNode(
                propertySignatures
            )
        );
    }
    statements.push(
        factory.createTypeAliasDeclaration(
            undefined,
            undefined,
            factory.createIdentifier("RemoveOperationData"),
            undefined,
            factory.createIntersectionTypeNode(adNodes)
        )
    );

    // RemoveOperation
    statements.push(
        factory.createTypeAliasDeclaration(
            undefined,
            [factory.createModifier(ts.SyntaxKind.ExportKeyword)],
            factory.createIdentifier("RemoveOperation"),
            undefined,
            factory.createTypeReferenceNode(
                factory.createIdentifier("OakOperation"),
                [
                    factory.createLiteralTypeNode(factory.createStringLiteral("remove")),
                    factory.createTypeReferenceNode(
                        factory.createIdentifier("RemoveOperationData"),
                        undefined
                    ),
                    factory.createTypeReferenceNode(
                        factory.createIdentifier("Filter"),
                        undefined
                    )
                ]
            )
        )
    );

    statements.push(
        factory.createTypeAliasDeclaration(
            undefined,
            [factory.createModifier(ts.SyntaxKind.ExportKeyword)],
            factory.createIdentifier("Operation"),
            undefined,
            factory.createUnionTypeNode([
                factory.createTypeReferenceNode(
                    factory.createIdentifier("CreateOperation"),
                    undefined
                ),
                factory.createTypeReferenceNode(
                    factory.createIdentifier("UpdateOperation"),
                    undefined
                ),
                factory.createTypeReferenceNode(
                    factory.createIdentifier("RemoveOperation"),
                    undefined
                ),
                factory.createTypeReferenceNode(
                    factory.createIdentifier("SelectOperation"),
                    undefined
                )
            ])
        )
    );
}

const initialStatements = () => [
    // import { String, Text, Int, SpecificKey } from 'oak-domain/types/DataType';
    factory.createImportDeclaration(
        undefined,
        undefined,
        factory.createImportClause(
            false,
            undefined,
            factory.createNamedImports(
                [
                    factory.createImportSpecifier(
                        false,
                        undefined,
                        factory.createIdentifier('String')
                    ),
                    factory.createImportSpecifier(
                        false,
                        undefined,
                        factory.createIdentifier('Int')
                    ),
                    factory.createImportSpecifier(
                        false,
                        undefined,
                        factory.createIdentifier('Float')
                    ),
                    factory.createImportSpecifier(
                        false,
                        undefined,
                        factory.createIdentifier('Double')
                    ),
                    factory.createImportSpecifier(
                        false,
                        undefined,
                        factory.createIdentifier('Boolean')
                    ),
                    factory.createImportSpecifier(
                        false,
                        undefined,
                        factory.createIdentifier('Text')
                    ),
                    factory.createImportSpecifier(
                        false,
                        undefined,
                        factory.createIdentifier('Datetime')
                    ),
                    factory.createImportSpecifier(
                        false,
                        undefined,
                        factory.createIdentifier('File')
                    ),
                    factory.createImportSpecifier(
                        false,
                        undefined,
                        factory.createIdentifier('Image')
                    ),
                    factory.createImportSpecifier(
                        false,
                        undefined,
                        factory.createIdentifier('PrimaryKey')
                    ),
                    factory.createImportSpecifier(
                        false,
                        undefined,
                        factory.createIdentifier('ForeignKey')
                    ),
                ]
            )
        ),
        factory.createStringLiteral(`${TYPE_PATH_IN_OAK_DOMAIN(2)}DataType`)
    ),

    /* import {
        Q_DateValue, Q_LogicKey, Q_NumberValue, FnCallKey, FnCallValue,
        Q_StringValue, Q_FullTextKey, Q_FullTextValue, FnCallValueAs,
        Q_BooleanValue,
    } from 'oak-domain/types/Demand'; */
    factory.createImportDeclaration(
        undefined,
        undefined,
        factory.createImportClause(
            false,
            undefined,
            factory.createNamedImports(
                [
                    factory.createImportSpecifier(
                        false,
                        undefined,
                        factory.createIdentifier('Q_DateValue')
                    ),
                    factory.createImportSpecifier(
                        false,
                        undefined,
                        factory.createIdentifier('Q_BooleanValue')
                    ),
                    factory.createImportSpecifier(
                        false,
                        undefined,
                        factory.createIdentifier('Q_NumberValue')
                    ),
                    factory.createImportSpecifier(
                        false,
                        undefined,
                        factory.createIdentifier('Q_StringValue')
                    ),
                    factory.createImportSpecifier(
                        false,
                        undefined,
                        factory.createIdentifier('Q_EnumValue')
                    ),
                    factory.createImportSpecifier(
                        false,
                        undefined,
                        factory.createIdentifier('NodeId')
                    ),
                    factory.createImportSpecifier(
                        false,
                        undefined,
                        factory.createIdentifier('MakeFilter')
                    ),
                    factory.createImportSpecifier(
                        false,
                        undefined,
                        factory.createIdentifier('FulltextFilter')
                    ),
                    factory.createImportSpecifier(
                        false,
                        undefined,
                        factory.createIdentifier('ExprOp')
                    ),
                    factory.createImportSpecifier(
                        false,
                        undefined,
                        factory.createIdentifier('ExpressionKey')
                    ),
                ]
            )
        ),
        factory.createStringLiteral(`${TYPE_PATH_IN_OAK_DOMAIN(2)}Demand`)
    ),
    factory.createImportDeclaration(
        undefined,
        undefined,
        factory.createImportClause(
            false,
            undefined,
            factory.createNamedImports([
                factory.createImportSpecifier(
                    false,
                    undefined,
                    factory.createIdentifier("OneOf")
                ),
                factory.createImportSpecifier(
                    false,
                    undefined,
                    factory.createIdentifier("ValueOf")
                )
            ])
        ),
        factory.createStringLiteral(`${TYPE_PATH_IN_OAK_DOMAIN(2)}Polyfill`)
    ),
    // import * as SubQuery from '../_SubQuery';
    factory.createImportDeclaration(
        undefined,
        undefined,
        factory.createImportClause(
            false,
            undefined,
            factory.createNamespaceImport(factory.createIdentifier("SubQuery"))
        ),
        factory.createStringLiteral("../_SubQuery")
    ),
    // import { Filter as OakFilter } from 'oak-domain/src/types/Entity';
    factory.createImportDeclaration(
        undefined,
        undefined,
        factory.createImportClause(
            false,
            undefined,
            factory.createNamedImports([
                factory.createImportSpecifier(
                    false,
                    factory.createIdentifier("Operation"),
                    factory.createIdentifier("OakOperation")
                )
            ])
        ),
        factory.createStringLiteral(`${TYPE_PATH_IN_OAK_DOMAIN(2)}Entity`),
        undefined
    )
];

function outputSubQuery(outputDir: string, printer: ts.Printer) {
    const statements: ts.Statement[] = [];
    for (const entity in Schema) {
        // import * as User from '../User/Schema';
        statements.push(
            factory.createImportDeclaration(
                undefined,
                undefined,
                factory.createImportClause(
                    false,
                    undefined,
                    factory.createNamespaceImport(factory.createIdentifier(entity))
                ),
                factory.createStringLiteral(`./${entity}/Schema`)
            )
        );
    }
    const entities = keys(Schema);

    // 每个有manyToOne的Entity都会输出${One}IdSubQuery
    for (const one in Schema) {
        const identifier = `${one}IdSubQuery`;
        const fromEntites = OneToMany[one] ? uniq(OneToMany[one]
            .filter(
                ([e, f]) => f !== 'entity'
            ).map(
                ([e]) => e
            )) : [];
        fromEntites.push(one);
        statements.push(
            factory.createTypeAliasDeclaration(
                undefined,
                [factory.createModifier(ts.SyntaxKind.ExportKeyword)],
                factory.createIdentifier(identifier),
                undefined,
                factory.createMappedTypeNode(
                    undefined,
                    factory.createTypeParameterDeclaration(
                        factory.createIdentifier("K"),
                        factory.createUnionTypeNode([
                            factory.createLiteralTypeNode(factory.createStringLiteral("$in")),
                            factory.createLiteralTypeNode(factory.createStringLiteral("$nin"))
                        ]),
                        undefined
                    ),
                    undefined,
                    factory.createToken(ts.SyntaxKind.QuestionToken),
                    factory.createUnionTypeNode(
                        fromEntites.map(
                            ele => factory.createIntersectionTypeNode(
                                [
                                    factory.createTypeReferenceNode(
                                        factory.createQualifiedName(
                                            factory.createIdentifier(ele),
                                            factory.createIdentifier(identifier)
                                        ),
                                        undefined
                                    ),
                                    factory.createTypeLiteralNode([factory.createPropertySignature(
                                        undefined,
                                        factory.createIdentifier("entity"),
                                        undefined,
                                        factory.createLiteralTypeNode(factory.createStringLiteral(firstLetterLowerCase(ele)))
                                    )])
                                ]
                            )
                        )
                    ),
                    undefined
                )

            )
        );
    }

    const resultFile = ts.createSourceFile("someFileName.ts", "", ts.ScriptTarget.Latest, /*setParentNodes*/ false, ts.ScriptKind.TS);
    const result = printer.printNode(
        ts.EmitHint.Unspecified,
        factory.createSourceFile(statements, factory.createToken(ts.SyntaxKind.EndOfFileToken),
            ts.NodeFlags.None),
        resultFile
    );

    const fileName = path.join(outputDir, '_SubQuery.ts');
    writeFileSync(fileName, result, { flag: 'w' });
}

function outputEntityDict(outputDir: string, printer: ts.Printer) {
    const statements: ts.Statement[] = [];
    const propertySignatures: ts.PropertySignature[] = [];
    for (const entity in Schema) {
        // import * as User from '../User/Schema';
        statements.push(
            factory.createImportDeclaration(
                undefined,
                undefined,
                factory.createImportClause(
                    false,
                    undefined,
                    factory.createNamedImports([factory.createImportSpecifier(
                        false,
                        factory.createIdentifier("EntityDef"),
                        factory.createIdentifier(entity)
                    )])
                ),
                factory.createStringLiteral(`./${entity}/Schema`)
            )
        );

        const entityLc = firstLetterLowerCase(entity);
        propertySignatures.push(
            factory.createPropertySignature(
                undefined,
                factory.createIdentifier(entityLc),
                undefined,
                factory.createTypeReferenceNode(entity)
            )
        );
    }

    if (/* process.env.TARGET_IN_OAK_DOMAIN */false) {
        statements.push(
            factory.createImportDeclaration(
                undefined,
                undefined,
                factory.createImportClause(
                    false,
                    undefined,
                    factory.createNamedImports([factory.createImportSpecifier(
                        false,
                        undefined,
                        factory.createIdentifier("EntityDef")
                    )])
                ),
                factory.createStringLiteral("../types/Entity"),
                undefined
            ),
            factory.createTypeAliasDeclaration(
                undefined,
                [factory.createModifier(ts.SyntaxKind.ExportKeyword)],
                factory.createIdentifier("EntityDict"),
                undefined,
                factory.createIntersectionTypeNode([
                    factory.createTypeLiteralNode(
                        propertySignatures
                    ),
                    factory.createTypeLiteralNode([
                        factory.createIndexSignature(
                            undefined,
                            undefined,
                            [factory.createParameterDeclaration(
                                undefined,
                                undefined,
                                undefined,
                                factory.createIdentifier("E"),
                                undefined,
                                factory.createKeywordTypeNode(ts.SyntaxKind.StringKeyword),
                                undefined
                            )],
                            factory.createTypeReferenceNode(
                                factory.createIdentifier("EntityDef"),
                                undefined
                            )
                        )
                    ])
                ])
            )
        );
    }
    else {
        statements.push(
            factory.createTypeAliasDeclaration(
                undefined,
                [factory.createModifier(ts.SyntaxKind.ExportKeyword)],
                factory.createIdentifier("EntityDict"),
                undefined,
                factory.createTypeLiteralNode(
                    propertySignatures
                )
            )
        );
    }

    const resultFile = ts.createSourceFile("someFileName.ts", "", ts.ScriptTarget.Latest, /*setParentNodes*/ false, ts.ScriptKind.TS);
    const result = printer.printNode(
        ts.EmitHint.Unspecified,
        factory.createSourceFile(statements, factory.createToken(ts.SyntaxKind.EndOfFileToken),
            ts.NodeFlags.None),
        resultFile
    );

    const fileName = path.join(outputDir, 'EntityDict.ts');
    writeFileSync(fileName, result, { flag: 'w' });
}

function outputSchema(outputDir: string, printer: ts.Printer) {
    for (const entity in Schema) {
        const statements: ts.Statement[] = initialStatements();
        // const { schemaAttrs } = Schema[entity];
        if (ActionAsts[entity]) {
            const importedSourceDict: {
                [k: string]: string[];
            } = {};
            const { importedFrom } = ActionAsts[entity];
            for (const a in importedFrom) {
                assert(a.endsWith('Action'));
                const s = a.slice(0, a.length - 6).concat('State');
                let source;
                if (importedFrom[a] === 'local') {
                    source = './Action';
                }
                else {
                    source = importedFrom[a];
                }
                if (importedSourceDict.hasOwnProperty(source)) {
                    importedSourceDict[source].push(s);
                }
                else {
                    assign(importedSourceDict, {
                        [source]: [s],
                    });
                }
            }
            let importParticularAction = false;
            for (const source in importedSourceDict) {
                const namedImports = importedSourceDict[source].map(
                    s => factory.createImportSpecifier(
                        false,
                        undefined,
                        factory.createIdentifier(s)
                    )
                );
                if (source === './Action') {
                    namedImports.push(
                        factory.createImportSpecifier(
                            false,
                            undefined,
                            factory.createIdentifier('ParticularAction')
                        ),
                        factory.createImportSpecifier(
                            false,
                            undefined,
                            factory.createIdentifier('Action')
                        )
                    );
                    importParticularAction = true;
                }
                statements.push(
                    factory.createImportDeclaration(
                        undefined,
                        undefined,
                        factory.createImportClause(
                            false,
                            undefined,
                            factory.createNamedImports(namedImports)
                        ),
                        factory.createStringLiteral(source),
                        undefined
                    )
                );
            }
            if (!importParticularAction) {
                statements.push(
                    factory.createImportDeclaration(
                        undefined,
                        undefined,
                        factory.createImportClause(
                            false,
                            undefined,
                            factory.createNamedImports(
                                [
                                    factory.createImportSpecifier(
                                        false,
                                        undefined,
                                        factory.createIdentifier('ParticularAction')
                                    ),
                                    factory.createImportSpecifier(
                                        false,
                                        undefined,
                                        factory.createIdentifier('Action')
                                    )
                                ]
                            )
                        ),
                        factory.createStringLiteral('./Action'),
                        undefined
                    )
                )
            }
        }
        else {
            statements.push(
                factory.createImportDeclaration(
                    undefined,
                    undefined,
                    factory.createImportClause(
                        false,
                        undefined,
                        factory.createNamedImports([factory.createImportSpecifier(
                            false,
                            undefined,
                            factory.createIdentifier("GenericAction")
                        )])
                    ),
                    factory.createStringLiteral(ACTION_CONSTANT_IN_OAK_DOMAIN(2)),
                    undefined
                )
            );
        }

        constructSchema(statements, entity);
        constructFilter(statements, entity);
        constructProjection(statements, entity);
        constructSorter(statements, entity);
        constructActions(statements, entity);
        constructQuery(statements, entity);
        constructFullAttrs(statements, entity);
        const EntityDefAttrs = [
            factory.createPropertySignature(
                undefined,
                factory.createIdentifier("Schema"),
                undefined,
                factory.createTypeReferenceNode(
                    factory.createIdentifier("Schema"),
                    undefined
                )
            ),
            factory.createPropertySignature(
                undefined,
                factory.createIdentifier("OpSchema"),
                undefined,
                factory.createTypeReferenceNode(
                    factory.createIdentifier("OpSchema"),
                    undefined
                )
            ),
            factory.createPropertySignature(
                undefined,
                factory.createIdentifier("Action"),
                undefined,
                factory.createTypeReferenceNode(
                    factory.createIdentifier(ActionAsts[entity] ? 'Action' : 'GenericAction'),
                    undefined
                )
            ),
            factory.createPropertySignature(
                undefined,
                factory.createIdentifier("Selection"),
                undefined,
                factory.createTypeReferenceNode(
                    factory.createIdentifier("Selection"),
                    undefined
                )
            ),
            factory.createPropertySignature(
                undefined,
                factory.createIdentifier("Operation"),
                undefined,
                factory.createTypeReferenceNode(
                    factory.createIdentifier("Operation"),
                    undefined
                )
            ),
        ];
        if (ActionAsts[entity]) {
            EntityDefAttrs.push(
                factory.createPropertySignature(
                    undefined,
                    factory.createIdentifier("ParticularAction"),
                    undefined,
                    factory.createTypeReferenceNode(
                        factory.createIdentifier('ParticularAction'),
                        undefined
                    )
                )
            );
        }
        statements.push(
            factory.createTypeAliasDeclaration(
                undefined,
                [factory.createModifier(ts.SyntaxKind.ExportKeyword)],
                factory.createIdentifier("EntityDef"),
                undefined,
                factory.createTypeLiteralNode(EntityDefAttrs)
            )
        )

        const result = printer.printList(ts.ListFormat.SourceFileStatements, factory.createNodeArray(statements), Schema[entity].sourceFile);
        const fileName = path.join(outputDir, entity, 'Schema.ts');
        writeFileSync(fileName, result, { flag: 'w' });
    }
}

function outputAction(outputDir: string, printer: ts.Printer) {
    for (const entity in ActionAsts) {
        const { sourceFile, statements, importedFrom } = ActionAsts[entity];
        const importStatements: ts.Statement[] = [];
        for (const k in importedFrom) {
            assert(k.endsWith('Action'));
            if (importedFrom[k] !== 'local') {
                importStatements.push(
                    factory.createImportDeclaration(
                        undefined,
                        undefined,
                        factory.createImportClause(
                            false,
                            undefined,
                            factory.createNamedImports([
                                factory.createImportSpecifier(
                                    false,
                                    undefined,
                                    factory.createIdentifier(k)
                                )
                            ])
                        ),
                        factory.createStringLiteral(importedFrom[k]),
                        undefined
                    )
                );
            }
        }
        /*  const result = printer.printNode(
             ts.EmitHint.Unspecified,
             factory.createSourceFile(statements,
                 factory.createToken(ts.SyntaxKind.EndOfFileToken),
                 ts.NodeFlags.None),
             sourceFile
         ); */
        // 这里如果用printNode，stringLiteral的输出始终有个bug不知道如何处理
        const result = printer.printList(
            ts.ListFormat.SourceFileStatements,
            factory.createNodeArray(importStatements.concat(statements)),
            sourceFile);
        const filename = path.join(outputDir, entity, 'Action.ts');
        writeFileSync(filename, result, { flag: 'w' });
    }
}

function constructAttributes(entity: string): ts.PropertyAssignment[] {
    const { schemaAttrs } = Schema[entity];
    const { [entity]: manyToOneSet } = ManyToOne;
    const result: ts.PropertyAssignment[] = [];

    schemaAttrs.forEach(
        (attr) => {
            const attrAssignments: ts.PropertyAssignment[] = [];
            const { name, type } = attr;
            let name2 = name;

            if (ts.isTypeReferenceNode(type!)) {
                const { typeName, typeArguments } = type;
                if (ts.isIdentifier(typeName)) {
                    const { text } = typeName;
                    switch (text) {
                        case 'String': {
                            attrAssignments.push(
                                factory.createPropertyAssignment(
                                    factory.createIdentifier("type"),
                                    factory.createStringLiteral("varchar")
                                ),
                                factory.createPropertyAssignment(
                                    factory.createIdentifier("params"),
                                    factory.createObjectLiteralExpression(
                                        [
                                            factory.createPropertyAssignment(
                                                factory.createIdentifier("width"),
                                                factory.createNumericLiteral(
                                                    (<ts.NumericLiteral>(<ts.LiteralTypeNode>typeArguments![0]).literal).text
                                                )
                                            ),
                                        ],
                                        true
                                    )
                                )
                            );
                            break;
                        }
                        case 'Text':
                        case 'Image':
                        case 'File': {
                            attrAssignments.push(
                                factory.createPropertyAssignment(
                                    factory.createIdentifier("type"),
                                    factory.createStringLiteral("text")
                                ),
                            );
                            break;
                        }
                        case 'Int':
                        case 'Uint': {
                            attrAssignments.push(
                                factory.createPropertyAssignment(
                                    factory.createIdentifier("type"),
                                    factory.createStringLiteral("int")
                                ),
                                factory.createPropertyAssignment(
                                    factory.createIdentifier("params"),
                                    factory.createObjectLiteralExpression(
                                        [
                                            factory.createPropertyAssignment(
                                                factory.createIdentifier("width"),
                                                factory.createNumericLiteral(
                                                    (<ts.NumericLiteral>(<ts.LiteralTypeNode>typeArguments![0]).literal).text
                                                )
                                            ),
                                            factory.createPropertyAssignment(
                                                factory.createIdentifier("signed"),
                                                text === 'Uint' ? factory.createFalse() : factory.createTrue()
                                            )
                                        ],
                                        true
                                    )
                                )
                            );
                            break;
                        }
                        case 'Float': {
                            attrAssignments.push(
                                factory.createPropertyAssignment(
                                    factory.createIdentifier("type"),
                                    factory.createStringLiteral("float")
                                ),
                                factory.createPropertyAssignment(
                                    factory.createIdentifier("params"),
                                    factory.createObjectLiteralExpression(
                                        [
                                            factory.createPropertyAssignment(
                                                factory.createIdentifier("precision"),
                                                factory.createNumericLiteral(
                                                    (<ts.NumericLiteral>(<ts.LiteralTypeNode>typeArguments![0]).literal).text
                                                )
                                            ),
                                            factory.createPropertyAssignment(
                                                factory.createIdentifier("scale"),
                                                factory.createNumericLiteral(
                                                    (<ts.NumericLiteral>(<ts.LiteralTypeNode>typeArguments![1]).literal).text
                                                )
                                            )
                                        ],
                                        true
                                    )
                                )
                            );
                            break;
                        }
                        case 'Double': {
                            attrAssignments.push(
                                factory.createPropertyAssignment(
                                    factory.createIdentifier("type"),
                                    factory.createStringLiteral("double")
                                ),
                                factory.createPropertyAssignment(
                                    factory.createIdentifier("params"),
                                    factory.createObjectLiteralExpression(
                                        [
                                            factory.createPropertyAssignment(
                                                factory.createIdentifier("precision"),
                                                factory.createNumericLiteral(
                                                    (<ts.NumericLiteral>(<ts.LiteralTypeNode>typeArguments![0]).literal).text
                                                )
                                            ),
                                            factory.createPropertyAssignment(
                                                factory.createIdentifier("scale"),
                                                factory.createNumericLiteral(
                                                    (<ts.NumericLiteral>(<ts.LiteralTypeNode>typeArguments![1]).literal).text
                                                )
                                            )
                                        ],
                                        true
                                    )
                                )
                            );
                            break;
                        }
                        case 'Boolean': {
                            attrAssignments.push(
                                factory.createPropertyAssignment(
                                    factory.createIdentifier("type"),
                                    factory.createStringLiteral("boolean")
                                )
                            );
                            break;
                        }
                        case 'Datetime': {
                            attrAssignments.push(
                                factory.createPropertyAssignment(
                                    factory.createIdentifier("type"),
                                    factory.createStringLiteral("datetime")
                                ),
                            );
                            break;
                        }
                        case 'Object': {
                            // object类型暂不支持查询
                            attrAssignments.push(
                                factory.createPropertyAssignment(
                                    factory.createIdentifier("type"),
                                    factory.createStringLiteral("object")
                                ),
                            );
                            break;
                        }
                        default: {
                            const text2 = text === 'Schema' ? entity : text;
                            const manyToOneItem = manyToOneSet && manyToOneSet.find(
                                ([refEntity, attrName]) => refEntity === text2 && attrName === attrName
                            );
                            if (manyToOneItem) {
                                // 外键
                                name2 = factory.createIdentifier(`${(<ts.Identifier>name).text}Id`);
                                attrAssignments.push(
                                    factory.createPropertyAssignment(
                                        factory.createIdentifier("type"),
                                        factory.createStringLiteral("ref")
                                    ),
                                    factory.createPropertyAssignment(
                                        factory.createIdentifier("ref"),
                                        factory.createStringLiteral(firstLetterLowerCase(text2))
                                    )
                                );
                            }
                            else {
                                assert(text.endsWith('State'));
                                attrAssignments.push(
                                    factory.createPropertyAssignment(
                                        factory.createIdentifier("type"),
                                        factory.createStringLiteral("varchar")
                                    ),
                                    factory.createPropertyAssignment(
                                        factory.createIdentifier("params"),
                                        factory.createObjectLiteralExpression(
                                            [factory.createPropertyAssignment(
                                                factory.createIdentifier("length"),
                                                factory.createNumericLiteral(STRING_LITERAL_MAX_LENGTH)
                                            )],
                                            true
                                        )
                                    )
                                );
                            }
                        }
                    }
                }
                else {
                    assert(false);
                }
            }
            else {
                if (ts.isUnionTypeNode(type!)) {
                    assert(ts.isLiteralTypeNode(type.types[0]));
                    if (ts.isStringLiteral(type.types[0].literal)) {
                        attrAssignments.push(
                            factory.createPropertyAssignment(
                                factory.createIdentifier("type"),
                                factory.createStringLiteral("varchar")
                            ),
                            factory.createPropertyAssignment(
                                factory.createIdentifier("params"),
                                factory.createObjectLiteralExpression(
                                    [factory.createPropertyAssignment(
                                        factory.createIdentifier("length"),
                                        factory.createNumericLiteral(STRING_LITERAL_MAX_LENGTH)
                                    )],
                                    true
                                )
                            )
                        );
                    }
                    else {
                        assert(ts.isNumericLiteral(type.types[0].literal));
                        attrAssignments.push(
                            factory.createPropertyAssignment(
                                factory.createIdentifier("type"),
                                factory.createStringLiteral("int")
                            ),
                            factory.createPropertyAssignment(
                                factory.createIdentifier("params"),
                                factory.createObjectLiteralExpression(
                                    [
                                        factory.createPropertyAssignment(
                                            factory.createIdentifier("precision"),
                                            factory.createNumericLiteral(NUMERICAL_LITERL_DEFAULT_PRECISION)
                                        ),
                                        factory.createPropertyAssignment(
                                            factory.createIdentifier("scale"),
                                            factory.createNumericLiteral(NUMERICAL_LITERL_DEFAULT_SCALE)
                                        )
                                    ],
                                    true
                                )
                            )
                        );
                    }
                }
                else {
                    assert(ts.isLiteralTypeNode(type!), `${entity}中的属性${(<ts.Identifier>name).text}有非法的属性类型定义`);
                    if (ts.isStringLiteral(type.literal)) {
                        attrAssignments.push(
                            factory.createPropertyAssignment(
                                factory.createIdentifier("type"),
                                factory.createStringLiteral("varchar")
                            ),
                            factory.createPropertyAssignment(
                                factory.createIdentifier("params"),
                                factory.createObjectLiteralExpression(
                                    [factory.createPropertyAssignment(
                                        factory.createIdentifier("length"),
                                        factory.createNumericLiteral(STRING_LITERAL_MAX_LENGTH)
                                    )],
                                    true
                                )
                            )
                        );
                    }
                    else {
                        assert(ts.isNumericLiteral(type.literal));
                        attrAssignments.push(
                            factory.createPropertyAssignment(
                                factory.createIdentifier("type"),
                                factory.createStringLiteral("precision")
                            ),
                            factory.createPropertyAssignment(
                                factory.createIdentifier("params"),
                                factory.createObjectLiteralExpression(
                                    [
                                        factory.createPropertyAssignment(
                                            factory.createIdentifier("precision"),
                                            factory.createNumericLiteral(NUMERICAL_LITERL_DEFAULT_PRECISION)
                                        ),
                                        factory.createPropertyAssignment(
                                            factory.createIdentifier("scale"),
                                            factory.createNumericLiteral(NUMERICAL_LITERL_DEFAULT_SCALE)
                                        )
                                    ],
                                    true
                                )
                            )
                        );
                    }
                }
            }

            result.push(
                factory.createPropertyAssignment(
                    name2,
                    factory.createObjectLiteralExpression(attrAssignments, true)
                )
            );
        }
    );

    return result;
}

function outputStorage(outputDir: string, printer: ts.Printer) {
    const importStatements: ts.Statement[] = [
        factory.createImportDeclaration(
            undefined,
            undefined,
            factory.createImportClause(
                false,
                undefined,
                factory.createNamedImports([factory.createImportSpecifier(
                    false,
                    undefined,
                    factory.createIdentifier("StorageSchema")
                )])
            ),
            factory.createStringLiteral(`${TYPE_PATH_IN_OAK_DOMAIN(1)}Storage`),
            undefined
        ),
        factory.createImportDeclaration(
            undefined,
            undefined,
            factory.createImportClause(
                false,
                undefined,
                factory.createNamedImports([factory.createImportSpecifier(
                    false,
                    undefined,
                    factory.createIdentifier("EntityDict")
                )])
            ),
            factory.createStringLiteral("./EntityDict"),
            undefined
        )
    ];
    const entityAssignments: ts.PropertyAssignment[] = [];

    for (const entity in Schema) {
        const indexExpressions: ts.Expression[] = [];
        const { sourceFile, fulltextIndex, indexes } = Schema[entity];
        const statements: ts.Statement[] = [
            factory.createImportDeclaration(
                undefined,
                undefined,
                factory.createImportClause(
                    false,
                    undefined,
                    factory.createNamedImports([factory.createImportSpecifier(
                        false,
                        undefined,
                        factory.createIdentifier("StorageDesc")
                    )])
                ),
                factory.createStringLiteral(`${TYPE_PATH_IN_OAK_DOMAIN(2)}Storage`),
                undefined
            ),
            factory.createImportDeclaration(
                undefined,
                undefined,
                factory.createImportClause(
                    false,
                    undefined,
                    factory.createNamedImports([factory.createImportSpecifier(
                        false,
                        undefined,
                        factory.createIdentifier("OpSchema")
                    )])
                ),
                factory.createStringLiteral("./Schema"),
                undefined
            )
        ];

        const propertyAssignments: ts.PropertyAssignment[] = [];
        const attributes = constructAttributes(entity);
        propertyAssignments.push(
            factory.createPropertyAssignment(
                factory.createIdentifier("attributes"),
                factory.createObjectLiteralExpression(
                    attributes,
                    true
                )
            )
        );

        if (indexes) {
            indexExpressions.push(
                ...indexes.elements
            )
        }

        if (indexExpressions.length > 0) {
            propertyAssignments.push(
                factory.createPropertyAssignment(
                    factory.createIdentifier("indexes"),
                    factory.createArrayLiteralExpression(indexExpressions, true)
                )
            );
        }
        statements.push(
            factory.createVariableStatement(
                [factory.createModifier(ts.SyntaxKind.ExportKeyword)],
                factory.createVariableDeclarationList(
                    [factory.createVariableDeclaration(
                        factory.createIdentifier("desc"),
                        undefined,
                        factory.createTypeReferenceNode(
                            factory.createIdentifier("StorageDesc"),
                            [
                                factory.createTypeReferenceNode(
                                    factory.createIdentifier("OpSchema"),
                                    undefined
                                )
                            ]
                        ),
                        factory.createObjectLiteralExpression(
                            propertyAssignments,
                            true
                        )
                    )],
                    ts.NodeFlags.Const
                )
            )
        );

        const result = printer.printList(
            ts.ListFormat.SourceFileStatements,
            factory.createNodeArray(statements),
            sourceFile);
        const filename = path.join(outputDir, entity, 'Storage.ts');
        writeFileSync(filename, result, { flag: 'w' });

        importStatements.push(
            factory.createImportDeclaration(
                undefined,
                undefined,
                factory.createImportClause(
                    false,
                    undefined,
                    factory.createNamedImports([
                        factory.createImportSpecifier(
                            false,
                            factory.createIdentifier("desc"),
                            factory.createIdentifier(`${firstLetterLowerCase(entity)}Desc`)
                        )
                    ])
                ),
                factory.createStringLiteral(`./${entity}/Storage`),
                undefined
            )
        );
        entityAssignments.push(
            factory.createPropertyAssignment(
                firstLetterLowerCase(entity),
                factory.createIdentifier(`${firstLetterLowerCase(entity)}Desc`)
            )
        );
    }

    importStatements.push(
        factory.createVariableStatement(
            [factory.createModifier(ts.SyntaxKind.ExportKeyword)],
            factory.createVariableDeclarationList(
                [factory.createVariableDeclaration(
                    factory.createIdentifier("storageSchema"),
                    undefined,
                    factory.createTypeReferenceNode(
                        factory.createIdentifier("StorageSchema"),
                        [
                            factory.createTypeReferenceNode('EntityDict')
                        ]
                    ),
                    factory.createObjectLiteralExpression(
                        entityAssignments,
                        true
                    )
                )],
                ts.NodeFlags.Const
            )
        )
    );

    const result = printer.printList(
        ts.ListFormat.SourceFileStatements,
        factory.createNodeArray(importStatements),
        ts.createSourceFile("someFileName.ts", "", ts.ScriptTarget.Latest, /*setParentNodes*/ false, ts.ScriptKind.TS));
    const filename = path.join(outputDir, 'Storage.ts');
    writeFileSync(filename, result, { flag: 'w' });
}

function resetOutputDir(outputDir: string) {
    emptydirSync(outputDir);

    for (const moduleName in Schema) {
        mkdirSync(`${outputDir}/${moduleName}`);
    }
}

function addReverseRelationship() {
    for (const reverseEntity in ReversePointerRelations) {
        if (!ReversePointerEntities.hasOwnProperty(reverseEntity)) {
            throw new Error(`「${reverseEntity}」被引用为一个反指对象，但其定义中的entity和entityId不符合要求`);
        }
        for (const one of ReversePointerRelations[reverseEntity]) {
            addRelationship(reverseEntity, one, 'entity');
        }
    }
}

function outputPackageJson(outputDir: string) {
    const pj = {
        "name": "oak-app-domain",
        "main": "index.ts"
    };

    const indexTs = `export * from './EntityDict';
    export * from './Storage';
    `;
    let filename = path.join(outputDir, 'index.ts');
    writeFileSync(filename, indexTs, { flag: 'w' });


    filename = path.join(outputDir, 'package.json');
    writeFileSync(filename, JSON.stringify(pj), { flag: 'w' });

    // 执行npm link
    try {
        execSync('npm link', {
            cwd: outputDir,
        });
    }
    catch (err) {
        console.error(err);
    }
}

export function analyzeEntities(inputDir: string) {
    const files = readdirSync(inputDir);
    const fullFilenames = files.map(
        ele => {
            const entity = ele.slice(0, ele.indexOf('.'))
            if (RESERVED_ENTITIES.includes(entity)) {
                throw new Error(`${ele}是系统保留字，请勿使用其当对象名`);
            }
            return `${inputDir}/${ele}`;
        }
    );

    const program = ts.createProgram(fullFilenames, { allowJs: true });

    files.forEach(
        (filename) => {
            if (process.env.COMPILING_BASE_DOMAIN) {
                EntitiesInOakDomain.push(filename.split('.')[0]);
            }
            analyzeEntity(filename, inputDir, program);
        }
    );
}

export function buildSchema(outputDir: string): void {
    addReverseRelationship();
    const printer = ts.createPrinter({ newLine: ts.NewLineKind.LineFeed });
    resetOutputDir(outputDir);
    outputSchema(outputDir, printer);
    outputSubQuery(outputDir, printer);
    outputAction(outputDir, printer);
    outputEntityDict(outputDir, printer);
    outputStorage(outputDir, printer);

    if (!process.env.TARGET_IN_OAK_DOMAIN) {
        outputPackageJson(outputDir);
    }
}
