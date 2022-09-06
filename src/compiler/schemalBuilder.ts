import path from 'path';
import assert from 'assert';
import { execSync } from 'child_process';
import { writeFileSync, readdirSync, mkdirSync, fstat } from 'fs';
import { emptydirSync } from 'fs-extra';
import { assign, cloneDeep, difference, identity, intersection, keys, uniq, uniqBy } from 'lodash';
import * as ts from 'typescript';
const { factory } = ts;
import {
    ENTITY_PATH_IN_OAK_GENERAL_BUSINESS,
    ACTION_CONSTANT_IN_OAK_DOMAIN,
    TYPE_PATH_IN_OAK_DOMAIN,
    RESERVED_ENTITIES,
    STRING_LITERAL_MAX_LENGTH,
    ENTITY_PATH_IN_OAK_DOMAIN,
    NUMERICAL_LITERL_DEFAULT_PRECISION,
    NUMERICAL_LITERL_DEFAULT_SCALE,
    INT_LITERL_DEFAULT_WIDTH,
} from './env';
import { firstLetterLowerCase, firstLetterUpperCase } from '../utils/string';

const Schema: Record<string, {
    schemaAttrs: Array<ts.PropertySignature>;
    fulltextIndex?: true;
    indexes?: ts.ArrayLiteralExpression;
    states: string[];
    sourceFile: ts.SourceFile;
    locale: ts.ObjectLiteralExpression;
    toModi: boolean;
    actionType: string;
    static: boolean;
    inModi: boolean;
}> = {};
const OneToMany: Record<string, Array<[string, string, boolean]>> = {};
const ManyToOne: Record<string, Array<[string, string, boolean]>> = {};
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
        factory.createStringLiteral(`${TYPE_PATH_IN_OAK_DOMAIN()}Action`),
        undefined
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
                    factory.createIdentifier("GenericAction")
                ),
                factory.createImportSpecifier(
                    false,
                    undefined,
                    factory.createIdentifier("AppendOnlyAction")
                ),
                factory.createImportSpecifier(
                    false,
                    undefined,
                    factory.createIdentifier("ReadOnlyAction")
                ),
                factory.createImportSpecifier(
                    false,
                    undefined,
                    factory.createIdentifier("ExcludeUpdateAction")
                ),
                factory.createImportSpecifier(
                    false,
                    undefined,
                    factory.createIdentifier("ExcludeRemoveAction")
                ),
            ])
        ),
        factory.createStringLiteral(ACTION_CONSTANT_IN_OAK_DOMAIN()),
        undefined
    )
];

const ActionAsts: {
    [module: string]: {
        statements: Array<ts.Statement>;
        sourceFile: ts.SourceFile;
        importedFrom: Record<string, ts.ImportDeclaration | 'local'>;
        // actionNames: string[];
        actionDefNames: string[];
    };
} = {};

const SchemaAsts: {
    [module: string]: {
        statements: Array<ts.Statement>;
        sourceFile: ts.SourceFile;
    };
} = {};

function addRelationship(many: string, one: string, key: string, notNull: boolean) {
    const { [many]: manySet } = ManyToOne;
    const one2 = one === 'Schema' ? many : one;
    if (manySet) {
        manySet.push([one2, key, notNull]);
    }
    else {
        assign(ManyToOne, {
            [many]: [[one2, key, notNull]],
        });
    }

    const { [one2]: oneSet } = OneToMany;
    if (oneSet) {
        oneSet.push([many, key, notNull]);
    }
    else {
        assign(OneToMany, {
            [one2]: [[many, key, notNull]],
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
    node: ts.Statement,
    sourceFile: ts.SourceFile) {

    // let actionNames;
    let actionDefName;
    /* if (ts.isTypeAliasDeclaration(node) && node.name.text === 'ParticularAction') {
        const { type } = node;
        if (ts.isUnionTypeNode(type)) {
            actionNames = type.types.map(
                (ele) => {
                    assert(ts.isTypeReferenceNode(ele));
                    const text = (<ts.Identifier>ele.typeName).text;
                    assert(text.endsWith('Action'));
                    return firstLetterLowerCase(text.slice(0, text.length - 6));
                }
            )
        }
        else {
            assert(ts.isTypeReferenceNode(type));
            const text = (<ts.Identifier>type.typeName).text;
            assert(text.endsWith('Action'));
            actionNames = [firstLetterLowerCase(text.slice(0, text.length - 6))];
        }
    } */

    if (ts.isVariableStatement(node)) {
        const { declarationList: { declarations } } = node;
        declarations.forEach(
            (declaration) => {
                if (ts.isIdentifier(declaration.name) && declaration.name.text.endsWith('ActionDef')) {
                    const { text } = declaration.name;
                    actionDefName = firstLetterLowerCase(text.slice(0, text.length - 9));
                }
            }
        );
    }

    if (ActionAsts[moduleName]) {
        ActionAsts[moduleName].statements.push(node);
        /* if (actionNames) {
            ActionAsts[moduleName].actionNames = actionNames;
        } */
        if (actionDefName) {
            ActionAsts[moduleName].actionDefNames.push(actionDefName);
        }
    }
    else {
        assign(ActionAsts, {
            [moduleName]: {
                statements: [...ActionImportStatements(), node],
                sourceFile,
                importedFrom: {},
                // actionNames,
                actionDefNames: actionDefName ? [actionDefName] : [],
            }
        });
    }
}

function pushStatementIntoSchemaAst(moduleName: string, statement: ts.Statement, sourceFile: ts.SourceFile) {
    if (SchemaAsts[moduleName]) {
        SchemaAsts[moduleName].statements.push(statement);
    }
    else {
        assign(SchemaAsts, {
            [moduleName]: {
                statements: [statement],
                sourceFile,
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
    assert(ts.isStringLiteral(moduleSpecifier) && moduleSpecifier.text === ACTION_CONSTANT_IN_OAK_DOMAIN());
    assign(ast.importedFrom, {
        [name.text]: node,
    });
}

function getStringTextFromUnionStringLiterals(moduleName: string, filename: string, node: ts.TypeReferenceNode, program: ts.Program) {
    const checker = program.getTypeChecker();
    const symbol = checker.getSymbolAtLocation(node.typeName);
    let declaration = symbol?.getDeclarations()![0]!;
    let isImport = false;
    /* const typee = checker.getDeclaredTypeOfSymbol(symbol!);

    const declaration = typee.aliasSymbol!.getDeclarations()![0]; */
    if (ts.isImportSpecifier(declaration)) {
        isImport = true;
        const typee = checker.getDeclaredTypeOfSymbol(symbol!);
        declaration = typee.aliasSymbol!.getDeclarations()![0];
    }

    assert(ts.isTypeAliasDeclaration(declaration));
    const { type, name } = declaration;
    // assert(ts.isUnionTypeNode(type!) || ts.isLiteralTypeNode(type!), `${filename}中引用的action「${(<ts.Identifier>name).text}」的定义不是union和stringLiteral类型`);

    // 如果这个action是从外部导入的，在这里要记下来此entity和这个导入之间的关系
    if (isImport) {
        const importDeclartion = symbol!.getDeclarations()![0]!.parent.parent.parent;

        assert(ts.isImportDeclaration(importDeclartion));
        addActionSource(moduleName, name, importDeclartion);
    }
    else {
        const ast = ActionAsts[moduleName];
        assign(ast.importedFrom, {
            [name.text]: 'local',
        });
    }

    const getStringLiteral = (ele: ts.TypeNode) => {
        assert(ts.isLiteralTypeNode(ele) && ts.isStringLiteral(ele.literal), `${filename}中引用的action${(<ts.Identifier>name).text}中存在不是stringliteral的类型`);
        assert(!ele.literal.text.includes('$'), `${filename}中引用的action${(<ts.Identifier>name).text}中的action「${ele.literal.text}」包含非法字符$`);
        assert(ele.literal.text.length > 0, `${filename}中引用的action${(<ts.Identifier>name).text}中的action「${ele.literal.text}」长度非法`);
        assert(ele.literal.text.length < STRING_LITERAL_MAX_LENGTH, `${filename}中引用的action${(<ts.Identifier>name).text}中的action「${ele.literal.text}」长度过长`);
        return ele.literal.text;
    }

    if (ts.isUnionTypeNode(type)) {
        const actions = type.types!.map(
            ele => getStringLiteral(ele)
        );

        return actions;
    }
    else {
        assert(ts.isLiteralTypeNode(type!), `${filename}中引用的action「${(<ts.Identifier>name).text}」的定义不是union和stringLiteral类型`);
        const action = getStringLiteral(type);
        return [action];
    }
}

const RESERVED_ACTION_NAMES = ['GenericAction', 'ParticularAction', 'ExcludeRemoveAction', 'ExcludeUpdateAction', 'ReadOnlyAction', 'AppendOnlyAction'];
import { genericActions } from '../actions/action';
import { unIndexedTypes } from '../types/DataType';
import { initinctiveAttributes } from '../types/Entity';

const OriginActionDict = {
    'crud': 'GenericAction',
    'excludeUpdate': 'ExcludeUpdateAction',
    'excludeRemove': 'ExcludeRemoveAction',
    'appendOnly': 'AppendOnlyAction',
    'readOnly': 'ReadOnlyAction',
};
function dealWithActions(moduleName: string, filename: string, node: ts.TypeNode, program: ts.Program, sourceFile: ts.SourceFile) {
    const actionTexts = genericActions.map(
        ele => ele
    );
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

        node.types.forEach(
            ele => {
                if (ts.isTypeReferenceNode(ele)) {
                    actionTexts.push(...getStringTextFromUnionStringLiterals(moduleName, filename, ele, program));
                }
                else {
                    assert(ts.isLiteralTypeNode(ele) && ts.isStringLiteral(ele.literal), `【${moduleName}】action的定义既非Type也不是string`);
                    actionTexts.push(ele.literal.text);
                }
            }
        );
    }
    else if (ts.isTypeReferenceNode(node)) {
        if (ts.isIdentifier(node.typeName)) {
            assert(!RESERVED_ACTION_NAMES.includes(node.typeName.text),
                `${filename}中的Action命名不能是「${RESERVED_ACTION_NAMES.join(',')}」之一`);
        }
        actionTexts.push(...getStringTextFromUnionStringLiterals(moduleName, filename, node, program));
    }
    else {
        assert(ts.isLiteralTypeNode(node) && ts.isStringLiteral(node.literal), `【${moduleName}】action的定义既非Type也不是string`);
        actionTexts.push(node.literal.text);
    }

    // 所有的action定义不能有重名
    const ActionDict = {};
    actionTexts.forEach(
        (action) => {
            assert(action.length <= STRING_LITERAL_MAX_LENGTH, `${filename}中的Action「${action}」命名长度大于${STRING_LITERAL_MAX_LENGTH}`);
            assert(/^[a-z][a-z|A-Z]+$/.test(action), `${filename}中的Action「${action}」命名不合法，必须以小字字母开头且只能包含字母`)
            if (ActionDict.hasOwnProperty(action)) {
                throw new Error(`文件${filename}中，Action定义上的【${action}】动作存在同名`);
            }
            else {
                assign(ActionDict, {
                    [action]: 1,
                });
            }
        }
    );

    pushStatementIntoActionAst(moduleName,
        factory.createVariableStatement(
            [factory.createModifier(ts.SyntaxKind.ExportKeyword)],
            factory.createVariableDeclarationList(
                [factory.createVariableDeclaration(
                    factory.createIdentifier("actions"),
                    undefined,
                    undefined,
                    factory.createArrayLiteralExpression(
                        actionTexts.map(
                            ele => factory.createStringLiteral(ele)
                        ),
                        false
                    )
                )],
                ts.NodeFlags.Const
            )
        ),
        sourceFile
    );
}

function getEntityImported(declaration: ts.ImportDeclaration, filename: string) {
    const { moduleSpecifier, importClause } = declaration;
    let entityImported: string | undefined;
    if (ts.isStringLiteral(moduleSpecifier)) {
        if (moduleSpecifier.text.startsWith('./')) {
            entityImported = moduleSpecifier.text.slice(2);
        }
        else if (moduleSpecifier.text.startsWith(ENTITY_PATH_IN_OAK_GENERAL_BUSINESS())) {
            entityImported = moduleSpecifier.text.slice(ENTITY_PATH_IN_OAK_GENERAL_BUSINESS().length);
        }
        else if (moduleSpecifier.text.startsWith(ENTITY_PATH_IN_OAK_DOMAIN())) {
            entityImported = moduleSpecifier.text.slice(ENTITY_PATH_IN_OAK_DOMAIN().length)
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

function checkLocaleEnumAttrs(node: ts.TypeLiteralNode, attrs: string[], filename: string) {
    const { members } = node;
    const memberKeys = members.map(
        (ele) => {
            assert(ts.isPropertySignature(ele) && ts.isIdentifier(ele.name));
            return ele.name.text;
        }
    );

    const lack = difference(attrs, memberKeys);
    if (lack.length > 0) {
        throw new Error(`${filename}中缺少了对${lack.join(',')}属性的locale定义`);
    }
}

function checkLocaleExpressionPropertyExists(root: ts.ObjectLiteralExpression, attr: string, exists: boolean, filename: string) {
    const { properties } = root;
    properties.forEach(
        (ele) => {
            assert(ts.isPropertyAssignment(ele) && (ts.isIdentifier(ele.name) || ts.isStringLiteral(ele.name)) && ts.isObjectLiteralExpression(ele.initializer));
            const { properties: p2 } = ele.initializer;
            const pp = p2.find(
                (ele2) => {
                    assert(ts.isPropertyAssignment(ele2) && ts.isIdentifier(ele2.name));
                    return ele2.name.text === attr;
                }
            );
            if (exists && !pp) {
                throw new Error(`${filename}中的locale定义中的${ele.name.text}中缺少了${attr}的定义`);
            }
            else if (!exists && pp) {
                throw new Error(`${filename}中的locale定义中的${ele.name.text}中有多余的${attr}定义`);
            }
        }
    )
}

function analyzeEntity(filename: string, path: string, program: ts.Program) {
    const fullPath = `${path}/${filename}`;
    const sourceFile = program.getSourceFile(fullPath);
    const moduleName = filename.split('.')[0];

    if (Schema.hasOwnProperty(moduleName)) {
        if (!path.includes('oak-general-business')) {
            console.log(`出现了同名的Entity定义「${moduleName}」，将使用您所定义的对象结构取代掉默认对象，请确认`);
        }
    }
    const referencedSchemas: string[] = [];
    const schemaAttrs: ts.TypeElement[] = [];
    let hasFulltextIndex: boolean = false;
    let indexes: ts.ArrayLiteralExpression;
    let beforeSchema = true;
    let hasActionDef = false;
    let hasRelationDef = false;
    let hasActionOrStateDef = false;
    let toModi = false;
    let actionType = 'crud';
    let _static = false;
    const enumStringAttrs: string[] = [];
    const states: string[] = [];
    const localEnumStringTypes: string[] = [];
    let localeDef: ts.ObjectLiteralExpression | undefined = undefined;
    ts.forEachChild(sourceFile!, (node) => {
        if (ts.isImportDeclaration(node)) {
            const entityImported = getEntityImported(node, filename);
            if (entityImported) {
                referencedSchemas.push(entityImported);
            }
        }

        if (ts.isInterfaceDeclaration(node)) {
            // schema 定义
            if (node.name.text === 'Schema') {
                assert(!localeDef, `【${filename}】locale定义须在Schema之后`);
                let hasEntityAttr = false;
                let hasEntityIdAttr = false;
                const { members, heritageClauses } = node;
                assert(['EntityShape', 'FileCarrierEntityShape'].includes((<ts.Identifier>heritageClauses![0].types![0].expression).text));
                members.forEach(
                    (attrNode) => {
                        const { type, name, questionToken } = <ts.PropertySignature>attrNode;
                        const attrName = (<ts.Identifier>name).text;
                        if (ts.isTypeReferenceNode(type!)
                            && ts.isIdentifier(type.typeName)) {
                            if ((referencedSchemas.includes(type.typeName.text) || type.typeName.text === 'Schema')) {
                                addRelationship(moduleName, type.typeName.text, attrName, !!questionToken);
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

                                if (reverseEntity === 'Modi') {
                                    toModi = true;
                                }
                            }
                            else {
                                schemaAttrs.push(attrNode);
                                if (localEnumStringTypes.includes(type.typeName.text)) {
                                    enumStringAttrs.push((<ts.Identifier>name).text);
                                }
                            }
                        }
                        else if (ts.isArrayTypeNode(type!) && ts.isTypeReferenceNode(type.elementType) && ts.isIdentifier(type.elementType.typeName)) {
                            const { typeName } = type.elementType;

                            if (referencedSchemas.includes(typeName.text)) {
                                // 这也是一对多的反指定义 
                                const reverseEntity = typeName.text;
                                if (ReversePointerRelations[reverseEntity]) {
                                    ReversePointerRelations[reverseEntity].push(moduleName);
                                }
                                else {
                                    assign(ReversePointerRelations, {
                                        [reverseEntity]: [moduleName],
                                    });
                                }

                                if (reverseEntity === 'Modi') {
                                    toModi = true;
                                }
                            }
                            else {
                                throw new Error(`对象${moduleName}中定义的属性${attrName}是不可识别的数组类别`);
                            }
                        }
                        else {
                            schemaAttrs.push(attrNode);
                            if (ts.isUnionTypeNode(type!)) {
                                const { types } = type;
                                if (ts.isLiteralTypeNode(types[0]) && ts.isStringLiteral(types[0].literal)) {
                                    enumStringAttrs.push((<ts.Identifier>name).text);
                                }
                            }
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
                beforeSchema = false;

                // 对于不是Oper的对象，全部建立和OperEntity的反指关系
                if (!['Oper', 'OperEntity', 'ModiEntity'].includes(moduleName)) {
                    if (ReversePointerRelations['OperEntity'] && !ReversePointerRelations['OperEntity'].includes(moduleName)) {
                        ReversePointerRelations['OperEntity'].push(moduleName);
                    }
                    else {
                        assign(ReversePointerRelations, {
                            ['OperEntity']: [moduleName],
                        });
                    }

                    // 对于不是Modi的对象，全部建立和ModiEntity的反指关系
                    if (!['Modi'].includes(moduleName) && !toModi) {
                        if (ReversePointerRelations['ModiEntity'] && !ReversePointerRelations['ModiEntity'].includes(moduleName)) {
                            ReversePointerRelations['ModiEntity'].push(moduleName);
                        }
                        else {
                            assign(ReversePointerRelations, {
                                ['ModiEntity']: [moduleName],
                            });
                        }
                    }
                }
            }
            else if (beforeSchema) {
                // 本地规定的一些形状定义，直接使用
                pushStatementIntoSchemaAst(moduleName, node, sourceFile!);
            }
        }

        if (ts.isTypeAliasDeclaration(node)) {
            // action 定义
            if (node.name.text === 'Action') {
                assert(!localeDef, `【${filename}】locale定义须在Action之后`);
                hasActionDef = true;
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
                                OriginActionDict[actionType as keyof typeof OriginActionDict],
                                undefined
                            ),
                            factory.createTypeReferenceNode(
                                'ParticularAction',
                                undefined
                            )
                        ])
                    ),
                    sourceFile!
                );
                dealWithActions(moduleName, filename, node.type, program, sourceFile!);
            }
            else if (node.name.text === 'Relation') {
                assert(!localeDef, `【${filename}】locale定义须在Relation之后`);
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
                        actionType: 'excludeUpdate',
                    },
                });
                addRelationship(relationEntityName, 'User', 'user', true);
                addRelationship(relationEntityName, moduleName, entityLc, true);

                hasRelationDef = true;
            }
            else if (node.name.text.endsWith('Action') || node.name.text.endsWith('State')) {
                assert(!localeDef, `【${filename}】locale定义须在Action/State之后`);
                hasActionOrStateDef = true;
                pushStatementIntoActionAst(moduleName,
                    factory.updateTypeAliasDeclaration(
                        node,
                        node.decorators,
                        [factory.createModifier(ts.SyntaxKind.ExportKeyword)],
                        node.name,
                        node.typeParameters,
                        node.type
                    ),
                    sourceFile!);
            }
            else if (beforeSchema) {
                // 本地规定的一些形状定义，直接使用
                pushStatementIntoSchemaAst(moduleName, node, sourceFile!);

                if (ts.isUnionTypeNode(node.type) && ts.isLiteralTypeNode(node.type.types[0]) && ts.isStringLiteral(node.type.types[0].literal)) {
                    // 本文件内定义的枚举类型
                    localEnumStringTypes.push(node.name.text);
                }
            }
        }

        if (ts.isVariableStatement(node)) {
            const { declarationList: { declarations } } = node;
            declarations.forEach(
                (declaration) => {
                    if (ts.isIdentifier(declaration.name) && declaration.name.text.endsWith('ActionDef')) {
                        if (declaration.type && ts.isTypeReferenceNode(declaration.type) && ts.isIdentifier(declaration.type.typeName) && declaration.type.typeName.text === 'ActionDef') {
                            // 是显示的actionDef定义
                            checkActionDefNameConsistent(filename, declaration);
                            const { typeArguments } = declaration.type;
                            assert(typeArguments!.length === 2);
                            const [actionNode, stateNode] = typeArguments!;

                            const checker = program.getTypeChecker();
                            let symbol = checker.getSymbolAtLocation((<ts.TypeReferenceNode>actionNode).typeName);

                            let declaration2 = symbol!.getDeclarations()![0];
                            if (declaration2.getSourceFile() === sourceFile) {
                                // pushStatementIntoActionAst(moduleName, <ts.TypeAliasDeclaration>declaration2, sourceFile);
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
                                /* pushStatementIntoActionAst(moduleName,
                                    factory.updateTypeAliasDeclaration(
                                        declaration2,
                                        declaration2.decorators,
                                        [factory.createModifier(ts.SyntaxKind.ExportKeyword)],
                                        declaration2.name,
                                        declaration2.typeParameters,
                                        declaration2.type
                                    ),
                                    sourceFile); */
                            }
                        }

                        pushStatementIntoActionAst(moduleName, node, sourceFile!);

                        const adName = declaration.name.text.slice(0, declaration.name.text.length - 9);
                        const attr = adName.concat('State');
                        schemaAttrs.push(
                            factory.createPropertySignature(
                                undefined,
                                factory.createIdentifier(firstLetterLowerCase(attr)),
                                factory.createToken(ts.SyntaxKind.QuestionToken),
                                factory.createTypeReferenceNode(
                                    factory.createIdentifier(attr),
                                )
                            )
                        );
                        states.push(firstLetterLowerCase(attr));
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
                                        if (!initinctiveAttributes.includes(indexAttrName)) {
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
                                    }
                                );
                            }
                        );

                        indexes = declaration.initializer;
                    }
                    else if (ts.isTypeReferenceNode(declaration.type!) && ts.isIdentifier(declaration.type.typeName) && declaration.type.typeName.text === 'LocaleDef') {
                        // locale定义
                        const { type, initializer } = declaration;

                        assert(ts.isObjectLiteralExpression(initializer!));
                        const { properties } = initializer;
                        assert(properties.length > 0, `${filename}至少需要有一种locale定义`);


                        const allEnumStringAttrs = enumStringAttrs.concat(states);
                        const { typeArguments } = type;
                        assert(typeArguments &&
                            ts.isTypeReferenceNode(typeArguments[0])
                            && ts.isIdentifier(typeArguments[0].typeName) && typeArguments[0].typeName.text === 'Schema', `${filename}中缺少locale定义，或者locale类型定义的第一个参数不是Schema`);

                        if (hasActionDef) {
                            assert(ts.isTypeReferenceNode(typeArguments[1])
                                && ts.isIdentifier(typeArguments[1].typeName) && typeArguments[1].typeName.text === 'Action', `${filename}中locale类型定义的第二个参数不是Action`);
                            // 检查每种locale定义中都应该有'action'域
                            checkLocaleExpressionPropertyExists(initializer, 'action', true, filename);
                        }
                        else {
                            assert(ts.isLiteralTypeNode(typeArguments[1])
                                && ts.isStringLiteral(typeArguments[1].literal), `${filename}中locale类型定义的第二个参数不是字符串`);
                            checkLocaleExpressionPropertyExists(initializer, 'action', false, filename);
                        }

                        if (hasRelationDef) {
                            assert(ts.isTypeReferenceNode(typeArguments[2])
                                && ts.isIdentifier(typeArguments[2].typeName)
                                && typeArguments[2].typeName.text === 'Relation', `${filename}中的locale类型定义的第三个参数不是Relation`);
                            // 检查每种locale定义中都应该有'r'域
                            checkLocaleExpressionPropertyExists(initializer, 'r', true, filename);
                        }
                        else {
                            assert(ts.isLiteralTypeNode(typeArguments[2])
                                && ts.isStringLiteral(typeArguments[2].literal), `${filename}中locale类型定义的第三个参数不是空字符串`);
                            checkLocaleExpressionPropertyExists(initializer, 'r', false, filename);
                        }

                        if (allEnumStringAttrs.length > 0) {
                            assert(ts.isTypeLiteralNode(typeArguments[3]), `${filename}中的locale类型定义的第四个参数不是{}`);
                            checkLocaleEnumAttrs(typeArguments[3], allEnumStringAttrs, filename);
                            // 检查每种locale定义中都应该有'v'域
                            checkLocaleExpressionPropertyExists(initializer, 'v', true, filename);
                        }
                        else {
                            assert(ts.isTypeLiteralNode(typeArguments[3]), `${filename}中的locale类型定义的第四个参数不是{}`);
                            assert(typeArguments[3].members.length == 0, `${filename}中locale类型定义的第四个参数不应存在相应的v定义`)
                            // 检查每种locale定义中都应该有'v'域
                            checkLocaleExpressionPropertyExists(initializer, 'v', false, filename);
                        }

                        localeDef = initializer;
                    }
                    else if (ts.isTypeReferenceNode(declaration.type!) && ts.isIdentifier(declaration.type.typeName) && declaration.type.typeName.text === 'Configuration') {
                        assert(!hasActionDef, `${moduleName}中的Configuration定义在Action之后`);
                        assert(ts.isObjectLiteralExpression(declaration.initializer!));
                        const { properties } = declaration.initializer;
                        const atProperty = properties.find(
                            ele => ts.isPropertyAssignment(ele) && ts.isIdentifier(ele.name) && ele.name.text === 'actionType'
                        );
                        const staticProperty = properties.find(
                            ele => ts.isPropertyAssignment(ele) && ts.isIdentifier(ele.name) && ele.name.text === 'static'
                        );
                        if (atProperty) {
                            actionType = (<ts.StringLiteral>(<ts.PropertyAssignment>atProperty).initializer).text;
                        }
                        if (staticProperty) {
                            _static = true;     // static如果有值只能为true
                        }
                    }
                    else {
                        throw new Error(`${moduleName}：不能理解的定义内容${declaration.name.getText()}`);
                    }
                }
            );
        }
    });

    if (!hasActionDef && hasActionOrStateDef) {
        throw new Error(`${filename}中有Action或State定义，但没有定义完整的Action类型`);
    }
    if (hasActionDef && actionType !== 'crud') {
        throw new Error(`${filename}中有Action定义，但却定义了actionType不是crud`);
    }
    assert(schemaAttrs.length > 0, `对象${moduleName}没有任何属性定义`);
    const schema = {
        schemaAttrs,
        sourceFile,
        toModi,
        actionType,
        static: _static,
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
    if (!localeDef) {
        throw new Error(`${filename}中缺少了locale定义`);
    }
    else {
        assign(schema, {
            locale: localeDef,
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
            undefined,
            factory.createTypeReferenceNode(
                factory.createIdentifier('Datetime'),
            )
        ),
        // $$updateAt$$: Datetime
        factory.createPropertySignature(
            undefined,
            factory.createIdentifier('$$updateAt$$'),
            undefined,
            factory.createTypeReferenceNode(
                factory.createIdentifier('Datetime'),
            )
        ),
        // $$updateAt$$: Datetime
        factory.createPropertySignature(
            undefined,
            factory.createIdentifier('$$deleteAt$$'),
            factory.createToken(ts.SyntaxKind.QuestionToken),
            factory.createUnionTypeNode([
                factory.createTypeReferenceNode(
                    factory.createIdentifier('Datetime'),
                ),
                factory.createLiteralTypeNode(factory.createNull())
            ])
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
                            questionToken ? factory.createUnionTypeNode([
                                factory.createTypeReferenceNode(
                                    createForeignRef(entity, text2, 'Schema')
                                ),
                                factory.createLiteralTypeNode(factory.createNull())
                            ]) : factory.createTypeReferenceNode(
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
                            questionToken ? factory.createUnionTypeNode([
                                factory.createTypeReferenceNode(
                                    factory.createIdentifier('ForeignKey'),
                                    [
                                        factory.createLiteralTypeNode(
                                            factory.createStringLiteral(firstLetterLowerCase(text2))
                                        )
                                    ]
                                ),
                                factory.createLiteralTypeNode(factory.createNull())
                            ]) : factory.createTypeReferenceNode(
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
                        const entityUnionTypeNode: ts.TypeNode[] = ReversePointerRelations[entity].map(
                            ele => factory.createLiteralTypeNode(
                                factory.createStringLiteral(firstLetterLowerCase(ele))
                            )
                        );

                        if (process.env.COMPLING_AS_LIB) {
                            // 如果是建立 base-domain，还要容纳可能的其它对象引用
                            entityUnionTypeNode.push(
                                factory.createKeywordTypeNode(ts.SyntaxKind.StringKeyword)
                            )
                        }
                        members.push(
                            factory.createPropertySignature(
                                undefined,
                                name,
                                questionToken,
                                questionToken ? factory.createUnionTypeNode([
                                    factory.createUnionTypeNode(
                                        entityUnionTypeNode
                                    ),
                                    factory.createLiteralTypeNode(factory.createNull())
                                ]) : factory.createUnionTypeNode(
                                    entityUnionTypeNode
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
                                questionToken ? factory.createUnionTypeNode([
                                    type,
                                    factory.createLiteralTypeNode(factory.createNull())
                                ]) : type
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
            assert(ts.isUnionTypeNode(type!) || ts.isLiteralTypeNode(type!), `${entity}有非法的属性类型定义${(<ts.Identifier>name).text}`);
            members.push(
                factory.createPropertySignature(
                    undefined,
                    name,
                    questionToken,
                    questionToken ? factory.createUnionTypeNode([
                        type,
                        factory.createLiteralTypeNode(factory.createNull())
                    ]) : type
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

    // 在这里把需要直接拷贝过来的语句写入
    if (SchemaAsts[entity]) {
        statements.push(...SchemaAsts[entity].statements);
    }


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
                            undefined,
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
                    case 'SingleGeo':
                    case 'Geo':
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
                            // 这里应该都是引用某个UnionType类型的定义了，如何判断？
                            // const words = getStringTextFromUnionStringLiterals();
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
        else if (ts.isUnionTypeNode(type!) && ts.isLiteralTypeNode(type.types[0]) || ts.isLiteralTypeNode(type!)) {
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
        else {
            // 此时应当是引用本地定义的shape
        }
    }

    // type AttrFilter = {};
    if (ReversePointerRelations[entity]) {
        // 有反向指针，将反向指针关联的对象的Filter也注入
        ReversePointerRelations[entity].forEach(
            ele =>
                members.push(
                    factory.createPropertySignature(
                        undefined,
                        firstLetterLowerCase(ele),
                        undefined,
                        factory.createTypeReferenceNode(
                            createForeignRef(entity, ele, 'Filter')
                        )
                    )
                )
        );
    }
    const eumUnionTypeNode: ts.TypeNode[] = ReversePointerRelations[entity] && ReversePointerRelations[entity].map(
        ele => factory.createLiteralTypeNode(
            factory.createStringLiteral(firstLetterLowerCase(ele))
        )
    );
    if (process.env.COMPLING_AS_LIB) {
        eumUnionTypeNode && eumUnionTypeNode.push(
            factory.createKeywordTypeNode(ts.SyntaxKind.StringKeyword)
        );
    }
    statements.push(
        factory.createTypeAliasDeclaration(
            undefined,
            undefined,
            factory.createIdentifier('AttrFilter'),
            ReversePointerRelations[entity] ? [
                factory.createTypeParameterDeclaration(
                    undefined,
                    factory.createIdentifier("E"),
                    undefined,
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
                process.env.COMPLING_AS_LIB ?
                    factory.createUnionTypeNode([
                        factory.createTypeReferenceNode(
                            factory.createIdentifier('OpAttr')
                        ),
                        factory.createKeywordTypeNode(ts.SyntaxKind.StringKeyword)
                    ]) :
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
                    undefined,
                    factory.createIdentifier("E"),
                    undefined,
                    factory.createTypeReferenceNode(
                        factory.createIdentifier("Q_EnumValue"),
                        [
                            factory.createUnionTypeNode(
                                eumUnionTypeNode
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
                    case 'SingleGeo':
                    case 'Geo':
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
                            if (text.endsWith('State')) {
                                properties.push(
                                    [name, false, undefined]
                                );
                            }
                            else {
                                // 引用的shape
                                properties.push(
                                    [name, false, undefined]
                                );
                            }
                        }
                    }
                }
            }
            else {
                assert(false);
            }
        }
        else {
            // 增加了本身object的shape定义
            // assert(ts.isUnionTypeNode(type!) && ts.isLiteralTypeNode(type.types[0]) || ts.isLiteralTypeNode(type!));
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
                            factory.createIntersectionTypeNode([
                                factory.createTypeReferenceNode(
                                    createForeignRef(entity, entityName, 'Selection'),
                                    undefined
                                ),
                                factory.createTypeLiteralNode([
                                    factory.createPropertySignature(
                                        undefined,
                                        factory.createIdentifier("$entity"),
                                        undefined,
                                        factory.createLiteralTypeNode(factory.createStringLiteral(firstLetterLowerCase(entityName)))
                                    )
                                ])
                            ]),
                            factory.createIntersectionTypeNode([
                                factory.createTypeReferenceNode(
                                    createForeignRef(entity, entityName, 'Exportation'),
                                    undefined
                                ),
                                factory.createTypeLiteralNode([
                                    factory.createPropertySignature(
                                        undefined,
                                        factory.createIdentifier("$entity"),
                                        undefined,
                                        factory.createLiteralTypeNode(factory.createStringLiteral(firstLetterLowerCase(entityName)))
                                    )
                                ])
                            ])
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
                    process.env.COMPLING_AS_LIB ?
                        factory.createUnionTypeNode([
                            factory.createTypeReferenceNode(
                                factory.createIdentifier('OpAttr')
                            ),
                            factory.createKeywordTypeNode(ts.SyntaxKind.StringKeyword)
                        ]) :
                        factory.createTypeReferenceNode(
                            factory.createIdentifier('OpAttr')
                        )
                ]
            )
        ]
    );

    const MetaPropertySignaturs: ts.TypeElement[] = [
        factory.createPropertySignature(
            undefined,
            factory.createStringLiteral("#id"),
            factory.createToken(ts.SyntaxKind.QuestionToken),
            factory.createTypeReferenceNode(
                'NodeId'
            )
        )
    ];
    if (process.env.COMPLING_AS_LIB) {
        MetaPropertySignaturs.push(
            factory.createIndexSignature(
                undefined,
                undefined,
                [factory.createParameterDeclaration(
                    undefined,
                    undefined,
                    undefined,
                    factory.createIdentifier("k"),
                    undefined,
                    factory.createKeywordTypeNode(ts.SyntaxKind.StringKeyword),
                    undefined
                )],
                factory.createKeywordTypeNode(ts.SyntaxKind.AnyKeyword)
            )
        )
    }
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
    const members: Array<ts.TypeNode> = [
        // id: 1
        factory.createTypeLiteralNode(
            [factory.createPropertySignature(
                undefined,
                factory.createIdentifier("id"),
                undefined,
                factory.createLiteralTypeNode(factory.createNumericLiteral("1"))
            )]
        ),
        // $$createAt$$: 1
        factory.createTypeLiteralNode(
            [factory.createPropertySignature(
                undefined,
                factory.createIdentifier("$$createAt$$"),
                undefined,
                factory.createLiteralTypeNode(factory.createNumericLiteral("1"))
            )]
        ),
        // $$updateAt$$: 1
        factory.createTypeLiteralNode(
            [factory.createPropertySignature(
                undefined,
                factory.createIdentifier("$$updateAt$$"),
                undefined,
                factory.createLiteralTypeNode(factory.createNumericLiteral("1"))
            )]
        ),
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
                                factory.createTypeLiteralNode(
                                    [factory.createPropertySignature(
                                        undefined,
                                        factory.createIdentifier(`${(<ts.Identifier>name).text}Id`),
                                        undefined,
                                        factory.createLiteralTypeNode(factory.createNumericLiteral("1"))
                                    )]
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
                        factory.createTypeLiteralNode(
                            [factory.createPropertySignature(
                                undefined,
                                name,
                                undefined,
                                type2
                            )]
                        )
                    );
                }
            }
        }
        else if (ts.isUnionTypeNode(type!) && ts.isLiteralTypeNode(type.types[0]) || ts.isLiteralTypeNode(type!)) {
            members.push(
                factory.createTypeLiteralNode(
                    [factory.createPropertySignature(
                        undefined,
                        name,
                        undefined,
                        factory.createLiteralTypeNode(factory.createNumericLiteral("1"))
                    )]
                )
            );
        }
        else {
            // 本地规定的shape，非结构化属性不参与排序
        }
    }

    if (ReversePointerRelations[entity]) {
        ReversePointerRelations[entity].forEach(
            (one) => {
                members.push(
                    factory.createTypeLiteralNode(
                        [factory.createPropertySignature(
                            undefined,
                            firstLetterLowerCase(one),
                            undefined,
                            factory.createTypeReferenceNode(
                                <ts.EntityName>createForeignRef(entity, one, 'SortAttr')
                            )
                        )]
                    )
                );
            }
        );
    }

    if (process.env.COMPLING_AS_LIB) {
        members.push(
            factory.createTypeLiteralNode([factory.createIndexSignature(
                undefined,
                undefined,
                [factory.createParameterDeclaration(
                    undefined,
                    undefined,
                    undefined,
                    factory.createIdentifier("k"),
                    undefined,
                    factory.createKeywordTypeNode(ts.SyntaxKind.StringKeyword),
                    undefined
                )],
                factory.createKeywordTypeNode(ts.SyntaxKind.AnyKeyword)
            )])
        );
    }

    members.push(
        factory.createTypeReferenceNode(
            factory.createIdentifier("OneOf"),
            [factory.createTypeReferenceNode(
                factory.createIdentifier("ExprOp"),
                [
                    process.env.COMPLING_AS_LIB ?
                        factory.createUnionTypeNode([
                            factory.createTypeReferenceNode(
                                factory.createIdentifier('OpAttr')
                            ),
                            factory.createKeywordTypeNode(ts.SyntaxKind.StringKeyword)
                        ]) :
                        factory.createTypeReferenceNode(
                            factory.createIdentifier('OpAttr')
                        )
                ]
            )]
        )
    );
    /**
     * 
        export type SortAttr = {
            id: 1;
        } | {
            $$createAt$$: 1;
        } | {
            $$updateAt$$: 1;
        } | {
            modiId: 1;
        } | {
            modi: Modi.SortAttr;
        } | {
            [k: string]: any;
        } | OneOf<ExprOp<OpAttr>>
     */
    statements.push(
        factory.createTypeAliasDeclaration(
            undefined,
            [factory.createModifier(ts.SyntaxKind.ExportKeyword)],
            factory.createIdentifier("SortAttr"),
            undefined,
            factory.createUnionTypeNode(members)
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
                    undefined,
                    factory.createIdentifier("P"),
                    factory.createTypeReferenceNode(
                      factory.createIdentifier("Object"),
                      undefined
                    ),
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
                    ),
                    factory.createLiteralTypeNode(factory.createStringLiteral("id"))
                ]
            )
        ),
        factory.createTypeAliasDeclaration(
            undefined,
            [factory.createModifier(ts.SyntaxKind.ExportKeyword)],
            factory.createIdentifier("Selection"),
            [
                factory.createTypeParameterDeclaration(
                    undefined,
                    factory.createIdentifier("P"),
                    factory.createTypeReferenceNode(
                      factory.createIdentifier("Object"),
                      undefined
                    ),
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
    let foreignKeyAttr: string[] = [];

    if (ReversePointerEntities[entity]) {
        foreignKeyAttr.push(
            'entity', 'entityId'
        );
    }
    if (manyToOneSet) {
        for (const one of manyToOneSet) {
            if (!ReversePointerRelations[entity] || !ReversePointerRelations[entity].includes(one[1])) {
                foreignKeyAttr.push(`${one[1]}Id`);
            }
        }
    }
    let adNodes: ts.TypeNode[] = [
        factory.createTypeReferenceNode(
            factory.createIdentifier("FormCreateData"),
            [
                foreignKeyAttr.length > 0
                    ? factory.createTypeReferenceNode(
                        factory.createIdentifier("Omit"),
                        [
                            factory.createTypeReferenceNode(
                                factory.createIdentifier("OpSchema"),
                                undefined
                            ),
                            factory.createUnionTypeNode(uniq(foreignKeyAttr).map(
                                ele => factory.createLiteralTypeNode(factory.createStringLiteral(ele))
                            ))
                        ]
                    )
                    : factory.createTypeReferenceNode(
                        factory.createIdentifier("OpSchema"),
                        undefined
                    )
            ]
        )
    ];


    if (manyToOneSet) {
        /**
         * create的多对一有两种case
         * 如果关联对象是create，则对象的外键由关联对象的id决定
         * 如果关联对象是update，则关联对象的filter由对象决定其主键
         * 见cascadeStore
         */
        const upsertOneNodes: ts.TypeNode[] = [];
        for (const one of manyToOneSet) {
            if (!ReversePointerRelations[entity] || !ReversePointerRelations[entity].includes(one[0])) {
                const oneEntity = one[0];
                const cascadeCreateNode = factory.createTypeLiteralNode(
                    [
                        factory.createPropertySignature(
                            undefined,
                            factory.createIdentifier(`${one[1]}Id`),
                            factory.createToken(ts.SyntaxKind.QuestionToken),
                            factory.createKeywordTypeNode(ts.SyntaxKind.NeverKeyword)
                        ),
                        factory.createPropertySignature(
                            undefined,
                            factory.createIdentifier(one[1]),
                            one[2] ? factory.createToken(ts.SyntaxKind.QuestionToken) : undefined,
                            factory.createTypeReferenceNode(
                                createForeignRef(entity, one[0], 'CreateSingleOperation')
                            )
                        )
                    ]
                );
                const cascadeUpdateNode = factory.createTypeLiteralNode(
                    [
                        factory.createPropertySignature(
                            undefined,
                            factory.createIdentifier(`${one[1]}Id`),
                            undefined,
                            factory.createTypeReferenceNode(
                                factory.createIdentifier("String"),
                                [factory.createLiteralTypeNode(factory.createNumericLiteral("64"))]
                            )
                        ),
                        factory.createPropertySignature(
                            undefined,
                            factory.createIdentifier(one[1]),
                            factory.createToken(ts.SyntaxKind.QuestionToken),
                            factory.createTypeReferenceNode(
                                createForeignRef(entity, one[0], 'UpdateOperation')
                            )
                        )
                    ]
                );
                const noCascadeNode = factory.createTypeLiteralNode(
                    [
                        factory.createPropertySignature(
                            undefined,
                            factory.createIdentifier(`${one[1]}Id`),
                            one[2] ? factory.createToken(ts.SyntaxKind.QuestionToken) : undefined,
                            factory.createTypeReferenceNode(
                                factory.createIdentifier("String"),
                                [factory.createLiteralTypeNode(factory.createNumericLiteral("64"))]
                            )
                        )
                    ]
                );
                if (Schema[oneEntity].static) {
                    upsertOneNodes.push(noCascadeNode);
                }
                else {
                    switch (Schema[oneEntity].actionType) {
                        case 'crud':
                        case 'excludeRemove': {
                            upsertOneNodes.push(
                                factory.createUnionTypeNode([cascadeCreateNode, cascadeUpdateNode, noCascadeNode])
                            );
                            break;
                        }
                        case 'excludeUpdate':
                        case 'appendOnly': {
                            upsertOneNodes.push(
                                factory.createUnionTypeNode([cascadeCreateNode, noCascadeNode])
                            );
                            break;
                        }
                        case 'readOnly': {
                            upsertOneNodes.push(noCascadeNode);
                            break;
                        }
                        default: {
                            assert(false);
                        }
                    }
                }
            }
        }

        if (upsertOneNodes.length > 0) {
            adNodes.push(
                factory.createIntersectionTypeNode(
                    upsertOneNodes
                )
            );
        }
    }
    const reverseOneNodes: ts.TypeNode[] = [];
    if (ReversePointerEntities[entity]) {
        if (ReversePointerRelations[entity]) {
            for (const one of ReversePointerRelations[entity]) {
                const cascadeCreateNode = factory.createTypeLiteralNode(
                    [
                        factory.createPropertySignature(
                            undefined,
                            factory.createIdentifier('entity'),
                            factory.createToken(ts.SyntaxKind.QuestionToken),
                            factory.createKeywordTypeNode(ts.SyntaxKind.NeverKeyword)
                        ),
                        factory.createPropertySignature(
                            undefined,
                            factory.createIdentifier('entityId'),
                            factory.createToken(ts.SyntaxKind.QuestionToken),
                            factory.createKeywordTypeNode(ts.SyntaxKind.NeverKeyword)
                        ),
                        factory.createPropertySignature(
                            undefined,
                            factory.createIdentifier(firstLetterLowerCase(one)),
                            undefined,          // 反向指针好像不能为空，以后或许会有特例  by Xc
                            factory.createTypeReferenceNode(
                                createForeignRef(entity, one, 'CreateSingleOperation')
                            )
                        )
                    ]
                );
                const cascadeUpdateNode = factory.createTypeLiteralNode(
                    [
                        factory.createPropertySignature(
                            undefined,
                            factory.createIdentifier('entity'),
                            undefined,          // 反向指针好像不能为空，以后或许会有特例  by Xc
                            factory.createLiteralTypeNode(factory.createStringLiteral(`${firstLetterLowerCase(one)}`)
                            )
                        ),
                        factory.createPropertySignature(
                            undefined,
                            factory.createIdentifier('entityId'),
                            undefined,           // 反向指针好像不能为空，以后或许会有特例  by Xc
                            factory.createTypeReferenceNode(
                                factory.createIdentifier("String"),
                                [factory.createLiteralTypeNode(factory.createNumericLiteral("64"))]
                            )
                        ),
                        factory.createPropertySignature(
                            undefined,
                            factory.createIdentifier(firstLetterLowerCase(one)),
                            undefined,
                            factory.createTypeReferenceNode(
                                createForeignRef(entity, one, 'UpdateOperation')
                            )
                        )
                    ]
                );
                const noCascadeNode = factory.createTypeLiteralNode(
                    [
                        factory.createPropertySignature(
                            undefined,
                            factory.createIdentifier('entity'),
                            undefined,          // 反向指针好像不能为空，以后或许会有特例  by Xc
                            factory.createLiteralTypeNode(factory.createStringLiteral(`${firstLetterLowerCase(one)}`)
                            )
                        ),
                        factory.createPropertySignature(
                            undefined,
                            factory.createIdentifier('entityId'),
                            undefined,           // 反向指针好像不能为空，以后或许会有特例  by Xc
                            factory.createTypeReferenceNode(
                                factory.createIdentifier("String"),
                                [factory.createLiteralTypeNode(factory.createNumericLiteral("64"))]
                            )
                        )
                    ]
                );
                if (Schema[one].static) {
                    reverseOneNodes.push(noCascadeNode);
                }
                else {
                    switch (Schema[one].actionType) {
                        case 'crud':
                        case 'excludeRemove': {
                            reverseOneNodes.push(cascadeCreateNode, cascadeUpdateNode, noCascadeNode);
                            break;
                        }
                        case 'appendOnly':
                        case 'excludeUpdate': {
                            reverseOneNodes.push(cascadeCreateNode, noCascadeNode);
                            break;
                        }
                        case 'readOnly': {
                            reverseOneNodes.push(noCascadeNode);
                            break;
                        }
                        default: {
                            assert(false);
                        }
                    }
                }
            }
        }

        if (process.env.COMPLING_AS_LIB) {
            // 如果是base，要包容更多可能的反指
            reverseOneNodes.push(
                factory.createTypeLiteralNode(
                    [
                        factory.createPropertySignature(
                            undefined,
                            factory.createIdentifier('entity'),
                            factory.createToken(ts.SyntaxKind.QuestionToken),
                            factory.createKeywordTypeNode(ts.SyntaxKind.StringKeyword)
                        ),
                        factory.createPropertySignature(
                            undefined,
                            factory.createIdentifier('entityId'),
                            factory.createToken(ts.SyntaxKind.QuestionToken),
                            factory.createKeywordTypeNode(ts.SyntaxKind.StringKeyword)
                        ),
                        factory.createIndexSignature(
                            undefined,
                            undefined,
                            [factory.createParameterDeclaration(
                                undefined,
                                undefined,
                                undefined,
                                factory.createIdentifier("K"),
                                undefined,
                                factory.createKeywordTypeNode(ts.SyntaxKind.StringKeyword),
                                undefined
                            )],
                            factory.createKeywordTypeNode(ts.SyntaxKind.AnyKeyword)
                        )
                    ]
                )
            );
        }

        if (reverseOneNodes.length > 0) {
            adNodes.push(
                factory.createUnionTypeNode(
                    reverseOneNodes
                )
            );
        }
    }

    // 一对多
    const propertySignatures: ts.TypeElement[] = [];

    if (oneToManySet) {
        for (const entityName in foreignKeySet) {
            const entityNameLc = firstLetterLowerCase(entityName);
            foreignKeySet[entityName].forEach(
                (foreignKey) => {
                    const identifier = `${entityNameLc}$${foreignKey}`;
                    const otmCreateOperationDataNode = factory.createTypeReferenceNode(
                        factory.createIdentifier("Omit"),
                        [
                            factory.createTypeReferenceNode(
                                createForeignRef(entity, entityName, 'CreateOperationData'),
                                undefined
                            ),
                            factory.createUnionTypeNode(foreignKey === 'entity' ? [
                                factory.createLiteralTypeNode(factory.createStringLiteral("entity")),
                                factory.createLiteralTypeNode(factory.createStringLiteral("entityId"))
                            ] : [
                                factory.createLiteralTypeNode(factory.createStringLiteral(foreignKey)),
                                factory.createLiteralTypeNode(factory.createStringLiteral(`${foreignKey}Id`))
                            ])
                        ]
                    );
                    const otmCreateSingleOperationNode = factory.createTypeReferenceNode(
                        factory.createIdentifier("OakOperation"),
                        [
                            factory.createLiteralTypeNode(factory.createStringLiteral("create")),
                            otmCreateOperationDataNode
                        ]
                    );
                    const otmCreateMultipleOperationNode = factory.createTypeReferenceNode(
                        factory.createIdentifier("OakOperation"),
                        [
                            factory.createLiteralTypeNode(factory.createStringLiteral("create")),
                            factory.createArrayTypeNode(
                                otmCreateOperationDataNode
                            )
                        ]
                    );
                    const otmUpdateOperationNode = factory.createTypeReferenceNode(
                        factory.createIdentifier("OakOperation"),
                        [
                            factory.createIndexedAccessTypeNode(
                                factory.createTypeReferenceNode(
                                    createForeignRef(entity, entityName, 'UpdateOperation'),
                                    undefined
                                ),
                                factory.createLiteralTypeNode(factory.createStringLiteral("action"))
                            ),
                            factory.createTypeReferenceNode(
                                factory.createIdentifier("Omit"),
                                [
                                    factory.createTypeReferenceNode(
                                        createForeignRef(entity, entityName, 'UpdateOperationData'),
                                        undefined
                                    ),
                                    factory.createUnionTypeNode(foreignKey === 'entity' ? [
                                        factory.createLiteralTypeNode(factory.createStringLiteral("entity")),
                                        factory.createLiteralTypeNode(factory.createStringLiteral("entityId"))
                                    ] : [
                                        factory.createLiteralTypeNode(factory.createStringLiteral(foreignKey)),
                                        factory.createLiteralTypeNode(factory.createStringLiteral(`${foreignKey}Id`))
                                    ])
                                ]
                            ),
                            factory.createTypeReferenceNode(
                                createForeignRef(entity, entityName, 'Filter'),
                                undefined
                            )
                        ]
                    );

                    if (!Schema[entityName].static) {
                        switch (Schema[entityName].actionType) {
                            case 'crud': {
                                propertySignatures.push(
                                    factory.createPropertySignature(
                                        undefined,
                                        factory.createIdentifier(identifier),
                                        factory.createToken(ts.SyntaxKind.QuestionToken),
                                        factory.createUnionTypeNode([
                                            otmUpdateOperationNode,
                                            otmCreateMultipleOperationNode,
                                            factory.createTypeReferenceNode(
                                                factory.createIdentifier("Array"),
                                                [factory.createUnionTypeNode([
                                                    otmCreateSingleOperationNode,
                                                    otmUpdateOperationNode
                                                ])]
                                            )
                                        ])
                                    )
                                );
                                break;
                            }
                            case 'appendOnly':
                            case 'excludeUpdate': {
                                propertySignatures.push(
                                    factory.createPropertySignature(
                                        undefined,
                                        factory.createIdentifier(identifier),
                                        factory.createToken(ts.SyntaxKind.QuestionToken),
                                        factory.createUnionTypeNode([
                                            otmCreateMultipleOperationNode,
                                            factory.createTypeReferenceNode(
                                                factory.createIdentifier("Array"),
                                                [otmCreateSingleOperationNode]
                                            )
                                        ])
                                    )
                                );
                                break;
                            }
                            case 'readOnly': {
                                break;
                            }
                            default: {
                                assert(false);
                            }
                        }
                    }
                }
            );
        }
    }
    if (propertySignatures.length > 0) {
        adNodes.push(
            factory.createTypeLiteralNode(
                propertySignatures
            )
        );
    }
    statements.push(
        factory.createTypeAliasDeclaration(
            undefined,
            [factory.createModifier(ts.SyntaxKind.ExportKeyword)],
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
                        factory.createIdentifier("CreateOperationData")
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
                            factory.createIdentifier("CreateOperationData")
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
                    factory.createIdentifier("CreateSingleOperation")
                ),
                factory.createTypeReferenceNode(
                    factory.createIdentifier("CreateMultipleOperation")
                )
            ])
        )
    );

    // UpdateOperationData
    foreignKeyAttr = [];
    if (ReversePointerRelations[entity]) {
        foreignKeyAttr.push('entity', 'entityId');
    }
    if (manyToOneSet) {
        for (const one of manyToOneSet) {
            if (!ReversePointerRelations[entity] || !ReversePointerRelations[entity].includes(one[1])) {
                foreignKeyAttr.push(`${one[1]}Id`);
            }
        }
    }
    adNodes = [
        factory.createTypeReferenceNode(
            factory.createIdentifier("FormUpdateData"),
            [
                foreignKeyAttr.length > 0 ? factory.createTypeReferenceNode(
                    factory.createIdentifier("Omit"),
                    [
                        factory.createTypeReferenceNode(
                            factory.createIdentifier("OpSchema"),
                            undefined
                        ),
                        factory.createUnionTypeNode(uniq(foreignKeyAttr).map(
                            ele => factory.createLiteralTypeNode(factory.createStringLiteral(ele))
                        ))
                    ]
                ) : factory.createTypeReferenceNode(
                    factory.createIdentifier("OpSchema"),
                    undefined
                )
            ]
        )
    ];
    if (manyToOneSet) {
        /**
         * update的多对一有三种case
         * 如果关联对象是create，则对象的外键由关联对象的id决定
         * 如果关联对象是update或者remove，则关联对象的filter由对象(的原行！注意这里的外键是不能变的!)决定其主键
         * 见cascadeStore
         */
        const upsertOneNodes: ts.TypeNode[] = [];
        for (const one of manyToOneSet) {
            if (!ReversePointerRelations[entity] || !ReversePointerRelations[entity].includes(one[0])) {
                const cascadeCreateNode = factory.createTypeLiteralNode(
                    [
                        factory.createPropertySignature(
                            undefined,
                            factory.createIdentifier(one[1]),
                            undefined,
                            factory.createTypeReferenceNode(
                                createForeignRef(entity, one[0], 'CreateSingleOperation')
                            )
                        ),
                        factory.createPropertySignature(
                            undefined,
                            factory.createIdentifier(`${one[1]}Id`),
                            factory.createToken(ts.SyntaxKind.QuestionToken),
                            factory.createKeywordTypeNode(ts.SyntaxKind.NeverKeyword)
                        ),
                    ]
                );
                const cascadeUpdateNode = factory.createTypeLiteralNode(
                    [
                        factory.createPropertySignature(
                            undefined,
                            factory.createIdentifier(one[1]),
                            undefined,
                            factory.createTypeReferenceNode(
                                createForeignRef(entity, one[0], 'UpdateOperation')
                            ),
                        ),
                        factory.createPropertySignature(
                            undefined,
                            factory.createIdentifier(`${one[1]}Id`),
                            factory.createToken(ts.SyntaxKind.QuestionToken),
                            factory.createKeywordTypeNode(ts.SyntaxKind.NeverKeyword)
                        ),
                    ]
                );
                const cascadeRemoveNode = factory.createTypeLiteralNode(
                    [
                        factory.createPropertySignature(
                            undefined,
                            factory.createIdentifier(one[1]),
                            undefined,
                            factory.createTypeReferenceNode(
                                createForeignRef(entity, one[0], 'RemoveOperation')
                            )
                        ),
                        factory.createPropertySignature(
                            undefined,
                            factory.createIdentifier(`${one[1]}Id`),
                            factory.createToken(ts.SyntaxKind.QuestionToken),
                            factory.createKeywordTypeNode(ts.SyntaxKind.NeverKeyword)
                        ),
                    ]
                );
                const noCascadeNode = factory.createTypeLiteralNode(
                    [
                        factory.createPropertySignature(
                            undefined,
                            factory.createIdentifier(one[1]),
                            factory.createToken(ts.SyntaxKind.QuestionToken),
                            factory.createKeywordTypeNode(ts.SyntaxKind.NeverKeyword)
                        ),
                        factory.createPropertySignature(
                            undefined,
                            factory.createIdentifier(`${one[1]}Id`),
                            factory.createToken(ts.SyntaxKind.QuestionToken),
                            factory.createUnionTypeNode(
                                [
                                    factory.createTypeReferenceNode(
                                        factory.createIdentifier("String"),
                                        [factory.createLiteralTypeNode(factory.createNumericLiteral("64"))]
                                    ),
                                    factory.createLiteralTypeNode(factory.createNull())
                                ]
                            )
                        ),
                    ]
                );
                if (Schema[one[0]].static) {
                    upsertOneNodes.push(
                        noCascadeNode
                    );
                }
                else {
                    switch (Schema[one[0]].actionType) {
                        case 'crud': {
                            upsertOneNodes.push(
                                factory.createUnionTypeNode([cascadeCreateNode, cascadeUpdateNode, cascadeRemoveNode, noCascadeNode])
                            );
                            break;
                        }
                        case 'excludeUpdate': {
                            upsertOneNodes.push(
                                factory.createUnionTypeNode([cascadeCreateNode, cascadeRemoveNode, noCascadeNode])
                            );
                            break;
                        }
                        case 'appendOnly': {
                            upsertOneNodes.push(
                                factory.createUnionTypeNode([cascadeCreateNode, noCascadeNode])
                            );
                            break;
                        }
                        case 'readOnly': {
                            upsertOneNodes.push(
                                noCascadeNode
                            );
                            break;
                        }
                        case 'excludeRemove': {
                            upsertOneNodes.push(
                                factory.createUnionTypeNode([cascadeCreateNode, cascadeUpdateNode, noCascadeNode])
                            );
                            break;
                        }
                        default: {
                            assert(false);
                        }
                    }
                }
            }
        }
        if (upsertOneNodes.length > 0) {
            adNodes.push(
                factory.createIntersectionTypeNode(
                    upsertOneNodes
                )
            );
        }

        const reverseOneNodes: ts.TypeNode[] = [];
        if (ReversePointerRelations[entity]) {
            const refEntityLitrals: (ts.TypeNode)[] = [];
            for (const one of ReversePointerRelations[entity]) {
                refEntityLitrals.push(factory.createLiteralTypeNode(factory.createStringLiteral(`${firstLetterLowerCase(one)}`)));
                const actionNodes: ts.TypeNode[] = [];
                if (!Schema[one].static) {
                    switch (Schema[one].actionType) {
                        case 'crud': {
                            actionNodes.push(
                                factory.createTypeReferenceNode(
                                    createForeignRef(entity, one, 'CreateSingleOperation')
                                ),
                                factory.createTypeReferenceNode(
                                    createForeignRef(entity, one, 'UpdateOperation')
                                ),
                                factory.createTypeReferenceNode(
                                    createForeignRef(entity, one, 'RemoveOperation')
                                )
                            );
                            break;
                        }
                        case 'excludeUpdate': {
                            actionNodes.push(
                                factory.createTypeReferenceNode(
                                    createForeignRef(entity, one, 'CreateSingleOperation')
                                ),
                                factory.createTypeReferenceNode(
                                    createForeignRef(entity, one, 'RemoveOperation')
                                )
                            );
                            break;
                        }
                        case 'excludeRemove': {
                            actionNodes.push(
                                factory.createTypeReferenceNode(
                                    createForeignRef(entity, one, 'CreateSingleOperation')
                                ),
                                factory.createTypeReferenceNode(
                                    createForeignRef(entity, one, 'UpdateOperation')
                                )
                            );
                            break;
                        }
                        case 'appendOnly': {
                            actionNodes.push(
                                factory.createTypeReferenceNode(
                                    createForeignRef(entity, one, 'CreateSingleOperation')
                                )
                            );
                            break;
                        }
                        case 'readOnly': {
                            break;
                        }
                        default: {
                            assert(false);
                        }
                    }
                }
                if (actionNodes.length > 0) {
                    reverseOneNodes.push(
                        factory.createTypeLiteralNode(
                            [
                                factory.createPropertySignature(
                                    undefined,
                                    factory.createIdentifier(firstLetterLowerCase(one)),
                                    factory.createToken(ts.SyntaxKind.QuestionToken),
                                    factory.createUnionTypeNode(actionNodes)
                                ),
                                factory.createPropertySignature(
                                    undefined,
                                    factory.createIdentifier('entityId'),
                                    factory.createToken(ts.SyntaxKind.QuestionToken),
                                    factory.createKeywordTypeNode(ts.SyntaxKind.NeverKeyword)
                                ),
                                factory.createPropertySignature(
                                    undefined,
                                    factory.createIdentifier('entity'),
                                    factory.createToken(ts.SyntaxKind.QuestionToken),
                                    factory.createKeywordTypeNode(ts.SyntaxKind.NeverKeyword)
                                )
                            ]
                        ),
                    );
                }
            }
            if (process.env.COMPLING_AS_LIB) {
                // 如果是base，要包容更多可能的反指
                refEntityLitrals.push(
                    factory.createKeywordTypeNode(ts.SyntaxKind.StringKeyword)
                );
            }

            reverseOneNodes.push(
                factory.createTypeLiteralNode(
                    [
                        factory.createPropertySignature(
                            undefined,
                            factory.createIdentifier('entity'),
                            factory.createToken(ts.SyntaxKind.QuestionToken),
                            factory.createUnionTypeNode(
                                [
                                    factory.createUnionTypeNode(refEntityLitrals),
                                    factory.createLiteralTypeNode(factory.createNull())
                                ]
                            )
                        ),
                        factory.createPropertySignature(
                            undefined,
                            factory.createIdentifier('entityId'),
                            factory.createToken(ts.SyntaxKind.QuestionToken),
                            factory.createUnionTypeNode(
                                [
                                    factory.createTypeReferenceNode(
                                        factory.createIdentifier("String"),
                                        [factory.createLiteralTypeNode(factory.createNumericLiteral("64"))]
                                    ),
                                    factory.createLiteralTypeNode(factory.createNull())
                                ]
                            )
                        )
                    ]
                )
            );
        }

        if (reverseOneNodes.length > 0) {
            adNodes.push(
                factory.createUnionTypeNode(
                    reverseOneNodes
                )
            );
        }
    }


    const propertySignatures2: ts.TypeElement[] = [];
    if (process.env.COMPLING_AS_LIB) {
        propertySignatures2.push(
            factory.createIndexSignature(
                undefined,
                undefined,
                [factory.createParameterDeclaration(
                    undefined,
                    undefined,
                    undefined,
                    factory.createIdentifier("k"),
                    undefined,
                    factory.createKeywordTypeNode(ts.SyntaxKind.StringKeyword),
                    undefined
                )],
                factory.createKeywordTypeNode(ts.SyntaxKind.AnyKeyword)
            )
        );
    }
    if (oneToManySet) {
        for (const entityName in foreignKeySet) {
            const entityNameLc = firstLetterLowerCase(entityName);
            foreignKeySet[entityName].forEach(
                (foreignKey) => {
                    const identifier = `${entityNameLc}s$${foreignKey}`;

                    const otmCreateOperationDataNode = factory.createTypeReferenceNode(
                        factory.createIdentifier("Omit"),
                        [
                            factory.createTypeReferenceNode(
                                createForeignRef(entity, entityName, 'CreateOperationData'),
                                undefined
                            ),
                            factory.createUnionTypeNode(foreignKey === 'entity' ? [
                                factory.createLiteralTypeNode(factory.createStringLiteral("entity")),
                                factory.createLiteralTypeNode(factory.createStringLiteral("entityId"))
                            ] : [
                                factory.createLiteralTypeNode(factory.createStringLiteral(foreignKey)),
                                factory.createLiteralTypeNode(factory.createStringLiteral(`${foreignKey}Id`))
                            ])
                        ]
                    );
                    const otmCreateSingleOperationNode = factory.createTypeReferenceNode(
                        factory.createIdentifier("OakOperation"),
                        [
                            factory.createLiteralTypeNode(factory.createStringLiteral("create")),
                            otmCreateOperationDataNode
                        ]
                    )
                    const otmCreateMultipleOperationNode = factory.createTypeReferenceNode(
                        factory.createIdentifier("OakOperation"),
                        [
                            factory.createLiteralTypeNode(factory.createStringLiteral("create")),
                            factory.createArrayTypeNode(
                                otmCreateOperationDataNode
                            )
                        ]
                    );
                    const otmUpdateOperationNode = factory.createTypeReferenceNode(
                        createForeignRef(entity, entityName, 'UpdateOperation'),
                        undefined
                    );
                    const otmRemoveOperationNode = factory.createTypeReferenceNode(
                        createForeignRef(entity, entityName, 'RemoveOperation'),
                        undefined
                    );
                    if (!Schema[entityName].static) {
                        switch (Schema[entityName].actionType) {
                            case 'crud': {
                                propertySignatures2.push(
                                    factory.createPropertySignature(
                                        undefined,
                                        factory.createIdentifier(identifier),
                                        factory.createToken(ts.SyntaxKind.QuestionToken),
                                        factory.createUnionTypeNode([
                                            otmUpdateOperationNode,
                                            otmRemoveOperationNode,
                                            otmCreateMultipleOperationNode,
                                            factory.createTypeReferenceNode(
                                                factory.createIdentifier("Array"),
                                                [factory.createUnionTypeNode([
                                                    otmCreateSingleOperationNode,
                                                    otmUpdateOperationNode,
                                                    otmRemoveOperationNode
                                                ])]
                                            )
                                        ])
                                    )
                                );
                                break;
                            }
                            case 'excludeUpdate': {
                                propertySignatures2.push(
                                    factory.createPropertySignature(
                                        undefined,
                                        factory.createIdentifier(identifier),
                                        factory.createToken(ts.SyntaxKind.QuestionToken),
                                        factory.createUnionTypeNode([
                                            otmRemoveOperationNode,
                                            otmCreateMultipleOperationNode,
                                            factory.createTypeReferenceNode(
                                                factory.createIdentifier("Array"),
                                                [factory.createUnionTypeNode([
                                                    otmCreateSingleOperationNode,
                                                    otmRemoveOperationNode
                                                ])]
                                            )
                                        ])
                                    )
                                );
                                break;
                            }
                            case 'excludeRemove': {
                                propertySignatures2.push(
                                    factory.createPropertySignature(
                                        undefined,
                                        factory.createIdentifier(identifier),
                                        factory.createToken(ts.SyntaxKind.QuestionToken),
                                        factory.createUnionTypeNode([
                                            otmUpdateOperationNode,
                                            otmCreateMultipleOperationNode,
                                            factory.createTypeReferenceNode(
                                                factory.createIdentifier("Array"),
                                                [factory.createUnionTypeNode([
                                                    otmCreateSingleOperationNode,
                                                    otmUpdateOperationNode
                                                ])]
                                            )
                                        ])
                                    )
                                );
                                break;
                            }
                            case 'appendOnly': {
                                propertySignatures2.push(
                                    factory.createPropertySignature(
                                        undefined,
                                        factory.createIdentifier(identifier),
                                        factory.createToken(ts.SyntaxKind.QuestionToken),
                                        factory.createUnionTypeNode([
                                            otmCreateMultipleOperationNode,
                                            factory.createTypeReferenceNode(
                                                factory.createIdentifier("Array"),
                                                [factory.createUnionTypeNode([
                                                    otmCreateSingleOperationNode
                                                ])]
                                            )
                                        ])
                                    )
                                );
                                break;
                            }
                            case 'readOnly': {
                                break;
                            }
                            default: {
                                assert(false);
                            }
                        }
                    }
                }
            );
        }
    }
    if (propertySignatures2.length > 0) {
        adNodes.push(
            factory.createTypeLiteralNode(
                propertySignatures2
            )
        );
    }
    statements.push(
        factory.createTypeAliasDeclaration(
            undefined,
            [factory.createModifier(ts.SyntaxKind.ExportKeyword)],
            factory.createIdentifier("UpdateOperationData"),
            undefined,
            factory.createIntersectionTypeNode(adNodes)
        )
    );

    // UpdateOperation
    const actionTypeNodes: ts.TypeNode[] = ActionAsts[entity] ? [
        factory.createTypeReferenceNode('ParticularAction'),
        factory.createLiteralTypeNode(factory.createStringLiteral("update"))
    ] : [
        factory.createLiteralTypeNode(factory.createStringLiteral("update"))
    ];
    if (process.env.COMPLING_AS_LIB) {
        actionTypeNodes.push(
            factory.createKeywordTypeNode(ts.SyntaxKind.StringKeyword)
        );
    }
    statements.push(
        factory.createTypeAliasDeclaration(
            undefined,
            [factory.createModifier(ts.SyntaxKind.ExportKeyword)],
            factory.createIdentifier("UpdateOperation"),
            undefined,
            factory.createTypeReferenceNode(
                factory.createIdentifier("OakOperation"),
                [
                    factory.createUnionTypeNode(actionTypeNodes),
                    factory.createTypeReferenceNode(
                        factory.createIdentifier("UpdateOperationData")
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

    // RemoveOperationData
    adNodes = [
        factory.createTypeLiteralNode([])
    ];
    if (manyToOneSet) {
        /**
         * remove的多对一有两种case         
         * 如果关联对象动作是update或者remove，则关联对象的filter由对象(的原行！注意这里的外键是不能变的!)决定其主键
         * 见cascadeStore
         */
        const upsertOneNodes: ts.TypeNode[] = [];
        for (const one of manyToOneSet) {
            if (!ReversePointerRelations[entity] || !ReversePointerRelations[entity].includes(one[0])) {
                if (!Schema[one[0]].static) {
                    switch (Schema[one[0]].actionType) {
                        case 'crud': {
                            upsertOneNodes.push(
                                factory.createUnionTypeNode(
                                    [
                                        factory.createTypeLiteralNode(
                                            [
                                                factory.createPropertySignature(
                                                    undefined,
                                                    factory.createIdentifier(one[1]),
                                                    factory.createToken(ts.SyntaxKind.QuestionToken),
                                                    factory.createUnionTypeNode([
                                                        factory.createTypeReferenceNode(
                                                            createForeignRef(entity, one[0], 'UpdateOperation')
                                                        ),
                                                        factory.createTypeReferenceNode(
                                                            createForeignRef(entity, one[0], 'RemoveOperation')
                                                        )
                                                    ])
                                                )
                                            ]
                                        )
                                    ]
                                )
                            );
                            break;
                        }
                        case 'excludeUpdate': {
                            upsertOneNodes.push(
                                factory.createUnionTypeNode(
                                    [
                                        factory.createTypeLiteralNode(
                                            [
                                                factory.createPropertySignature(
                                                    undefined,
                                                    factory.createIdentifier(one[1]),
                                                    factory.createToken(ts.SyntaxKind.QuestionToken),
                                                    factory.createTypeReferenceNode(
                                                        createForeignRef(entity, one[0], 'RemoveOperation')
                                                    )
                                                )
                                            ]
                                        )
                                    ]
                                )
                            );
                            break;
                        }
                        case 'excludeRemove': {
                            upsertOneNodes.push(
                                factory.createUnionTypeNode(
                                    [
                                        factory.createTypeLiteralNode(
                                            [
                                                factory.createPropertySignature(
                                                    undefined,
                                                    factory.createIdentifier(one[1]),
                                                    factory.createToken(ts.SyntaxKind.QuestionToken),
                                                    factory.createTypeReferenceNode(
                                                        createForeignRef(entity, one[0], 'UpdateOperation')
                                                    )
                                                )
                                            ]
                                        )
                                    ]
                                )
                            );
                            break;
                        }
                        case 'appendOnly':
                        case 'readOnly': {
                            break;
                        }
                        default: {
                            assert(false);
                        }
                    }
                }
            }
        }

        const reverseOneNodes: ts.TypeNode[] = [];
        if (ReversePointerRelations[entity]) {
            const refEntityLitrals: (ts.TypeNode)[] = [];
            for (const one of ReversePointerRelations[entity]) {
                refEntityLitrals.push(factory.createLiteralTypeNode(factory.createStringLiteral(`${firstLetterLowerCase(one)}`)));
                if (!Schema[one].static) {
                    switch (Schema[one].actionType) {
                        case 'crud': {
                            reverseOneNodes.push(
                                factory.createTypeLiteralNode(
                                    [
                                        factory.createPropertySignature(
                                            undefined,
                                            factory.createIdentifier(firstLetterLowerCase(one)),
                                            factory.createToken(ts.SyntaxKind.QuestionToken),
                                            factory.createUnionTypeNode([
                                                factory.createTypeReferenceNode(
                                                    createForeignRef(entity, one, 'UpdateOperation')
                                                ),
                                                factory.createTypeReferenceNode(
                                                    createForeignRef(entity, one, 'RemoveOperation')
                                                )
                                            ])
                                        )
                                    ]
                                ),
                            );
                            break;
                        }
                        case 'excludeUpdate': {
                            reverseOneNodes.push(
                                factory.createTypeLiteralNode(
                                    [
                                        factory.createPropertySignature(
                                            undefined,
                                            factory.createIdentifier(firstLetterLowerCase(one)),
                                            factory.createToken(ts.SyntaxKind.QuestionToken),
                                            factory.createTypeReferenceNode(
                                                createForeignRef(entity, one, 'RemoveOperation')
                                            )
                                        )
                                    ]
                                ),
                            );
                            break;
                        }
                        case 'excludeRemove': {
                            reverseOneNodes.push(
                                factory.createTypeLiteralNode(
                                    [
                                        factory.createPropertySignature(
                                            undefined,
                                            factory.createIdentifier(firstLetterLowerCase(one)),
                                            factory.createToken(ts.SyntaxKind.QuestionToken),
                                            factory.createTypeReferenceNode(
                                                createForeignRef(entity, one, 'UpdateOperation')
                                            )
                                        )
                                    ]
                                ),
                            );
                            break;
                        }
                        case 'appendOnly':
                        case 'readOnly': {
                            break;
                        }
                        default: {
                            assert(false);
                        }
                    }
                }

            }
            if (process.env.COMPLING_AS_LIB) {
                reverseOneNodes.push(
                    factory.createTypeLiteralNode(
                        [
                            factory.createIndexSignature(
                                undefined,
                                undefined,
                                [factory.createParameterDeclaration(
                                    undefined,
                                    undefined,
                                    undefined,
                                    factory.createIdentifier("k"),
                                    undefined,
                                    factory.createKeywordTypeNode(ts.SyntaxKind.StringKeyword),
                                    undefined
                                )],
                                factory.createKeywordTypeNode(ts.SyntaxKind.AnyKeyword)
                            )
                        ]
                    )
                )
            }
        }

        if (upsertOneNodes.length > 0) {
            adNodes.push(
                factory.createIntersectionTypeNode(
                    upsertOneNodes
                )
            );
        }
        if (reverseOneNodes.length > 0) {
            adNodes.push(
                factory.createUnionTypeNode(
                    reverseOneNodes
                )
            );
        }
    }

    /**
     *  remove的同时进行cascade update或者cascade remove，感觉用触发器会更自然，因为在用户界面上似乎不会有对应的操作。
     *  这部分代码暂时封闭 by Xc 20220501
     **/

    /* const propertySignatures3: ts.TypeElement[] = [];
    if (process.env.COMPLING_AS_LIB) {
        propertySignatures3.push(
            factory.createIndexSignature(
                undefined,
                undefined,
                [factory.createParameterDeclaration(
                    undefined,
                    undefined,
                    undefined,
                    factory.createIdentifier("k"),
                    undefined,
                    factory.createKeywordTypeNode(ts.SyntaxKind.StringKeyword),
                    undefined
                )],
                factory.createKeywordTypeNode(ts.SyntaxKind.AnyKeyword)
            )
        );
    }
    if (oneToManySet) {
        for (const entityName in foreignKeySet) {
            const entityNameLc = firstLetterLowerCase(entityName);
            foreignKeySet[entityName].forEach(
                (foreignKey) => {
                    const identifier = `${entityNameLc}s$${foreignKey}`;
                    propertySignatures3.push(
                        factory.createPropertySignature(
                            undefined,
                            factory.createIdentifier(identifier),
                            factory.createToken(ts.SyntaxKind.QuestionToken),
                            factory.createUnionTypeNode([
                                factory.createTypeReferenceNode(
                                    createForeignRef(entity, entityName, 'UpdateOperation'),
                                    undefined
                                ),
                                factory.createTypeReferenceNode(
                                    createForeignRef(entity, entityName, 'RemoveOperation'),
                                    undefined
                                ),
                                factory.createTypeReferenceNode(
                                    factory.createIdentifier("Array"),
                                    [factory.createUnionTypeNode([
                                        factory.createTypeReferenceNode(
                                            createForeignRef(entity, entityName, 'UpdateOperation'),
                                            undefined
                                        ),
                                        factory.createTypeReferenceNode(
                                            createForeignRef(entity, entityName, 'RemoveOperation'),
                                            undefined
                                        )
                                    ])]
                                )
                            ])
                        )
                    );
                }
            );
        }
    }
    if (propertySignatures3.length > 0) {
        adNodes.push(
            factory.createTypeLiteralNode(
                propertySignatures3
            )
        );
    } */

    statements.push(
        factory.createTypeAliasDeclaration(
            undefined,
            [factory.createModifier(ts.SyntaxKind.ExportKeyword)],
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
                    ),
                    factory.createTypeReferenceNode(
                        factory.createIdentifier("Sorter"),
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
                    factory.createImportSpecifier(
                        false,
                        undefined,
                        factory.createIdentifier('Geo')
                    ),
                    factory.createImportSpecifier(
                        false,
                        undefined,
                        factory.createIdentifier('SingleGeo')
                    )
                ]
            )
        ),
        factory.createStringLiteral(`${TYPE_PATH_IN_OAK_DOMAIN()}DataType`)
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
        factory.createStringLiteral(`${TYPE_PATH_IN_OAK_DOMAIN()}Demand`)
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
        factory.createStringLiteral(`${TYPE_PATH_IN_OAK_DOMAIN()}Polyfill`)
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
                    undefined,
                    factory.createIdentifier("FormCreateData")
                ),
                factory.createImportSpecifier(
                    false,
                    undefined,
                    factory.createIdentifier("FormUpdateData")
                ),
                factory.createImportSpecifier(
                    false,
                    factory.createIdentifier("Operation"),
                    factory.createIdentifier("OakOperation")
                ),
                factory.createImportSpecifier(
                    false,
                    factory.createIdentifier("MakeAction"),
                    factory.createIdentifier("OakMakeAction")
                )
            ])
        ),
        factory.createStringLiteral(`${TYPE_PATH_IN_OAK_DOMAIN()}Entity`),
        undefined
    )
];

function outputSubQuery(outputDir: string, printer: ts.Printer) {
    const statements: ts.Statement[] = [];
    if (process.env.COMPLING_AS_LIB) {
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
                        factory.createIdentifier("Selection")
                    )])
                ),
                factory.createStringLiteral(TYPE_PATH_IN_OAK_DOMAIN(1)),
                undefined
            )
        );
    }
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

        const inUnionTypeNode: ts.TypeNode[] = fromEntites.map(
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
        );

        if (process.env.COMPLING_AS_LIB) {
            // 如果是建立 base，这里要加上额外可能的对象信息
            inUnionTypeNode.push(
                factory.createKeywordTypeNode(ts.SyntaxKind.AnyKeyword)
            );
        }
        statements.push(
            factory.createTypeAliasDeclaration(
                undefined,
                [factory.createModifier(ts.SyntaxKind.ExportKeyword)],
                factory.createIdentifier(identifier),
                undefined,
                factory.createMappedTypeNode(
                    undefined,
                    factory.createTypeParameterDeclaration(
                        undefined,
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
                        inUnionTypeNode
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

    if (/* process.env.COMPLING_AS_LIB */false) {
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
        if (ActionAsts[entity]) {
            const { importedFrom, actionDefNames } = ActionAsts[entity];
            const localActions: string[] = ['Action', 'ParticularAction'];
            for (const a in importedFrom) {
                assert(a.endsWith('Action'));
                const s = a.slice(0, a.length - 6).concat('State');
                if (importedFrom[a] === 'local' && actionDefNames.includes(firstLetterLowerCase(a.slice(0, a.length - 6)))) {
                    localActions.push(s);
                }
                else if (actionDefNames.includes(firstLetterLowerCase(a.slice(0, a.length - 6)))) {
                    const { moduleSpecifier } = importedFrom[a] as ts.ImportDeclaration;
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
                                            factory.createIdentifier(s)
                                        )
                                    ]
                                )
                            ),
                            moduleSpecifier,
                            undefined
                        )
                    );
                }
            }
            statements.push(
                factory.createImportDeclaration(
                    undefined,
                    undefined,
                    factory.createImportClause(
                        false,
                        undefined,
                        factory.createNamedImports(localActions.map(
                            ele => factory.createImportSpecifier(
                                false,
                                undefined,
                                factory.createIdentifier(ele)
                            )
                        ))
                    ),
                    factory.createStringLiteral('./Action'),
                    undefined
                )
            );
        }
        else {
            statements.push(
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
                                factory.createIdentifier("GenericAction")
                            ),
                            factory.createImportSpecifier(
                                false,
                                undefined,
                                factory.createIdentifier("AppendOnlyAction")
                            ),
                            factory.createImportSpecifier(
                                false,
                                undefined,
                                factory.createIdentifier("ReadOnlyAction")
                            ),
                            factory.createImportSpecifier(
                                false,
                                undefined,
                                factory.createIdentifier("ExcludeUpdateAction")
                            ),
                            factory.createImportSpecifier(
                                false,
                                undefined,
                                factory.createIdentifier("ExcludeRemoveAction")
                            ),
                        ])
                    ),
                    factory.createStringLiteral(ACTION_CONSTANT_IN_OAK_DOMAIN()),
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

        const actionTypeNode: ts.TypeNode = factory.createTypeReferenceNode(
            factory.createIdentifier('OakMakeAction'),
            [
                ActionAsts[entity] ? factory.createTypeReferenceNode('Action') : factory.createTypeReferenceNode(
                    OriginActionDict[Schema[entity].actionType as keyof typeof OriginActionDict],
                )
            ]
        );
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
                process.env.COMPLING_AS_LIB ?
                    factory.createUnionTypeNode(
                        [
                            actionTypeNode,
                            factory.createKeywordTypeNode(ts.SyntaxKind.StringKeyword)
                        ]
                    ) : actionTypeNode
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
            factory.createPropertySignature(
                undefined,
                factory.createIdentifier("Create"),
                undefined,
                factory.createTypeReferenceNode(
                    factory.createIdentifier("CreateOperation"),
                    undefined
                )
            ),
            factory.createPropertySignature(
                undefined,
                factory.createIdentifier("Update"),
                undefined,
                factory.createTypeReferenceNode(
                    factory.createIdentifier("UpdateOperation"),
                    undefined
                )
            ),
            factory.createPropertySignature(
                undefined,
                factory.createIdentifier("Remove"),
                undefined,
                factory.createTypeReferenceNode(
                    factory.createIdentifier("RemoveOperation"),
                    undefined
                )
            ),
            factory.createPropertySignature(
                undefined,
                factory.createIdentifier("CreateSingle"),
                undefined,
                factory.createTypeReferenceNode(
                    factory.createIdentifier("CreateSingleOperation"),
                    undefined
                )
            ),
            factory.createPropertySignature(
                undefined,
                factory.createIdentifier("CreateMulti"),
                undefined,
                factory.createTypeReferenceNode(
                    factory.createIdentifier("CreateMultipleOperation"),
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
    const actionDictStatements: ts.Statement[] = [];
    const propertyAssignments: ts.PropertyAssignment[] = [];
    for (const entity in ActionAsts) {
        const { sourceFile, statements, importedFrom, actionDefNames } = ActionAsts[entity];
        const importStatements: ts.Statement[] = [];
        for (const k in importedFrom) {
            assert(k.endsWith('Action'));
            if (importedFrom[k] !== 'local') {
                importStatements.push(
                    importedFrom[k] as ts.ImportDeclaration
                );
            }
        }
        /* const actionDiff = difference(actionNames, actionDefNames);
        if (actionDiff.length > 0) {
            throw new Error(`action not conform to actionDef: ${actionDiff.join(',')}, entity: ${entity}`);
        } */
        statements.push(
            factory.createVariableStatement(
                [factory.createModifier(ts.SyntaxKind.ExportKeyword)],
                factory.createVariableDeclarationList(
                    [factory.createVariableDeclaration(
                        factory.createIdentifier("ActionDefDict"),
                        undefined,
                        undefined,
                        factory.createObjectLiteralExpression(
                            actionDefNames.map(
                                ele => factory.createPropertyAssignment(
                                    factory.createIdentifier(`${ele}State`),
                                    factory.createIdentifier(`${firstLetterUpperCase(ele)}ActionDef`)
                                )
                            ),
                            true
                        )
                    )],
                    ts.NodeFlags.Const
                )
            )
        );
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

        actionDictStatements.push(
            factory.createImportDeclaration(
                undefined,
                undefined,
                factory.createImportClause(
                    false,
                    undefined,
                    factory.createNamedImports([factory.createImportSpecifier(
                        false,
                        factory.createIdentifier("ActionDefDict"),
                        factory.createIdentifier(entity)
                    )])
                ),
                factory.createStringLiteral(`./${entity}/Action`)
            )
        );
        propertyAssignments.push(
            factory.createPropertyAssignment(
                factory.createIdentifier(firstLetterLowerCase(entity)),
                factory.createIdentifier(entity)
            )
        );
    }

    actionDictStatements.push(
        factory.createVariableStatement(
            [factory.createModifier(ts.SyntaxKind.ExportKeyword)],
            factory.createVariableDeclarationList(
                [factory.createVariableDeclaration(
                    factory.createIdentifier("ActionDefDict"),
                    undefined,
                    undefined,
                    factory.createObjectLiteralExpression(
                        propertyAssignments,
                        true
                    )
                )],
                ts.NodeFlags.Const
            )
        )
    );

    const resultFile = ts.createSourceFile("someFileName.ts", "", ts.ScriptTarget.Latest, /*setParentNodes*/ false, ts.ScriptKind.TS);
    const result = printer.printNode(
        ts.EmitHint.Unspecified,
        factory.createSourceFile(actionDictStatements, factory.createToken(ts.SyntaxKind.EndOfFileToken),
            ts.NodeFlags.None),
        resultFile
    );

    const fileName = path.join(outputDir, 'ActionDefDict.ts');
    writeFileSync(fileName, result, { flag: 'w' });
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
                                                factory.createIdentifier("length"),
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
                        case 'SingleGeo':
                        case 'Geo': {
                            // object类型暂不支持查询
                            attrAssignments.push(
                                factory.createPropertyAssignment(
                                    factory.createIdentifier("type"),
                                    factory.createStringLiteral("geometry")
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
                                if (text.endsWith('State')) {
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
                                    // 引用的shape                                    
                                    attrAssignments.push(
                                        factory.createPropertyAssignment(
                                            factory.createIdentifier("type"),
                                            factory.createStringLiteral("object")
                                        ),
                                    );
                                }
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
                    if (ts.isLiteralTypeNode(type.types[0])) {
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
                                                factory.createIdentifier("width"),
                                                factory.createNumericLiteral(INT_LITERL_DEFAULT_WIDTH)
                                            )
                                        ],
                                        true
                                    )
                                )
                            );
                        }
                    }
                    else {
                        // 否则是本地规定的shape，直接用object
                        attrAssignments.push(
                            factory.createPropertyAssignment(
                                factory.createIdentifier("type"),
                                factory.createStringLiteral("object")
                            ),
                        );
                    }
                }
                else {
                    if (ts.isLiteralTypeNode(type!)) {
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
                    else {
                        // 否则是本地规定的shape，直接用object
                        attrAssignments.push(
                            factory.createPropertyAssignment(
                                factory.createIdentifier("type"),
                                factory.createStringLiteral("object")
                            ),
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

function outputLocale(outputDir: string, printer: ts.Printer) {
    const locales: Record<string, string[]> = {};
    const entities: string[] = [];
    for (const entity in Schema) {
        const { locale, sourceFile } = Schema[entity];
        if (locale) {
            const { properties } = locale;
            properties.forEach(
                (ele) => {
                    assert(ts.isPropertyAssignment(ele) && (ts.isIdentifier(ele.name) || ts.isStringLiteral(ele.name)) && ts.isObjectLiteralExpression(ele.initializer));
                    const lng = ele.name.text;

                    const result = printer.printList(
                        ts.ListFormat.SourceFileStatements,
                        factory.createNodeArray([
                            factory.createReturnStatement(
                                ele.initializer
                            )
                        ]),
                        sourceFile);
                    const data = Function(result)();
                    const filename = path.join(outputDir, entity, 'locales', `${lng}.json`);
                    writeFileSync(filename, JSON.stringify(data), { flag: 'w' });

                    if (locales[lng]) {
                        locales[lng].push(entity);
                    }
                    else {
                        locales[lng] = [entity];
                    }
                }
            );
            entities.push(entity);
        }
    }

    for (const lng in locales) {
        if (locales[lng].length < entities.length) {
            const lack = difference(entities, locales[lng]);
            throw new Error(`${lng}语言定义中缺少了对象${lack.join(',')}的定义，请检查相应的定义文件`);
        }
        /* const statements: ts.Statement[] = locales[lng].map(
            (entity) => factory.createImportDeclaration(
                undefined,
                undefined,
                factory.createImportClause(
                    false,
                    factory.createIdentifier(firstLetterLowerCase(entity)),
                    undefined
                ),
                factory.createStringLiteral(`../${entity}/locales/${lng}`),
                undefined
            )
        );

        statements.push(
            factory.createExportAssignment(
                undefined,
                undefined,
                undefined,
                factory.createObjectLiteralExpression(
                    locales[lng].map(
                        ele => factory.createShorthandPropertyAssignment(
                            factory.createIdentifier(firstLetterLowerCase(ele)),
                            undefined
                        )
                    ),
                    true
                )
            )
        );

        const result = printer.printList(
            ts.ListFormat.SourceFileStatements,
            factory.createNodeArray(statements),
            ts.createSourceFile("someFileName.ts", "", ts.ScriptTarget.Latest,  false, ts.ScriptKind.TS));
        const filename = path.join(outputDir, '_locales', `${lng}.ts`);
        writeFileSync(filename, result, { flag: 'w' }); */
    }
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
        const { sourceFile, inModi, indexes, toModi, actionType, static: _static } = Schema[entity];
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
                factory.createStringLiteral(`${TYPE_PATH_IN_OAK_DOMAIN()}Storage`),
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
        switch (actionType) {
            case 'readOnly': {
                statements.push(
                    factory.createImportDeclaration(
                        undefined,
                        undefined,
                        factory.createImportClause(
                            false,
                            undefined,
                            factory.createNamedImports([factory.createImportSpecifier(
                                false,
                                factory.createIdentifier("readOnlyActions"),
                                factory.createIdentifier("actions")
                            )])
                        ),
                        factory.createStringLiteral(ACTION_CONSTANT_IN_OAK_DOMAIN()),
                        undefined
                    )
                );
                break;
            }
            case 'appendOnly': {
                statements.push(
                    factory.createImportDeclaration(
                        undefined,
                        undefined,
                        factory.createImportClause(
                            false,
                            undefined,
                            factory.createNamedImports([factory.createImportSpecifier(
                                false,
                                factory.createIdentifier("appendOnlyActions"),
                                factory.createIdentifier("actions")
                            )])
                        ),
                        factory.createStringLiteral(ACTION_CONSTANT_IN_OAK_DOMAIN()),
                        undefined
                    )
                );
                break;
            }
            case 'excludeUpdate': {
                statements.push(
                    factory.createImportDeclaration(
                        undefined,
                        undefined,
                        factory.createImportClause(
                            false,
                            undefined,
                            factory.createNamedImports([factory.createImportSpecifier(
                                false,
                                factory.createIdentifier("excludeUpdateActions"),
                                factory.createIdentifier("actions")
                            )])
                        ),
                        factory.createStringLiteral(ACTION_CONSTANT_IN_OAK_DOMAIN()),
                        undefined
                    )
                );
                break;
            }
            default: {
                if (ActionAsts[entity]) {
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
                                    factory.createIdentifier("actions")
                                )])
                            ),
                            factory.createStringLiteral("./Action"),
                            undefined
                        )
                    );
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
                                    factory.createIdentifier("genericActions"),
                                    factory.createIdentifier("actions")
                                )])
                            ),
                            factory.createStringLiteral(ACTION_CONSTANT_IN_OAK_DOMAIN()),
                            undefined
                        )
                    );
                }
            }
        }

        const propertyAssignments: (ts.PropertyAssignment | ts.ShorthandPropertyAssignment)[] = [];
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
        if (toModi) {
            propertyAssignments.push(
                factory.createPropertyAssignment(
                    factory.createIdentifier("toModi"),
                    factory.createTrue()
                )
            );
        }

        if (inModi) {
            propertyAssignments.push(
                factory.createPropertyAssignment(
                    factory.createIdentifier("inModi"),
                    factory.createTrue()
                )
            );
        }

        if (_static || actionType === 'readOnly') {
            propertyAssignments.push(
                factory.createPropertyAssignment(
                    factory.createIdentifier("static"),
                    factory.createTrue()
                )
            );
        }

        propertyAssignments.push(
            factory.createPropertyAssignment(
                factory.createIdentifier("actionType"),
                factory.createStringLiteral(actionType)
            ),
            factory.createShorthandPropertyAssignment(
                factory.createIdentifier("actions"),
                undefined
            )
        );

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
        mkdirSync(path.join(outputDir, moduleName));
        mkdirSync(path.join(outputDir, moduleName, 'locales'));
    }
    mkdirSync(path.join(outputDir, '_locales'))
}

function addReverseRelationship() {
    for (const reverseEntity in ReversePointerRelations) {
        if (!ReversePointerEntities.hasOwnProperty(reverseEntity)) {
            throw new Error(`「${reverseEntity}」被引用为一个反指对象，但其定义中的entity和entityId不符合要求`);
        }
        for (const one of ReversePointerRelations[reverseEntity]) {
            addRelationship(reverseEntity, one, 'entity', false);
        }
    }
}

function outputIndexTs(outputDir: string) {
    const indexTs = `export * from './EntityDict';
    export * from './Storage';
    export * from './ActionDefDict';
    `;
    const filename = path.join(outputDir, 'index.ts');
    writeFileSync(filename, indexTs, { flag: 'w' });
}

function outputPackageJson(outputDir: string) {
    const pj = {
        "name": process.env.COMPLING_AS_LIB ? "general-app-domain" : "oak-app-domain",
        "main": "index.ts"
    };

    const filename = path.join(outputDir, 'package.json');
    writeFileSync(filename, JSON.stringify(pj), { flag: 'w' });
}

/**
 * （从toModi的对象开始）分析可能被modi指向的对象
 */
function analyzeInModi() {
    const getRelateEntities = (entity: string) => {
        let result: string[] = [];
        if (ManyToOne[entity]) {
            // 用反指指针指向的对象可以忽略，因为前端不可能设计出这样的更新页面
            result = ManyToOne[entity].filter(
                ele => ele[1] !== 'entity'
            ).map(
                ele => ele[0]
            );
        }

        if (OneToMany[entity]) {
            result.push(
                ...OneToMany[entity].map(
                    ele => ele[0]
                )
            );
        }
        return uniq(result);
    };
    const setInModi = (entity: string) => {
        if (['Modi', 'ModiEntity', 'Oper', 'OperEntity', 'User'].includes(entity)) {
            return;
        }
        const schema = Schema[entity];
        if (schema.toModi || schema.inModi || schema.actionType === 'readOnly' || schema.static) {
            return;
        }
        console.log('setInModi', entity);
        schema.inModi = true;
        const related = getRelateEntities(entity);
        related.forEach(
            ele => setInModi(ele)
        );
    };
    for (const entity in Schema) {
        if (Schema[entity].toModi) {
            const related = getRelateEntities(entity);
            related.forEach(
                ele => setInModi(ele)
            );
        }
    }
}

export function analyzeEntities(inputDir: string) {
    const files = readdirSync(inputDir);
    const fullFilenames = files.map(
        ele => {
            const entity = ele.slice(0, ele.indexOf('.'))
            if (RESERVED_ENTITIES.includes(entity) || RESERVED_ENTITIES.find(
                ele2 => entity.startsWith(ele2)
            )) {
                throw new Error(`${ele}是系统保留字，请勿使用其当对象名或对象名前缀`);
            }
            return `${inputDir}/${ele}`;
        }
    );

    const program = ts.createProgram(fullFilenames, { allowJs: true });

    files.forEach(
        (filename) => {
            analyzeEntity(filename, inputDir, program);
        }
    );
    analyzeInModi();
}

export function buildSchema(outputDir: string): void {
    addReverseRelationship();
    const printer = ts.createPrinter({ newLine: ts.NewLineKind.LineFeed });
    resetOutputDir(outputDir);
    outputSchema(outputDir, printer);
    outputLocale(outputDir, printer);
    outputSubQuery(outputDir, printer);
    outputAction(outputDir, printer);
    outputEntityDict(outputDir, printer);
    outputStorage(outputDir, printer);
    outputIndexTs(outputDir);

    if (!process.env.COMPLING_AS_LIB) {
        outputPackageJson(outputDir);
    }
}
