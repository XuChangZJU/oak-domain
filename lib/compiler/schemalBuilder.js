"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    Object.defineProperty(o, k2, { enumerable: true, get: function() { return m[k]; } });
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.buildSchema = exports.analyzeEntities = void 0;
const path_1 = __importDefault(require("path"));
const assert_1 = __importDefault(require("assert"));
const fs_1 = require("fs");
const fs_extra_1 = require("fs-extra");
const lodash_1 = require("lodash");
const ts = __importStar(require("typescript"));
const { factory } = ts;
const env_1 = require("./env");
const utils_1 = require("./utils");
const Schema = {};
const OneToMany = {};
const ManyToOne = {};
const ReversePointerEntities = {};
const ReversePointerRelations = {};
const ActionImportStatements = () => [
    factory.createImportDeclaration(undefined, undefined, factory.createImportClause(false, undefined, factory.createNamedImports([factory.createImportSpecifier(false, undefined, factory.createIdentifier("ActionDef"))])), factory.createStringLiteral(`${(0, env_1.TYPE_PATH_IN_OAK_DOMAIN)()}Action`), undefined),
    factory.createImportDeclaration(undefined, undefined, factory.createImportClause(false, undefined, factory.createNamedImports([factory.createImportSpecifier(false, undefined, factory.createIdentifier("GenericAction"))])), factory.createStringLiteral((0, env_1.ACTION_CONSTANT_IN_OAK_DOMAIN)()), undefined)
];
const ActionAsts = {};
const SchemaAsts = {};
function addRelationship(many, one, key, notNull) {
    const { [many]: manySet } = ManyToOne;
    const one2 = one === 'Schema' ? many : one;
    if (manySet) {
        manySet.push([one2, key, notNull]);
    }
    else {
        (0, lodash_1.assign)(ManyToOne, {
            [many]: [[one2, key, notNull]],
        });
    }
    const { [one2]: oneSet } = OneToMany;
    if (oneSet) {
        oneSet.push([many, key, notNull]);
    }
    else {
        (0, lodash_1.assign)(OneToMany, {
            [one2]: [[many, key, notNull]],
        });
    }
}
function createForeignRef(entity, foreignKey, ref) {
    if (entity === foreignKey) {
        return factory.createIdentifier(ref);
    }
    return factory.createQualifiedName(factory.createIdentifier(foreignKey), factory.createIdentifier(ref));
}
function pushStatementIntoActionAst(moduleName, node, sourceFile) {
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
        declarations.forEach((declaration) => {
            if (ts.isIdentifier(declaration.name) && declaration.name.text.endsWith('ActionDef')) {
                const { text } = declaration.name;
                actionDefName = (0, utils_1.firstLetterLowerCase)(text.slice(0, text.length - 9));
            }
        });
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
        (0, lodash_1.assign)(ActionAsts, {
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
function pushStatementIntoSchemaAst(moduleName, statement, sourceFile) {
    if (SchemaAsts[moduleName]) {
        SchemaAsts[moduleName].statements.push(statement);
    }
    else {
        (0, lodash_1.assign)(SchemaAsts, {
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
function checkActionDefNameConsistent(filename, actionDefNode) {
    const { name, type } = actionDefNode;
    (0, assert_1.default)(ts.isTypeReferenceNode(type));
    const { typeArguments } = type;
    (0, assert_1.default)(typeArguments.length === 2);
    const [actionNode, stateNode] = typeArguments;
    (0, assert_1.default)(ts.isIdentifier(name), `文件${filename}中的ActionDef${name.text}不是一个有效的变量`);
    (0, assert_1.default)(name.text.endsWith('ActionDef'), `文件${filename}中的ActionDef${name.text}未以ActionDef结尾`);
    (0, assert_1.default)(ts.isTypeReferenceNode(actionNode) && ts.isTypeReferenceNode(stateNode), `文件${filename}中的ActionDef${name.text}类型声明中的action和state非法`);
    (0, assert_1.default)(ts.isIdentifier(actionNode.typeName) && ts.isIdentifier(stateNode.typeName));
    (0, assert_1.default)(actionNode.typeName.text.endsWith('Action'), `文件${filename}中的ActionDef${name.text}所引用的Action${actionNode.typeName}未以Action结尾`);
    (0, assert_1.default)(stateNode.typeName.text.endsWith('State'), `文件${filename}中的ActionDef${name.text}所引用的Action${stateNode.typeName}未以Action结尾`);
    const adfName = name.text.slice(0, name.text.length - 9);
    const aName = actionNode.typeName.text.slice(0, actionNode.typeName.text.length - 6);
    const sName = stateNode.typeName.text.slice(0, stateNode.typeName.text.length - 5);
    (0, assert_1.default)(adfName === aName && aName === sName, `文件${filename}中的ActionDef${name.text}中ActionDef, Action和State的命名规则不一致`);
}
function addActionSource(moduleName, name, node) {
    const ast = ActionAsts[moduleName];
    const { moduleSpecifier } = node;
    // 目前应该只会引用oak-domain/src/actions/action里的公共action
    (0, assert_1.default)(ts.isStringLiteral(moduleSpecifier) && moduleSpecifier.text === (0, env_1.ACTION_CONSTANT_IN_OAK_DOMAIN)());
    (0, lodash_1.assign)(ast.importedFrom, {
        [name.text]: node,
    });
}
function getStringTextFromUnionStringLiterals(moduleName, filename, node, program) {
    const checker = program.getTypeChecker();
    const symbol = checker.getSymbolAtLocation(node.typeName);
    let declaration = symbol?.getDeclarations()[0];
    let isImport = false;
    /* const typee = checker.getDeclaredTypeOfSymbol(symbol!);

    const declaration = typee.aliasSymbol!.getDeclarations()![0]; */
    if (ts.isImportSpecifier(declaration)) {
        isImport = true;
        const typee = checker.getDeclaredTypeOfSymbol(symbol);
        declaration = typee.aliasSymbol.getDeclarations()[0];
    }
    (0, assert_1.default)(ts.isTypeAliasDeclaration(declaration));
    const { type, name } = declaration;
    // assert(ts.isUnionTypeNode(type!) || ts.isLiteralTypeNode(type!), `${filename}中引用的action「${(<ts.Identifier>name).text}」的定义不是union和stringLiteral类型`);
    // 如果这个action是从外部导入的，在这里要记下来此entity和这个导入之间的关系
    if (isImport) {
        const importDeclartion = symbol.getDeclarations()[0].parent.parent.parent;
        (0, assert_1.default)(ts.isImportDeclaration(importDeclartion));
        addActionSource(moduleName, name, importDeclartion);
    }
    else {
        const ast = ActionAsts[moduleName];
        (0, lodash_1.assign)(ast.importedFrom, {
            [name.text]: 'local',
        });
    }
    const getStringLiteral = (ele) => {
        (0, assert_1.default)(ts.isLiteralTypeNode(ele) && ts.isStringLiteral(ele.literal), `${filename}中引用的action${name.text}中存在不是stringliteral的类型`);
        (0, assert_1.default)(!ele.literal.text.includes('$'), `${filename}中引用的action${name.text}中的action「${ele.literal.text}」包含非法字符$`);
        (0, assert_1.default)(ele.literal.text.length > 0, `${filename}中引用的action${name.text}中的action「${ele.literal.text}」长度非法`);
        (0, assert_1.default)(ele.literal.text.length < env_1.STRING_LITERAL_MAX_LENGTH, `${filename}中引用的action${name.text}中的action「${ele.literal.text}」长度过长`);
        return ele.literal.text;
    };
    if (ts.isUnionTypeNode(type)) {
        const actions = type.types.map(ele => getStringLiteral(ele));
        return actions;
    }
    else {
        (0, assert_1.default)(ts.isLiteralTypeNode(type), `${filename}中引用的action「${name.text}」的定义不是union和stringLiteral类型`);
        const action = getStringLiteral(type);
        return [action];
    }
}
const RESERVED_ACTION_NAMES = ['GenericAction', 'ParticularAction'];
const action_1 = require("../actions/action");
const DataType_1 = require("../types/DataType");
function dealWithActions(moduleName, filename, node, program) {
    const actionTexts = action_1.genericActions.map(ele => ele);
    if (ts.isUnionTypeNode(node)) {
        const actionNames = node.types.map(ele => {
            if (ts.isTypeReferenceNode(ele) && ts.isIdentifier(ele.typeName)) {
                return ele.typeName.text;
            }
        }).filter(ele => !!ele);
        (0, assert_1.default)((0, lodash_1.intersection)(actionNames, env_1.RESERVED_ENTITIES).length === 0, `${filename}中的Action命名不能是「${RESERVED_ACTION_NAMES.join(',')}」之一`);
        node.types.forEach(ele => {
            if (ts.isTypeReferenceNode(ele)) {
                actionTexts.push(...getStringTextFromUnionStringLiterals(moduleName, filename, ele, program));
            }
            else {
                (0, assert_1.default)(ts.isLiteralTypeNode(ele) && ts.isStringLiteral(ele.literal), `【${moduleName}】action的定义既非Type也不是string`);
                actionTexts.push(ele.literal.text);
            }
        });
    }
    else if (ts.isTypeReferenceNode(node)) {
        if (ts.isIdentifier(node.typeName)) {
            (0, assert_1.default)(!RESERVED_ACTION_NAMES.includes(node.typeName.text), `${filename}中的Action命名不能是「${RESERVED_ACTION_NAMES.join(',')}」之一`);
        }
        actionTexts.push(...getStringTextFromUnionStringLiterals(moduleName, filename, node, program));
    }
    else {
        (0, assert_1.default)(ts.isLiteralTypeNode(node) && ts.isStringLiteral(node.literal), `【${moduleName}】action的定义既非Type也不是string`);
        actionTexts.push(node.literal.text);
    }
    // 所有的action定义不能有重名
    const ActionDict = {};
    actionTexts.forEach((action) => {
        (0, assert_1.default)(action.length <= env_1.STRING_LITERAL_MAX_LENGTH, `${filename}中的Action「${action}」命名长度大于${env_1.STRING_LITERAL_MAX_LENGTH}`);
        if (ActionDict.hasOwnProperty(action)) {
            throw new Error(`文件${filename}中，Action定义上的【${action}】动作存在同名`);
        }
        else {
            (0, lodash_1.assign)(ActionDict, {
                [action]: 1,
            });
        }
    });
    // 为每个action在schema中建立相应的state域(除了genericState)
    // 放到actionDef的定义处去做。by Xc
}
function getEntityImported(declaration, filename) {
    const { moduleSpecifier, importClause } = declaration;
    let entityImported;
    if (ts.isStringLiteral(moduleSpecifier)) {
        if (moduleSpecifier.text.startsWith('./')) {
            entityImported = moduleSpecifier.text.slice(2);
        }
        else if (moduleSpecifier.text.startsWith((0, env_1.ENTITY_PATH_IN_OAK_GENERAL_BUSINESS)())) {
            entityImported = moduleSpecifier.text.slice((0, env_1.ENTITY_PATH_IN_OAK_GENERAL_BUSINESS)().length);
        }
    }
    if (entityImported) {
        const { namedBindings } = importClause;
        (0, assert_1.default)(ts.isNamedImports(namedBindings));
        const { elements } = namedBindings;
        (0, assert_1.default)(elements.find(ele => ts.isImportSpecifier(ele) && ele.name.text === entityImported && ele.propertyName.text === 'Schema'), `「${filename}」导入的对象名称和对象所在的文件名称「${entityImported}」不符`);
        return entityImported;
    }
}
function analyzeEntity(filename, path, program) {
    const fullPath = `${path}/${filename}`;
    const sourceFile = program.getSourceFile(fullPath);
    const moduleName = filename.split('.')[0];
    const referencedSchemas = [];
    const schemaAttrs = [];
    let hasFulltextIndex = false;
    let indexes;
    let beforeSchema = true;
    ts.forEachChild(sourceFile, (node) => {
        if (ts.isImportDeclaration(node)) {
            const entityImported = getEntityImported(node, filename);
            if (entityImported) {
                referencedSchemas.push(entityImported);
            }
        }
        if (ts.isInterfaceDeclaration(node)) {
            // schema 定义
            if (node.name.text === 'Schema') {
                let hasEntityAttr = false;
                let hasEntityIdAttr = false;
                const { members, heritageClauses } = node;
                (0, assert_1.default)(heritageClauses[0].types[0].expression.text === 'EntityShape');
                members.forEach((attrNode) => {
                    const { type, name, questionToken } = attrNode;
                    const attrName = name.text;
                    if (ts.isTypeReferenceNode(type)
                        && ts.isIdentifier(type.typeName)) {
                        if ((referencedSchemas.includes(type.typeName.text) || type.typeName.text === 'Schema')) {
                            addRelationship(moduleName, type.typeName.text, attrName, !!questionToken);
                            schemaAttrs.push(attrNode);
                        }
                        else if (type.typeName.text === 'Array') {
                            // 这是一对多的反向指针的引用，需要特殊处理
                            const { typeArguments } = type;
                            (0, assert_1.default)(typeArguments.length === 1
                                && ts.isTypeReferenceNode(typeArguments[0])
                                && ts.isIdentifier(typeArguments[0].typeName)
                                && referencedSchemas.includes(typeArguments[0].typeName.text), `「${filename}」非法的属性定义「${attrName}」`);
                            const reverseEntity = typeArguments[0].typeName.text;
                            if (ReversePointerRelations[reverseEntity]) {
                                ReversePointerRelations[reverseEntity].push(moduleName);
                            }
                            else {
                                (0, lodash_1.assign)(ReversePointerRelations, {
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
                        && ts.isTypeReferenceNode(type)
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
                        && ts.isTypeReferenceNode(type)
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
                });
                if (hasEntityAttr && hasEntityIdAttr) {
                    (0, lodash_1.assign)(ReversePointerEntities, {
                        [moduleName]: 1,
                    });
                }
                beforeSchema = false;
            }
            else if (beforeSchema) {
                // 本地规定的一些形状定义，直接使用
                pushStatementIntoSchemaAst(moduleName, node, sourceFile);
            }
        }
        if (ts.isTypeAliasDeclaration(node)) {
            // action 定义
            if (node.name.text === 'Action') {
                const modifiers = [factory.createModifier(ts.SyntaxKind.ExportKeyword)];
                pushStatementIntoActionAst(moduleName, factory.updateTypeAliasDeclaration(node, node.decorators, modifiers, factory.createIdentifier('ParticularAction'), node.typeParameters, node.type), sourceFile);
                pushStatementIntoActionAst(moduleName, factory.createTypeAliasDeclaration(undefined, [factory.createModifier(ts.SyntaxKind.ExportKeyword)], factory.createIdentifier("Action"), undefined, factory.createUnionTypeNode([
                    factory.createTypeReferenceNode(factory.createIdentifier("GenericAction"), undefined),
                    factory.createTypeReferenceNode(factory.createIdentifier("ParticularAction"), undefined)
                ])), sourceFile);
                dealWithActions(moduleName, filename, node.type, program);
            }
            else if (node.name.text === 'Relation') {
                // 增加userXXX对象的描述
                if (ts.isLiteralTypeNode(node.type)) {
                    (0, assert_1.default)(ts.isStringLiteral(node.type.literal));
                    (0, assert_1.default)(node.type.literal.text.length < env_1.STRING_LITERAL_MAX_LENGTH, `Relation定义的字符串长度不长于${env_1.STRING_LITERAL_MAX_LENGTH}（${filename}，${node.type.literal.text}）`);
                }
                else {
                    (0, assert_1.default)(ts.isUnionTypeNode(node.type), `Relation的定义只能是string类型（${filename}）`);
                    node.type.types.forEach((ele) => {
                        (0, assert_1.default)(ts.isLiteralTypeNode(ele) && ts.isStringLiteral(ele.literal), `Relation的定义只能是string类型（${filename}）`);
                        (0, assert_1.default)(ele.literal.text.length < env_1.STRING_LITERAL_MAX_LENGTH, `Relation定义的字符串长度不长于${env_1.STRING_LITERAL_MAX_LENGTH}（${filename}，${ele.literal.text}）`);
                    });
                }
                const entityLc = (0, utils_1.firstLetterLowerCase)(moduleName);
                const relationEntityName = `User${moduleName}`;
                const relationSchemaAttrs = [
                    factory.createPropertySignature(undefined, factory.createIdentifier("user"), undefined, factory.createTypeReferenceNode(factory.createIdentifier("User"), undefined)),
                    factory.createPropertySignature(undefined, factory.createIdentifier(entityLc), undefined, factory.createTypeReferenceNode(factory.createIdentifier(moduleName), undefined)),
                    factory.createPropertySignature(undefined, factory.createIdentifier('relation'), undefined, node.type),
                ];
                (0, lodash_1.assign)(Schema, {
                    [relationEntityName]: {
                        schemaAttrs: relationSchemaAttrs,
                        sourceFile,
                    },
                });
                addRelationship(relationEntityName, 'User', 'user', true);
                addRelationship(relationEntityName, moduleName, entityLc, true);
            }
            else if (node.name.text.endsWith('Action') || node.name.text.endsWith('State')) {
                pushStatementIntoActionAst(moduleName, factory.updateTypeAliasDeclaration(node, node.decorators, [factory.createModifier(ts.SyntaxKind.ExportKeyword)], node.name, node.typeParameters, node.type), sourceFile);
            }
            else if (beforeSchema) {
                // 本地规定的一些形状定义，直接使用
                pushStatementIntoSchemaAst(moduleName, node, sourceFile);
            }
        }
        if (ts.isVariableStatement(node)) {
            const { declarationList: { declarations } } = node;
            declarations.forEach((declaration) => {
                if (ts.isIdentifier(declaration.name) && declaration.name.text.endsWith('ActionDef')) {
                    if (declaration.type && ts.isTypeReferenceNode(declaration.type) && ts.isIdentifier(declaration.type.typeName) && declaration.type.typeName.text === 'ActionDef') {
                        // 是显示的actionDef定义
                        checkActionDefNameConsistent(filename, declaration);
                        const { typeArguments } = declaration.type;
                        (0, assert_1.default)(typeArguments.length === 2);
                        const [actionNode, stateNode] = typeArguments;
                        const checker = program.getTypeChecker();
                        let symbol = checker.getSymbolAtLocation(actionNode.typeName);
                        let declaration2 = symbol.getDeclarations()[0];
                        if (declaration2.getSourceFile() === sourceFile) {
                            // pushStatementIntoActionAst(moduleName, <ts.TypeAliasDeclaration>declaration2, sourceFile);
                        }
                        symbol = checker.getSymbolAtLocation(stateNode.typeName);
                        declaration2 = symbol.getDeclarations()[0];
                        if (declaration2.getSourceFile() === sourceFile) {
                            // 检查state的定义合法
                            (0, assert_1.default)(ts.isTypeAliasDeclaration(declaration2) && ts.isUnionTypeNode(declaration2.type), `「${filename}」State「${declaration2.name}」的定义只能是或结点`);
                            declaration2.type.types.forEach((type) => {
                                (0, assert_1.default)(ts.isLiteralTypeNode(type) && ts.isStringLiteral(type.literal), `「${filename}」State「${declaration2.name}」的定义只能是字符串`);
                                (0, assert_1.default)(type.literal.text.length < env_1.STRING_LITERAL_MAX_LENGTH, `「${filename}」State「${type.literal.text}」的长度大于「${env_1.STRING_LITERAL_MAX_LENGTH}」`);
                            });
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
                    pushStatementIntoActionAst(moduleName, node, sourceFile);
                    const adName = declaration.name.text.slice(0, declaration.name.text.length - 9);
                    const attr = adName.concat('State');
                    schemaAttrs.push(factory.createPropertySignature(undefined, factory.createIdentifier((0, utils_1.firstLetterLowerCase)(attr)), factory.createToken(ts.SyntaxKind.QuestionToken), factory.createTypeReferenceNode(factory.createIdentifier(attr))));
                }
                else if (declaration.type && (ts.isArrayTypeNode(declaration.type)
                    && ts.isTypeReferenceNode(declaration.type.elementType)
                    && ts.isIdentifier(declaration.type.elementType.typeName)
                    && declaration.type.elementType.typeName.text === 'Index'
                    || ts.isTypeReferenceNode(declaration.type)
                        && ts.isIdentifier(declaration.type.typeName)
                        && declaration.type.typeName.text === 'Array'
                        && ts.isTypeReferenceNode(declaration.type.typeArguments[0])
                        && ts.isIdentifier(declaration.type.typeArguments[0].typeName)
                        && declaration.type.typeArguments[0].typeName.text === 'Index')) {
                    // 对索引Index的定义
                    const indexNameDict = {};
                    (0, assert_1.default)(ts.isArrayLiteralExpression(declaration.initializer), `「${filename}」Index「${declaration.name.getText()}」的定义必须符合规范`);
                    // todo 这里应该先做一个类型检查的，但不知道怎么写  by Xc
                    // 检查索引的属性是否合法
                    const { elements } = declaration.initializer;
                    elements.forEach((ele) => {
                        let isFulltextIndex = false;
                        (0, assert_1.default)(ts.isObjectLiteralExpression(ele));
                        const { properties } = ele;
                        const attrProperty = properties.find((ele2) => {
                            (0, assert_1.default)(ts.isPropertyAssignment(ele2));
                            return ele2.name.getText() === 'attributes';
                        });
                        (0, assert_1.default)(ts.isArrayLiteralExpression(attrProperty.initializer));
                        const nameProperty = properties.find((ele2) => {
                            (0, assert_1.default)(ts.isPropertyAssignment(ele2));
                            return ele2.name.getText() === 'name';
                        });
                        (0, assert_1.default)(ts.isStringLiteral(nameProperty.initializer));
                        const indexName = nameProperty.initializer.text;
                        if (indexNameDict[indexName]) {
                            throw new Error(`「${filename}」索引定义重名「${indexName}」`);
                        }
                        (0, lodash_1.assign)(indexNameDict, {
                            [indexName]: true,
                        });
                        const configProperty = properties.find((ele2) => {
                            (0, assert_1.default)(ts.isPropertyAssignment(ele2));
                            return ele2.name.getText() === 'config';
                        });
                        if (configProperty) {
                            (0, assert_1.default)(ts.isObjectLiteralExpression(configProperty.initializer));
                            const { properties: properties2 } = configProperty.initializer;
                            const typeProperty = properties2.find((ele2) => {
                                (0, assert_1.default)(ts.isPropertyAssignment(ele2));
                                return ele2.name.getText() === 'type';
                            });
                            if (typeProperty && typeProperty.initializer.text === 'fulltext') {
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
                        elements.forEach((ele2) => {
                            (0, assert_1.default)(ts.isObjectLiteralExpression(ele2));
                            const { properties: properties2 } = ele2;
                            const nameProperty = properties2.find((ele3) => {
                                (0, assert_1.default)(ts.isPropertyAssignment(ele3));
                                return ele3.name.getText() === 'name';
                            });
                            const indexAttrName = nameProperty.initializer.text;
                            const schemaNode = schemaAttrs.find((ele3) => {
                                (0, assert_1.default)(ts.isPropertySignature(ele3));
                                return ele3.name.text === indexAttrName;
                            });
                            if (!schemaNode) {
                                throw new Error(`「${filename}」中索引「${indexName}」的属性「${indexAttrName}」定义非法`);
                            }
                            const { type, name } = schemaNode;
                            const entity = (0, utils_1.firstLetterLowerCase)(moduleName);
                            const { [entity]: manyToOneSet } = ManyToOne;
                            if (ts.isTypeReferenceNode(type)) {
                                const { typeName } = type;
                                if (ts.isIdentifier(typeName)) {
                                    const { text } = typeName;
                                    const text2 = text === 'Schema' ? entity : text;
                                    const manyToOneItem = manyToOneSet && manyToOneSet.find(([refEntity, attrName]) => refEntity === text2 && attrName === name.text);
                                    if (!manyToOneItem) {
                                        // 如果不是外键，则不能是Text, File 
                                        if (isFulltextIndex) {
                                            (0, assert_1.default)(['Text', 'String'].includes(text2), `「${filename}」中全文索引「${indexName}」定义的属性「${indexAttrName}」类型非法，只能是Text/String`);
                                        }
                                        else {
                                            (0, assert_1.default)(!DataType_1.unIndexedTypes.includes(text2), `「${filename}」中索引「${indexName}」的属性「${indexAttrName}」的类型为「${text2}」，不可索引`);
                                        }
                                    }
                                    else {
                                        (0, assert_1.default)(!isFulltextIndex, `「${filename}」中全文索引「${indexName}」的属性「${indexAttrName}」类型非法，只能为Text/String`);
                                    }
                                }
                                else {
                                    (0, assert_1.default)(false); // 这是什么case，不确定
                                }
                            }
                            else {
                                (0, assert_1.default)(!isFulltextIndex, `「${filename}」中全文索引「${indexName}」的属性「${indexAttrName}」类型只能为Text/String`);
                                (0, assert_1.default)(ts.isUnionTypeNode(type) || ts.isLiteralTypeNode(type), `${entity}中索引「${indexName}」的属性${name.text}有定义非法`);
                            }
                        });
                    });
                    indexes = declaration.initializer;
                }
                else {
                    throw new Error(`不能理解的定义内容${declaration.name.getText()}`);
                }
            });
        }
    });
    (0, assert_1.default)(schemaAttrs.length > 0);
    const schema = {
        schemaAttrs,
        sourceFile,
    };
    if (hasFulltextIndex) {
        (0, lodash_1.assign)(schema, {
            fulltextIndex: true,
        });
    }
    if (indexes) {
        (0, lodash_1.assign)(schema, {
            indexes,
        });
    }
    (0, lodash_1.assign)(Schema, {
        [moduleName]: schema,
    });
}
/**
 * 生成Schema
 * @param statements
 * @param schemaAttrs
 * @param entity
 */
function constructSchema(statements, entity) {
    const { schemaAttrs } = Schema[entity];
    const members = [
        // id: String<64>
        factory.createPropertySignature(undefined, factory.createIdentifier('id'), undefined, factory.createTypeReferenceNode(factory.createIdentifier('PrimaryKey'))),
        // $$createAt$$: Datetime
        factory.createPropertySignature(undefined, factory.createIdentifier('$$createAt$$'), undefined, factory.createTypeReferenceNode(factory.createIdentifier('Datetime'))),
        // $$updateAt$$: Datetime
        factory.createPropertySignature(undefined, factory.createIdentifier('$$updateAt$$'), undefined, factory.createTypeReferenceNode(factory.createIdentifier('Datetime'))),
        // $$updateAt$$: Datetime
        factory.createPropertySignature(undefined, factory.createIdentifier('$$removeAt$$'), factory.createToken(ts.SyntaxKind.QuestionToken), factory.createUnionTypeNode([
            factory.createTypeReferenceNode(factory.createIdentifier('Datetime')),
            factory.createLiteralTypeNode(factory.createNull())
        ]))
    ];
    const members2 = [];
    const { [entity]: manyToOneSet } = ManyToOne;
    const { [entity]: oneToManySet } = OneToMany;
    const referenceEntities = [];
    for (const attr of schemaAttrs) {
        const { type, name, questionToken } = attr;
        const attrName = name.text;
        if (ts.isTypeReferenceNode(type)) {
            const { typeName } = type;
            if (ts.isIdentifier(typeName)) {
                const { text } = typeName;
                const text2 = text === 'Schema' ? entity : text;
                const manyToOneItem = manyToOneSet && manyToOneSet.find(([refEntity, attrName]) => refEntity === text2 && attrName === attrName);
                if (manyToOneItem) {
                    referenceEntities.push(text2);
                    members2.push(factory.createPropertySignature(undefined, name, questionToken, questionToken ? factory.createUnionTypeNode([
                        factory.createTypeReferenceNode(createForeignRef(entity, text2, 'Schema')),
                        factory.createLiteralTypeNode(factory.createNull())
                    ]) : factory.createTypeReferenceNode(createForeignRef(entity, text2, 'Schema'))));
                    const foreignKey = `${attrName}Id`;
                    members.push(factory.createPropertySignature(undefined, factory.createIdentifier(foreignKey), questionToken, questionToken ? factory.createUnionTypeNode([
                        factory.createTypeReferenceNode(factory.createIdentifier('ForeignKey'), [
                            factory.createLiteralTypeNode(factory.createStringLiteral((0, utils_1.firstLetterLowerCase)(text2)))
                        ]),
                        factory.createLiteralTypeNode(factory.createNull())
                    ]) : factory.createTypeReferenceNode(factory.createIdentifier('ForeignKey'), [
                        factory.createLiteralTypeNode(factory.createStringLiteral((0, utils_1.firstLetterLowerCase)(text2)))
                    ])));
                }
                else {
                    // assert(types.includes(text), `${entity}中的属性${name.toString()}有非法的属性类型定义`);
                    // 处理entity这种特殊情况
                    if (ReversePointerRelations[entity] && attrName === 'entity') {
                        const entityUnionTypeNode = ReversePointerRelations[entity].map(ele => factory.createLiteralTypeNode(factory.createStringLiteral((0, utils_1.firstLetterLowerCase)(ele))));
                        if (process.env.COMPLING_AS_LIB) {
                            // 如果是建立 base-domain，还要容纳可能的其它对象引用
                            entityUnionTypeNode.push(factory.createKeywordTypeNode(ts.SyntaxKind.StringKeyword));
                        }
                        members.push(factory.createPropertySignature(undefined, name, questionToken, questionToken ? factory.createUnionTypeNode([
                            factory.createUnionTypeNode(entityUnionTypeNode),
                            factory.createLiteralTypeNode(factory.createNull())
                        ]) : factory.createUnionTypeNode(entityUnionTypeNode)));
                    }
                    else {
                        members.push(factory.createPropertySignature(undefined, name, questionToken, questionToken ? factory.createUnionTypeNode([
                            type,
                            factory.createLiteralTypeNode(factory.createNull())
                        ]) : type));
                    }
                }
            }
            else {
                (0, assert_1.default)(false); // 这是什么case，不确定
                members.push(attr);
            }
        }
        else {
            (0, assert_1.default)(ts.isUnionTypeNode(type) || ts.isLiteralTypeNode(type), `${entity}中的属性${name.text}有非法的属性类型定义`);
            members.push(factory.createPropertySignature(undefined, name, questionToken, questionToken ? factory.createUnionTypeNode([
                type,
                factory.createLiteralTypeNode(factory.createNull())
            ]) : type));
        }
    }
    // 处理reverserPointer
    const reverseOnes = ReversePointerRelations[entity];
    if (reverseOnes) {
        reverseOnes.forEach((one) => {
            referenceEntities.push(one);
            members2.push(factory.createPropertySignature(undefined, (0, utils_1.firstLetterLowerCase)(one), factory.createToken(ts.SyntaxKind.QuestionToken), factory.createTypeReferenceNode(createForeignRef(entity, one, 'Schema'))));
        });
    }
    const foreignKeySet = {};
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
            const entityNameLc = (0, utils_1.firstLetterLowerCase)(entityName);
            foreignKeySet[entityName].forEach((foreignKey) => {
                const identifier = `${entityNameLc}$${foreignKey}`;
                members2.push(factory.createPropertySignature(undefined, identifier, factory.createToken(ts.SyntaxKind.QuestionToken), factory.createTypeReferenceNode(factory.createIdentifier("Array"), [factory.createTypeReferenceNode(createForeignRef(entity, entityName, 'Schema'), undefined)])));
            });
        }
    }
    (0, lodash_1.uniq)(referenceEntities).forEach((ele) => {
        if (ele !== entity) {
            statements.push(factory.createImportDeclaration(undefined, undefined, factory.createImportClause(false, undefined, factory.createNamespaceImport(factory.createIdentifier(ele))), factory.createStringLiteral(`../${ele}/Schema`)));
        }
    });
    // 在这里把需要直接拷贝过来的语句写入
    if (SchemaAsts[entity]) {
        statements.push(...SchemaAsts[entity].statements);
    }
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
    statements.push(factory.createTypeAliasDeclaration(undefined, [
        factory.createModifier(ts.SyntaxKind.ExportKeyword)
    ], factory.createIdentifier('OpSchema'), undefined, factory.createTypeLiteralNode(members)), factory.createTypeAliasDeclaration(undefined, [factory.createModifier(ts.SyntaxKind.ExportKeyword)], factory.createIdentifier("OpAttr"), undefined, factory.createTypeOperatorNode(ts.SyntaxKind.KeyOfKeyword, factory.createTypeReferenceNode(factory.createIdentifier("OpSchema"), undefined))));
    statements.push(factory.createTypeAliasDeclaration(undefined, [
        factory.createModifier(ts.SyntaxKind.ExportKeyword)
    ], factory.createIdentifier('Schema'), undefined, factory.createIntersectionTypeNode([
        factory.createTypeLiteralNode(members.concat(members2)),
        factory.createMappedTypeNode(undefined, factory.createTypeParameterDeclaration(factory.createIdentifier("A"), factory.createTypeReferenceNode(factory.createIdentifier("ExpressionKey"), undefined), undefined), undefined, factory.createToken(ts.SyntaxKind.QuestionToken), factory.createKeywordTypeNode(ts.SyntaxKind.AnyKeyword), undefined)
    ])));
}
/**
 * 生成Query
 * @param statements
 * @param schemaAttrs
 * @param entity
 */
function constructFilter(statements, entity) {
    const { schemaAttrs, fulltextIndex } = Schema[entity];
    const members = [
        // id: Q_StringValue
        factory.createPropertySignature(undefined, factory.createIdentifier('id'), undefined, factory.createUnionTypeNode([
            factory.createTypeReferenceNode(factory.createIdentifier('Q_StringValue')),
            factory.createTypeReferenceNode(factory.createQualifiedName(factory.createIdentifier("SubQuery"), factory.createIdentifier(`${entity}IdSubQuery`)))
        ])),
        // $$createAt$$: Q_DateValue
        factory.createPropertySignature(undefined, factory.createIdentifier('$$createAt$$'), undefined, factory.createTypeReferenceNode(factory.createIdentifier('Q_DateValue'))),
        // $$updateAt$$: Q_DateValue
        factory.createPropertySignature(undefined, factory.createIdentifier('$$updateAt$$'), undefined, factory.createTypeReferenceNode(factory.createIdentifier('Q_DateValue')))
    ];
    const { [entity]: manyToOneSet } = ManyToOne;
    for (const attr of schemaAttrs) {
        const { type, name } = attr;
        const attrName = name.text;
        if (ts.isTypeReferenceNode(type)) {
            const { typeName } = type;
            if (ts.isIdentifier(typeName)) {
                const { text } = typeName;
                let type2;
                switch (text) {
                    case 'String':
                    case 'Text':
                    case 'Image':
                    case 'File': {
                        if (ReversePointerRelations[entity] && attrName === 'entity') {
                            type2 = factory.createTypeReferenceNode('E');
                        }
                        else {
                            type2 = factory.createTypeReferenceNode(factory.createIdentifier('Q_StringValue'));
                        }
                        break;
                    }
                    case 'Int':
                    case 'Float':
                    case 'Double': {
                        type2 = factory.createTypeReferenceNode(factory.createIdentifier('Q_NumberValue'));
                        break;
                    }
                    case 'Boolean': {
                        type2 = factory.createTypeReferenceNode(factory.createIdentifier('Q_BooleanValue'));
                        break;
                    }
                    case 'Datetime': {
                        type2 = factory.createTypeReferenceNode(factory.createIdentifier('Q_DateValue'));
                        break;
                    }
                    case 'Geo':
                    case 'Object': {
                        // object类型暂不支持查询
                        break;
                    }
                    default: {
                        const text2 = text === 'Schema' ? entity : text;
                        const manyToOneItem = manyToOneSet && manyToOneSet.find(([refEntity]) => refEntity === text2);
                        if (manyToOneItem) {
                            // 外键可能落到相应的子查询中
                            members.push(factory.createPropertySignature(undefined, `${name.text}Id`, undefined, factory.createUnionTypeNode([
                                factory.createTypeReferenceNode(factory.createIdentifier('Q_StringValue')),
                                factory.createTypeReferenceNode(factory.createQualifiedName(factory.createIdentifier("SubQuery"), factory.createIdentifier(`${text2}IdSubQuery`)), undefined)
                            ])));
                            type2 = factory.createTypeReferenceNode(createForeignRef(entity, text2, 'Filter'));
                        }
                        else {
                            if (text.endsWith('State')) {
                                type2 = factory.createTypeReferenceNode(factory.createIdentifier('Q_EnumValue'), [
                                    factory.createTypeReferenceNode(factory.createIdentifier(text), undefined)
                                ]);
                            }
                            else {
                                // 引用的本地定义的shape
                            }
                        }
                    }
                }
                if (type2) {
                    members.push(factory.createPropertySignature(undefined, name, undefined, type2));
                }
            }
        }
        else if (ts.isUnionTypeNode(type) && ts.isLiteralTypeNode(type.types[0]) || ts.isLiteralTypeNode(type)) {
            members.push(factory.createPropertySignature(undefined, name, undefined, factory.createTypeReferenceNode(factory.createIdentifier('Q_EnumValue'), [
                type
            ])));
        }
        else {
            // 此时应当是引用本地定义的shape
        }
    }
    // type AttrFilter = {};
    const eumUnionTypeNode = ReversePointerRelations[entity] && ReversePointerRelations[entity].map(ele => factory.createLiteralTypeNode(factory.createStringLiteral((0, utils_1.firstLetterLowerCase)(ele))));
    if (process.env.COMPLING_AS_LIB) {
        eumUnionTypeNode && eumUnionTypeNode.push(factory.createKeywordTypeNode(ts.SyntaxKind.StringKeyword));
    }
    statements.push(factory.createTypeAliasDeclaration(undefined, undefined, factory.createIdentifier('AttrFilter'), ReversePointerRelations[entity] ? [
        factory.createTypeParameterDeclaration(factory.createIdentifier("E"), undefined)
    ] : undefined, factory.createTypeLiteralNode(members)));
    /**
     *
    export type Filter = AttrFilter | Partial<ExprOp<OpSchema> | {
            [F in Q_LogicKey]: Filter[];
        } | {
            [F in Q_FullTextKey]: Q_FullTextValue;
        }>;

     */
    const types = [
        factory.createTypeReferenceNode(factory.createIdentifier("AttrFilter"), ReversePointerRelations[entity] ? [factory.createTypeReferenceNode('E')] : undefined),
        factory.createTypeReferenceNode(factory.createIdentifier("ExprOp"), [
            factory.createTypeReferenceNode(factory.createIdentifier('OpAttr'))
        ]),
    ];
    // 如果还有其它类型的查询如全文，则加在types数组中
    if (fulltextIndex) {
        types.push(factory.createTypeReferenceNode('FulltextFilter'));
    }
    statements.push(factory.createTypeAliasDeclaration(undefined, [factory.createModifier(ts.SyntaxKind.ExportKeyword)], factory.createIdentifier("Filter"), ReversePointerRelations[entity] ? [
        factory.createTypeParameterDeclaration(factory.createIdentifier("E"), undefined, factory.createTypeReferenceNode(factory.createIdentifier("Q_EnumValue"), [
            factory.createUnionTypeNode(eumUnionTypeNode)
        ]))
    ] : undefined, factory.createTypeReferenceNode(factory.createIdentifier("MakeFilter"), [factory.createIntersectionTypeNode(types)])));
}
/**
 * 构造Projection和OneAttrProjection
 * @param statements
 * @param entity
 */
function constructProjection(statements, entity) {
    const { schemaAttrs } = Schema[entity];
    const properties = [
        ['id', true],
        ['$$createAt$$', false],
        ['$$updateAt$$', false],
    ];
    const foreignKeyProperties = {
        [entity]: [''],
    };
    const { [entity]: manyToOneSet } = ManyToOne;
    for (const attr of schemaAttrs) {
        const { type, name } = attr;
        const attrName = name.text;
        if (ts.isTypeReferenceNode(type)) {
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
                    case 'Geo':
                    case 'Object': {
                        properties.push([name, false]);
                        break;
                    }
                    default: {
                        const text2 = text === 'Schema' ? entity : text;
                        const manyToOneItem = manyToOneSet && manyToOneSet.find(([refEntity]) => refEntity === text2);
                        if (manyToOneItem) {
                            // 外键投影
                            properties.push([`${attrName}Id`, false, undefined], [name, false, factory.createTypeReferenceNode(createForeignRef(entity, text2, 'Projection')), factory.createTypeReferenceNode(createForeignRef(entity, text2, 'ExportProjection'))]);
                            if (foreignKeyProperties.hasOwnProperty(text2)) {
                                foreignKeyProperties[text2].push(attrName);
                            }
                            else {
                                (0, lodash_1.assign)(foreignKeyProperties, {
                                    [text2]: [attrName],
                                });
                            }
                        }
                        else {
                            // todo 此处是对State的专门处理
                            if (text.endsWith('State')) {
                                properties.push([name, false, undefined]);
                            }
                            else {
                                // 引用的shape
                                properties.push([name, false, undefined]);
                            }
                        }
                    }
                }
            }
            else {
                (0, assert_1.default)(false);
            }
        }
        else {
            // 增加了本身object的shape定义
            // assert(ts.isUnionTypeNode(type!) && ts.isLiteralTypeNode(type.types[0]) || ts.isLiteralTypeNode(type!));
            properties.push([name, false, undefined]);
        }
    }
    if (ReversePointerRelations[entity]) {
        ReversePointerRelations[entity].forEach((one) => {
            const text2 = one === 'Schema' ? entity : one;
            properties.push([(0, utils_1.firstLetterLowerCase)(one), false, factory.createTypeReferenceNode(createForeignRef(entity, one, 'Projection')), factory.createTypeReferenceNode(createForeignRef(entity, one, 'ExportProjection'))]);
            if (foreignKeyProperties.hasOwnProperty(one)) {
                foreignKeyProperties[text2].push('entity');
            }
            else {
                (0, lodash_1.assign)(foreignKeyProperties, {
                    [text2]: ['entity'],
                });
            }
        });
    }
    // 一对多的projection
    const { [entity]: oneToManySet } = OneToMany;
    if (oneToManySet) {
        const foreignKeySet = {};
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
            const entityNameLc = (0, utils_1.firstLetterLowerCase)(entityName);
            foreignKeySet[entityName].forEach((foreignKey) => {
                const identifier = `${entityNameLc}$${foreignKey}`;
                properties.push([identifier, false,
                    factory.createIntersectionTypeNode([
                        factory.createTypeReferenceNode(createForeignRef(entity, entityName, 'Selection'), undefined),
                        factory.createTypeLiteralNode([
                            factory.createPropertySignature(undefined, factory.createIdentifier("$entity"), undefined, factory.createLiteralTypeNode(factory.createStringLiteral((0, utils_1.firstLetterLowerCase)(entityName))))
                        ])
                    ]),
                    factory.createIntersectionTypeNode([
                        factory.createTypeReferenceNode(createForeignRef(entity, entityName, 'Exportation'), undefined),
                        factory.createTypeLiteralNode([
                            factory.createPropertySignature(undefined, factory.createIdentifier("$entity"), undefined, factory.createLiteralTypeNode(factory.createStringLiteral((0, utils_1.firstLetterLowerCase)(entityName))))
                        ])
                    ])
                ]);
            });
        }
    }
    const exprNode = factory.createTypeReferenceNode(factory.createIdentifier("Partial"), [
        factory.createTypeReferenceNode(factory.createIdentifier("ExprOp"), [
            factory.createTypeReferenceNode(factory.createIdentifier("OpAttr"), undefined)
        ])
    ]);
    const MetaPropertySignaturs = [
        factory.createPropertySignature(undefined, factory.createStringLiteral("#id"), factory.createToken(ts.SyntaxKind.QuestionToken), factory.createTypeReferenceNode('NodeId'))
    ];
    if (process.env.COMPLING_AS_LIB) {
        MetaPropertySignaturs.push(factory.createIndexSignature(undefined, undefined, [factory.createParameterDeclaration(undefined, undefined, undefined, factory.createIdentifier("k"), undefined, factory.createKeywordTypeNode(ts.SyntaxKind.StringKeyword), undefined)], factory.createKeywordTypeNode(ts.SyntaxKind.AnyKeyword)));
    }
    // Projection，正常查询的投影
    statements.push(factory.createTypeAliasDeclaration(undefined, [factory.createModifier(ts.SyntaxKind.ExportKeyword)], factory.createIdentifier("Projection"), undefined, factory.createIntersectionTypeNode([
        factory.createTypeLiteralNode(MetaPropertySignaturs.concat(properties.map(([n, q, v]) => {
            return factory.createPropertySignature(undefined, n, q ? undefined : factory.createToken(ts.SyntaxKind.QuestionToken), v || factory.createLiteralTypeNode(factory.createNumericLiteral("1")));
        }))),
        exprNode,
    ])));
    // ExportProjection，下载查询的投影
    statements.push(factory.createTypeAliasDeclaration(undefined, [factory.createModifier(ts.SyntaxKind.ExportKeyword)], factory.createIdentifier("ExportProjection"), undefined, factory.createIntersectionTypeNode([
        factory.createTypeLiteralNode(MetaPropertySignaturs.concat(properties.map(([n, q, v, v2]) => {
            return factory.createPropertySignature(undefined, n, factory.createToken(ts.SyntaxKind.QuestionToken), v2 || factory.createKeywordTypeNode(ts.SyntaxKind.StringKeyword));
        }))),
        exprNode,
    ])));
    // ${Entity}Projection，外键查询的专用投影
    for (const foreignKey in foreignKeyProperties) {
        const identifier = `${foreignKey}IdProjection`;
        statements.push(factory.createTypeAliasDeclaration(undefined, undefined, factory.createIdentifier(identifier), undefined, factory.createTypeReferenceNode(factory.createIdentifier("OneOf"), [
            factory.createTypeLiteralNode(foreignKeyProperties[foreignKey].map((attr) => factory.createPropertySignature(undefined, attr ? factory.createIdentifier(`${attr}Id`) : 'id', undefined, factory.createLiteralTypeNode(factory.createNumericLiteral("1")))))
        ])));
    }
}
/**
 * 构造Query
 * @param statements
 * @param entity
 */
function constructQuery(statements, entity) {
    const entityLc = (0, utils_1.firstLetterLowerCase)(entity);
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
        (0, lodash_1.uniqBy)(manyToOneSet, ([a]) => a).forEach(([oneEntity, foreignKey]) => {
            statements.push(factory.createTypeAliasDeclaration(undefined, [factory.createModifier(ts.SyntaxKind.ExportKeyword)], factory.createIdentifier(`${oneEntity}IdSubQuery`), undefined, factory.createTypeReferenceNode(factory.createIdentifier("Selection"), [factory.createTypeReferenceNode(factory.createIdentifier(`${oneEntity}IdProjection`), undefined)])));
            if (oneEntity === entity) {
                manyToSelf = true;
            }
        });
    }
    // 主键可能产生的子查询
    if (!manyToSelf) {
        statements.push(factory.createTypeAliasDeclaration(undefined, [factory.createModifier(ts.SyntaxKind.ExportKeyword)], factory.createIdentifier(`${entity}IdSubQuery`), undefined, factory.createTypeReferenceNode(factory.createIdentifier("Selection"), [factory.createTypeReferenceNode(factory.createIdentifier(`${entity}IdProjection`), undefined)])));
    }
}
/**
 * 构造Sort
 * @param statements
 * @param entity
 */
function constructSorter(statements, entity) {
    const { schemaAttrs } = Schema[entity];
    const members = [
        // id: 1
        factory.createPropertySignature(undefined, factory.createIdentifier("id"), undefined, factory.createLiteralTypeNode(factory.createNumericLiteral("1"))),
        // $$createAt$$: 1
        factory.createPropertySignature(undefined, factory.createIdentifier('$$createAt$$'), undefined, factory.createLiteralTypeNode(factory.createNumericLiteral("1"))),
        // $$updateAt$$: 1
        factory.createPropertySignature(undefined, factory.createIdentifier('$$updateAt$$'), undefined, factory.createLiteralTypeNode(factory.createNumericLiteral("1")))
    ];
    const { [entity]: manyToOneSet } = ManyToOne;
    for (const attr of schemaAttrs) {
        const { type, name, questionToken } = attr;
        if (ts.isTypeReferenceNode(type)) {
            const { typeName } = type;
            if (ts.isIdentifier(typeName)) {
                const { text } = typeName;
                let type2;
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
                        const manyToOneItem = manyToOneSet && manyToOneSet.find(([refEntity]) => refEntity === text2);
                        if (manyToOneItem) {
                            type2 = factory.createTypeReferenceNode(createForeignRef(entity, text2, 'SortAttr'));
                            members.push(factory.createPropertySignature(undefined, `${name.text}Id`, undefined, factory.createLiteralTypeNode(factory.createNumericLiteral("1"))));
                        }
                        else if (!['Object'].includes(text)) {
                            // todo 对State的专门处理
                            type2 = factory.createLiteralTypeNode(factory.createNumericLiteral("1"));
                        }
                    }
                }
                if (type2) {
                    members.push(factory.createPropertySignature(undefined, name, undefined, type2));
                }
            }
        }
        else if (ts.isUnionTypeNode(type) && ts.isLiteralTypeNode(type.types[0]) || ts.isLiteralTypeNode(type)) {
            members.push(factory.createPropertySignature(undefined, name, undefined, factory.createLiteralTypeNode(factory.createNumericLiteral("1"))));
        }
        else {
            // 本地规定的shape，非结构化属性不参与排序
        }
    }
    if (ReversePointerRelations[entity]) {
        ReversePointerRelations[entity].forEach((one) => {
            members.push(factory.createPropertySignature(undefined, (0, utils_1.firstLetterLowerCase)(one), undefined, factory.createTypeReferenceNode(createForeignRef(entity, one, 'SortAttr'))));
        });
        if (process.env.COMPLING_AS_LIB) {
            members.push(factory.createIndexSignature(undefined, undefined, [factory.createParameterDeclaration(undefined, undefined, undefined, factory.createIdentifier("k"), undefined, factory.createKeywordTypeNode(ts.SyntaxKind.StringKeyword), undefined)], factory.createKeywordTypeNode(ts.SyntaxKind.AnyKeyword)));
        }
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
    statements.push(factory.createTypeAliasDeclaration(undefined, [factory.createModifier(ts.SyntaxKind.ExportKeyword)], factory.createIdentifier("SortAttr"), undefined, factory.createTypeReferenceNode(factory.createIdentifier("OneOf"), [factory.createIntersectionTypeNode([
            factory.createTypeLiteralNode(members),
            factory.createTypeReferenceNode(factory.createIdentifier("ExprOp"), [
                factory.createTypeReferenceNode(factory.createIdentifier('OpAttr'))
            ])
        ])])));
    /**
     * export type SortNode = {
        $attr: SortAttr;
        $direction?: 'asc' | 'desc';
    };
     */
    statements.push(factory.createTypeAliasDeclaration(undefined, [factory.createModifier(ts.SyntaxKind.ExportKeyword)], factory.createIdentifier("SortNode"), undefined, factory.createTypeLiteralNode([
        factory.createPropertySignature(undefined, factory.createIdentifier("$attr"), undefined, factory.createTypeReferenceNode(factory.createIdentifier("SortAttr"), undefined)),
        factory.createPropertySignature(undefined, factory.createIdentifier("$direction"), factory.createToken(ts.SyntaxKind.QuestionToken), factory.createUnionTypeNode([
            factory.createLiteralTypeNode(factory.createStringLiteral("asc")),
            factory.createLiteralTypeNode(factory.createStringLiteral("desc"))
        ]))
    ])));
    /**
     * export type Sorter = SortNode[];
     */
    statements.push(factory.createTypeAliasDeclaration(undefined, [factory.createModifier(ts.SyntaxKind.ExportKeyword)], factory.createIdentifier("Sorter"), undefined, factory.createArrayTypeNode(factory.createTypeReferenceNode(factory.createIdentifier("SortNode"), undefined))));
}
function constructFullAttrs(statements, entity) {
    const { [entity]: manyToOneSet } = ManyToOne;
    const { [entity]: oneToManySet } = OneToMany;
    if (manyToOneSet && manyToOneSet.length) {
        const mtoAttrs = [];
        for (const item of manyToOneSet) {
            const [one, key] = item;
            if (one === entity) {
                // 递归引用自身，因为typescript本身不支持递归，因此这里做一个显式的三层递归应该够用了
                mtoAttrs.push(factory.createTemplateLiteralType(factory.createTemplateHead(`${key}.`, `${key}.`), [factory.createTemplateLiteralTypeSpan(factory.createTypeReferenceNode(factory.createIdentifier("OpAttr"), undefined), factory.createTemplateTail("", ""))]), factory.createTemplateLiteralType(factory.createTemplateHead(`${key}.${key}.`, `${key}.${key}.`), [factory.createTemplateLiteralTypeSpan(factory.createTypeReferenceNode(factory.createIdentifier("OpAttr"), undefined), factory.createTemplateTail("", ""))]), factory.createTemplateLiteralType(factory.createTemplateHead(`${key}.${key}.${key}.`, `${key}.${key}.${key}.`), [factory.createTemplateLiteralTypeSpan(factory.createTypeReferenceNode(factory.createIdentifier("OpAttr"), undefined), factory.createTemplateTail("", ""))]));
            }
            else {
                mtoAttrs.push(factory.createTemplateLiteralType(factory.createTemplateHead(`${key}.`, `${key}.`), [factory.createTemplateLiteralTypeSpan(factory.createTypeReferenceNode(factory.createQualifiedName(factory.createIdentifier(one), factory.createIdentifier("NativeAttr")), undefined), factory.createTemplateTail("", ""))
                ]));
            }
        }
        statements.push(factory.createTypeAliasDeclaration(undefined, [factory.createModifier(ts.SyntaxKind.ExportKeyword)], factory.createIdentifier("NativeAttr"), undefined, factory.createUnionTypeNode([
            factory.createTypeReferenceNode(factory.createIdentifier("OpAttr"), undefined),
            ...mtoAttrs
        ])));
    }
    else {
        statements.push(factory.createTypeAliasDeclaration(undefined, [factory.createModifier(ts.SyntaxKind.ExportKeyword)], factory.createIdentifier("NativeAttr"), undefined, factory.createTypeReferenceNode(factory.createIdentifier("OpAttr"), undefined)));
    }
    const foreignKeySet = {};
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
        const otmAttrs = [];
        for (const entityName in foreignKeySet) {
            const entityNameLc = (0, utils_1.firstLetterLowerCase)(entityName);
            if (foreignKeySet[entityName].length > 1) {
                foreignKeySet[entityName].forEach((foreignKey) => {
                    const head = `${entityNameLc}s$${foreignKey}`;
                    otmAttrs.push(factory.createTemplateLiteralType(factory.createTemplateHead(`${head}$`, `${head}$`), [
                        factory.createTemplateLiteralTypeSpan(factory.createKeywordTypeNode(ts.SyntaxKind.NumberKeyword), factory.createTemplateMiddle(".", ".")),
                        factory.createTemplateLiteralTypeSpan(factory.createTypeReferenceNode(entityName === entity
                            ? factory.createIdentifier("NativeAttr")
                            : factory.createQualifiedName(factory.createIdentifier(entityName), factory.createIdentifier("NativeAttr")), undefined), factory.createTemplateTail("", ""))
                    ]));
                });
            }
            else {
                otmAttrs.push(factory.createTemplateLiteralType(factory.createTemplateHead(`${entityNameLc}s$`, `${entityNameLc}s$`), [
                    factory.createTemplateLiteralTypeSpan(factory.createKeywordTypeNode(ts.SyntaxKind.NumberKeyword), factory.createTemplateMiddle(".", ".")),
                    factory.createTemplateLiteralTypeSpan(factory.createTypeReferenceNode(entityName === entity
                        ? factory.createIdentifier("NativeAttr")
                        : factory.createQualifiedName(factory.createIdentifier(entityName), factory.createIdentifier("NativeAttr")), undefined), factory.createTemplateTail("", ""))
                ]));
            }
        }
        statements.push(factory.createTypeAliasDeclaration(undefined, [factory.createModifier(ts.SyntaxKind.ExportKeyword)], factory.createIdentifier("FullAttr"), undefined, factory.createUnionTypeNode([
            factory.createTypeReferenceNode(factory.createIdentifier("NativeAttr"), undefined),
            ...otmAttrs
        ])));
    }
    else {
        statements.push(factory.createTypeAliasDeclaration(undefined, [factory.createModifier(ts.SyntaxKind.ExportKeyword)], factory.createIdentifier("FullAttr"), undefined, factory.createTypeReferenceNode(factory.createIdentifier("NativeAttr"), undefined)));
    }
}
function constructActions(statements, entity) {
    // Selection
    statements.push(factory.createTypeAliasDeclaration(undefined, [factory.createModifier(ts.SyntaxKind.ExportKeyword)], factory.createIdentifier("SelectOperation"), [
        factory.createTypeParameterDeclaration(factory.createIdentifier("P"), undefined, factory.createTypeReferenceNode(factory.createIdentifier("Projection"), undefined))
    ], factory.createTypeReferenceNode(factory.createIdentifier("OakOperation"), [
        factory.createLiteralTypeNode(factory.createStringLiteral("select")),
        factory.createTypeReferenceNode(factory.createIdentifier("P"), undefined),
        factory.createTypeReferenceNode(factory.createIdentifier("Filter"), undefined),
        factory.createTypeReferenceNode(factory.createIdentifier("Sorter"), undefined)
    ])), factory.createTypeAliasDeclaration(undefined, [factory.createModifier(ts.SyntaxKind.ExportKeyword)], factory.createIdentifier("Selection"), [
        factory.createTypeParameterDeclaration(factory.createIdentifier("P"), undefined, factory.createTypeReferenceNode(factory.createIdentifier("Projection"), undefined))
    ], factory.createTypeReferenceNode(factory.createIdentifier("Omit"), [
        factory.createTypeReferenceNode(factory.createIdentifier("SelectOperation"), [
            factory.createTypeReferenceNode(factory.createIdentifier("P"), undefined)
        ]),
        factory.createLiteralTypeNode(factory.createStringLiteral("action"))
    ])));
    // Exportation
    statements.push(factory.createTypeAliasDeclaration(undefined, [factory.createModifier(ts.SyntaxKind.ExportKeyword)], factory.createIdentifier("Exportation"), undefined, factory.createTypeReferenceNode(factory.createIdentifier("OakOperation"), [
        factory.createLiteralTypeNode(factory.createStringLiteral("export")),
        factory.createTypeReferenceNode(factory.createIdentifier("ExportProjection"), undefined),
        factory.createTypeReferenceNode(factory.createIdentifier("Filter"), undefined),
        factory.createTypeReferenceNode(factory.createIdentifier("Sorter"), undefined)
    ])));
    const { [entity]: manyToOneSet } = ManyToOne;
    const { [entity]: oneToManySet } = OneToMany;
    const foreignKeySet = {};
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
    let foreignKeyAttrNode = [];
    if (manyToOneSet) {
        for (const one of manyToOneSet) {
            if (!ReversePointerRelations[entity] || !ReversePointerRelations[entity].includes(one[1])) {
                foreignKeyAttrNode.push(factory.createLiteralTypeNode(factory.createStringLiteral(`${one[1]}Id`)));
            }
        }
        if (ReversePointerRelations[entity]) {
            foreignKeyAttrNode.push(factory.createLiteralTypeNode(factory.createStringLiteral('entity')), factory.createLiteralTypeNode(factory.createStringLiteral('entityId')));
        }
    }
    let adNodes = [
        factory.createTypeReferenceNode(factory.createIdentifier("FormCreateData"), [
            foreignKeyAttrNode.length > 0
                ? factory.createTypeReferenceNode(factory.createIdentifier("Omit"), [
                    factory.createTypeReferenceNode(factory.createIdentifier("OpSchema"), undefined),
                    factory.createUnionTypeNode(foreignKeyAttrNode)
                ])
                : factory.createTypeReferenceNode(factory.createIdentifier("OpSchema"), undefined)
        ])
    ];
    if (manyToOneSet) {
        /**
         * create的多对一有两种case
         * 如果关联对象是create，则对象的外键由关联对象的id决定
         * 如果关联对象是update，则关联对象的filter由对象决定其主键
         * 见cascadeStore
         */
        const upsertOneNodes = [];
        for (const one of manyToOneSet) {
            if (!ReversePointerRelations[entity] || !ReversePointerRelations[entity].includes(one[0])) {
                upsertOneNodes.push(factory.createUnionTypeNode([
                    factory.createTypeLiteralNode([
                        factory.createPropertySignature(undefined, factory.createIdentifier(one[1]), one[2] ? factory.createToken(ts.SyntaxKind.QuestionToken) : undefined, factory.createTypeReferenceNode(createForeignRef(entity, one[0], 'CreateSingleOperation')))
                    ]),
                    factory.createTypeLiteralNode([
                        factory.createPropertySignature(undefined, factory.createIdentifier(`${one[1]}Id`), one[2] ? factory.createToken(ts.SyntaxKind.QuestionToken) : undefined, factory.createTypeReferenceNode(factory.createIdentifier("String"), [factory.createLiteralTypeNode(factory.createNumericLiteral("64"))])),
                        factory.createPropertySignature(undefined, factory.createIdentifier(one[1]), factory.createToken(ts.SyntaxKind.QuestionToken), factory.createTypeReferenceNode(createForeignRef(entity, one[0], 'UpdateOperation')))
                    ])
                ]));
            }
        }
        const reverseOneNodes = [];
        if (ReversePointerRelations[entity]) {
            for (const one of ReversePointerRelations[entity]) {
                reverseOneNodes.push(factory.createTypeLiteralNode([
                    factory.createPropertySignature(undefined, factory.createIdentifier((0, utils_1.firstLetterLowerCase)(one)), undefined, // 反向指针好像不能为空，以后或许会有特例  by Xc
                    factory.createTypeReferenceNode(createForeignRef(entity, one, 'CreateSingleOperation')))
                ]), factory.createTypeLiteralNode([
                    factory.createPropertySignature(undefined, factory.createIdentifier('entity'), undefined, // 反向指针好像不能为空，以后或许会有特例  by Xc
                    factory.createLiteralTypeNode(factory.createStringLiteral(`${(0, utils_1.firstLetterLowerCase)(one)}`))),
                    factory.createPropertySignature(undefined, factory.createIdentifier('entityId'), undefined, // 反向指针好像不能为空，以后或许会有特例  by Xc
                    factory.createTypeReferenceNode(factory.createIdentifier("String"), [factory.createLiteralTypeNode(factory.createNumericLiteral("64"))])),
                    factory.createPropertySignature(undefined, factory.createIdentifier((0, utils_1.firstLetterLowerCase)(one)), factory.createToken(ts.SyntaxKind.QuestionToken), factory.createTypeReferenceNode(createForeignRef(entity, one, 'UpdateOperation')))
                ]));
            }
            if (process.env.COMPLING_AS_LIB) {
                // 如果是base，要包容更多可能的反指
                reverseOneNodes.push(factory.createTypeLiteralNode([
                    factory.createPropertySignature(undefined, factory.createIdentifier('entity'), undefined, factory.createKeywordTypeNode(ts.SyntaxKind.StringKeyword)),
                    factory.createPropertySignature(undefined, factory.createIdentifier('entityId'), undefined, factory.createTypeReferenceNode(factory.createIdentifier("String"), [factory.createLiteralTypeNode(factory.createNumericLiteral("64"))])),
                ]));
            }
        }
        if (upsertOneNodes.length > 0) {
            adNodes.push(factory.createIntersectionTypeNode(upsertOneNodes));
        }
        if (reverseOneNodes.length > 0) {
            adNodes.push(factory.createUnionTypeNode(reverseOneNodes));
        }
    }
    // 一对多
    const propertySignatures = [];
    if (process.env.COMPLING_AS_LIB) {
        propertySignatures.push(factory.createIndexSignature(undefined, undefined, [factory.createParameterDeclaration(undefined, undefined, undefined, factory.createIdentifier("k"), undefined, factory.createKeywordTypeNode(ts.SyntaxKind.StringKeyword), undefined)], factory.createKeywordTypeNode(ts.SyntaxKind.AnyKeyword)));
    }
    if (oneToManySet) {
        for (const entityName in foreignKeySet) {
            const entityNameLc = (0, utils_1.firstLetterLowerCase)(entityName);
            foreignKeySet[entityName].forEach((foreignKey) => {
                const identifier = `${entityNameLc}$${foreignKey}`;
                const otmCreateOperationDataNode = factory.createTypeReferenceNode(factory.createIdentifier("Omit"), [
                    factory.createTypeReferenceNode(createForeignRef(entity, entityName, 'CreateOperationData'), undefined),
                    factory.createUnionTypeNode(foreignKey === 'entity' ? [
                        factory.createLiteralTypeNode(factory.createStringLiteral("entity")),
                        factory.createLiteralTypeNode(factory.createStringLiteral("entityId"))
                    ] : [
                        factory.createLiteralTypeNode(factory.createStringLiteral(foreignKey)),
                        factory.createLiteralTypeNode(factory.createStringLiteral(`${foreignKey}Id`))
                    ])
                ]);
                const otmCreateOperationNode = factory.createTypeReferenceNode(factory.createIdentifier("OakOperation"), [
                    factory.createLiteralTypeNode(factory.createStringLiteral("create")),
                    factory.createUnionTypeNode([
                        otmCreateOperationDataNode,
                        factory.createArrayTypeNode(otmCreateOperationDataNode)
                    ])
                ]);
                const otmUpdateOperationNode = factory.createTypeReferenceNode(factory.createIdentifier("OakOperation"), [
                    factory.createLiteralTypeNode(factory.createStringLiteral("update")),
                    factory.createTypeReferenceNode(factory.createIdentifier("Omit"), [
                        factory.createTypeReferenceNode(createForeignRef(entity, entityName, 'UpdateOperationData'), undefined),
                        factory.createUnionTypeNode(foreignKey === 'entity' ? [
                            factory.createLiteralTypeNode(factory.createStringLiteral("entity")),
                            factory.createLiteralTypeNode(factory.createStringLiteral("entityId"))
                        ] : [
                            factory.createLiteralTypeNode(factory.createStringLiteral(foreignKey)),
                            factory.createLiteralTypeNode(factory.createStringLiteral(`${foreignKey}Id`))
                        ])
                    ]),
                    factory.createTypeReferenceNode(createForeignRef(entity, entityName, 'Filter'), undefined)
                ]);
                propertySignatures.push(factory.createPropertySignature(undefined, factory.createIdentifier(identifier), factory.createToken(ts.SyntaxKind.QuestionToken), factory.createUnionTypeNode([
                    otmUpdateOperationNode,
                    factory.createTypeReferenceNode(factory.createIdentifier("Array"), [factory.createUnionTypeNode([
                            otmCreateOperationNode,
                            otmUpdateOperationNode
                        ])])
                ])));
            });
        }
    }
    if (propertySignatures.length > 0) {
        adNodes.push(factory.createTypeLiteralNode(propertySignatures));
    }
    statements.push(factory.createTypeAliasDeclaration(undefined, [factory.createModifier(ts.SyntaxKind.ExportKeyword)], factory.createIdentifier("CreateOperationData"), undefined, factory.createIntersectionTypeNode(adNodes)));
    // CreateOperation
    statements.push(factory.createTypeAliasDeclaration(undefined, [factory.createModifier(ts.SyntaxKind.ExportKeyword)], factory.createIdentifier("CreateSingleOperation"), undefined, factory.createTypeReferenceNode(factory.createIdentifier("OakOperation"), [
        factory.createLiteralTypeNode(factory.createStringLiteral("create")),
        factory.createTypeReferenceNode(factory.createIdentifier("CreateOperationData"))
    ])), factory.createTypeAliasDeclaration(undefined, [factory.createModifier(ts.SyntaxKind.ExportKeyword)], factory.createIdentifier("CreateMultipleOperation"), undefined, factory.createTypeReferenceNode(factory.createIdentifier("OakOperation"), [
        factory.createLiteralTypeNode(factory.createStringLiteral("create")),
        factory.createTypeReferenceNode(factory.createIdentifier("Array"), [factory.createTypeReferenceNode(factory.createIdentifier("CreateOperationData"))])
    ])), factory.createTypeAliasDeclaration(undefined, [factory.createModifier(ts.SyntaxKind.ExportKeyword)], factory.createIdentifier("CreateOperation"), undefined, factory.createUnionTypeNode([
        factory.createTypeReferenceNode(factory.createIdentifier("CreateSingleOperation")),
        factory.createTypeReferenceNode(factory.createIdentifier("CreateMultipleOperation"))
    ])));
    // UpdateOperationData
    foreignKeyAttrNode = [];
    if (manyToOneSet) {
        for (const one of manyToOneSet) {
            if (!ReversePointerRelations[entity] || !ReversePointerRelations[entity].includes(one[1])) {
                foreignKeyAttrNode.push(factory.createLiteralTypeNode(factory.createStringLiteral(`${one[1]}Id`)));
            }
        }
        if (ReversePointerRelations[entity]) {
            foreignKeyAttrNode.push(factory.createLiteralTypeNode(factory.createStringLiteral('entity')), factory.createLiteralTypeNode(factory.createStringLiteral('entityId')));
        }
    }
    adNodes = [
        factory.createTypeReferenceNode(factory.createIdentifier("FormUpdateData"), [
            foreignKeyAttrNode.length > 0 ? factory.createTypeReferenceNode(factory.createIdentifier("Omit"), [
                factory.createTypeReferenceNode(factory.createIdentifier("OpSchema"), undefined),
                factory.createUnionTypeNode(foreignKeyAttrNode)
            ]) : factory.createTypeReferenceNode(factory.createIdentifier("OpSchema"), undefined)
        ])
    ];
    if (manyToOneSet) {
        /**
         * update的多对一有三种case
         * 如果关联对象是create，则对象的外键由关联对象的id决定
         * 如果关联对象是update或者remove，则关联对象的filter由对象(的原行！注意这里的外键是不能变的!)决定其主键
         * 见cascadeStore
         */
        const upsertOneNodes = [];
        for (const one of manyToOneSet) {
            if (!ReversePointerRelations[entity] || !ReversePointerRelations[entity].includes(one[0])) {
                upsertOneNodes.push(factory.createUnionTypeNode([
                    factory.createTypeLiteralNode([
                        factory.createPropertySignature(undefined, factory.createIdentifier(one[1]), factory.createToken(ts.SyntaxKind.QuestionToken), factory.createUnionTypeNode([
                            factory.createTypeReferenceNode(createForeignRef(entity, one[0], 'CreateSingleOperation')),
                            factory.createTypeReferenceNode(createForeignRef(entity, one[0], 'UpdateOperation')),
                            factory.createTypeReferenceNode(createForeignRef(entity, one[0], 'RemoveOperation'))
                        ])),
                        factory.createPropertySignature(undefined, factory.createIdentifier(`${one[1]}Id`), factory.createToken(ts.SyntaxKind.QuestionToken), factory.createKeywordTypeNode(ts.SyntaxKind.UndefinedKeyword)),
                    ]),
                    factory.createTypeLiteralNode([
                        factory.createPropertySignature(undefined, factory.createIdentifier(one[1]), factory.createToken(ts.SyntaxKind.QuestionToken), factory.createKeywordTypeNode(ts.SyntaxKind.UndefinedKeyword)),
                        factory.createPropertySignature(undefined, factory.createIdentifier(`${one[1]}Id`), factory.createToken(ts.SyntaxKind.QuestionToken), factory.createUnionTypeNode([
                            factory.createTypeReferenceNode(factory.createIdentifier("String"), [factory.createLiteralTypeNode(factory.createNumericLiteral("64"))]),
                            factory.createLiteralTypeNode(factory.createNull())
                        ])),
                    ])
                ]));
            }
        }
        if (upsertOneNodes.length > 0) {
            adNodes.push(factory.createIntersectionTypeNode(upsertOneNodes));
        }
        const reverseOneNodes = [];
        if (ReversePointerRelations[entity]) {
            const refEntityLitrals = [];
            for (const one of ReversePointerRelations[entity]) {
                refEntityLitrals.push(factory.createLiteralTypeNode(factory.createStringLiteral(`${(0, utils_1.firstLetterLowerCase)(one)}`)));
                reverseOneNodes.push(factory.createTypeLiteralNode([
                    factory.createPropertySignature(undefined, factory.createIdentifier((0, utils_1.firstLetterLowerCase)(one)), factory.createToken(ts.SyntaxKind.QuestionToken), factory.createUnionTypeNode([
                        factory.createTypeReferenceNode(createForeignRef(entity, one, 'CreateSingleOperation')),
                        factory.createTypeReferenceNode(createForeignRef(entity, one, 'UpdateOperation')),
                        factory.createTypeReferenceNode(createForeignRef(entity, one, 'RemoveOperation'))
                    ])),
                    factory.createPropertySignature(undefined, factory.createIdentifier('entityId'), factory.createToken(ts.SyntaxKind.QuestionToken), factory.createKeywordTypeNode(ts.SyntaxKind.UndefinedKeyword)),
                    factory.createPropertySignature(undefined, factory.createIdentifier('entity'), factory.createToken(ts.SyntaxKind.QuestionToken), factory.createKeywordTypeNode(ts.SyntaxKind.UndefinedKeyword))
                ]));
            }
            if (process.env.COMPLING_AS_LIB) {
                // 如果是base，要包容更多可能的反指
                refEntityLitrals.push(factory.createKeywordTypeNode(ts.SyntaxKind.StringKeyword));
            }
            reverseOneNodes.push(factory.createTypeLiteralNode([
                factory.createPropertySignature(undefined, factory.createIdentifier('entity'), factory.createToken(ts.SyntaxKind.QuestionToken), factory.createUnionTypeNode([
                    factory.createUnionTypeNode(refEntityLitrals),
                    factory.createLiteralTypeNode(factory.createNull())
                ])),
                factory.createPropertySignature(undefined, factory.createIdentifier('entityId'), factory.createToken(ts.SyntaxKind.QuestionToken), factory.createUnionTypeNode([
                    factory.createTypeReferenceNode(factory.createIdentifier("String"), [factory.createLiteralTypeNode(factory.createNumericLiteral("64"))]),
                    factory.createLiteralTypeNode(factory.createNull())
                ]))
            ]));
        }
        if (reverseOneNodes.length > 0) {
            adNodes.push(factory.createUnionTypeNode(reverseOneNodes));
        }
    }
    const propertySignatures2 = [];
    if (process.env.COMPLING_AS_LIB) {
        propertySignatures2.push(factory.createIndexSignature(undefined, undefined, [factory.createParameterDeclaration(undefined, undefined, undefined, factory.createIdentifier("k"), undefined, factory.createKeywordTypeNode(ts.SyntaxKind.StringKeyword), undefined)], factory.createKeywordTypeNode(ts.SyntaxKind.AnyKeyword)));
    }
    if (oneToManySet) {
        for (const entityName in foreignKeySet) {
            const entityNameLc = (0, utils_1.firstLetterLowerCase)(entityName);
            foreignKeySet[entityName].forEach((foreignKey) => {
                const identifier = `${entityNameLc}s$${foreignKey}`;
                const otmCreateOperationDataNode = factory.createTypeReferenceNode(factory.createIdentifier("Omit"), [
                    factory.createTypeReferenceNode(createForeignRef(entity, entityName, 'CreateOperationData'), undefined),
                    factory.createUnionTypeNode(foreignKey === 'entity' ? [
                        factory.createLiteralTypeNode(factory.createStringLiteral("entity")),
                        factory.createLiteralTypeNode(factory.createStringLiteral("entityId"))
                    ] : [
                        factory.createLiteralTypeNode(factory.createStringLiteral(foreignKey)),
                        factory.createLiteralTypeNode(factory.createStringLiteral(`${foreignKey}Id`))
                    ])
                ]);
                const otmCreateOperationNode = factory.createTypeReferenceNode(factory.createIdentifier("OakOperation"), [
                    factory.createLiteralTypeNode(factory.createStringLiteral("create")),
                    factory.createUnionTypeNode([
                        otmCreateOperationDataNode,
                        factory.createArrayTypeNode(otmCreateOperationDataNode)
                    ])
                ]);
                propertySignatures2.push(factory.createPropertySignature(undefined, factory.createIdentifier(identifier), factory.createToken(ts.SyntaxKind.QuestionToken), factory.createUnionTypeNode([
                    factory.createTypeReferenceNode(createForeignRef(entity, entityName, 'UpdateOperation'), undefined),
                    factory.createTypeReferenceNode(createForeignRef(entity, entityName, 'RemoveOperation'), undefined),
                    factory.createTypeReferenceNode(factory.createIdentifier("Array"), [factory.createUnionTypeNode([
                            otmCreateOperationNode,
                            factory.createTypeReferenceNode(createForeignRef(entity, entityName, 'UpdateOperation'), undefined),
                            factory.createTypeReferenceNode(createForeignRef(entity, entityName, 'RemoveOperation'), undefined)
                        ])])
                ])));
            });
        }
    }
    if (propertySignatures2.length > 0) {
        adNodes.push(factory.createTypeLiteralNode(propertySignatures2));
    }
    statements.push(factory.createTypeAliasDeclaration(undefined, [factory.createModifier(ts.SyntaxKind.ExportKeyword)], factory.createIdentifier("UpdateOperationData"), undefined, factory.createIntersectionTypeNode(adNodes)));
    // UpdateOperation
    statements.push(factory.createTypeAliasDeclaration(undefined, [factory.createModifier(ts.SyntaxKind.ExportKeyword)], factory.createIdentifier("UpdateOperation"), undefined, factory.createTypeReferenceNode(factory.createIdentifier("OakOperation"), [
        ActionAsts[entity] ?
            factory.createUnionTypeNode([
                factory.createTypeReferenceNode('ParticularAction'),
                factory.createLiteralTypeNode(factory.createStringLiteral("update"))
            ]) :
            factory.createLiteralTypeNode(factory.createStringLiteral("update")),
        factory.createTypeReferenceNode(factory.createIdentifier("UpdateOperationData")),
        factory.createTypeReferenceNode(factory.createIdentifier("Filter"), undefined)
    ])));
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
        const upsertOneNodes = [];
        for (const one of manyToOneSet) {
            if (!ReversePointerRelations[entity] || !ReversePointerRelations[entity].includes(one[0])) {
                upsertOneNodes.push(factory.createUnionTypeNode([
                    factory.createTypeLiteralNode([
                        factory.createPropertySignature(undefined, factory.createIdentifier(one[1]), factory.createToken(ts.SyntaxKind.QuestionToken), factory.createTypeReferenceNode(createForeignRef(entity, one[0], 'UpdateOperation')))
                    ]),
                    factory.createTypeLiteralNode([
                        factory.createPropertySignature(undefined, factory.createIdentifier(one[1]), factory.createToken(ts.SyntaxKind.QuestionToken), factory.createTypeReferenceNode(createForeignRef(entity, one[0], 'RemoveOperation')))
                    ])
                ]));
            }
        }
        const reverseOneNodes = [];
        if (ReversePointerRelations[entity]) {
            const refEntityLitrals = [];
            for (const one of ReversePointerRelations[entity]) {
                refEntityLitrals.push(factory.createLiteralTypeNode(factory.createStringLiteral(`${(0, utils_1.firstLetterLowerCase)(one)}`)));
                reverseOneNodes.push(factory.createTypeLiteralNode([
                    factory.createPropertySignature(undefined, factory.createIdentifier((0, utils_1.firstLetterLowerCase)(one)), factory.createToken(ts.SyntaxKind.QuestionToken), factory.createTypeReferenceNode(createForeignRef(entity, one, 'UpdateOperation')))
                ]), factory.createTypeLiteralNode([
                    factory.createPropertySignature(undefined, factory.createIdentifier((0, utils_1.firstLetterLowerCase)(one)), factory.createToken(ts.SyntaxKind.QuestionToken), factory.createTypeReferenceNode(createForeignRef(entity, one, 'RemoveOperation')))
                ]));
            }
        }
        if (upsertOneNodes.length > 0) {
            adNodes.push(factory.createIntersectionTypeNode(upsertOneNodes));
        }
        if (reverseOneNodes.length > 0) {
            adNodes.push(factory.createUnionTypeNode(reverseOneNodes));
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
    statements.push(factory.createTypeAliasDeclaration(undefined, [factory.createModifier(ts.SyntaxKind.ExportKeyword)], factory.createIdentifier("RemoveOperationData"), undefined, factory.createIntersectionTypeNode(adNodes)));
    // RemoveOperation
    statements.push(factory.createTypeAliasDeclaration(undefined, [factory.createModifier(ts.SyntaxKind.ExportKeyword)], factory.createIdentifier("RemoveOperation"), undefined, factory.createTypeReferenceNode(factory.createIdentifier("OakOperation"), [
        factory.createLiteralTypeNode(factory.createStringLiteral("remove")),
        factory.createTypeReferenceNode(factory.createIdentifier("RemoveOperationData"), undefined),
        factory.createTypeReferenceNode(factory.createIdentifier("Filter"), undefined)
    ])));
    statements.push(factory.createTypeAliasDeclaration(undefined, [factory.createModifier(ts.SyntaxKind.ExportKeyword)], factory.createIdentifier("Operation"), undefined, factory.createUnionTypeNode([
        factory.createTypeReferenceNode(factory.createIdentifier("CreateOperation"), undefined),
        factory.createTypeReferenceNode(factory.createIdentifier("UpdateOperation"), undefined),
        factory.createTypeReferenceNode(factory.createIdentifier("RemoveOperation"), undefined),
        factory.createTypeReferenceNode(factory.createIdentifier("SelectOperation"), undefined)
    ])));
}
const initialStatements = () => [
    // import { String, Text, Int, SpecificKey } from 'oak-domain/types/DataType';
    factory.createImportDeclaration(undefined, undefined, factory.createImportClause(false, undefined, factory.createNamedImports([
        factory.createImportSpecifier(false, undefined, factory.createIdentifier('String')),
        factory.createImportSpecifier(false, undefined, factory.createIdentifier('Int')),
        factory.createImportSpecifier(false, undefined, factory.createIdentifier('Float')),
        factory.createImportSpecifier(false, undefined, factory.createIdentifier('Double')),
        factory.createImportSpecifier(false, undefined, factory.createIdentifier('Boolean')),
        factory.createImportSpecifier(false, undefined, factory.createIdentifier('Text')),
        factory.createImportSpecifier(false, undefined, factory.createIdentifier('Datetime')),
        factory.createImportSpecifier(false, undefined, factory.createIdentifier('File')),
        factory.createImportSpecifier(false, undefined, factory.createIdentifier('Image')),
        factory.createImportSpecifier(false, undefined, factory.createIdentifier('PrimaryKey')),
        factory.createImportSpecifier(false, undefined, factory.createIdentifier('ForeignKey')),
        factory.createImportSpecifier(false, undefined, factory.createIdentifier('Geo'))
    ])), factory.createStringLiteral(`${(0, env_1.TYPE_PATH_IN_OAK_DOMAIN)()}DataType`)),
    /* import {
        Q_DateValue, Q_LogicKey, Q_NumberValue, FnCallKey, FnCallValue,
        Q_StringValue, Q_FullTextKey, Q_FullTextValue, FnCallValueAs,
        Q_BooleanValue,
    } from 'oak-domain/types/Demand'; */
    factory.createImportDeclaration(undefined, undefined, factory.createImportClause(false, undefined, factory.createNamedImports([
        factory.createImportSpecifier(false, undefined, factory.createIdentifier('Q_DateValue')),
        factory.createImportSpecifier(false, undefined, factory.createIdentifier('Q_BooleanValue')),
        factory.createImportSpecifier(false, undefined, factory.createIdentifier('Q_NumberValue')),
        factory.createImportSpecifier(false, undefined, factory.createIdentifier('Q_StringValue')),
        factory.createImportSpecifier(false, undefined, factory.createIdentifier('Q_EnumValue')),
        factory.createImportSpecifier(false, undefined, factory.createIdentifier('NodeId')),
        factory.createImportSpecifier(false, undefined, factory.createIdentifier('MakeFilter')),
        factory.createImportSpecifier(false, undefined, factory.createIdentifier('FulltextFilter')),
        factory.createImportSpecifier(false, undefined, factory.createIdentifier('ExprOp')),
        factory.createImportSpecifier(false, undefined, factory.createIdentifier('ExpressionKey')),
    ])), factory.createStringLiteral(`${(0, env_1.TYPE_PATH_IN_OAK_DOMAIN)()}Demand`)),
    factory.createImportDeclaration(undefined, undefined, factory.createImportClause(false, undefined, factory.createNamedImports([
        factory.createImportSpecifier(false, undefined, factory.createIdentifier("OneOf")),
        factory.createImportSpecifier(false, undefined, factory.createIdentifier("ValueOf"))
    ])), factory.createStringLiteral(`${(0, env_1.TYPE_PATH_IN_OAK_DOMAIN)()}Polyfill`)),
    // import * as SubQuery from '../_SubQuery';
    factory.createImportDeclaration(undefined, undefined, factory.createImportClause(false, undefined, factory.createNamespaceImport(factory.createIdentifier("SubQuery"))), factory.createStringLiteral("../_SubQuery")),
    // import { Filter as OakFilter } from 'oak-domain/src/types/Entity';
    factory.createImportDeclaration(undefined, undefined, factory.createImportClause(false, undefined, factory.createNamedImports([
        factory.createImportSpecifier(false, undefined, factory.createIdentifier("FormCreateData")),
        factory.createImportSpecifier(false, undefined, factory.createIdentifier("FormUpdateData")),
        factory.createImportSpecifier(false, factory.createIdentifier("Operation"), factory.createIdentifier("OakOperation"))
    ])), factory.createStringLiteral(`${(0, env_1.TYPE_PATH_IN_OAK_DOMAIN)()}Entity`), undefined)
];
function outputSubQuery(outputDir, printer) {
    const statements = [];
    if (process.env.COMPLING_AS_LIB) {
        statements.push(factory.createImportDeclaration(undefined, undefined, factory.createImportClause(false, undefined, factory.createNamedImports([factory.createImportSpecifier(false, undefined, factory.createIdentifier("Selection"))])), factory.createStringLiteral("oak-domain/lib/types/Entity"), undefined));
    }
    for (const entity in Schema) {
        // import * as User from '../User/Schema';
        statements.push(factory.createImportDeclaration(undefined, undefined, factory.createImportClause(false, undefined, factory.createNamespaceImport(factory.createIdentifier(entity))), factory.createStringLiteral(`./${entity}/Schema`)));
    }
    const entities = (0, lodash_1.keys)(Schema);
    // 每个有manyToOne的Entity都会输出${One}IdSubQuery
    for (const one in Schema) {
        const identifier = `${one}IdSubQuery`;
        const fromEntites = OneToMany[one] ? (0, lodash_1.uniq)(OneToMany[one]
            .filter(([e, f]) => f !== 'entity').map(([e]) => e)) : [];
        fromEntites.push(one);
        const inUnionTypeNode = fromEntites.map(ele => factory.createIntersectionTypeNode([
            factory.createTypeReferenceNode(factory.createQualifiedName(factory.createIdentifier(ele), factory.createIdentifier(identifier)), undefined),
            factory.createTypeLiteralNode([factory.createPropertySignature(undefined, factory.createIdentifier("entity"), undefined, factory.createLiteralTypeNode(factory.createStringLiteral((0, utils_1.firstLetterLowerCase)(ele))))])
        ]));
        if (process.env.COMPLING_AS_LIB) {
            // 如果是建立 base，这里要加上额外可能的对象信息
            inUnionTypeNode.push(factory.createKeywordTypeNode(ts.SyntaxKind.AnyKeyword));
        }
        statements.push(factory.createTypeAliasDeclaration(undefined, [factory.createModifier(ts.SyntaxKind.ExportKeyword)], factory.createIdentifier(identifier), undefined, factory.createMappedTypeNode(undefined, factory.createTypeParameterDeclaration(factory.createIdentifier("K"), factory.createUnionTypeNode([
            factory.createLiteralTypeNode(factory.createStringLiteral("$in")),
            factory.createLiteralTypeNode(factory.createStringLiteral("$nin"))
        ]), undefined), undefined, factory.createToken(ts.SyntaxKind.QuestionToken), factory.createUnionTypeNode(inUnionTypeNode), undefined)));
    }
    const resultFile = ts.createSourceFile("someFileName.ts", "", ts.ScriptTarget.Latest, /*setParentNodes*/ false, ts.ScriptKind.TS);
    const result = printer.printNode(ts.EmitHint.Unspecified, factory.createSourceFile(statements, factory.createToken(ts.SyntaxKind.EndOfFileToken), ts.NodeFlags.None), resultFile);
    const fileName = path_1.default.join(outputDir, '_SubQuery.ts');
    (0, fs_1.writeFileSync)(fileName, result, { flag: 'w' });
}
function outputEntityDict(outputDir, printer) {
    const statements = [];
    const propertySignatures = [];
    for (const entity in Schema) {
        // import * as User from '../User/Schema';
        statements.push(factory.createImportDeclaration(undefined, undefined, factory.createImportClause(false, undefined, factory.createNamedImports([factory.createImportSpecifier(false, factory.createIdentifier("EntityDef"), factory.createIdentifier(entity))])), factory.createStringLiteral(`./${entity}/Schema`)));
        const entityLc = (0, utils_1.firstLetterLowerCase)(entity);
        propertySignatures.push(factory.createPropertySignature(undefined, factory.createIdentifier(entityLc), undefined, factory.createTypeReferenceNode(entity)));
    }
    if ( /* process.env.COMPLING_AS_LIB */false) {
        statements.push(factory.createImportDeclaration(undefined, undefined, factory.createImportClause(false, undefined, factory.createNamedImports([factory.createImportSpecifier(false, undefined, factory.createIdentifier("EntityDef"))])), factory.createStringLiteral("../types/Entity"), undefined), factory.createTypeAliasDeclaration(undefined, [factory.createModifier(ts.SyntaxKind.ExportKeyword)], factory.createIdentifier("EntityDict"), undefined, factory.createIntersectionTypeNode([
            factory.createTypeLiteralNode(propertySignatures),
            factory.createTypeLiteralNode([
                factory.createIndexSignature(undefined, undefined, [factory.createParameterDeclaration(undefined, undefined, undefined, factory.createIdentifier("E"), undefined, factory.createKeywordTypeNode(ts.SyntaxKind.StringKeyword), undefined)], factory.createTypeReferenceNode(factory.createIdentifier("EntityDef"), undefined))
            ])
        ])));
    }
    else {
        statements.push(factory.createTypeAliasDeclaration(undefined, [factory.createModifier(ts.SyntaxKind.ExportKeyword)], factory.createIdentifier("EntityDict"), undefined, factory.createTypeLiteralNode(propertySignatures)));
    }
    const resultFile = ts.createSourceFile("someFileName.ts", "", ts.ScriptTarget.Latest, /*setParentNodes*/ false, ts.ScriptKind.TS);
    const result = printer.printNode(ts.EmitHint.Unspecified, factory.createSourceFile(statements, factory.createToken(ts.SyntaxKind.EndOfFileToken), ts.NodeFlags.None), resultFile);
    const fileName = path_1.default.join(outputDir, 'EntityDict.ts');
    (0, fs_1.writeFileSync)(fileName, result, { flag: 'w' });
}
function outputSchema(outputDir, printer) {
    for (const entity in Schema) {
        const statements = initialStatements();
        // const { schemaAttrs } = Schema[entity];
        if (ActionAsts[entity]) {
            const { importedFrom, actionDefNames } = ActionAsts[entity];
            const localActions = ['Action', 'ParticularAction'];
            for (const a in importedFrom) {
                (0, assert_1.default)(a.endsWith('Action'));
                const s = a.slice(0, a.length - 6).concat('State');
                if (importedFrom[a] === 'local' && actionDefNames.includes((0, utils_1.firstLetterLowerCase)(a.slice(0, a.length - 6)))) {
                    localActions.push(s);
                }
                else if (actionDefNames.includes((0, utils_1.firstLetterLowerCase)(a.slice(0, a.length - 6)))) {
                    const { moduleSpecifier } = importedFrom[a];
                    statements.push(factory.createImportDeclaration(undefined, undefined, factory.createImportClause(false, undefined, factory.createNamedImports([
                        factory.createImportSpecifier(false, undefined, factory.createIdentifier(s))
                    ])), moduleSpecifier, undefined));
                }
            }
            statements.push(factory.createImportDeclaration(undefined, undefined, factory.createImportClause(false, undefined, factory.createNamedImports(localActions.map(ele => factory.createImportSpecifier(false, undefined, factory.createIdentifier(ele))))), factory.createStringLiteral('./Action'), undefined));
        }
        else {
            statements.push(factory.createImportDeclaration(undefined, undefined, factory.createImportClause(false, undefined, factory.createNamedImports([factory.createImportSpecifier(false, undefined, factory.createIdentifier("GenericAction"))])), factory.createStringLiteral((0, env_1.ACTION_CONSTANT_IN_OAK_DOMAIN)()), undefined));
        }
        constructSchema(statements, entity);
        constructFilter(statements, entity);
        constructProjection(statements, entity);
        constructSorter(statements, entity);
        constructActions(statements, entity);
        constructQuery(statements, entity);
        constructFullAttrs(statements, entity);
        const EntityDefAttrs = [
            factory.createPropertySignature(undefined, factory.createIdentifier("Schema"), undefined, factory.createTypeReferenceNode(factory.createIdentifier("Schema"), undefined)),
            factory.createPropertySignature(undefined, factory.createIdentifier("OpSchema"), undefined, factory.createTypeReferenceNode(factory.createIdentifier("OpSchema"), undefined)),
            factory.createPropertySignature(undefined, factory.createIdentifier("Action"), undefined, factory.createTypeReferenceNode(factory.createIdentifier(ActionAsts[entity] ? 'Action' : 'GenericAction'), undefined)),
            factory.createPropertySignature(undefined, factory.createIdentifier("Selection"), undefined, factory.createTypeReferenceNode(factory.createIdentifier("Selection"), undefined)),
            factory.createPropertySignature(undefined, factory.createIdentifier("Operation"), undefined, factory.createTypeReferenceNode(factory.createIdentifier("Operation"), undefined)),
        ];
        if (ActionAsts[entity]) {
            EntityDefAttrs.push(factory.createPropertySignature(undefined, factory.createIdentifier("ParticularAction"), undefined, factory.createTypeReferenceNode(factory.createIdentifier('ParticularAction'), undefined)));
        }
        statements.push(factory.createTypeAliasDeclaration(undefined, [factory.createModifier(ts.SyntaxKind.ExportKeyword)], factory.createIdentifier("EntityDef"), undefined, factory.createTypeLiteralNode(EntityDefAttrs)));
        const result = printer.printList(ts.ListFormat.SourceFileStatements, factory.createNodeArray(statements), Schema[entity].sourceFile);
        const fileName = path_1.default.join(outputDir, entity, 'Schema.ts');
        (0, fs_1.writeFileSync)(fileName, result, { flag: 'w' });
    }
}
function outputAction(outputDir, printer) {
    const actionDictStatements = [];
    const propertyAssignments = [];
    for (const entity in ActionAsts) {
        const { sourceFile, statements, importedFrom, actionDefNames } = ActionAsts[entity];
        const importStatements = [];
        for (const k in importedFrom) {
            (0, assert_1.default)(k.endsWith('Action'));
            if (importedFrom[k] !== 'local') {
                importStatements.push(importedFrom[k]);
            }
        }
        /* const actionDiff = difference(actionNames, actionDefNames);
        if (actionDiff.length > 0) {
            throw new Error(`action not conform to actionDef: ${actionDiff.join(',')}, entity: ${entity}`);
        } */
        statements.push(factory.createVariableStatement([factory.createModifier(ts.SyntaxKind.ExportKeyword)], factory.createVariableDeclarationList([factory.createVariableDeclaration(factory.createIdentifier("ActionDefDict"), undefined, undefined, factory.createObjectLiteralExpression(actionDefNames.map(ele => factory.createPropertyAssignment(factory.createIdentifier(`${ele}State`), factory.createIdentifier(`${(0, utils_1.firstLetterUpperCase)(ele)}ActionDef`))), true))], ts.NodeFlags.Const)));
        /*  const result = printer.printNode(
             ts.EmitHint.Unspecified,
             factory.createSourceFile(statements,
                 factory.createToken(ts.SyntaxKind.EndOfFileToken),
                 ts.NodeFlags.None),
             sourceFile
         ); */
        // 这里如果用printNode，stringLiteral的输出始终有个bug不知道如何处理
        const result = printer.printList(ts.ListFormat.SourceFileStatements, factory.createNodeArray(importStatements.concat(statements)), sourceFile);
        const filename = path_1.default.join(outputDir, entity, 'Action.ts');
        (0, fs_1.writeFileSync)(filename, result, { flag: 'w' });
        actionDictStatements.push(factory.createImportDeclaration(undefined, undefined, factory.createImportClause(false, undefined, factory.createNamedImports([factory.createImportSpecifier(false, factory.createIdentifier("ActionDefDict"), factory.createIdentifier(entity))])), factory.createStringLiteral(`./${entity}/Action`)));
        propertyAssignments.push(factory.createPropertyAssignment(factory.createIdentifier((0, utils_1.firstLetterLowerCase)(entity)), factory.createIdentifier(entity)));
    }
    actionDictStatements.push(factory.createVariableStatement([factory.createModifier(ts.SyntaxKind.ExportKeyword)], factory.createVariableDeclarationList([factory.createVariableDeclaration(factory.createIdentifier("ActionDefDict"), undefined, undefined, factory.createObjectLiteralExpression(propertyAssignments, true))], ts.NodeFlags.Const)));
    const resultFile = ts.createSourceFile("someFileName.ts", "", ts.ScriptTarget.Latest, /*setParentNodes*/ false, ts.ScriptKind.TS);
    const result = printer.printNode(ts.EmitHint.Unspecified, factory.createSourceFile(actionDictStatements, factory.createToken(ts.SyntaxKind.EndOfFileToken), ts.NodeFlags.None), resultFile);
    const fileName = path_1.default.join(outputDir, 'ActionDefDict.ts');
    (0, fs_1.writeFileSync)(fileName, result, { flag: 'w' });
}
function constructAttributes(entity) {
    const { schemaAttrs } = Schema[entity];
    const { [entity]: manyToOneSet } = ManyToOne;
    const result = [];
    schemaAttrs.forEach((attr) => {
        const attrAssignments = [];
        const { name, type } = attr;
        let name2 = name;
        if (ts.isTypeReferenceNode(type)) {
            const { typeName, typeArguments } = type;
            if (ts.isIdentifier(typeName)) {
                const { text } = typeName;
                switch (text) {
                    case 'String': {
                        attrAssignments.push(factory.createPropertyAssignment(factory.createIdentifier("type"), factory.createStringLiteral("varchar")), factory.createPropertyAssignment(factory.createIdentifier("params"), factory.createObjectLiteralExpression([
                            factory.createPropertyAssignment(factory.createIdentifier("width"), factory.createNumericLiteral(typeArguments[0].literal.text)),
                        ], true)));
                        break;
                    }
                    case 'Text':
                    case 'Image':
                    case 'File': {
                        attrAssignments.push(factory.createPropertyAssignment(factory.createIdentifier("type"), factory.createStringLiteral("text")));
                        break;
                    }
                    case 'Int':
                    case 'Uint': {
                        attrAssignments.push(factory.createPropertyAssignment(factory.createIdentifier("type"), factory.createStringLiteral("int")), factory.createPropertyAssignment(factory.createIdentifier("params"), factory.createObjectLiteralExpression([
                            factory.createPropertyAssignment(factory.createIdentifier("width"), factory.createNumericLiteral(typeArguments[0].literal.text)),
                            factory.createPropertyAssignment(factory.createIdentifier("signed"), text === 'Uint' ? factory.createFalse() : factory.createTrue())
                        ], true)));
                        break;
                    }
                    case 'Float': {
                        attrAssignments.push(factory.createPropertyAssignment(factory.createIdentifier("type"), factory.createStringLiteral("float")), factory.createPropertyAssignment(factory.createIdentifier("params"), factory.createObjectLiteralExpression([
                            factory.createPropertyAssignment(factory.createIdentifier("precision"), factory.createNumericLiteral(typeArguments[0].literal.text)),
                            factory.createPropertyAssignment(factory.createIdentifier("scale"), factory.createNumericLiteral(typeArguments[1].literal.text))
                        ], true)));
                        break;
                    }
                    case 'Double': {
                        attrAssignments.push(factory.createPropertyAssignment(factory.createIdentifier("type"), factory.createStringLiteral("double")), factory.createPropertyAssignment(factory.createIdentifier("params"), factory.createObjectLiteralExpression([
                            factory.createPropertyAssignment(factory.createIdentifier("precision"), factory.createNumericLiteral(typeArguments[0].literal.text)),
                            factory.createPropertyAssignment(factory.createIdentifier("scale"), factory.createNumericLiteral(typeArguments[1].literal.text))
                        ], true)));
                        break;
                    }
                    case 'Boolean': {
                        attrAssignments.push(factory.createPropertyAssignment(factory.createIdentifier("type"), factory.createStringLiteral("boolean")));
                        break;
                    }
                    case 'Datetime': {
                        attrAssignments.push(factory.createPropertyAssignment(factory.createIdentifier("type"), factory.createStringLiteral("datetime")));
                        break;
                    }
                    case 'Geo': {
                        // object类型暂不支持查询
                        attrAssignments.push(factory.createPropertyAssignment(factory.createIdentifier("type"), factory.createStringLiteral("geometry")));
                        break;
                    }
                    case 'Object': {
                        // object类型暂不支持查询
                        attrAssignments.push(factory.createPropertyAssignment(factory.createIdentifier("type"), factory.createStringLiteral("object")));
                        break;
                    }
                    default: {
                        const text2 = text === 'Schema' ? entity : text;
                        const manyToOneItem = manyToOneSet && manyToOneSet.find(([refEntity, attrName]) => refEntity === text2 && attrName === attrName);
                        if (manyToOneItem) {
                            // 外键
                            name2 = factory.createIdentifier(`${name.text}Id`);
                            attrAssignments.push(factory.createPropertyAssignment(factory.createIdentifier("type"), factory.createStringLiteral("ref")), factory.createPropertyAssignment(factory.createIdentifier("ref"), factory.createStringLiteral((0, utils_1.firstLetterLowerCase)(text2))));
                        }
                        else {
                            if (text.endsWith('State')) {
                                attrAssignments.push(factory.createPropertyAssignment(factory.createIdentifier("type"), factory.createStringLiteral("varchar")), factory.createPropertyAssignment(factory.createIdentifier("params"), factory.createObjectLiteralExpression([factory.createPropertyAssignment(factory.createIdentifier("length"), factory.createNumericLiteral(env_1.STRING_LITERAL_MAX_LENGTH))], true)));
                            }
                            else {
                                // 引用的shape                                    
                                attrAssignments.push(factory.createPropertyAssignment(factory.createIdentifier("type"), factory.createStringLiteral("object")));
                            }
                        }
                    }
                }
            }
            else {
                (0, assert_1.default)(false);
            }
        }
        else {
            if (ts.isUnionTypeNode(type)) {
                if (ts.isLiteralTypeNode(type.types[0])) {
                    if (ts.isStringLiteral(type.types[0].literal)) {
                        attrAssignments.push(factory.createPropertyAssignment(factory.createIdentifier("type"), factory.createStringLiteral("varchar")), factory.createPropertyAssignment(factory.createIdentifier("params"), factory.createObjectLiteralExpression([factory.createPropertyAssignment(factory.createIdentifier("length"), factory.createNumericLiteral(env_1.STRING_LITERAL_MAX_LENGTH))], true)));
                    }
                    else {
                        (0, assert_1.default)(ts.isNumericLiteral(type.types[0].literal));
                        attrAssignments.push(factory.createPropertyAssignment(factory.createIdentifier("type"), factory.createStringLiteral("int")), factory.createPropertyAssignment(factory.createIdentifier("params"), factory.createObjectLiteralExpression([
                            factory.createPropertyAssignment(factory.createIdentifier("precision"), factory.createNumericLiteral(env_1.NUMERICAL_LITERL_DEFAULT_PRECISION)),
                            factory.createPropertyAssignment(factory.createIdentifier("scale"), factory.createNumericLiteral(env_1.NUMERICAL_LITERL_DEFAULT_SCALE))
                        ], true)));
                    }
                }
                else {
                    // 否则是本地规定的shape，直接用object
                    attrAssignments.push(factory.createPropertyAssignment(factory.createIdentifier("type"), factory.createStringLiteral("object")));
                }
            }
            else {
                if (ts.isLiteralTypeNode(type)) {
                    if (ts.isStringLiteral(type.literal)) {
                        attrAssignments.push(factory.createPropertyAssignment(factory.createIdentifier("type"), factory.createStringLiteral("varchar")), factory.createPropertyAssignment(factory.createIdentifier("params"), factory.createObjectLiteralExpression([factory.createPropertyAssignment(factory.createIdentifier("length"), factory.createNumericLiteral(env_1.STRING_LITERAL_MAX_LENGTH))], true)));
                    }
                    else {
                        (0, assert_1.default)(ts.isNumericLiteral(type.literal));
                        attrAssignments.push(factory.createPropertyAssignment(factory.createIdentifier("type"), factory.createStringLiteral("precision")), factory.createPropertyAssignment(factory.createIdentifier("params"), factory.createObjectLiteralExpression([
                            factory.createPropertyAssignment(factory.createIdentifier("precision"), factory.createNumericLiteral(env_1.NUMERICAL_LITERL_DEFAULT_PRECISION)),
                            factory.createPropertyAssignment(factory.createIdentifier("scale"), factory.createNumericLiteral(env_1.NUMERICAL_LITERL_DEFAULT_SCALE))
                        ], true)));
                    }
                }
                else {
                    // 否则是本地规定的shape，直接用object
                    attrAssignments.push(factory.createPropertyAssignment(factory.createIdentifier("type"), factory.createStringLiteral("object")));
                }
            }
        }
        result.push(factory.createPropertyAssignment(name2, factory.createObjectLiteralExpression(attrAssignments, true)));
    });
    return result;
}
function outputStorage(outputDir, printer) {
    const importStatements = [
        factory.createImportDeclaration(undefined, undefined, factory.createImportClause(false, undefined, factory.createNamedImports([factory.createImportSpecifier(false, undefined, factory.createIdentifier("StorageSchema"))])), factory.createStringLiteral(`${(0, env_1.TYPE_PATH_IN_OAK_DOMAIN)()}Storage`), undefined),
        factory.createImportDeclaration(undefined, undefined, factory.createImportClause(false, undefined, factory.createNamedImports([factory.createImportSpecifier(false, undefined, factory.createIdentifier("EntityDict"))])), factory.createStringLiteral("./EntityDict"), undefined)
    ];
    const entityAssignments = [];
    for (const entity in Schema) {
        const indexExpressions = [];
        const { sourceFile, fulltextIndex, indexes } = Schema[entity];
        const statements = [
            factory.createImportDeclaration(undefined, undefined, factory.createImportClause(false, undefined, factory.createNamedImports([factory.createImportSpecifier(false, undefined, factory.createIdentifier("StorageDesc"))])), factory.createStringLiteral(`${(0, env_1.TYPE_PATH_IN_OAK_DOMAIN)()}Storage`), undefined),
            factory.createImportDeclaration(undefined, undefined, factory.createImportClause(false, undefined, factory.createNamedImports([factory.createImportSpecifier(false, undefined, factory.createIdentifier("OpSchema"))])), factory.createStringLiteral("./Schema"), undefined)
        ];
        const propertyAssignments = [];
        const attributes = constructAttributes(entity);
        propertyAssignments.push(factory.createPropertyAssignment(factory.createIdentifier("attributes"), factory.createObjectLiteralExpression(attributes, true)));
        if (indexes) {
            indexExpressions.push(...indexes.elements);
        }
        if (indexExpressions.length > 0) {
            propertyAssignments.push(factory.createPropertyAssignment(factory.createIdentifier("indexes"), factory.createArrayLiteralExpression(indexExpressions, true)));
        }
        statements.push(factory.createVariableStatement([factory.createModifier(ts.SyntaxKind.ExportKeyword)], factory.createVariableDeclarationList([factory.createVariableDeclaration(factory.createIdentifier("desc"), undefined, factory.createTypeReferenceNode(factory.createIdentifier("StorageDesc"), [
                factory.createTypeReferenceNode(factory.createIdentifier("OpSchema"), undefined)
            ]), factory.createObjectLiteralExpression(propertyAssignments, true))], ts.NodeFlags.Const)));
        const result = printer.printList(ts.ListFormat.SourceFileStatements, factory.createNodeArray(statements), sourceFile);
        const filename = path_1.default.join(outputDir, entity, 'Storage.ts');
        (0, fs_1.writeFileSync)(filename, result, { flag: 'w' });
        importStatements.push(factory.createImportDeclaration(undefined, undefined, factory.createImportClause(false, undefined, factory.createNamedImports([
            factory.createImportSpecifier(false, factory.createIdentifier("desc"), factory.createIdentifier(`${(0, utils_1.firstLetterLowerCase)(entity)}Desc`))
        ])), factory.createStringLiteral(`./${entity}/Storage`), undefined));
        entityAssignments.push(factory.createPropertyAssignment((0, utils_1.firstLetterLowerCase)(entity), factory.createIdentifier(`${(0, utils_1.firstLetterLowerCase)(entity)}Desc`)));
    }
    importStatements.push(factory.createVariableStatement([factory.createModifier(ts.SyntaxKind.ExportKeyword)], factory.createVariableDeclarationList([factory.createVariableDeclaration(factory.createIdentifier("storageSchema"), undefined, factory.createTypeReferenceNode(factory.createIdentifier("StorageSchema"), [
            factory.createTypeReferenceNode('EntityDict')
        ]), factory.createObjectLiteralExpression(entityAssignments, true))], ts.NodeFlags.Const)));
    const result = printer.printList(ts.ListFormat.SourceFileStatements, factory.createNodeArray(importStatements), ts.createSourceFile("someFileName.ts", "", ts.ScriptTarget.Latest, /*setParentNodes*/ false, ts.ScriptKind.TS));
    const filename = path_1.default.join(outputDir, 'Storage.ts');
    (0, fs_1.writeFileSync)(filename, result, { flag: 'w' });
}
function resetOutputDir(outputDir) {
    (0, fs_extra_1.emptydirSync)(outputDir);
    for (const moduleName in Schema) {
        (0, fs_1.mkdirSync)(`${outputDir}/${moduleName}`);
    }
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
function outputPackageJson(outputDir) {
    const pj = {
        "name": "oak-app-domain",
        "main": "index.ts"
    };
    const indexTs = `export * from './EntityDict';
    export * from './Storage';
    export * from './ActionDefDict';
    `;
    let filename = path_1.default.join(outputDir, 'index.ts');
    (0, fs_1.writeFileSync)(filename, indexTs, { flag: 'w' });
    filename = path_1.default.join(outputDir, 'package.json');
    (0, fs_1.writeFileSync)(filename, JSON.stringify(pj), { flag: 'w' });
    // 执行npm link
    /* try {
        execSync('npm link', {
            cwd: outputDir,
        });
    }
    catch (err) {
        console.error(err);
    } */
}
function analyzeEntities(inputDir) {
    const files = (0, fs_1.readdirSync)(inputDir);
    const fullFilenames = files.map(ele => {
        const entity = ele.slice(0, ele.indexOf('.'));
        if (env_1.RESERVED_ENTITIES.includes(entity)) {
            throw new Error(`${ele}是系统保留字，请勿使用其当对象名`);
        }
        return `${inputDir}/${ele}`;
    });
    const program = ts.createProgram(fullFilenames, { allowJs: true });
    files.forEach((filename) => {
        analyzeEntity(filename, inputDir, program);
    });
}
exports.analyzeEntities = analyzeEntities;
function buildSchema(outputDir) {
    addReverseRelationship();
    const printer = ts.createPrinter({ newLine: ts.NewLineKind.LineFeed });
    resetOutputDir(outputDir);
    outputSchema(outputDir, printer);
    outputSubQuery(outputDir, printer);
    outputAction(outputDir, printer);
    outputEntityDict(outputDir, printer);
    outputStorage(outputDir, printer);
    //if (!process.env.COMPLING_AS_LIB) {
    outputPackageJson(outputDir);
    //}
}
exports.buildSchema = buildSchema;
