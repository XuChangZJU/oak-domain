"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.buildSchema = exports.analyzeEntities = exports.registerDeducedRelationMap = exports.registerFixedDestinationPathMap = exports.registerIgnoredRelationPathMap = exports.registerFreeEntities = exports.registerIgnoredForeignKeyMap = void 0;
const tslib_1 = require("tslib");
const path_1 = tslib_1.__importDefault(require("path"));
const assert_1 = tslib_1.__importDefault(require("assert"));
const fs_1 = require("fs");
const fs_extra_1 = require("fs-extra");
const lodash_1 = require("lodash");
const ts = tslib_1.__importStar(require("typescript"));
const { factory } = ts;
const env_1 = require("./env");
const string_1 = require("../utils/string");
const Schema = {};
const OneToMany = {};
const ManyToOne = {};
const ReversePointerEntities = {};
const ReversePointerRelations = {};
const ActionImportStatements = () => [
    factory.createImportDeclaration(undefined, undefined, factory.createImportClause(false, undefined, factory.createNamedImports([factory.createImportSpecifier(false, undefined, factory.createIdentifier("ActionDef"))])), factory.createStringLiteral(`${(0, env_1.TYPE_PATH_IN_OAK_DOMAIN)()}Action`), undefined),
    factory.createImportDeclaration(undefined, undefined, factory.createImportClause(false, undefined, factory.createNamedImports([
        factory.createImportSpecifier(false, undefined, factory.createIdentifier("GenericAction")),
        factory.createImportSpecifier(false, undefined, factory.createIdentifier("AppendOnlyAction")),
        factory.createImportSpecifier(false, undefined, factory.createIdentifier("ReadOnlyAction")),
        factory.createImportSpecifier(false, undefined, factory.createIdentifier("ExcludeUpdateAction")),
        factory.createImportSpecifier(false, undefined, factory.createIdentifier("ExcludeRemoveAction")),
        factory.createImportSpecifier(false, undefined, factory.createIdentifier("RelationAction")),
    ])), factory.createStringLiteral((0, env_1.ACTION_CONSTANT_IN_OAK_DOMAIN)()), undefined)
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
/**
 * 对relationship去重。一旦发生对象重定义这里就有可能重复
 */
function uniqRelationships() {
    for (const entity in ManyToOne) {
        ManyToOne[entity] = (0, lodash_1.uniqBy)(ManyToOne[entity], (ele) => `${ele[0]}-${ele[1]}`);
    }
    for (const entity in OneToMany) {
        OneToMany[entity] = (0, lodash_1.uniqBy)(OneToMany[entity], (ele) => `${ele[0]}-${ele[1]}`);
    }
    for (const entity in ReversePointerRelations) {
        OneToMany[entity] = (0, lodash_1.uniq)(OneToMany[entity]);
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
                actionDefName = (0, string_1.firstLetterLowerCase)(text.slice(0, text.length - 9));
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
function checkStringLiteralLegal(filename, obj, text, ele) {
    (0, assert_1.default)(ts.isLiteralTypeNode(ele) && ts.isStringLiteral(ele.literal), `${filename}中引用的${obj} ${text}中存在不是stringliteral的类型`);
    (0, assert_1.default)(!ele.literal.text.includes('$'), `${filename}中引用的action${text}中的${obj}「${ele.literal.text}」包含非法字符$`);
    (0, assert_1.default)(ele.literal.text.length > 0, `${filename}中引用的action${text}中的${obj}「${ele.literal.text}」长度非法`);
    (0, assert_1.default)(ele.literal.text.length < env_1.STRING_LITERAL_MAX_LENGTH, `${filename}中引用的${obj} ${text}中的「${ele.literal.text}」长度过长`);
    return ele.literal.text;
}
function addActionSource(moduleName, name, node) {
    const ast = ActionAsts[moduleName];
    const { moduleSpecifier } = node;
    // todo 目前应该只会引用oak-domain/src/actions/action里的公共action，未来如果有交叉引用这里代码要修正（如果domain中也有引用action_constants这里应该也会错）
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
    if (ts.isUnionTypeNode(type)) {
        const actions = type.types.map(ele => checkStringLiteralLegal(filename, 'action', name.text, ele));
        return actions;
    }
    else {
        (0, assert_1.default)(ts.isLiteralTypeNode(type), `${filename}中引用的action「${name.text}」的定义不是union和stringLiteral类型`);
        const action = checkStringLiteralLegal(filename, 'action', name.text, type);
        return [action];
    }
}
const RESERVED_ACTION_NAMES = ['GenericAction', 'ParticularAction', 'ExcludeRemoveAction', 'ExcludeUpdateAction', 'ReadOnlyAction', 'AppendOnlyAction', 'RelationAction'];
const action_1 = require("../actions/action");
const DataType_1 = require("../types/DataType");
const Entity_1 = require("../types/Entity");
const uuid_1 = require("../utils/uuid");
const OriginActionDict = {
    'crud': 'GenericAction',
    'excludeUpdate': 'ExcludeUpdateAction',
    'excludeRemove': 'ExcludeRemoveAction',
    'appendOnly': 'AppendOnlyAction',
    'readOnly': 'ReadOnlyAction',
};
function dealWithActions(moduleName, filename, node, program, sourceFile) {
    const actionTexts = action_1.genericActions.map(ele => ele);
    if (moduleName === 'User') {
        actionTexts.push(...action_1.relationActions);
    }
    if (ts.isUnionTypeNode(node)) {
        const actionNames = node.types.map(ele => {
            if (ts.isTypeReferenceNode(ele) && ts.isIdentifier(ele.typeName)) {
                return ele.typeName.text;
            }
        }).filter(ele => !!ele);
        (0, assert_1.default)((0, lodash_1.intersection)(actionNames, RESERVED_ACTION_NAMES).length === 0, `${filename}中的Action命名不能是「${RESERVED_ACTION_NAMES.join(',')}」之一`);
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
        (0, assert_1.default)(/^[a-z][a-z|A-Z]+$/.test(action), `${filename}中的Action「${action}」命名不合法，必须以小字字母开头且只能包含字母`);
        if (ActionDict.hasOwnProperty(action)) {
            throw new Error(`文件${filename}中，Action定义上的【${action}】动作存在同名`);
        }
        else {
            (0, lodash_1.assign)(ActionDict, {
                [action]: 1,
            });
        }
    });
    pushStatementIntoActionAst(moduleName, factory.createVariableStatement([factory.createModifier(ts.SyntaxKind.ExportKeyword)], factory.createVariableDeclarationList([factory.createVariableDeclaration(factory.createIdentifier("actions"), undefined, undefined, factory.createArrayLiteralExpression(actionTexts.map(ele => factory.createStringLiteral(ele)), false))], ts.NodeFlags.Const)), sourceFile);
}
/**
 * entity的引用一定要以 import { Schema as XXX } from '..../XXX'这种形式
 * @param declaration
 * @param filename
 * @returns
 */
function getEntityImported(declaration) {
    const { moduleSpecifier, importClause } = declaration;
    let entityImported;
    if (ts.isStringLiteral(moduleSpecifier)) {
        const { name: importedFileName } = path_1.default.parse(moduleSpecifier.text);
        const { namedBindings } = importClause;
        if (namedBindings && ts.isNamedImports(namedBindings)) {
            const { elements } = namedBindings;
            if (elements.find(ele => ts.isImportSpecifier(ele) && ele.name.text === importedFileName && ele.propertyName?.text === 'Schema')) {
                entityImported = importedFileName;
            }
        }
    }
    return entityImported;
}
function checkLocaleEnumAttrs(node, attrs, filename) {
    const { members } = node;
    const memberKeys = members.map((ele) => {
        (0, assert_1.default)(ts.isPropertySignature(ele) && ts.isIdentifier(ele.name));
        return ele.name.text;
    });
    const lack = (0, lodash_1.difference)(attrs, memberKeys);
    if (lack.length > 0) {
        throw new Error(`${filename}中缺少了对${lack.join(',')}属性的locale定义`);
    }
}
function checkLocaleExpressionPropertyExists(root, attr, exists, filename) {
    const { properties } = root;
    properties.forEach((ele) => {
        (0, assert_1.default)(ts.isPropertyAssignment(ele) && (ts.isIdentifier(ele.name) || ts.isStringLiteral(ele.name)) && ts.isObjectLiteralExpression(ele.initializer));
        const { properties: p2 } = ele.initializer;
        const pp = p2.find((ele2) => {
            (0, assert_1.default)(ts.isPropertyAssignment(ele2) && ts.isIdentifier(ele2.name));
            return ele2.name.text === attr;
        });
        if (exists && !pp) {
            throw new Error(`${filename}中的locale定义中的${ele.name.text}中缺少了${attr}的定义`);
        }
        else if (!exists && pp) {
            throw new Error(`${filename}中的locale定义中的${ele.name.text}中有多余的${attr}定义`);
        }
    });
}
function getStringEnumValues(filename, program, obj, node) {
    const checker = program.getTypeChecker();
    const symbol = checker.getSymbolAtLocation(node.typeName);
    let declaration = symbol?.getDeclarations()[0];
    if (ts.isImportSpecifier(declaration)) {
        const typee = checker.getDeclaredTypeOfSymbol(symbol);
        declaration = typee.aliasSymbol?.getDeclarations()[0];
    }
    if (declaration && ts.isTypeAliasDeclaration(declaration)) {
        if (ts.isUnionTypeNode(declaration.type) && ts.isLiteralTypeNode(declaration.type.types[0])) {
            return declaration.type.types.map(ele => checkStringLiteralLegal(filename, obj, declaration.name.text, ele));
        }
        if (ts.isLiteralTypeNode(declaration.type)) {
            const value = checkStringLiteralLegal(filename, obj, declaration.name.text, declaration.type);
            return [value];
        }
    }
}
function checkNameLegal(filename, attrName, upperCase) {
    (0, assert_1.default)(attrName.length <= env_1.ENTITY_NAME_MAX_LENGTH, `文件「${filename}」：「${attrName}」的名称定义过长，不能超过「${env_1.ENTITY_NAME_MAX_LENGTH}」长度`);
    if (upperCase) {
        (0, assert_1.default)(/[A-Z][a-z|A-Z|0-9]+/i.test(attrName), `文件「${filename}」：「${attrName}」的名称必须以大写字母开始，且只能包含字母和数字`);
    }
    else if (upperCase === false) {
        (0, assert_1.default)(/[a-z][a-z|A-Z|0-9]+/i.test(attrName), `文件「${filename}」：「${attrName}」的名称必须以小写字母开始，且只能包含字母和数字`);
    }
    else {
        (0, assert_1.default)(/[a-z|A-Z][a-z|A-Z|0-9]+/i.test(attrName), `文件「${filename}」：「${attrName}」的名称必须以字母开始，且只能包含字母和数字`);
    }
}
function analyzeEntity(filename, path, program, relativePath) {
    const fullPath = `${path}/${filename}`;
    const sourceFile = program.getSourceFile(fullPath);
    const moduleName = filename.split('.')[0];
    if (Schema.hasOwnProperty(moduleName)) {
        delete ActionAsts[moduleName];
        delete SchemaAsts[moduleName];
        // removeFromRelationShip(moduleName);
        console.warn(`出现了同名的Entity定义「${moduleName}」，将使用${fullPath}取代掉默认对象，请检查新的对象结构及相关常量定义与原有的兼容，否则原有对象的相关逻辑会出现不可知异常`);
    }
    checkNameLegal(filename, moduleName, true);
    const referencedSchemas = [];
    const schemaAttrs = [];
    let hasFulltextIndex = false;
    let indexes;
    let beforeSchema = true;
    let hasActionDef = false;
    let hasRelationDef = false;
    let hasActionOrStateDef = false;
    let toModi = false;
    let actionType = 'crud';
    let _static = false;
    const enumAttributes = {};
    const additionalImports = [];
    let localeDef = undefined;
    // let relationHierarchy: ts.ObjectLiteralExpression | undefined = undefined;
    // let reverseCascadeRelationHierarchy: ts.ObjectLiteralExpression | undefined = undefined;
    ts.forEachChild(sourceFile, (node) => {
        if (ts.isImportDeclaration(node)) {
            const entityImported = getEntityImported(node);
            if (entityImported) {
                referencedSchemas.push(entityImported);
            }
            else {
                const { moduleSpecifier, importClause } = node;
                if (ts.isStringLiteral(moduleSpecifier)) {
                    const { text } = moduleSpecifier;
                    // 和数据类型相关的会自动引入，这里忽略（见initialStatements）
                    // 如果是相对路径，编译后的路径默认要深一层
                    const moduleSpecifier2Text = text.startsWith('.') ? (relativePath
                        ? path_1.default.join(relativePath, text).replace(/\\/g, '/')
                        : path_1.default.join('..', text).replace(/\\/g, '/')) : text;
                    additionalImports.push(factory.updateImportDeclaration(node, undefined, undefined, importClause, factory.createStringLiteral(moduleSpecifier2Text), undefined));
                }
                else {
                    (0, assert_1.default)(false, '未处理的import方式');
                }
            }
        }
        if (ts.isInterfaceDeclaration(node)) {
            // schema 定义
            if (node.name.text === 'Schema') {
                (0, assert_1.default)(!localeDef, `【${filename}】locale定义须在Schema之后`);
                let hasEntityAttr = false;
                let hasEntityIdAttr = false;
                const { members, heritageClauses } = node;
                (0, assert_1.default)(['EntityShape'].includes(heritageClauses[0].types[0].expression.text), moduleName);
                members.forEach((attrNode) => {
                    const { type, name, questionToken } = attrNode;
                    const attrName = name.text;
                    checkNameLegal(filename, attrName, false);
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
                                if (!ReversePointerRelations[reverseEntity].includes(moduleName)) {
                                    ReversePointerRelations[reverseEntity].push(moduleName);
                                }
                            }
                            else {
                                (0, lodash_1.assign)(ReversePointerRelations, {
                                    [reverseEntity]: [moduleName],
                                });
                            }
                            if (reverseEntity === 'Modi') {
                                toModi = true;
                            }
                        }
                        else {
                            schemaAttrs.push(attrNode);
                            const enumStringValues = getStringEnumValues(filename, program, '属性', type);
                            if (enumStringValues) {
                                enumAttributes[attrName] = enumStringValues;
                            }
                        }
                    }
                    else if (ts.isArrayTypeNode(type) && ts.isTypeReferenceNode(type.elementType) && ts.isIdentifier(type.elementType.typeName)) {
                        const { typeName } = type.elementType;
                        if (referencedSchemas.includes(typeName.text)) {
                            // 这也是一对多的反指定义 
                            const reverseEntity = typeName.text;
                            if (ReversePointerRelations[reverseEntity]) {
                                ReversePointerRelations[reverseEntity].push(moduleName);
                            }
                            else {
                                (0, lodash_1.assign)(ReversePointerRelations, {
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
                        if (ts.isUnionTypeNode(type) && ts.isLiteralTypeNode(type.types[0]) && ts.isStringLiteral(type.types[0].literal)) {
                            (0, assert_1.default)(ts.isIdentifier(name));
                            const { types } = type;
                            const enumValues = types.map((ele) => checkStringLiteralLegal(filename, '属性', name.text, ele));
                            enumAttributes[name.text] = enumValues;
                        }
                        else if (ts.isLiteralTypeNode(type) && ts.isStringLiteral(type.literal)) {
                            // 单个字符串的情形，目前应该没有，没测试过，先写着 by Xc 20230221
                            (0, assert_1.default)(ts.isIdentifier(name));
                            const enumValues = [
                                checkStringLiteralLegal(filename, '属性', name.text, type)
                            ];
                            enumAttributes[name.text] = enumValues;
                        }
                    }
                    if (attrName === 'entity') {
                        (0, assert_1.default)(ts.isTypeReferenceNode(type) && ts.isIdentifier(type.typeName), `「${moduleName}」中entity属性的定义不是String<32>类型，entity是系统用于表示反指指针的保留属性，请勿他用`);
                        const { typeArguments } = type;
                        (0, assert_1.default)(type.typeName.text === 'String'
                            && typeArguments
                            && typeArguments.length === 1, `「${moduleName}」中entity属性的定义不是String<32>类型，entity是系统用于表示反指指针的保留属性，请勿他用`);
                        const [node] = typeArguments;
                        if (ts.isLiteralTypeNode(node) && ts.isNumericLiteral(node.literal)) {
                            if (parseInt(node.literal.text) > 32) {
                                (0, assert_1.default)(false, `「${moduleName}」中entity属性的定义不是String<32>类型，entity是系统用于表示反指指针的保留属性，请勿他用`);
                            }
                            else {
                                hasEntityAttr = true;
                            }
                        }
                    }
                    if (attrName === 'entityId') {
                        (0, assert_1.default)(ts.isTypeReferenceNode(type) && ts.isIdentifier(type.typeName), `「${moduleName}」中entityId属性的定义不是String<64>类型，entityId是系统用于表示反指指针的保留属性，请勿他用`);
                        const { typeArguments } = type;
                        (0, assert_1.default)(type.typeName.text === 'String' && typeArguments && typeArguments.length === 1, `「${moduleName}」中entityId属性的定义不是String<64>类型，entityId是系统用于表示反指指针的保留属性，请勿他用`);
                        const [node] = typeArguments;
                        if (ts.isLiteralTypeNode(node) && ts.isNumericLiteral(node.literal)) {
                            if (parseInt(node.literal.text) !== 64) {
                                (0, assert_1.default)(false, `「${moduleName}」中entityId属性的定义不是String<64>类型，entityId是系统用于表示反指指针的保留属性，请勿他用`);
                            }
                            else {
                                hasEntityIdAttr = true;
                            }
                        }
                    }
                });
                if (hasEntityAttr && hasEntityIdAttr) {
                    (0, lodash_1.assign)(ReversePointerEntities, {
                        [moduleName]: 1,
                    });
                }
                else if (hasEntityAttr || hasEntityIdAttr) {
                    throw new Error(`文件「${filename}」：属性 定义中只包含${hasEntityAttr ? 'entity' : 'entityId'}，不符合定义规范。entity/entityId必须联合出现，代表不定对象的反向指针`);
                }
                beforeSchema = false;
                // 对于不是Modi和Oper的对象，全部建立和ModiEntity的反指关系
                if (!['Modi', 'Oper', 'OperEntity', 'ModiEntity'].includes(moduleName) && !toModi) {
                    if (ReversePointerRelations['ModiEntity'] && !ReversePointerRelations['ModiEntity'].includes(moduleName)) {
                        ReversePointerRelations['ModiEntity'].push(moduleName);
                    }
                    else {
                        (0, lodash_1.assign)(ReversePointerRelations, {
                            ['ModiEntity']: [moduleName],
                        });
                    }
                    if (ReversePointerRelations['OperEntity'] && !ReversePointerRelations['OperEntity'].includes(moduleName)) {
                        ReversePointerRelations['OperEntity'].push(moduleName);
                    }
                    else {
                        (0, lodash_1.assign)(ReversePointerRelations, {
                            ['OperEntity']: [moduleName],
                        });
                    }
                }
            }
            else if (beforeSchema) {
                // 本地规定的一些形状定义，直接使用
                pushStatementIntoSchemaAst(moduleName, node, sourceFile);
            }
        }
        if (ts.isTypeAliasDeclaration(node)) {
            // action 定义
            if (node.name.text === 'Action') {
                (0, assert_1.default)(!localeDef, `【${filename}】locale定义须在Action之后`);
                hasActionDef = true;
                const modifiers = [factory.createModifier(ts.SyntaxKind.ExportKeyword)];
                pushStatementIntoActionAst(moduleName, factory.updateTypeAliasDeclaration(node, node.decorators, modifiers, factory.createIdentifier('ParticularAction'), node.typeParameters, node.type), sourceFile);
                dealWithActions(moduleName, filename, node.type, program, sourceFile);
            }
            else if (node.name.text === 'Relation') {
                (0, assert_1.default)(!localeDef, `【${filename}】locale定义须在Relation之后`);
                const relationValues = [];
                if (ts.isLiteralTypeNode(node.type)) {
                    (0, assert_1.default)(ts.isStringLiteral(node.type.literal));
                    (0, assert_1.default)(node.type.literal.text.length < env_1.STRING_LITERAL_MAX_LENGTH, `Relation定义的字符串长度不长于${env_1.STRING_LITERAL_MAX_LENGTH}（${filename}，${node.type.literal.text}）`);
                    relationValues.push(node.type.literal.text);
                }
                else {
                    (0, assert_1.default)(ts.isUnionTypeNode(node.type), `Relation的定义只能是string类型（${filename}）`);
                    relationValues.push(...node.type.types.map((ele) => {
                        (0, assert_1.default)(ts.isLiteralTypeNode(ele) && ts.isStringLiteral(ele.literal), `Relation的定义只能是string类型（${filename}）`);
                        (0, assert_1.default)(ele.literal.text.length < env_1.STRING_LITERAL_MAX_LENGTH, `Relation定义的字符串长度不长于${env_1.STRING_LITERAL_MAX_LENGTH}（${filename}，${ele.literal.text}）`);
                        return ele.literal.text;
                    }));
                }
                // 对UserEntityGrant对象，建立相应的反指关系
                if (ReversePointerRelations['UserEntityGrant']) {
                    if (!ReversePointerRelations['UserEntityGrant'].includes(moduleName)) {
                        ReversePointerRelations['UserEntityGrant'].push(moduleName);
                    }
                }
                else {
                    (0, lodash_1.assign)(ReversePointerRelations, {
                        ['UserEntityGrant']: [moduleName],
                    });
                }
                // 对Relation对象建立相应的反指关系
                if (ReversePointerRelations['Relation']) {
                    if (!ReversePointerRelations['Relation'].includes(moduleName)) {
                        ReversePointerRelations['Relation'].push(moduleName);
                    }
                }
                else {
                    (0, lodash_1.assign)(ReversePointerRelations, {
                        ['Relation']: [moduleName],
                    });
                }
                // 对UserRelation对象建立相应的反指关系
                if (ReversePointerRelations['UserRelation']) {
                    if (!ReversePointerRelations['UserRelation'].includes(moduleName)) {
                        ReversePointerRelations['UserRelation'].push(moduleName);
                    }
                }
                else {
                    (0, lodash_1.assign)(ReversePointerRelations, {
                        ['UserRelation']: [moduleName],
                    });
                }
                hasRelationDef = node;
            }
            else if (node.name.text.endsWith('Action') || node.name.text.endsWith('State')) {
                (0, assert_1.default)(!localeDef, `【${filename}】locale定义须在Action/State之后`);
                hasActionOrStateDef = true;
                const { type } = node;
                if (ts.isUnionTypeNode(type)) {
                    pushStatementIntoActionAst(moduleName, factory.updateTypeAliasDeclaration(node, node.decorators, [factory.createModifier(ts.SyntaxKind.ExportKeyword)], node.name, node.typeParameters, process.env.COMPLING_AS_LIB ? factory.createUnionTypeNode([
                        ...type.types,
                        factory.createKeywordTypeNode(ts.SyntaxKind.StringKeyword)
                    ]) : type), sourceFile);
                }
                else {
                    (0, assert_1.default)(ts.isLiteralTypeNode(type) || ts.isTypeReferenceNode(type), `${moduleName} - ${node.name}`);
                    pushStatementIntoActionAst(moduleName, factory.updateTypeAliasDeclaration(node, node.decorators, [factory.createModifier(ts.SyntaxKind.ExportKeyword)], node.name, node.typeParameters, process.env.COMPLING_AS_LIB ? factory.createUnionTypeNode([
                        type,
                        factory.createKeywordTypeNode(ts.SyntaxKind.StringKeyword)
                    ]) : type), sourceFile);
                }
            }
            else if (beforeSchema) {
                // 本地规定的一些形状定义，直接使用
                pushStatementIntoSchemaAst(moduleName, node, sourceFile);
            }
        }
        if (ts.isVariableStatement(node)) {
            const { declarationList: { declarations } } = node;
            const dealWithActionDef = (declaration) => {
                checkActionDefNameConsistent(filename, declaration);
                const { typeArguments } = declaration.type;
                (0, assert_1.default)(typeArguments.length === 2);
                const [actionNode, stateNode] = typeArguments;
                (0, assert_1.default)(ts.isTypeReferenceNode(actionNode));
                (0, assert_1.default)(ts.isTypeReferenceNode(stateNode));
                (0, assert_1.default)(getStringEnumValues(filename, program, 'action', actionNode), `文件${filename}中的action${actionNode.typeName.text}定义不是字符串类型`);
                const enumStateValues = getStringEnumValues(filename, program, 'state', stateNode);
                (0, assert_1.default)(enumStateValues, `文件${filename}中的state${stateNode.typeName.text}定义不是字符串类型`);
                pushStatementIntoActionAst(moduleName, node, sourceFile);
                (0, assert_1.default)(ts.isIdentifier(declaration.name));
                const adName = declaration.name.text.slice(0, declaration.name.text.length - 9);
                const attr = adName.concat('State');
                schemaAttrs.push(factory.createPropertySignature(undefined, (0, string_1.firstLetterLowerCase)(attr), factory.createToken(ts.SyntaxKind.QuestionToken), factory.createTypeReferenceNode(attr)));
                enumAttributes[(0, string_1.firstLetterLowerCase)(attr)] = enumStateValues;
            };
            const dealWithIndexes = (declaration) => {
                const indexNameDict = {};
                // 检查索引的属性是否合法
                const { elements } = declaration;
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
                    const nameText = nameProperty.initializer.text;
                    if (indexNameDict[nameText]) {
                        throw new Error(`「${filename}」索引定义重名「${nameText}」`);
                    }
                    (0, lodash_1.assign)(indexNameDict, {
                        [nameText]: true,
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
                        if (!Entity_1.initinctiveAttributes.includes(indexAttrName)) {
                            const schemaNode = schemaAttrs.find((ele3) => {
                                (0, assert_1.default)(ts.isPropertySignature(ele3));
                                return ele3.name.text === indexAttrName;
                            });
                            if (!schemaNode) {
                                throw new Error(`「${filename}」中索引「${nameText}」的属性「${indexAttrName}」定义非法`);
                            }
                            const { type, name } = schemaNode;
                            const entity = moduleName;
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
                                            (0, assert_1.default)(['Text', 'String'].includes(text2), `「${filename}」中全文索引「${nameText}」定义的属性「${indexAttrName}」类型非法，只能是Text/String`);
                                        }
                                        else {
                                            (0, assert_1.default)(!DataType_1.unIndexedTypes.includes(text2), `「${filename}」中索引「${nameText}」的属性「${indexAttrName}」的类型为「${text2}」，不可索引`);
                                        }
                                    }
                                    else {
                                        (0, assert_1.default)(!isFulltextIndex, `「${filename}」中全文索引「${nameText}」的属性「${indexAttrName}」类型非法，只能为Text/String`);
                                        // 在这里把外键加上Id，这样storageSchema才能正常通过
                                        // 这里的写法不太好，未来TS版本高了可能会有问题。by Xc 20230131
                                        Object.assign(nameProperty, {
                                            initializer: factory.createStringLiteral(`${indexAttrName}Id`),
                                        });
                                    }
                                }
                                else {
                                    (0, assert_1.default)(false); // 这是什么case，不确定
                                }
                            }
                            else {
                                (0, assert_1.default)(!isFulltextIndex, `「${filename}」中全文索引「${nameText}」的属性「${indexAttrName}」类型只能为Text/String`);
                                (0, assert_1.default)(ts.isUnionTypeNode(type) || ts.isLiteralTypeNode(type), `${entity}中索引「${nameText}」的属性${name.text}有定义非法`);
                            }
                        }
                    });
                });
                indexes = declaration;
            };
            const dealWithLocales = (declaration) => {
                if (hasActionDef) {
                    // 检查每种locale定义中都应该有'action'域
                    checkLocaleExpressionPropertyExists(declaration, 'action', true, filename);
                }
                else {
                    checkLocaleExpressionPropertyExists(declaration, 'action', false, filename);
                }
                if (hasRelationDef) {
                    // 检查每种locale定义中都应该有'r'域
                    checkLocaleExpressionPropertyExists(declaration, 'r', true, filename);
                }
                else {
                    checkLocaleExpressionPropertyExists(declaration, 'r', false, filename);
                }
                const allEnumStringAttrs = Object.keys(enumAttributes);
                if (allEnumStringAttrs.length > 0) {
                    // 检查每种locale定义中都应该有'v'域
                    checkLocaleExpressionPropertyExists(declaration, 'v', true, filename);
                }
                else {
                    // 检查每种locale定义中都应该有'v'域
                    checkLocaleExpressionPropertyExists(declaration, 'v', false, filename);
                }
                localeDef = declaration;
            };
            const dealWithConfiguration = (declaration) => {
                // assert(!hasActionDef, `${moduleName}中的Configuration定义在Action之后`);
                const { properties } = declaration;
                const atProperty = properties.find(ele => ts.isPropertyAssignment(ele) && ts.isIdentifier(ele.name) && ele.name.text === 'actionType');
                const staticProperty = properties.find(ele => ts.isPropertyAssignment(ele) && ts.isIdentifier(ele.name) && ele.name.text === 'static');
                if (atProperty) {
                    actionType = atProperty.initializer.text;
                }
                if (staticProperty) {
                    _static = true; // static如果有值只能为true
                }
            };
            declarations.forEach((declaration) => {
                if (declaration.type && ts.isTypeReferenceNode(declaration.type) && ts.isIdentifier(declaration.type.typeName) && declaration.type.typeName.text === 'ActionDef') {
                    dealWithActionDef(declaration);
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
                    console.log(`「${filename}」直接定义indexes的写法已经过时，请定义在entityDesc中`);
                    (0, assert_1.default)(ts.isArrayLiteralExpression(declaration.initializer));
                    dealWithIndexes(declaration.initializer);
                }
                else if (declaration.type && ts.isTypeReferenceNode(declaration.type) && ts.isIdentifier(declaration.type.typeName) && declaration.type.typeName.text === 'LocaleDef') {
                    // locale定义
                    console.log(`「${filename}」直接定义locales的写法已经过时，请定义在entityDesc中`);
                    const { type, initializer } = declaration;
                    (0, assert_1.default)(ts.isObjectLiteralExpression(initializer));
                    const { properties } = initializer;
                    (0, assert_1.default)(properties.length > 0, `${filename}至少需要有一种locale定义`);
                    const allEnumStringAttrs = Object.keys(enumAttributes);
                    const { typeArguments } = type;
                    (0, assert_1.default)(typeArguments &&
                        ts.isTypeReferenceNode(typeArguments[0])
                        && ts.isIdentifier(typeArguments[0].typeName) && typeArguments[0].typeName.text === 'Schema', `${filename}中缺少locale定义，或者locale类型定义的第一个参数不是Schema`);
                    if (hasActionDef) {
                        (0, assert_1.default)(ts.isTypeReferenceNode(typeArguments[1])
                            && ts.isIdentifier(typeArguments[1].typeName) && typeArguments[1].typeName.text === 'Action', `${filename}中locale类型定义的第二个参数不是Action`);
                    }
                    else {
                        (0, assert_1.default)(ts.isLiteralTypeNode(typeArguments[1])
                            && ts.isStringLiteral(typeArguments[1].literal), `${filename}中locale类型定义的第二个参数不是字符串`);
                    }
                    if (hasRelationDef) {
                        (0, assert_1.default)(ts.isTypeReferenceNode(typeArguments[2])
                            && ts.isIdentifier(typeArguments[2].typeName)
                            && typeArguments[2].typeName.text === 'Relation', `${filename}中的locale类型定义的第三个参数不是Relation`);
                    }
                    else {
                        (0, assert_1.default)(ts.isLiteralTypeNode(typeArguments[2])
                            && ts.isStringLiteral(typeArguments[2].literal), `${filename}中locale类型定义的第三个参数不是空字符串`);
                    }
                    if (allEnumStringAttrs.length > 0) {
                        (0, assert_1.default)(ts.isTypeLiteralNode(typeArguments[3]), `${filename}中的locale类型定义的第四个参数不是{}`);
                        checkLocaleEnumAttrs(typeArguments[3], allEnumStringAttrs, filename);
                    }
                    else {
                        (0, assert_1.default)(ts.isTypeLiteralNode(typeArguments[3]), `${filename}中的locale类型定义的第四个参数不是{}`);
                        (0, assert_1.default)(typeArguments[3].members.length == 0, `${filename}中locale类型定义的第四个参数不应存在相应的v定义`);
                    }
                    dealWithLocales(initializer);
                }
                else if (declaration.type && ts.isTypeReferenceNode(declaration.type) && ts.isIdentifier(declaration.type.typeName) && declaration.type.typeName.text === 'Configuration') {
                    console.log(`「${filename}」直接定义configuration的写法已经过时，请定义在entityDesc中`);
                    (0, assert_1.default)(ts.isObjectLiteralExpression(declaration.initializer));
                    dealWithConfiguration(declaration.initializer);
                }
                else if (declaration.type && ts.isTypeReferenceNode(declaration.type) && ts.isIdentifier(declaration.type.typeName) && declaration.type.typeName.text === 'EntityDesc') {
                    (0, assert_1.default)(ts.isObjectLiteralExpression(declaration.initializer));
                    const { properties } = declaration.initializer;
                    const localesProperty = properties.find(ele => ts.isPropertyAssignment(ele) && ts.isIdentifier(ele.name) && ele.name.text === 'locales');
                    (0, assert_1.default)(ts.isPropertyAssignment(localesProperty));
                    dealWithLocales(localesProperty.initializer);
                    const indexesProperty = properties.find(ele => ts.isPropertyAssignment(ele) && ts.isIdentifier(ele.name) && ele.name.text === 'indexes');
                    if (indexesProperty) {
                        (0, assert_1.default)(ts.isPropertyAssignment(indexesProperty));
                        dealWithIndexes(indexesProperty.initializer);
                    }
                    const configurationProperty = properties.find(ele => ts.isPropertyAssignment(ele) && ts.isIdentifier(ele.name) && ele.name.text === 'configuration');
                    if (configurationProperty) {
                        (0, assert_1.default)(ts.isPropertyAssignment(configurationProperty));
                        dealWithConfiguration(configurationProperty.initializer);
                    }
                }
                else {
                    throw new Error(`${moduleName}：不能理解的定义内容${declaration.name.text}`);
                }
            });
        }
    });
    // 要等configuration确定了actionType后再处理
    if (hasActionDef) {
        const actionDefNodes = [
            factory.createTypeReferenceNode(OriginActionDict[actionType], undefined),
            factory.createTypeReferenceNode('ParticularAction', undefined)
        ];
        if (moduleName === 'User') {
            actionDefNodes.push(factory.createTypeReferenceNode('RelationAction', undefined));
        }
        if (process.env.COMPLING_AS_LIB) {
            actionDefNodes.push(factory.createKeywordTypeNode(ts.SyntaxKind.StringKeyword));
        }
        pushStatementIntoActionAst(moduleName, factory.createTypeAliasDeclaration(undefined, [factory.createModifier(ts.SyntaxKind.ExportKeyword)], factory.createIdentifier("Action"), undefined, factory.createUnionTypeNode(actionDefNodes)), sourceFile);
    }
    if (!hasActionDef && hasActionOrStateDef) {
        throw new Error(`${filename}中有Action或State定义，但没有定义完整的Action类型`);
    }
    if (hasActionDef && actionType !== 'crud') {
        throw new Error(`${filename}中有Action定义，但却定义了actionType不是crud`);
    }
    (0, assert_1.default)(schemaAttrs.length > 0, `对象${moduleName}没有任何属性定义`);
    const schema = {
        schemaAttrs,
        sourceFile,
        toModi,
        actionType,
        static: _static,
        hasRelationDef,
        enumAttributes,
        additionalImports,
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
    if (!localeDef) {
        throw new Error(`${filename}中缺少了locale定义`);
    }
    else {
        (0, lodash_1.assign)(schema, {
            locale: localeDef,
        });
    }
    /* if (hasRelationDef) {
        if(!relationHierarchy && !reverseCascadeRelationHierarchy){
            console.warn(`${filename}中定义了Relation,但并没有relationHierarchy或reverseCascadeRelationHierarchy的定义，请注意自主编写权限分配的checker`);
        }
        if (relationHierarchy) {
            assign(schema, {
                relationHierarchy,
            });
        }
        if (reverseCascadeRelationHierarchy) {
            assign(schema, {
                reverseCascadeRelationHierarchy,
            });
        }
    }
    else {
        assert(!relationHierarchy, `${filename}中具有relationHierarchy定义但没有Relation定义`);
        assert(!reverseCascadeRelationHierarchy, `${filename}中具有reverseCascadeRelationHierarchy定义但没有Relation定义`)
    } */
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
    const members = [];
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
                            factory.createLiteralTypeNode(factory.createStringLiteral((0, string_1.firstLetterLowerCase)(text2)))
                        ]),
                        factory.createLiteralTypeNode(factory.createNull())
                    ]) : factory.createTypeReferenceNode(factory.createIdentifier('ForeignKey'), [
                        factory.createLiteralTypeNode(factory.createStringLiteral((0, string_1.firstLetterLowerCase)(text2)))
                    ])));
                }
                else {
                    // assert(types.includes(text), `${entity}中的属性${name.toString()}有非法的属性类型定义`);
                    // 处理entity这种特殊情况
                    if (ReversePointerRelations[entity] && attrName === 'entity') {
                        const entityUnionTypeNode = ReversePointerRelations[entity].map(ele => factory.createLiteralTypeNode(factory.createStringLiteral((0, string_1.firstLetterLowerCase)(ele))));
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
            (0, assert_1.default)(ts.isUnionTypeNode(type) || ts.isLiteralTypeNode(type), `${entity}有非法的属性类型定义${name.text}`);
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
            members2.push(factory.createPropertySignature(undefined, (0, string_1.firstLetterLowerCase)(one), factory.createToken(ts.SyntaxKind.QuestionToken), factory.createTypeReferenceNode(createForeignRef(entity, one, 'Schema'))));
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
            const entityNameLc = (0, string_1.firstLetterLowerCase)(entityName);
            foreignKeySet[entityName].forEach((foreignKey) => {
                const identifier = `${entityNameLc}$${foreignKey}`;
                members2.push(factory.createPropertySignature(undefined, identifier, factory.createToken(ts.SyntaxKind.QuestionToken), factory.createTypeReferenceNode(factory.createIdentifier("Array"), [factory.createTypeReferenceNode(createForeignRef(entity, entityName, 'Schema'), undefined)])));
                const aggrIdentifier = `${entityNameLc}$${foreignKey}$$aggr`;
                members2.push(factory.createPropertySignature(undefined, aggrIdentifier, factory.createToken(ts.SyntaxKind.QuestionToken), factory.createTypeReferenceNode(factory.createIdentifier("AggregationResult"), [factory.createTypeReferenceNode(createForeignRef(entity, entityName, 'Schema'), undefined)])));
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
    statements.push(factory.createTypeAliasDeclaration(undefined, [
        factory.createModifier(ts.SyntaxKind.ExportKeyword)
    ], factory.createIdentifier('OpSchema'), undefined, factory.createIntersectionTypeNode([
        factory.createTypeReferenceNode('EntityShape'),
        factory.createTypeLiteralNode(members)
    ])), factory.createTypeAliasDeclaration(undefined, [factory.createModifier(ts.SyntaxKind.ExportKeyword)], factory.createIdentifier("OpAttr"), undefined, factory.createTypeOperatorNode(ts.SyntaxKind.KeyOfKeyword, factory.createTypeReferenceNode(factory.createIdentifier("OpSchema"), undefined))));
    statements.push(factory.createTypeAliasDeclaration(undefined, [
        factory.createModifier(ts.SyntaxKind.ExportKeyword)
    ], factory.createIdentifier('Schema'), undefined, factory.createIntersectionTypeNode([
        factory.createTypeReferenceNode('EntityShape'),
        factory.createTypeLiteralNode(members.concat(members2)),
        factory.createMappedTypeNode(undefined, factory.createTypeParameterDeclaration(undefined, factory.createIdentifier("A"), factory.createTypeReferenceNode(factory.createIdentifier("ExpressionKey"), undefined), undefined), undefined, factory.createToken(ts.SyntaxKind.QuestionToken), factory.createKeywordTypeNode(ts.SyntaxKind.AnyKeyword), undefined)
    ])));
}
/**
 * 生成Query
 * @param statements
 * @param schemaAttrs
 * @param entity
 */
function constructFilter(statements, entity) {
    const { schemaAttrs, fulltextIndex, enumAttributes } = Schema[entity];
    const members = [
        // id: Q_StringValue
        factory.createPropertySignature(undefined, factory.createIdentifier('id'), undefined, factory.createUnionTypeNode([
            factory.createTypeReferenceNode(factory.createIdentifier('Q_StringValue')),
            /* factory.createTypeReferenceNode(
                factory.createQualifiedName(
                    factory.createIdentifier("SubQuery"),
                    factory.createIdentifier(`${entity}IdSubQuery`)
                )
            ) */
        ])),
        // $$createAt$$: Q_DateValue
        factory.createPropertySignature(undefined, factory.createIdentifier('$$createAt$$'), undefined, factory.createTypeReferenceNode(factory.createIdentifier('Q_DateValue'))),
        // $$seq$$: Q_StringValue
        factory.createPropertySignature(undefined, factory.createIdentifier('$$seq$$'), undefined, factory.createTypeReferenceNode(factory.createIdentifier('Q_StringValue'))),
        // $$updateAt$$: Q_DateValue
        factory.createPropertySignature(undefined, factory.createIdentifier('$$updateAt$$'), undefined, factory.createTypeReferenceNode(factory.createIdentifier('Q_DateValue')))
    ];
    const { [entity]: manyToOneSet } = ManyToOne;
    const entityUnionTypeNodes = ReversePointerRelations[entity] && ReversePointerRelations[entity].map(ele => factory.createLiteralTypeNode(factory.createStringLiteral((0, string_1.firstLetterLowerCase)(ele))));
    if (process.env.COMPLING_AS_LIB) {
        entityUnionTypeNodes && entityUnionTypeNodes.push(factory.createKeywordTypeNode(ts.SyntaxKind.StringKeyword));
    }
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
                            type2 = factory.createTypeReferenceNode(factory.createIdentifier('Q_EnumValue'), [
                                factory.createUnionTypeNode(entityUnionTypeNodes)
                            ]);
                        }
                        else {
                            type2 = factory.createTypeReferenceNode(factory.createIdentifier('Q_StringValue'));
                        }
                        break;
                    }
                    case 'Int':
                    case 'Uint':
                    case 'Float':
                    case 'Double':
                    case 'Price': {
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
                    case 'SingleGeo':
                    case 'Geo': {
                        // geo类型暂时只支持通过expr查询
                        break;
                    }
                    case 'Object': {
                        type2 = factory.createTypeReferenceNode(factory.createIdentifier('Object'));
                        break;
                    }
                    default: {
                        const text2 = text === 'Schema' ? entity : text;
                        const manyToOneItem = manyToOneSet && manyToOneSet.find(([refEntity]) => refEntity === text2);
                        if (manyToOneItem) {
                            // 外键可能落到相应的子查询中
                            members.push(factory.createPropertySignature(undefined, `${name.text}Id`, undefined, factory.createTypeReferenceNode(factory.createIdentifier('Q_StringValue'))));
                            type2 = factory.createTypeReferenceNode(createForeignRef(entity, text2, 'Filter'));
                        }
                        else if (enumAttributes && enumAttributes[attrName] || ts.isUnionTypeNode(type)) {
                            // 这里应该都是引用某个UnionType类型的定义了，如何判断？
                            // const words = getStringTextFromUnionStringLiterals();
                            type2 = factory.createTypeReferenceNode(factory.createIdentifier('Q_EnumValue'), [
                                factory.createTypeReferenceNode(factory.createIdentifier(text), undefined)
                            ]);
                        }
                        else {
                            // 非枚举类型的非结构化属性，用JSONFilter来形式化
                            type2 = factory.createTypeReferenceNode(factory.createIdentifier('JsonFilter'), [
                                factory.createTypeReferenceNode(factory.createIdentifier(text), undefined)
                            ]);
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
            (0, assert_1.default)(type);
            members.push(factory.createPropertySignature(undefined, name, undefined, factory.createTypeReferenceNode(factory.createIdentifier('JsonFilter'), [
                type
            ])));
        }
    }
    // type AttrFilter = {};
    if (ReversePointerRelations[entity]) {
        // 有反向指针，将反向指针关联的对象的Filter也注入
        ReversePointerRelations[entity].forEach(ele => members.push(factory.createPropertySignature(undefined, (0, string_1.firstLetterLowerCase)(ele), undefined, factory.createTypeReferenceNode(createForeignRef(entity, ele, 'Filter')))));
    }
    // 一对多的生成子查询
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
            const entityNameLc = (0, string_1.firstLetterLowerCase)(entityName);
            foreignKeySet[entityName].forEach((foreignKey) => {
                const identifier = `${entityNameLc}$${foreignKey}`;
                members.push(factory.createPropertySignature(undefined, identifier, undefined, factory.createIntersectionTypeNode([
                    factory.createTypeReferenceNode(createForeignRef(entity, entityName, 'Filter'), undefined),
                    factory.createTypeReferenceNode('SubQueryPredicateMetadata')
                ])));
            });
        }
    }
    statements.push(factory.createTypeAliasDeclaration(undefined, undefined, factory.createIdentifier('AttrFilter'), undefined, factory.createTypeLiteralNode(members)));
    /**
     *
    export type Filter = AttrFilter | Partial<ExprOp<OpSchema> | {
            [F in Q_LogicKey]: Filter[];
        } | {
            [F in Q_FullTextKey]: Q_FullTextValue;
        }>;

     */
    const types = [
        factory.createTypeReferenceNode(factory.createIdentifier("AttrFilter")),
        factory.createTypeReferenceNode(factory.createIdentifier("ExprOp"), [
            process.env.COMPLING_AS_LIB ?
                factory.createUnionTypeNode([
                    factory.createTypeReferenceNode(factory.createIdentifier('OpAttr')),
                    factory.createKeywordTypeNode(ts.SyntaxKind.StringKeyword)
                ]) :
                factory.createTypeReferenceNode(factory.createIdentifier('OpAttr'))
        ]),
    ];
    // 如果还有其它类型的查询如全文，则加在types数组中
    if (fulltextIndex) {
        types.push(factory.createTypeReferenceNode('FulltextFilter'));
    }
    statements.push(factory.createTypeAliasDeclaration(undefined, [factory.createModifier(ts.SyntaxKind.ExportKeyword)], factory.createIdentifier("Filter"), undefined, factory.createTypeReferenceNode(factory.createIdentifier("MakeFilter"), [factory.createIntersectionTypeNode(types)])));
}
/**
 * 构造Projection和OneAttrProjection
 * @param statements
 * @param entity
 */
function constructProjection(statements, entity) {
    const { schemaAttrs, enumAttributes } = Schema[entity];
    const properties = [
        ['id', false],
        ['$$createAt$$', false],
        ['$$updateAt$$', false],
        ['$$seq$$', false],
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
                    case 'Uint':
                    case 'Float':
                    case 'Double':
                    case 'Boolean':
                    case 'Datetime':
                    case 'Image':
                    case 'File':
                    case 'SingleGeo':
                    case 'Geo':
                    case 'Price': {
                        properties.push([name, false]);
                        break;
                    }
                    case 'Object': {
                        properties.push([name, false, factory.createUnionTypeNode([
                                factory.createKeywordTypeNode(ts.SyntaxKind.NumberKeyword),
                                factory.createTypeReferenceNode(factory.createIdentifier("Object"), undefined)
                            ])]);
                        break;
                    }
                    default: {
                        const text2 = text === 'Schema' ? entity : text;
                        const manyToOneItem = manyToOneSet && manyToOneSet.find(([refEntity]) => refEntity === text2);
                        if (manyToOneItem) {
                            // 外键投影
                            properties.push([`${attrName}Id`, false, undefined], [name, false, factory.createTypeReferenceNode(createForeignRef(entity, text2, 'Projection')) /* , factory.createTypeReferenceNode(
                                    createForeignRef(entity, text2, 'ExportProjection')
                                ) */
                            ]);
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
                            if (!enumAttributes || !enumAttributes[attrName]) {
                                // 引用的非enum类型shape
                                properties.push([name, false, factory.createUnionTypeNode([
                                        factory.createKeywordTypeNode(ts.SyntaxKind.NumberKeyword),
                                        factory.createTypeReferenceNode(factory.createIdentifier("JsonProjection"), [type])
                                    ])]);
                            }
                            else {
                                // 引用的enum类型shape
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
            if (enumAttributes && enumAttributes[attrName] || ts.isUnionTypeNode(type) && ts.isLiteralTypeNode(type.types[0])) {
                properties.push([name, false, undefined]);
            }
            else {
                // 如果是非枚举类型的其它对象的union定义，加上JsonProjection
                properties.push([name, false, factory.createUnionTypeNode([
                        factory.createKeywordTypeNode(ts.SyntaxKind.NumberKeyword),
                        factory.createTypeReferenceNode(factory.createIdentifier("JsonProjection"), [type])
                    ])]);
            }
        }
    }
    if (ReversePointerRelations[entity]) {
        ReversePointerRelations[entity].forEach((one) => {
            const text2 = one === 'Schema' ? entity : one;
            properties.push([(0, string_1.firstLetterLowerCase)(one), false, factory.createTypeReferenceNode(createForeignRef(entity, one, 'Projection')) /* , factory.createTypeReferenceNode(
                    createForeignRef(entity, one, 'ExportProjection')
                ) */
            ]);
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
            const entityNameLc = (0, string_1.firstLetterLowerCase)(entityName);
            foreignKeySet[entityName].forEach((foreignKey) => {
                const identifier = `${entityNameLc}$${foreignKey}`;
                const aggrIdentifier = `${entityNameLc}$${foreignKey}$$aggr`;
                properties.push([identifier, false,
                    factory.createIntersectionTypeNode([
                        factory.createTypeReferenceNode(createForeignRef(entity, entityName, 'Selection'), undefined),
                        factory.createTypeLiteralNode([
                            factory.createPropertySignature(undefined, factory.createIdentifier("$entity"), undefined, factory.createLiteralTypeNode(factory.createStringLiteral((0, string_1.firstLetterLowerCase)(entityName))))
                        ])
                    ]) /* ,
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
                    ]) */
                ], [aggrIdentifier, false,
                    factory.createIntersectionTypeNode([
                        factory.createTypeReferenceNode(createForeignRef(entity, entityName, 'Aggregation'), undefined),
                        factory.createTypeLiteralNode([
                            factory.createPropertySignature(undefined, factory.createIdentifier("$entity"), undefined, factory.createLiteralTypeNode(factory.createStringLiteral((0, string_1.firstLetterLowerCase)(entityName))))
                        ])
                    ])
                ]);
            });
        }
    }
    const exprNode = factory.createTypeReferenceNode(factory.createIdentifier("Partial"), [
        factory.createTypeReferenceNode(factory.createIdentifier("ExprOp"), [
            process.env.COMPLING_AS_LIB ?
                factory.createUnionTypeNode([
                    factory.createTypeReferenceNode(factory.createIdentifier('OpAttr')),
                    factory.createKeywordTypeNode(ts.SyntaxKind.StringKeyword)
                ]) :
                factory.createTypeReferenceNode(factory.createIdentifier('OpAttr'))
        ])
    ]);
    const MetaPropertySignatures = [
        factory.createPropertySignature(undefined, factory.createStringLiteral("#id"), factory.createToken(ts.SyntaxKind.QuestionToken), factory.createTypeReferenceNode('NodeId'))
    ];
    if (process.env.COMPLING_AS_LIB) {
        MetaPropertySignatures.push(factory.createIndexSignature(undefined, undefined, [factory.createParameterDeclaration(undefined, undefined, undefined, factory.createIdentifier("k"), undefined, factory.createKeywordTypeNode(ts.SyntaxKind.StringKeyword), undefined)], factory.createKeywordTypeNode(ts.SyntaxKind.AnyKeyword)));
    }
    // Projection，正常查询的投影
    statements.push(factory.createTypeAliasDeclaration(undefined, [factory.createModifier(ts.SyntaxKind.ExportKeyword)], factory.createIdentifier("Projection"), undefined, factory.createIntersectionTypeNode([
        factory.createTypeLiteralNode(MetaPropertySignatures.concat(properties.map(([n, q, v]) => {
            return factory.createPropertySignature(undefined, n, q ? undefined : factory.createToken(ts.SyntaxKind.QuestionToken), v || factory.createKeywordTypeNode(ts.SyntaxKind.NumberKeyword));
        }))),
        exprNode,
    ])));
    // ExportProjection，下载查询的投影 
    // 已经废弃。By Xc 2023.01.08
    /* statements.push(
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
    ); */
    // ${Entity}Projection，外键查询的专用投影
    for (const foreignKey in foreignKeyProperties) {
        const identifier = `${foreignKey}IdProjection`;
        statements.push(factory.createTypeAliasDeclaration(undefined, undefined, factory.createIdentifier(identifier), undefined, factory.createTypeReferenceNode(factory.createIdentifier("OneOf"), [
            factory.createTypeLiteralNode(foreignKeyProperties[foreignKey].map((attr) => factory.createPropertySignature(undefined, attr ? factory.createIdentifier(`${attr}Id`) : 'id', undefined, factory.createKeywordTypeNode(ts.SyntaxKind.NumberKeyword))))
        ])));
    }
}
/**
 * 构造Query
 * @param statements
 * @param entity
 */
function constructQuery(statements, entity) {
    const entityLc = (0, string_1.firstLetterLowerCase)(entity);
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
        factory.createTypeLiteralNode([factory.createPropertySignature(undefined, factory.createIdentifier("id"), undefined, factory.createKeywordTypeNode(ts.SyntaxKind.NumberKeyword))]),
        // $$createAt$$: 1
        factory.createTypeLiteralNode([factory.createPropertySignature(undefined, factory.createIdentifier("$$createAt$$"), undefined, factory.createKeywordTypeNode(ts.SyntaxKind.NumberKeyword))]),
        // $$seq$$: 1
        factory.createTypeLiteralNode([factory.createPropertySignature(undefined, factory.createIdentifier("$$seq$$"), undefined, factory.createKeywordTypeNode(ts.SyntaxKind.NumberKeyword))]),
        // $$updateAt$$: 1
        factory.createTypeLiteralNode([factory.createPropertySignature(undefined, factory.createIdentifier("$$updateAt$$"), undefined, factory.createKeywordTypeNode(ts.SyntaxKind.NumberKeyword))]),
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
                    case 'File':
                    case 'Price': {
                        type2 = factory.createKeywordTypeNode(ts.SyntaxKind.NumberKeyword);
                        break;
                    }
                    default: {
                        const text2 = text === 'Schema' ? entity : text;
                        const manyToOneItem = manyToOneSet && manyToOneSet.find(([refEntity]) => refEntity === text2);
                        if (manyToOneItem) {
                            type2 = factory.createTypeReferenceNode(createForeignRef(entity, text2, 'SortAttr'));
                            members.push(factory.createTypeLiteralNode([factory.createPropertySignature(undefined, factory.createIdentifier(`${name.text}Id`), undefined, factory.createKeywordTypeNode(ts.SyntaxKind.NumberKeyword))]));
                        }
                        else if (!['Object'].includes(text)) {
                            // todo 对State的专门处理
                            type2 = factory.createKeywordTypeNode(ts.SyntaxKind.NumberKeyword);
                        }
                    }
                }
                if (type2) {
                    members.push(factory.createTypeLiteralNode([factory.createPropertySignature(undefined, name, undefined, type2)]));
                }
            }
        }
        else if (ts.isUnionTypeNode(type) && ts.isLiteralTypeNode(type.types[0]) || ts.isLiteralTypeNode(type)) {
            members.push(factory.createTypeLiteralNode([factory.createPropertySignature(undefined, name, undefined, factory.createKeywordTypeNode(ts.SyntaxKind.NumberKeyword))]));
        }
        else {
            // 本地规定的shape，非结构化属性不参与排序
        }
    }
    if (ReversePointerRelations[entity]) {
        ReversePointerRelations[entity].forEach((one) => {
            members.push(factory.createTypeLiteralNode([factory.createPropertySignature(undefined, (0, string_1.firstLetterLowerCase)(one), undefined, factory.createTypeReferenceNode(createForeignRef(entity, one, 'SortAttr')))]));
        });
    }
    if (process.env.COMPLING_AS_LIB) {
        members.push(factory.createTypeLiteralNode([factory.createIndexSignature(undefined, undefined, [factory.createParameterDeclaration(undefined, undefined, undefined, factory.createIdentifier("k"), undefined, factory.createKeywordTypeNode(ts.SyntaxKind.StringKeyword), undefined)], factory.createKeywordTypeNode(ts.SyntaxKind.AnyKeyword))]));
    }
    members.push(factory.createTypeReferenceNode(factory.createIdentifier("OneOf"), [factory.createTypeReferenceNode(factory.createIdentifier("ExprOp"), [
            process.env.COMPLING_AS_LIB ?
                factory.createUnionTypeNode([
                    factory.createTypeReferenceNode(factory.createIdentifier('OpAttr')),
                    factory.createKeywordTypeNode(ts.SyntaxKind.StringKeyword)
                ]) :
                factory.createTypeReferenceNode(factory.createIdentifier('OpAttr'))
        ])]));
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
    statements.push(factory.createTypeAliasDeclaration(undefined, [factory.createModifier(ts.SyntaxKind.ExportKeyword)], factory.createIdentifier("SortAttr"), undefined, factory.createUnionTypeNode(members)));
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
            const entityNameLc = (0, string_1.firstLetterLowerCase)(entityName);
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
function constructOperations(statements, entity) {
    // Selection
    statements.push(factory.createTypeAliasDeclaration(undefined, [factory.createModifier(ts.SyntaxKind.ExportKeyword)], factory.createIdentifier("SelectOperation"), [
        factory.createTypeParameterDeclaration(undefined, factory.createIdentifier("P"), factory.createTypeReferenceNode(factory.createIdentifier("Object"), undefined), factory.createTypeReferenceNode(factory.createIdentifier("Projection"), undefined))
    ], factory.createTypeReferenceNode(factory.createIdentifier("OakSelection"), [
        factory.createLiteralTypeNode(factory.createStringLiteral("select")),
        factory.createTypeReferenceNode(factory.createIdentifier("P"), undefined),
        factory.createTypeReferenceNode(factory.createIdentifier("Filter"), undefined),
        factory.createTypeReferenceNode(factory.createIdentifier("Sorter"), undefined)
    ])), factory.createTypeAliasDeclaration(undefined, [factory.createModifier(ts.SyntaxKind.ExportKeyword)], factory.createIdentifier("Selection"), [
        factory.createTypeParameterDeclaration(undefined, factory.createIdentifier("P"), factory.createTypeReferenceNode(factory.createIdentifier("Object"), undefined), factory.createTypeReferenceNode(factory.createIdentifier("Projection"), undefined))
    ], factory.createTypeReferenceNode(factory.createIdentifier("SelectOperation"), [
        factory.createTypeReferenceNode(factory.createIdentifier("P"), undefined)
    ])), factory.createTypeAliasDeclaration(undefined, [factory.createToken(ts.SyntaxKind.ExportKeyword)], factory.createIdentifier("Aggregation"), undefined, factory.createTypeReferenceNode(factory.createIdentifier("DeduceAggregation"), [
        factory.createTypeReferenceNode(factory.createIdentifier("Projection"), undefined),
        factory.createTypeReferenceNode(factory.createIdentifier("Filter"), undefined),
        factory.createTypeReferenceNode(factory.createIdentifier("Sorter"), undefined)
    ])));
    // Exportation
    // 已经废弃，by Xc 2023.01.08
    /*  statements.push(
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
     ); */
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
    let foreignKeyAttr = [];
    if (ReversePointerEntities[entity]) {
        foreignKeyAttr.push('entity', 'entityId');
    }
    if (manyToOneSet) {
        for (const one of manyToOneSet) {
            if (!ReversePointerRelations[entity] || !ReversePointerRelations[entity].includes(one[1])) {
                foreignKeyAttr.push(`${one[1]}Id`);
            }
        }
    }
    let adNodes = [
        factory.createTypeReferenceNode(factory.createIdentifier("FormCreateData"), [
            foreignKeyAttr.length > 0
                ? factory.createTypeReferenceNode(factory.createIdentifier("Omit"), [
                    factory.createTypeReferenceNode(factory.createIdentifier("OpSchema"), undefined),
                    factory.createUnionTypeNode((0, lodash_1.uniq)(foreignKeyAttr).map(ele => factory.createLiteralTypeNode(factory.createStringLiteral(ele))))
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
                const oneEntity = one[0];
                const cascadeCreateNode = factory.createTypeLiteralNode([
                    factory.createPropertySignature(undefined, factory.createIdentifier(`${one[1]}Id`), factory.createToken(ts.SyntaxKind.QuestionToken), factory.createKeywordTypeNode(ts.SyntaxKind.NeverKeyword)),
                    factory.createPropertySignature(undefined, factory.createIdentifier(one[1]), one[2] ? factory.createToken(ts.SyntaxKind.QuestionToken) : undefined, factory.createTypeReferenceNode(createForeignRef(entity, one[0], 'CreateSingleOperation')))
                ]);
                const cascadeUpdateNode = factory.createTypeLiteralNode([
                    factory.createPropertySignature(undefined, factory.createIdentifier(`${one[1]}Id`), undefined, factory.createTypeReferenceNode(factory.createIdentifier("ForeignKey"), [factory.createLiteralTypeNode(factory.createStringLiteral(one[1]))])),
                    factory.createPropertySignature(undefined, factory.createIdentifier(one[1]), factory.createToken(ts.SyntaxKind.QuestionToken), factory.createTypeReferenceNode(createForeignRef(entity, one[0], 'UpdateOperation')))
                ]);
                const noCascadeNode = factory.createTypeLiteralNode([
                    factory.createPropertySignature(undefined, factory.createIdentifier(`${one[1]}Id`), one[2] ? factory.createToken(ts.SyntaxKind.QuestionToken) : undefined, factory.createTypeReferenceNode(factory.createIdentifier("ForeignKey"), [factory.createLiteralTypeNode(factory.createStringLiteral(one[1]))]))
                ]);
                if (Schema[oneEntity].static) {
                    upsertOneNodes.push(noCascadeNode);
                }
                else {
                    switch (Schema[oneEntity].actionType) {
                        case 'crud':
                        case 'excludeRemove': {
                            upsertOneNodes.push(factory.createUnionTypeNode([cascadeCreateNode, cascadeUpdateNode, noCascadeNode]));
                            break;
                        }
                        case 'excludeUpdate':
                        case 'appendOnly': {
                            upsertOneNodes.push(factory.createUnionTypeNode([cascadeCreateNode, noCascadeNode]));
                            break;
                        }
                        case 'readOnly': {
                            upsertOneNodes.push(noCascadeNode);
                            break;
                        }
                        default: {
                            (0, assert_1.default)(false);
                        }
                    }
                }
            }
        }
        if (upsertOneNodes.length > 0) {
            adNodes.push(factory.createIntersectionTypeNode(upsertOneNodes));
        }
    }
    const reverseOneNodes = [];
    if (ReversePointerEntities[entity]) {
        if (ReversePointerRelations[entity]) {
            const { schemaAttrs } = Schema[entity];
            const { questionToken: entityQuestionToken } = schemaAttrs.find(ele => {
                const { name } = ele;
                return name.text === 'entity';
            });
            const { questionToken: entityIdQuestionToken } = schemaAttrs.find(ele => {
                const { name } = ele;
                return name.text === 'entityId';
            });
            for (const one of ReversePointerRelations[entity]) {
                const cascadeCreateNode = factory.createTypeLiteralNode([
                    factory.createPropertySignature(undefined, factory.createIdentifier('entity'), factory.createToken(ts.SyntaxKind.QuestionToken), factory.createKeywordTypeNode(ts.SyntaxKind.NeverKeyword)),
                    factory.createPropertySignature(undefined, factory.createIdentifier('entityId'), factory.createToken(ts.SyntaxKind.QuestionToken), factory.createKeywordTypeNode(ts.SyntaxKind.NeverKeyword)),
                    factory.createPropertySignature(undefined, factory.createIdentifier((0, string_1.firstLetterLowerCase)(one)), undefined, // 反向指针好像不能为空，以后或许会有特例  by Xc
                    factory.createTypeReferenceNode(createForeignRef(entity, one, 'CreateSingleOperation')))
                ]);
                const cascadeUpdateNode = factory.createTypeLiteralNode([
                    factory.createPropertySignature(undefined, factory.createIdentifier('entity'), undefined, // 反向指针好像不能为空，以后或许会有特例  by Xc
                    factory.createLiteralTypeNode(factory.createStringLiteral(`${(0, string_1.firstLetterLowerCase)(one)}`))),
                    factory.createPropertySignature(undefined, factory.createIdentifier('entityId'), undefined, // 反向指针好像不能为空，以后或许会有特例  by Xc
                    factory.createTypeReferenceNode(factory.createIdentifier("ForeignKey"), [factory.createLiteralTypeNode(factory.createStringLiteral(one))])),
                    factory.createPropertySignature(undefined, factory.createIdentifier((0, string_1.firstLetterLowerCase)(one)), undefined, factory.createTypeReferenceNode(createForeignRef(entity, one, 'UpdateOperation')))
                ]);
                const noCascadeNode = factory.createTypeLiteralNode([
                    factory.createPropertySignature(undefined, factory.createIdentifier('entity'), entityQuestionToken, factory.createLiteralTypeNode(factory.createStringLiteral(`${(0, string_1.firstLetterLowerCase)(one)}`))),
                    factory.createPropertySignature(undefined, factory.createIdentifier('entityId'), entityIdQuestionToken, factory.createTypeReferenceNode(factory.createIdentifier("ForeignKey"), [factory.createLiteralTypeNode(factory.createStringLiteral(one))]))
                ]);
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
                            (0, assert_1.default)(false);
                        }
                    }
                }
            }
        }
        if (process.env.COMPLING_AS_LIB) {
            // 如果是base，要包容更多可能的反指
            reverseOneNodes.push(factory.createTypeLiteralNode([
                factory.createPropertySignature(undefined, factory.createIdentifier('entity'), factory.createToken(ts.SyntaxKind.QuestionToken), factory.createKeywordTypeNode(ts.SyntaxKind.StringKeyword)),
                factory.createPropertySignature(undefined, factory.createIdentifier('entityId'), factory.createToken(ts.SyntaxKind.QuestionToken), factory.createKeywordTypeNode(ts.SyntaxKind.StringKeyword)),
                factory.createIndexSignature(undefined, undefined, [factory.createParameterDeclaration(undefined, undefined, undefined, factory.createIdentifier("K"), undefined, factory.createKeywordTypeNode(ts.SyntaxKind.StringKeyword), undefined)], factory.createKeywordTypeNode(ts.SyntaxKind.AnyKeyword))
            ]));
        }
        if (reverseOneNodes.length > 0) {
            adNodes.push(factory.createUnionTypeNode(reverseOneNodes));
        }
    }
    // 一对多
    const propertySignatures = [];
    if (oneToManySet) {
        for (const entityName in foreignKeySet) {
            const entityNameLc = (0, string_1.firstLetterLowerCase)(entityName);
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
                const otmCreateSingleOperationNode = factory.createTypeReferenceNode(factory.createIdentifier("OakOperation"), [
                    factory.createLiteralTypeNode(factory.createStringLiteral("create")),
                    otmCreateOperationDataNode
                ]);
                const otmCreateMultipleOperationNode = factory.createTypeReferenceNode(factory.createIdentifier("OakOperation"), [
                    factory.createLiteralTypeNode(factory.createStringLiteral("create")),
                    factory.createArrayTypeNode(otmCreateOperationDataNode)
                ]);
                const otmUpdateOperationNode = factory.createTypeReferenceNode(factory.createIdentifier("OakOperation"), [
                    factory.createIndexedAccessTypeNode(factory.createTypeReferenceNode(createForeignRef(entity, entityName, 'UpdateOperation'), undefined), factory.createLiteralTypeNode(factory.createStringLiteral("action"))),
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
                    factory.createTypeReferenceNode(factory.createIdentifier("Omit"), [
                        factory.createTypeReferenceNode(createForeignRef(entity, entityName, 'Filter'), undefined),
                        factory.createUnionTypeNode(foreignKey === 'entity' ? [
                            factory.createLiteralTypeNode(factory.createStringLiteral("entity")),
                            factory.createLiteralTypeNode(factory.createStringLiteral("entityId"))
                        ] : [
                            factory.createLiteralTypeNode(factory.createStringLiteral(foreignKey)),
                            factory.createLiteralTypeNode(factory.createStringLiteral(`${foreignKey}Id`))
                        ])
                    ])
                ]);
                if (!Schema[entityName].static) {
                    switch (Schema[entityName].actionType) {
                        case 'crud': {
                            propertySignatures.push(factory.createPropertySignature(undefined, factory.createIdentifier(identifier), factory.createToken(ts.SyntaxKind.QuestionToken), factory.createUnionTypeNode([
                                otmUpdateOperationNode,
                                otmCreateMultipleOperationNode,
                                factory.createTypeReferenceNode(factory.createIdentifier("Array"), [factory.createUnionTypeNode([
                                        otmCreateSingleOperationNode,
                                        otmUpdateOperationNode
                                    ])])
                            ])));
                            break;
                        }
                        case 'appendOnly':
                        case 'excludeUpdate': {
                            propertySignatures.push(factory.createPropertySignature(undefined, factory.createIdentifier(identifier), factory.createToken(ts.SyntaxKind.QuestionToken), factory.createUnionTypeNode([
                                otmCreateMultipleOperationNode,
                                factory.createTypeReferenceNode(factory.createIdentifier("Array"), [otmCreateSingleOperationNode])
                            ])));
                            break;
                        }
                        case 'readOnly': {
                            break;
                        }
                        default: {
                            (0, assert_1.default)(false);
                        }
                    }
                }
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
        factory.createTypeReferenceNode(factory.createIdentifier("FormUpdateData"), [
            foreignKeyAttr.length > 0 ? factory.createTypeReferenceNode(factory.createIdentifier("Omit"), [
                factory.createTypeReferenceNode(factory.createIdentifier("OpSchema"), undefined),
                factory.createUnionTypeNode((0, lodash_1.uniq)(foreignKeyAttr).map(ele => factory.createLiteralTypeNode(factory.createStringLiteral(ele))))
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
                const cascadeCreateNode = factory.createTypeLiteralNode([
                    factory.createPropertySignature(undefined, factory.createIdentifier(one[1]), undefined, factory.createTypeReferenceNode(createForeignRef(entity, one[0], 'CreateSingleOperation'))),
                    factory.createPropertySignature(undefined, factory.createIdentifier(`${one[1]}Id`), factory.createToken(ts.SyntaxKind.QuestionToken), factory.createKeywordTypeNode(ts.SyntaxKind.NeverKeyword)),
                ]);
                const cascadeUpdateNode = factory.createTypeLiteralNode([
                    factory.createPropertySignature(undefined, factory.createIdentifier(one[1]), undefined, factory.createTypeReferenceNode(createForeignRef(entity, one[0], 'UpdateOperation'))),
                    factory.createPropertySignature(undefined, factory.createIdentifier(`${one[1]}Id`), factory.createToken(ts.SyntaxKind.QuestionToken), factory.createKeywordTypeNode(ts.SyntaxKind.NeverKeyword)),
                ]);
                const cascadeRemoveNode = factory.createTypeLiteralNode([
                    factory.createPropertySignature(undefined, factory.createIdentifier(one[1]), undefined, factory.createTypeReferenceNode(createForeignRef(entity, one[0], 'RemoveOperation'))),
                    factory.createPropertySignature(undefined, factory.createIdentifier(`${one[1]}Id`), factory.createToken(ts.SyntaxKind.QuestionToken), factory.createKeywordTypeNode(ts.SyntaxKind.NeverKeyword)),
                ]);
                const noCascadeNode = factory.createTypeLiteralNode([
                    factory.createPropertySignature(undefined, factory.createIdentifier(one[1]), factory.createToken(ts.SyntaxKind.QuestionToken), factory.createKeywordTypeNode(ts.SyntaxKind.NeverKeyword)),
                    factory.createPropertySignature(undefined, factory.createIdentifier(`${one[1]}Id`), factory.createToken(ts.SyntaxKind.QuestionToken), factory.createUnionTypeNode([
                        factory.createTypeReferenceNode(factory.createIdentifier("ForeignKey"), [factory.createLiteralTypeNode(factory.createStringLiteral(one[1]))]),
                        factory.createLiteralTypeNode(factory.createNull())
                    ])),
                ]);
                if (Schema[one[0]].static) {
                    upsertOneNodes.push(noCascadeNode);
                }
                else {
                    switch (Schema[one[0]].actionType) {
                        case 'crud': {
                            upsertOneNodes.push(factory.createUnionTypeNode([cascadeCreateNode, cascadeUpdateNode, cascadeRemoveNode, noCascadeNode]));
                            break;
                        }
                        case 'excludeUpdate': {
                            upsertOneNodes.push(factory.createUnionTypeNode([cascadeCreateNode, cascadeRemoveNode, noCascadeNode]));
                            break;
                        }
                        case 'appendOnly': {
                            upsertOneNodes.push(factory.createUnionTypeNode([cascadeCreateNode, noCascadeNode]));
                            break;
                        }
                        case 'readOnly': {
                            upsertOneNodes.push(noCascadeNode);
                            break;
                        }
                        case 'excludeRemove': {
                            upsertOneNodes.push(factory.createUnionTypeNode([cascadeCreateNode, cascadeUpdateNode, noCascadeNode]));
                            break;
                        }
                        default: {
                            (0, assert_1.default)(false);
                        }
                    }
                }
            }
        }
        if (upsertOneNodes.length > 0) {
            adNodes.push(factory.createIntersectionTypeNode(upsertOneNodes));
        }
        const reverseOneNodes = [];
        if (ReversePointerRelations[entity]) {
            const refEntityLitrals = [];
            for (const one of ReversePointerRelations[entity]) {
                refEntityLitrals.push(factory.createLiteralTypeNode(factory.createStringLiteral(`${(0, string_1.firstLetterLowerCase)(one)}`)));
                const actionNodes = [];
                if (!Schema[one].static) {
                    switch (Schema[one].actionType) {
                        case 'crud': {
                            actionNodes.push(factory.createTypeReferenceNode(createForeignRef(entity, one, 'CreateSingleOperation')), factory.createTypeReferenceNode(createForeignRef(entity, one, 'UpdateOperation')), factory.createTypeReferenceNode(createForeignRef(entity, one, 'RemoveOperation')));
                            break;
                        }
                        case 'excludeUpdate': {
                            actionNodes.push(factory.createTypeReferenceNode(createForeignRef(entity, one, 'CreateSingleOperation')), factory.createTypeReferenceNode(createForeignRef(entity, one, 'RemoveOperation')));
                            break;
                        }
                        case 'excludeRemove': {
                            actionNodes.push(factory.createTypeReferenceNode(createForeignRef(entity, one, 'CreateSingleOperation')), factory.createTypeReferenceNode(createForeignRef(entity, one, 'UpdateOperation')));
                            break;
                        }
                        case 'appendOnly': {
                            actionNodes.push(factory.createTypeReferenceNode(createForeignRef(entity, one, 'CreateSingleOperation')));
                            break;
                        }
                        case 'readOnly': {
                            break;
                        }
                        default: {
                            (0, assert_1.default)(false);
                        }
                    }
                }
                if (actionNodes.length > 0) {
                    reverseOneNodes.push(factory.createTypeLiteralNode([
                        factory.createPropertySignature(undefined, factory.createIdentifier((0, string_1.firstLetterLowerCase)(one)), factory.createToken(ts.SyntaxKind.QuestionToken), factory.createUnionTypeNode(actionNodes)),
                        factory.createPropertySignature(undefined, factory.createIdentifier('entityId'), factory.createToken(ts.SyntaxKind.QuestionToken), factory.createKeywordTypeNode(ts.SyntaxKind.NeverKeyword)),
                        factory.createPropertySignature(undefined, factory.createIdentifier('entity'), factory.createToken(ts.SyntaxKind.QuestionToken), factory.createKeywordTypeNode(ts.SyntaxKind.NeverKeyword))
                    ]));
                }
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
                    factory.createTypeReferenceNode(factory.createIdentifier("ForeignKey"), [factory.createUnionTypeNode(ReversePointerRelations[entity].map(ele => factory.createLiteralTypeNode(factory.createStringLiteral(ele))))]),
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
            const entityNameLc = (0, string_1.firstLetterLowerCase)(entityName);
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
                const otmCreateSingleOperationNode = factory.createTypeReferenceNode(factory.createIdentifier("OakOperation"), [
                    factory.createLiteralTypeNode(factory.createStringLiteral("create")),
                    otmCreateOperationDataNode
                ]);
                const otmCreateMultipleOperationNode = factory.createTypeReferenceNode(factory.createIdentifier("OakOperation"), [
                    factory.createLiteralTypeNode(factory.createStringLiteral("create")),
                    factory.createArrayTypeNode(otmCreateOperationDataNode)
                ]);
                const otmUpdateOperationNode = factory.createTypeReferenceNode(factory.createIdentifier("OakOperation"), [
                    factory.createIndexedAccessTypeNode(factory.createTypeReferenceNode(createForeignRef(entity, entityName, 'UpdateOperation'), undefined), factory.createLiteralTypeNode(factory.createStringLiteral("action"))),
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
                    factory.createTypeReferenceNode(factory.createIdentifier("Omit"), [
                        factory.createTypeReferenceNode(createForeignRef(entity, entityName, 'Filter'), undefined),
                        factory.createUnionTypeNode(foreignKey === 'entity' ? [
                            factory.createLiteralTypeNode(factory.createStringLiteral("entity")),
                            factory.createLiteralTypeNode(factory.createStringLiteral("entityId"))
                        ] : [
                            factory.createLiteralTypeNode(factory.createStringLiteral(foreignKey)),
                            factory.createLiteralTypeNode(factory.createStringLiteral(`${foreignKey}Id`))
                        ])
                    ])
                ]);
                const otmRemoveOperationNode = factory.createTypeReferenceNode(factory.createIdentifier("OakOperation"), [
                    factory.createIndexedAccessTypeNode(factory.createTypeReferenceNode(createForeignRef(entity, entityName, 'RemoveOperation'), undefined), factory.createLiteralTypeNode(factory.createStringLiteral("action"))),
                    factory.createTypeReferenceNode(factory.createIdentifier("Omit"), [
                        factory.createTypeReferenceNode(createForeignRef(entity, entityName, 'RemoveOperationData'), undefined),
                        factory.createUnionTypeNode(foreignKey === 'entity' ? [
                            factory.createLiteralTypeNode(factory.createStringLiteral("entity")),
                            factory.createLiteralTypeNode(factory.createStringLiteral("entityId"))
                        ] : [
                            factory.createLiteralTypeNode(factory.createStringLiteral(foreignKey)),
                            factory.createLiteralTypeNode(factory.createStringLiteral(`${foreignKey}Id`))
                        ])
                    ]),
                    factory.createTypeReferenceNode(factory.createIdentifier("Omit"), [
                        factory.createTypeReferenceNode(createForeignRef(entity, entityName, 'Filter'), undefined),
                        factory.createUnionTypeNode(foreignKey === 'entity' ? [
                            factory.createLiteralTypeNode(factory.createStringLiteral("entity")),
                            factory.createLiteralTypeNode(factory.createStringLiteral("entityId"))
                        ] : [
                            factory.createLiteralTypeNode(factory.createStringLiteral(foreignKey)),
                            factory.createLiteralTypeNode(factory.createStringLiteral(`${foreignKey}Id`))
                        ])
                    ])
                ]);
                if (!Schema[entityName].static) {
                    switch (Schema[entityName].actionType) {
                        case 'crud': {
                            propertySignatures2.push(factory.createPropertySignature(undefined, factory.createIdentifier(identifier), factory.createToken(ts.SyntaxKind.QuestionToken), factory.createUnionTypeNode([
                                otmUpdateOperationNode,
                                otmRemoveOperationNode,
                                otmCreateMultipleOperationNode,
                                factory.createTypeReferenceNode(factory.createIdentifier("Array"), [factory.createUnionTypeNode([
                                        otmCreateSingleOperationNode,
                                        otmUpdateOperationNode,
                                        otmRemoveOperationNode
                                    ])])
                            ])));
                            break;
                        }
                        case 'excludeUpdate': {
                            propertySignatures2.push(factory.createPropertySignature(undefined, factory.createIdentifier(identifier), factory.createToken(ts.SyntaxKind.QuestionToken), factory.createUnionTypeNode([
                                otmRemoveOperationNode,
                                otmCreateMultipleOperationNode,
                                factory.createTypeReferenceNode(factory.createIdentifier("Array"), [factory.createUnionTypeNode([
                                        otmCreateSingleOperationNode,
                                        otmRemoveOperationNode
                                    ])])
                            ])));
                            break;
                        }
                        case 'excludeRemove': {
                            propertySignatures2.push(factory.createPropertySignature(undefined, factory.createIdentifier(identifier), factory.createToken(ts.SyntaxKind.QuestionToken), factory.createUnionTypeNode([
                                otmUpdateOperationNode,
                                otmCreateMultipleOperationNode,
                                factory.createTypeReferenceNode(factory.createIdentifier("Array"), [factory.createUnionTypeNode([
                                        otmCreateSingleOperationNode,
                                        otmUpdateOperationNode
                                    ])])
                            ])));
                            break;
                        }
                        case 'appendOnly': {
                            propertySignatures2.push(factory.createPropertySignature(undefined, factory.createIdentifier(identifier), factory.createToken(ts.SyntaxKind.QuestionToken), factory.createUnionTypeNode([
                                otmCreateMultipleOperationNode,
                                factory.createTypeReferenceNode(factory.createIdentifier("Array"), [factory.createUnionTypeNode([
                                        otmCreateSingleOperationNode
                                    ])])
                            ])));
                            break;
                        }
                        case 'readOnly': {
                            break;
                        }
                        default: {
                            (0, assert_1.default)(false);
                        }
                    }
                }
            });
        }
    }
    if (propertySignatures2.length > 0) {
        adNodes.push(factory.createTypeLiteralNode(propertySignatures2));
    }
    statements.push(factory.createTypeAliasDeclaration(undefined, [factory.createModifier(ts.SyntaxKind.ExportKeyword)], factory.createIdentifier("UpdateOperationData"), undefined, factory.createIntersectionTypeNode(adNodes)));
    // UpdateOperation
    const actionTypeNodes = [factory.createLiteralTypeNode(factory.createStringLiteral("update"))];
    if (ActionAsts[entity]) {
        actionTypeNodes.push(factory.createTypeReferenceNode('ParticularAction'));
    }
    if (Schema[entity].hasRelationDef || entity === 'User') {
        actionTypeNodes.push(factory.createTypeReferenceNode('RelationAction'));
    }
    if (process.env.COMPLING_AS_LIB) {
        actionTypeNodes.push(factory.createKeywordTypeNode(ts.SyntaxKind.StringKeyword));
    }
    statements.push(factory.createTypeAliasDeclaration(undefined, [factory.createModifier(ts.SyntaxKind.ExportKeyword)], factory.createIdentifier("UpdateOperation"), undefined, factory.createTypeReferenceNode(factory.createIdentifier("OakOperation"), [
        factory.createUnionTypeNode(actionTypeNodes),
        factory.createTypeReferenceNode(factory.createIdentifier("UpdateOperationData")),
        factory.createTypeReferenceNode(factory.createIdentifier("Filter"), undefined),
        factory.createTypeReferenceNode(factory.createIdentifier("Sorter"), undefined)
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
                if (!Schema[one[0]].static) {
                    switch (Schema[one[0]].actionType) {
                        case 'crud': {
                            upsertOneNodes.push(factory.createUnionTypeNode([
                                factory.createTypeLiteralNode([
                                    factory.createPropertySignature(undefined, factory.createIdentifier(one[1]), factory.createToken(ts.SyntaxKind.QuestionToken), factory.createUnionTypeNode([
                                        factory.createTypeReferenceNode(createForeignRef(entity, one[0], 'UpdateOperation')),
                                        factory.createTypeReferenceNode(createForeignRef(entity, one[0], 'RemoveOperation'))
                                    ]))
                                ])
                            ]));
                            break;
                        }
                        case 'excludeUpdate': {
                            upsertOneNodes.push(factory.createUnionTypeNode([
                                factory.createTypeLiteralNode([
                                    factory.createPropertySignature(undefined, factory.createIdentifier(one[1]), factory.createToken(ts.SyntaxKind.QuestionToken), factory.createTypeReferenceNode(createForeignRef(entity, one[0], 'RemoveOperation')))
                                ])
                            ]));
                            break;
                        }
                        case 'excludeRemove': {
                            upsertOneNodes.push(factory.createUnionTypeNode([
                                factory.createTypeLiteralNode([
                                    factory.createPropertySignature(undefined, factory.createIdentifier(one[1]), factory.createToken(ts.SyntaxKind.QuestionToken), factory.createTypeReferenceNode(createForeignRef(entity, one[0], 'UpdateOperation')))
                                ])
                            ]));
                            break;
                        }
                        case 'appendOnly':
                        case 'readOnly': {
                            break;
                        }
                        default: {
                            (0, assert_1.default)(false);
                        }
                    }
                }
            }
        }
        const reverseOneNodes = [];
        if (ReversePointerRelations[entity]) {
            const refEntityLitrals = [];
            for (const one of ReversePointerRelations[entity]) {
                refEntityLitrals.push(factory.createLiteralTypeNode(factory.createStringLiteral(`${(0, string_1.firstLetterLowerCase)(one)}`)));
                if (!Schema[one].static) {
                    switch (Schema[one].actionType) {
                        case 'crud': {
                            reverseOneNodes.push(factory.createTypeLiteralNode([
                                factory.createPropertySignature(undefined, factory.createIdentifier((0, string_1.firstLetterLowerCase)(one)), factory.createToken(ts.SyntaxKind.QuestionToken), factory.createUnionTypeNode([
                                    factory.createTypeReferenceNode(createForeignRef(entity, one, 'UpdateOperation')),
                                    factory.createTypeReferenceNode(createForeignRef(entity, one, 'RemoveOperation'))
                                ]))
                            ]));
                            break;
                        }
                        case 'excludeUpdate': {
                            reverseOneNodes.push(factory.createTypeLiteralNode([
                                factory.createPropertySignature(undefined, factory.createIdentifier((0, string_1.firstLetterLowerCase)(one)), factory.createToken(ts.SyntaxKind.QuestionToken), factory.createTypeReferenceNode(createForeignRef(entity, one, 'RemoveOperation')))
                            ]));
                            break;
                        }
                        case 'excludeRemove': {
                            reverseOneNodes.push(factory.createTypeLiteralNode([
                                factory.createPropertySignature(undefined, factory.createIdentifier((0, string_1.firstLetterLowerCase)(one)), factory.createToken(ts.SyntaxKind.QuestionToken), factory.createTypeReferenceNode(createForeignRef(entity, one, 'UpdateOperation')))
                            ]));
                            break;
                        }
                        case 'appendOnly':
                        case 'readOnly': {
                            break;
                        }
                        default: {
                            (0, assert_1.default)(false);
                        }
                    }
                }
            }
            if (process.env.COMPLING_AS_LIB) {
                reverseOneNodes.push(factory.createTypeLiteralNode([
                    factory.createIndexSignature(undefined, undefined, [factory.createParameterDeclaration(undefined, undefined, undefined, factory.createIdentifier("k"), undefined, factory.createKeywordTypeNode(ts.SyntaxKind.StringKeyword), undefined)], factory.createKeywordTypeNode(ts.SyntaxKind.AnyKeyword))
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
        factory.createTypeReferenceNode(factory.createIdentifier("Filter"), undefined),
        factory.createTypeReferenceNode(factory.createIdentifier("Sorter"), undefined)
    ])));
    statements.push(factory.createTypeAliasDeclaration(undefined, [factory.createModifier(ts.SyntaxKind.ExportKeyword)], factory.createIdentifier("Operation"), undefined, factory.createUnionTypeNode([
        factory.createTypeReferenceNode(factory.createIdentifier("CreateOperation"), undefined),
        factory.createTypeReferenceNode(factory.createIdentifier("UpdateOperation"), undefined),
        factory.createTypeReferenceNode(factory.createIdentifier("RemoveOperation"), undefined)
    ])));
}
const initialStatements = () => [
    // import { String, Text, Int, SpecificKey } from 'oak-domain/types/DataType';
    factory.createImportDeclaration(undefined, undefined, factory.createImportClause(false, undefined, factory.createNamedImports([
        factory.createImportSpecifier(false, undefined, factory.createIdentifier('PrimaryKey')),
        factory.createImportSpecifier(false, undefined, factory.createIdentifier('ForeignKey')),
        factory.createImportSpecifier(false, undefined, factory.createIdentifier('JsonProjection'))
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
        factory.createImportSpecifier(false, undefined, factory.createIdentifier('JsonFilter')),
        factory.createImportSpecifier(false, undefined, factory.createIdentifier('SubQueryPredicateMetadata')),
    ])), factory.createStringLiteral(`${(0, env_1.TYPE_PATH_IN_OAK_DOMAIN)()}Demand`)),
    factory.createImportDeclaration(undefined, undefined, factory.createImportClause(false, undefined, factory.createNamedImports([
        factory.createImportSpecifier(false, undefined, factory.createIdentifier("OneOf")),
        factory.createImportSpecifier(false, undefined, factory.createIdentifier("ValueOf"))
    ])), factory.createStringLiteral(`${(0, env_1.TYPE_PATH_IN_OAK_DOMAIN)()}Polyfill`)),
    // import * as SubQuery from '../_SubQuery';
    /* factory.createImportDeclaration(
        undefined,
        undefined,
        factory.createImportClause(
            false,
            undefined,
            factory.createNamespaceImport(factory.createIdentifier("SubQuery"))
        ),
        factory.createStringLiteral("../_SubQuery")
    ), */
    // import { Filter as OakFilter } from 'oak-domain/src/types/Entity';
    factory.createImportDeclaration(undefined, undefined, factory.createImportClause(false, undefined, factory.createNamedImports([
        factory.createImportSpecifier(false, undefined, factory.createIdentifier("FormCreateData")),
        factory.createImportSpecifier(false, undefined, factory.createIdentifier("FormUpdateData")),
        factory.createImportSpecifier(false, undefined, factory.createIdentifier("DeduceAggregation")),
        factory.createImportSpecifier(false, factory.createIdentifier("Operation"), factory.createIdentifier("OakOperation")),
        factory.createImportSpecifier(false, factory.createIdentifier("Selection"), factory.createIdentifier("OakSelection")),
        factory.createImportSpecifier(false, factory.createIdentifier("MakeAction"), factory.createIdentifier("OakMakeAction")),
        factory.createImportSpecifier(false, undefined, factory.createIdentifier("AggregationResult")),
    ])), factory.createStringLiteral(`${(0, env_1.TYPE_PATH_IN_OAK_DOMAIN)()}Entity`), undefined)
];
function outputSubQuery(outputDir, printer) {
    const statements = [];
    if (process.env.COMPLING_AS_LIB) {
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
            /* .filter(
                ([e, f]) => f !== 'entity'
            ) */ .map(([e]) => e)) : [];
        fromEntites.push(one);
        const inUnionTypeNode = fromEntites.map(ele => factory.createIntersectionTypeNode([
            factory.createTypeReferenceNode(factory.createQualifiedName(factory.createIdentifier(ele), factory.createIdentifier(identifier)), undefined),
            factory.createTypeLiteralNode([factory.createPropertySignature(undefined, factory.createIdentifier("entity"), undefined, factory.createLiteralTypeNode(factory.createStringLiteral((0, string_1.firstLetterLowerCase)(ele))))])
        ]));
        if (process.env.COMPLING_AS_LIB) {
            // 如果是建立 base，这里要加上额外可能的对象信息
            inUnionTypeNode.push(factory.createKeywordTypeNode(ts.SyntaxKind.AnyKeyword));
        }
        statements.push(factory.createTypeAliasDeclaration(undefined, [factory.createModifier(ts.SyntaxKind.ExportKeyword)], factory.createIdentifier(identifier), undefined, factory.createMappedTypeNode(undefined, factory.createTypeParameterDeclaration(undefined, factory.createIdentifier("K"), factory.createUnionTypeNode([
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
        const entityLc = (0, string_1.firstLetterLowerCase)(entity);
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
        if (ActionAsts[entity]) {
            const { importedFrom, actionDefNames } = ActionAsts[entity];
            const localActions = ['Action', 'ParticularAction'];
            for (const a in importedFrom) {
                (0, assert_1.default)(a.endsWith('Action'));
                const s = a.slice(0, a.length - 6).concat('State');
                if (importedFrom[a] === 'local' && actionDefNames.includes((0, string_1.firstLetterLowerCase)(a.slice(0, a.length - 6)))) {
                    localActions.push(s);
                }
                else if (actionDefNames.includes((0, string_1.firstLetterLowerCase)(a.slice(0, a.length - 6)))) {
                    // 现在源文件中的import语句保留下来了
                    // const { moduleSpecifier } = importedFrom[a] as ts.ImportDeclaration;
                    // statements.push(
                    //     factory.createImportDeclaration(
                    //         undefined,
                    //         undefined,
                    //         factory.createImportClause(
                    //             false,
                    //             undefined,
                    //             factory.createNamedImports(
                    //                 [
                    //                     factory.createImportSpecifier(
                    //                         false,
                    //                         undefined,
                    //                         factory.createIdentifier(s)
                    //                     )
                    //                 ]
                    //             )
                    //         ),
                    //         moduleSpecifier,
                    //         undefined
                    //     )
                    // );
                }
            }
            statements.push(factory.createImportDeclaration(undefined, undefined, factory.createImportClause(false, undefined, factory.createNamedImports(localActions.map(ele => factory.createImportSpecifier(false, undefined, factory.createIdentifier(ele))))), factory.createStringLiteral('./Action'), undefined), factory.createImportDeclaration(undefined, undefined, factory.createImportClause(false, undefined, factory.createNamedImports([
                factory.createImportSpecifier(false, undefined, factory.createIdentifier("RelationAction")),
            ])), factory.createStringLiteral((0, env_1.ACTION_CONSTANT_IN_OAK_DOMAIN)()), undefined));
        }
        else {
            statements.push(factory.createImportDeclaration(undefined, undefined, factory.createImportClause(false, undefined, factory.createNamedImports([
                factory.createImportSpecifier(false, undefined, factory.createIdentifier("GenericAction")),
                factory.createImportSpecifier(false, undefined, factory.createIdentifier("AppendOnlyAction")),
                factory.createImportSpecifier(false, undefined, factory.createIdentifier("ReadOnlyAction")),
                factory.createImportSpecifier(false, undefined, factory.createIdentifier("ExcludeUpdateAction")),
                factory.createImportSpecifier(false, undefined, factory.createIdentifier("ExcludeRemoveAction")),
                factory.createImportSpecifier(false, undefined, factory.createIdentifier("RelationAction")),
            ])), factory.createStringLiteral((0, env_1.ACTION_CONSTANT_IN_OAK_DOMAIN)()), undefined));
        }
        const { additionalImports } = Schema[entity];
        if (additionalImports?.length > 0) {
            statements.push(...additionalImports);
        }
        // Relation定义加入
        /* if (typeof Schema[entity].hasRelationDef === 'object' && ts.isTypeAliasDeclaration(Schema[entity].hasRelationDef as ts.Node)) {
            const node = Schema[entity].hasRelationDef as ts.TypeAliasDeclaration;
            statements.push(
                factory.updateTypeAliasDeclaration(
                    node,
                    undefined,
                    [factory.createModifier(ts.SyntaxKind.ExportKeyword)],
                    node.name,
                    node.typeParameters,
                    node.type
                )
            );
        } */
        constructSchema(statements, entity);
        constructFilter(statements, entity);
        constructProjection(statements, entity);
        constructSorter(statements, entity);
        constructOperations(statements, entity);
        constructQuery(statements, entity);
        // 现在FullAttrs和NativeAttrs似乎没什么用，还会引起递归
        // constructFullAttrs(statements, entity);
        const makeActionArguments = [];
        if (ActionAsts[entity]) {
            makeActionArguments.push(factory.createTypeReferenceNode('Action'));
        }
        else {
            makeActionArguments.push(factory.createTypeReferenceNode(OriginActionDict[Schema[entity].actionType]));
        }
        if (Schema[entity].hasRelationDef || entity === 'User') {
            makeActionArguments.push(factory.createTypeReferenceNode('RelationAction'));
        }
        const actionTypeNode = factory.createTypeReferenceNode(factory.createIdentifier('OakMakeAction'), makeActionArguments.length === 1 ? makeActionArguments : [factory.createUnionTypeNode(makeActionArguments)]);
        const EntityDefAttrs = [
            factory.createPropertySignature(undefined, factory.createIdentifier("Schema"), undefined, factory.createTypeReferenceNode(factory.createIdentifier("Schema"), undefined)),
            factory.createPropertySignature(undefined, factory.createIdentifier("OpSchema"), undefined, factory.createTypeReferenceNode(factory.createIdentifier("OpSchema"), undefined)),
            factory.createPropertySignature(undefined, factory.createIdentifier("Action"), undefined, process.env.COMPLING_AS_LIB ?
                factory.createUnionTypeNode([
                    actionTypeNode,
                    factory.createKeywordTypeNode(ts.SyntaxKind.StringKeyword)
                ]) : actionTypeNode),
            factory.createPropertySignature(undefined, factory.createIdentifier("Selection"), undefined, factory.createTypeReferenceNode(factory.createIdentifier("Selection"), undefined)),
            factory.createPropertySignature(undefined, factory.createIdentifier("Aggregation"), undefined, factory.createTypeReferenceNode(factory.createIdentifier("Aggregation"), undefined)),
            factory.createPropertySignature(undefined, factory.createIdentifier("Operation"), undefined, factory.createTypeReferenceNode(factory.createIdentifier("Operation"), undefined)),
            factory.createPropertySignature(undefined, factory.createIdentifier("Create"), undefined, factory.createTypeReferenceNode(factory.createIdentifier("CreateOperation"), undefined)),
            factory.createPropertySignature(undefined, factory.createIdentifier("Update"), undefined, factory.createTypeReferenceNode(factory.createIdentifier("UpdateOperation"), undefined)),
            factory.createPropertySignature(undefined, factory.createIdentifier("Remove"), undefined, factory.createTypeReferenceNode(factory.createIdentifier("RemoveOperation"), undefined)),
            factory.createPropertySignature(undefined, factory.createIdentifier("CreateSingle"), undefined, factory.createTypeReferenceNode(factory.createIdentifier("CreateSingleOperation"), undefined)),
            factory.createPropertySignature(undefined, factory.createIdentifier("CreateMulti"), undefined, factory.createTypeReferenceNode(factory.createIdentifier("CreateMultipleOperation"), undefined)),
        ];
        if (ActionAsts[entity]) {
            EntityDefAttrs.push(factory.createPropertySignature(undefined, factory.createIdentifier("ParticularAction"), undefined, factory.createTypeReferenceNode(factory.createIdentifier('ParticularAction'), undefined)));
        }
        /* if (typeof Schema[entity].hasRelationDef === 'object' && ts.isTypeAliasDeclaration(Schema[entity].hasRelationDef as ts.Node)) {
            EntityDefAttrs.push(
                factory.createPropertySignature(
                    undefined,
                    factory.createIdentifier("Relation"),
                    undefined,
                    factory.createTypeReferenceNode(
                        factory.createIdentifier('Relation'),
                        undefined
                    )
                )
            );
        } */
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
        statements.push(factory.createVariableStatement([factory.createModifier(ts.SyntaxKind.ExportKeyword)], factory.createVariableDeclarationList([factory.createVariableDeclaration(factory.createIdentifier("ActionDefDict"), undefined, undefined, factory.createObjectLiteralExpression(actionDefNames.map(ele => factory.createPropertyAssignment(factory.createIdentifier(`${ele}State`), factory.createIdentifier(`${(0, string_1.firstLetterUpperCase)(ele)}ActionDef`))), true))], ts.NodeFlags.Const)));
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
        propertyAssignments.push(factory.createPropertyAssignment(factory.createIdentifier((0, string_1.firstLetterLowerCase)(entity)), factory.createIdentifier(entity)));
    }
    actionDictStatements.push(factory.createVariableStatement([factory.createModifier(ts.SyntaxKind.ExportKeyword)], factory.createVariableDeclarationList([factory.createVariableDeclaration(factory.createIdentifier("ActionDefDict"), undefined, undefined, factory.createObjectLiteralExpression(propertyAssignments, true))], ts.NodeFlags.Const)));
    const resultFile = ts.createSourceFile("someFileName.ts", "", ts.ScriptTarget.Latest, /*setParentNodes*/ false, ts.ScriptKind.TS);
    const result = printer.printNode(ts.EmitHint.Unspecified, factory.createSourceFile(actionDictStatements, factory.createToken(ts.SyntaxKind.EndOfFileToken), ts.NodeFlags.None), resultFile);
    const fileName = path_1.default.join(outputDir, 'ActionDefDict.ts');
    (0, fs_1.writeFileSync)(fileName, result, { flag: 'w' });
}
function constructAttributes(entity) {
    const { schemaAttrs, enumAttributes } = Schema[entity];
    const { [entity]: manyToOneSet } = ManyToOne;
    const result = [];
    schemaAttrs.forEach((attr) => {
        const attrAssignments = [];
        const { name, type, questionToken: allowNull } = attr;
        if (!allowNull) {
            attrAssignments.push(factory.createPropertyAssignment(factory.createIdentifier("notNull"), factory.createTrue()));
        }
        let name2 = name;
        if (ts.isTypeReferenceNode(type)) {
            const { typeName, typeArguments } = type;
            if (ts.isIdentifier(typeName)) {
                const { text } = typeName;
                switch (text) {
                    case 'String': {
                        attrAssignments.push(factory.createPropertyAssignment(factory.createIdentifier("type"), factory.createStringLiteral("varchar")), factory.createPropertyAssignment(factory.createIdentifier("params"), factory.createObjectLiteralExpression([
                            factory.createPropertyAssignment(factory.createIdentifier("length"), factory.createNumericLiteral(typeArguments[0].literal.text)),
                        ], true)));
                        // 如果是entity，在这里处理一下ref
                        if (ts.isIdentifier(name) && name.text === 'entity') {
                            const mtoRelations = ReversePointerRelations[entity];
                            if (mtoRelations) {
                                const mtoEntities = mtoRelations.map(ele => (0, string_1.firstLetterLowerCase)(ele));
                                attrAssignments.push(factory.createPropertyAssignment(factory.createIdentifier("ref"), factory.createArrayLiteralExpression(mtoEntities.map(ele => factory.createStringLiteral(ele)), false)));
                            }
                        }
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
                    case 'Double':
                    case 'Float':
                    case 'Decimal': {
                        if (['Double', 'Float'].includes(text)) {
                            console.warn(`${entity}对象中还有${text}类型定义，现在统一用Decimal进行存储`);
                        }
                        attrAssignments.push(factory.createPropertyAssignment(factory.createIdentifier("type"), factory.createStringLiteral("decimal")), factory.createPropertyAssignment(factory.createIdentifier("params"), factory.createObjectLiteralExpression([
                            factory.createPropertyAssignment(factory.createIdentifier("precision"), factory.createNumericLiteral(typeArguments[0].literal.text)),
                            factory.createPropertyAssignment(factory.createIdentifier("scale"), factory.createNumericLiteral(typeArguments[1].literal.text))
                        ], true)));
                        break;
                    }
                    case 'Boolean': {
                        attrAssignments.push(factory.createPropertyAssignment(factory.createIdentifier("type"), factory.createStringLiteral("boolean")));
                        break;
                    }
                    case 'Price': {
                        attrAssignments.push(factory.createPropertyAssignment(factory.createIdentifier("type"), factory.createStringLiteral("money")));
                        break;
                    }
                    case 'Datetime': {
                        attrAssignments.push(factory.createPropertyAssignment(factory.createIdentifier("type"), factory.createStringLiteral("datetime")));
                        break;
                    }
                    case 'SingleGeo':
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
                            attrAssignments.push(factory.createPropertyAssignment(factory.createIdentifier("type"), factory.createStringLiteral("ref")), factory.createPropertyAssignment(factory.createIdentifier("ref"), factory.createStringLiteral((0, string_1.firstLetterLowerCase)(text2))));
                        }
                        else {
                            if (enumAttributes && enumAttributes[name.text]) {
                                attrAssignments.push(factory.createPropertyAssignment('type', factory.createStringLiteral("enum")), factory.createPropertyAssignment('enumeration', factory.createArrayLiteralExpression(enumAttributes[name.text].map(ele => factory.createStringLiteral(ele)))));
                            }
                            else {
                                // todo 引用的非string定义，目前没有处理int类型的引用，等遇到了再处理
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
                        (0, assert_1.default)(enumAttributes && enumAttributes[name.text]);
                        attrAssignments.push(factory.createPropertyAssignment('type', factory.createStringLiteral("enum")), factory.createPropertyAssignment('enumeration', factory.createArrayLiteralExpression(enumAttributes[name.text].map(ele => factory.createStringLiteral(ele)))));
                    }
                    else {
                        (0, assert_1.default)(ts.isNumericLiteral(type.types[0].literal));
                        attrAssignments.push(factory.createPropertyAssignment(factory.createIdentifier("type"), factory.createStringLiteral("int")), factory.createPropertyAssignment(factory.createIdentifier("params"), factory.createObjectLiteralExpression([
                            factory.createPropertyAssignment(factory.createIdentifier("width"), factory.createNumericLiteral(env_1.INT_LITERL_DEFAULT_WIDTH))
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
function outputLocale(outputDir, printer) {
    const locales = {};
    const entities = [];
    for (const entity in Schema) {
        const { locale, sourceFile } = Schema[entity];
        if (locale) {
            const { properties } = locale;
            properties.forEach((ele) => {
                (0, assert_1.default)(ts.isPropertyAssignment(ele) && (ts.isIdentifier(ele.name) || ts.isStringLiteral(ele.name)) && ts.isObjectLiteralExpression(ele.initializer));
                const lng = ele.name.text;
                const result = printer.printList(ts.ListFormat.SourceFileStatements, factory.createNodeArray([
                    factory.createReturnStatement(ele.initializer)
                ]), sourceFile);
                const data = Function(result)();
                const filename = path_1.default.join(outputDir, entity, 'locales', `${lng}.json`);
                (0, fs_1.writeFileSync)(filename, JSON.stringify(data), { flag: 'w' });
                if (locales[lng]) {
                    locales[lng].push(entity);
                }
                else {
                    locales[lng] = [entity];
                }
            });
            entities.push(entity);
        }
    }
    for (const lng in locales) {
        if (locales[lng].length < entities.length) {
            const lack = (0, lodash_1.difference)(entities, locales[lng]);
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
function outputStorage(outputDir, printer) {
    const importStatements = [
        factory.createImportDeclaration(undefined, undefined, factory.createImportClause(false, undefined, factory.createNamedImports([factory.createImportSpecifier(false, undefined, factory.createIdentifier("StorageSchema"))])), factory.createStringLiteral(`${(0, env_1.TYPE_PATH_IN_OAK_DOMAIN)(1)}Storage`), undefined),
        factory.createImportDeclaration(undefined, undefined, factory.createImportClause(false, undefined, factory.createNamedImports([factory.createImportSpecifier(false, undefined, factory.createIdentifier("EntityDict"))])), factory.createStringLiteral("./EntityDict"), undefined)
    ];
    const entityAssignments = [];
    for (const entity in Schema) {
        const indexExpressions = [];
        const { sourceFile, inModi, indexes, toModi, actionType, static: _static, hasRelationDef } = Schema[entity];
        const fromSchemaSpecifiers = [
            factory.createImportSpecifier(false, undefined, factory.createIdentifier("OpSchema"))
        ];
        /* if (relationHierarchy || reverseCascadeRelationHierarchy) {
            fromSchemaSpecifiers.push(
                factory.createImportSpecifier(
                    false,
                    undefined,
                    factory.createIdentifier("Relation")
                )
            );
        } */
        const statements = [
            factory.createImportDeclaration(undefined, undefined, factory.createImportClause(false, undefined, factory.createNamedImports([factory.createImportSpecifier(false, undefined, factory.createIdentifier("StorageDesc"))])), factory.createStringLiteral(`${(0, env_1.TYPE_PATH_IN_OAK_DOMAIN)()}Storage`), undefined),
            factory.createImportDeclaration(undefined, undefined, factory.createImportClause(false, undefined, factory.createNamedImports(fromSchemaSpecifiers)), factory.createStringLiteral("./Schema"), undefined)
        ];
        const needImportActions = [];
        switch (actionType) {
            case 'readOnly': {
                needImportActions.push(factory.createImportSpecifier(false, factory.createIdentifier("readOnlyActions"), factory.createIdentifier("actions")));
                break;
            }
            case 'appendOnly': {
                needImportActions.push(factory.createImportSpecifier(false, factory.createIdentifier("appendOnlyActions"), factory.createIdentifier("actions")));
                break;
            }
            case 'excludeUpdate': {
                needImportActions.push(factory.createImportSpecifier(false, factory.createIdentifier("excludeUpdateActions"), factory.createIdentifier("actions")));
                break;
            }
            default: {
                if (ActionAsts[entity]) {
                    statements.push(factory.createImportDeclaration(undefined, undefined, factory.createImportClause(false, undefined, factory.createNamedImports([factory.createImportSpecifier(false, undefined, factory.createIdentifier("actions"))])), factory.createStringLiteral("./Action"), undefined));
                }
                else {
                    needImportActions.push(factory.createImportSpecifier(false, factory.createIdentifier("genericActions"), factory.createIdentifier("actions")));
                }
            }
        }
        if (Schema[entity].hasRelationDef || entity === 'User') {
            needImportActions.push(factory.createImportSpecifier(false, undefined, factory.createIdentifier("relationActions")));
        }
        if (needImportActions.length > 0) {
            statements.push(factory.createImportDeclaration(undefined, undefined, factory.createImportClause(false, undefined, factory.createNamedImports(needImportActions)), factory.createStringLiteral((0, env_1.ACTION_CONSTANT_IN_OAK_DOMAIN)()), undefined));
        }
        const propertyAssignments = [];
        const attributes = constructAttributes(entity);
        propertyAssignments.push(factory.createPropertyAssignment(factory.createIdentifier("attributes"), factory.createObjectLiteralExpression(attributes, true)));
        if (indexes) {
            indexExpressions.push(...indexes.elements);
        }
        if (toModi) {
            propertyAssignments.push(factory.createPropertyAssignment(factory.createIdentifier("toModi"), factory.createTrue()));
        }
        if (inModi) {
            propertyAssignments.push(factory.createPropertyAssignment(factory.createIdentifier("inModi"), factory.createTrue()));
        }
        if (_static || actionType === 'readOnly') {
            propertyAssignments.push(factory.createPropertyAssignment(factory.createIdentifier("static"), factory.createTrue()));
        }
        propertyAssignments.push(factory.createPropertyAssignment(factory.createIdentifier("actionType"), factory.createStringLiteral(actionType)));
        propertyAssignments.push(factory.createShorthandPropertyAssignment(factory.createIdentifier("actions"), undefined));
        if (indexExpressions.length > 0) {
            propertyAssignments.push(factory.createPropertyAssignment(factory.createIdentifier("indexes"), factory.createArrayLiteralExpression(indexExpressions, true)));
        }
        /* if (relationHierarchy) {
            propertyAssignments.push(
                factory.createPropertyAssignment(
                    factory.createIdentifier("relationHierarchy"),
                    relationHierarchy,
                )
            );
        }
        if (reverseCascadeRelationHierarchy) {
            propertyAssignments.push(
                factory.createPropertyAssignment(
                    factory.createIdentifier("reverseCascadeRelationHierarchy"),
                    reverseCascadeRelationHierarchy,
                )
            );
        } */
        if (hasRelationDef) {
            const { type } = hasRelationDef;
            if (ts.isUnionTypeNode(type)) {
                const { types } = type;
                const relationTexts = types.map(ele => {
                    (0, assert_1.default)(ts.isLiteralTypeNode(ele) && ts.isStringLiteral(ele.literal));
                    return ele.literal.text;
                });
                propertyAssignments.push(factory.createPropertyAssignment(factory.createIdentifier("relation"), factory.createArrayLiteralExpression(relationTexts.map(ele => factory.createStringLiteral(ele)))));
            }
            else {
                (0, assert_1.default)(ts.isLiteralTypeNode(type));
                (0, assert_1.default)(ts.isStringLiteral(type.literal));
                propertyAssignments.push(factory.createPropertyAssignment(factory.createIdentifier("relation"), factory.createArrayLiteralExpression([
                    type.literal
                ])));
            }
        }
        const sdTypeArguments = [
            factory.createTypeReferenceNode(factory.createIdentifier("OpSchema"), undefined)
        ];
        statements.push(factory.createVariableStatement([factory.createModifier(ts.SyntaxKind.ExportKeyword)], factory.createVariableDeclarationList([factory.createVariableDeclaration(factory.createIdentifier("desc"), undefined, factory.createTypeReferenceNode(factory.createIdentifier("StorageDesc"), sdTypeArguments), factory.createObjectLiteralExpression(propertyAssignments, true))], ts.NodeFlags.Const)));
        const result = printer.printList(ts.ListFormat.SourceFileStatements, factory.createNodeArray(statements), sourceFile);
        const filename = path_1.default.join(outputDir, entity, 'Storage.ts');
        (0, fs_1.writeFileSync)(filename, result, { flag: 'w' });
        importStatements.push(factory.createImportDeclaration(undefined, undefined, factory.createImportClause(false, undefined, factory.createNamedImports([
            factory.createImportSpecifier(false, factory.createIdentifier("desc"), factory.createIdentifier(`${(0, string_1.firstLetterLowerCase)(entity)}Desc`))
        ])), factory.createStringLiteral(`./${entity}/Storage`), undefined));
        entityAssignments.push(factory.createPropertyAssignment((0, string_1.firstLetterLowerCase)(entity), factory.createIdentifier(`${(0, string_1.firstLetterLowerCase)(entity)}Desc`)));
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
        (0, fs_1.mkdirSync)(path_1.default.join(outputDir, moduleName));
        (0, fs_1.mkdirSync)(path_1.default.join(outputDir, moduleName, 'locales'));
    }
    (0, fs_1.mkdirSync)(path_1.default.join(outputDir, '_locales'));
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
function outputIndexTs(outputDir) {
    const indexTs = `export * from './EntityDict';
    export * from './Storage';
    export * from './ActionDefDict';
    export * from './Relation';
    `;
    const filename = path_1.default.join(outputDir, 'index.ts');
    (0, fs_1.writeFileSync)(filename, indexTs, { flag: 'w' });
}
function outputPackageJson(outputDir) {
    const pj = {
        "name": process.env.COMPLING_AS_LIB ? "general-app-domain" : "oak-app-domain",
        "main": "index.ts"
    };
    const filename = path_1.default.join(outputDir, 'package.json');
    (0, fs_1.writeFileSync)(filename, JSON.stringify(pj), { flag: 'w' });
}
/**
 * （从toModi的对象开始）分析可能被modi指向的对象
 */
function analyzeInModi() {
    const getRelateEntities = (entity) => {
        let result = [];
        if (ManyToOne[entity]) {
            // 用反指指针指向的对象可以忽略，因为前端不可能设计出这样的更新页面
            result = ManyToOne[entity].filter(ele => ele[1] !== 'entity').map(ele => ele[0]);
        }
        if (OneToMany[entity]) {
            result.push(...OneToMany[entity].map(ele => ele[0]));
        }
        return (0, lodash_1.uniq)(result);
    };
    const setInModi = (entity) => {
        if (['Modi', 'ModiEntity', 'Oper', 'OperEntity', 'User'].includes(entity)) {
            return;
        }
        const schema = Schema[entity];
        if (schema.toModi || schema.inModi || schema.actionType === 'readOnly' || schema.static) {
            return;
        }
        schema.inModi = true;
        const related = getRelateEntities(entity);
        related.forEach(ele => setInModi(ele));
    };
    for (const entity in Schema) {
        if (Schema[entity].toModi) {
            const related = getRelateEntities(entity);
            related.forEach(ele => setInModi(ele));
        }
    }
}
let IGNORED_FOREIGN_KEY_MAP = {};
let IGNORED_RELATION_PATH_MAP = {};
let DEDUCED_RELATION_MAP = {};
let SELECT_FREE_ENTITIES = [];
let CREATE_FREE_ENTITIES = [];
let UPDATE_FREE_ENTITIES = [];
let FIXED_DESTINATION_PATH_MAP = {};
let FIXED_FOR_ALL_DESTINATION_PATH_ENTITIES = [];
function registerIgnoredForeignKeyMap(map) {
    IGNORED_FOREIGN_KEY_MAP = map;
}
exports.registerIgnoredForeignKeyMap = registerIgnoredForeignKeyMap;
function registerFreeEntities(selectFreeEntities = [], createFreeEntities = [], updateFreeEntities = []) {
    SELECT_FREE_ENTITIES = selectFreeEntities;
    CREATE_FREE_ENTITIES = createFreeEntities;
    UPDATE_FREE_ENTITIES = updateFreeEntities;
}
exports.registerFreeEntities = registerFreeEntities;
function registerIgnoredRelationPathMap(map) {
    for (const k in map) {
        IGNORED_RELATION_PATH_MAP[(0, string_1.firstLetterUpperCase)(k)] = map[k];
    }
}
exports.registerIgnoredRelationPathMap = registerIgnoredRelationPathMap;
/**
 * 很多路径虽然最后指向同一对象，但不能封掉，封了会导致查询的时候找不到对应的路径path
 * @param map
 */
function registerFixedDestinationPathMap(map) {
    for (const k in map) {
        if (k === '.') {
            FIXED_FOR_ALL_DESTINATION_PATH_ENTITIES.push(...map[k]);
        }
        else if (FIXED_DESTINATION_PATH_MAP[k]) {
            FIXED_DESTINATION_PATH_MAP[k].push(...map[k]);
        }
        else {
            FIXED_DESTINATION_PATH_MAP[k] = map[k];
        }
    }
}
exports.registerFixedDestinationPathMap = registerFixedDestinationPathMap;
function registerDeducedRelationMap(map) {
    for (const k in map) {
        const entity = (0, string_1.firstLetterUpperCase)(k);
        (0, assert_1.default)(Schema.hasOwnProperty(entity), `config/relation.ts中配置的DeducedRelationMap包含不合法的对象名称「${k}」`);
        // 定义的deduce的属性一定是多对一的外键，此时ReversePointerEntities还未处理
        if (ReversePointerEntities[entity] && map[k] === 'entity') {
        }
        else {
            const mto = ManyToOne[entity].find(ele => ele[1] === map[k]);
            (0, assert_1.default)(mto, `config/relation.ts中配置的DeducedRelationMap所定义的「${k}」的deduce属性「${map[k]}」不是一个有效的外键指针`);
        }
        DEDUCED_RELATION_MAP[entity] = map[k];
    }
}
exports.registerDeducedRelationMap = registerDeducedRelationMap;
/**
 * 输出所有和User相关的对象的后继
 */
function outputRelation(outputDir, printer) {
    const ExcludedEntities = ['Oper', 'User', 'OperEntity', 'Modi', 'ModiEntity', 'UserRelation', 'Relation', 'RelationAuth', 'ActionAuth'];
    const actionPath = [];
    const relationPath = [];
    const outputRecursively = (root, entity, path, paths, isRelation) => {
        if (ExcludedEntities.includes(entity)) {
            return;
        }
        if (IGNORED_RELATION_PATH_MAP[entity]?.find((ele) => path.includes(ele))) {
            return;
        }
        if (paths.length > 12) {
            throw new Error('对象之间的关系深度过长，请优化设计加以避免');
        }
        actionPath.push([(0, string_1.firstLetterLowerCase)(entity), path, root, isRelation, paths]);
        if (Schema[entity].hasRelationDef) {
            // assert(!DEDUCED_RELATION_MAP[entity], `${entity}对象定义了deducedRelationMap，但它有relation`);
            relationPath.push([(0, string_1.firstLetterLowerCase)(entity), path, root, isRelation]);
        }
        const { [entity]: parent } = OneToMany;
        if (parent) {
            parent.forEach(([child, foreignKey]) => {
                const child2 = (0, string_1.firstLetterLowerCase)(child);
                if (child === entity) {
                    // 如果有层级关系对象，最多找3层。同时这里只找本身存在relation关系的对象，因为如果对象上没有relation，则其上的公共路径应当可以维护住层级关系
                    // 例如在jichuang项目中，house上没有relation，通过其park外键所维护的路径不需要遍历其父亲。而parkCluster因为有relation，所以必须构造以之为根的所有的可能路径
                    // 如果不是以之为根的，同样可以根据其上的公共路径去查找，parkCluster.system和parkCluster.parent.system必然是一样的
                    if (!Schema[entity].hasRelationDef) {
                        return;
                    }
                    if (paths.find(ele => ele !== child2) || paths.length > 2) {
                        return;
                    }
                }
                else if (paths.indexOf(child2) >= 0) {
                    // 除了层级之外的递归直接忽略
                    return;
                }
                if (IGNORED_FOREIGN_KEY_MAP[child2]?.includes(foreignKey)) {
                    // 忽略的路径放弃
                    return;
                }
                if (DEDUCED_RELATION_MAP[child] === foreignKey) {
                    // 如果子对象本身由父对象推定，也放弃
                    return;
                }
                const fk = foreignKey === 'entity' ? (0, string_1.firstLetterLowerCase)(entity) : foreignKey;
                const path2 = path ? `${fk}.${path}` : fk;
                outputRecursively(root, child, path2, paths.concat([(0, string_1.firstLetterLowerCase)(entity)]), isRelation);
            });
        }
    };
    // 所有属性中有指向user的对象
    const { User } = OneToMany;
    User.forEach(([entity3, foreignKey]) => {
        const fk = foreignKey === 'entity' ? 'user' : foreignKey;
        if (!IGNORED_FOREIGN_KEY_MAP[(0, string_1.firstLetterLowerCase)(entity3)]?.includes(foreignKey)) {
            outputRecursively((0, string_1.firstLetterLowerCase)(entity3), entity3, fk, [fk], false);
        }
    });
    // 所有带relation的对象
    const hasRelationEntities = Object.keys(Schema).filter((entity) => Schema[entity].hasRelationDef);
    hasRelationEntities.forEach((entity3) => {
        outputRecursively((0, string_1.firstLetterLowerCase)(entity3), entity3, '', [], true);
    });
    actionPath.sort((ele1, ele2) => {
        // 先按sourceEntity来排序
        if (ele1[0] > ele2[0]) {
            return 1;
        }
        else if (ele1[0] < ele2[0]) {
            return -1;
        }
        else {
            // 再按destEntity
            if (ele1[2] > ele2[2]) {
                return 1;
            }
            else if (ele1[2] < ele2[2]) {
                return -1;
            }
            else {
                // 最后按paths的长度倒排
                return ele1[4].length - ele2[4].length;
            }
        }
    });
    const entityRelations = [];
    for (const entity in Schema) {
        const { hasRelationDef } = Schema[entity];
        if (hasRelationDef) {
            const { type } = hasRelationDef;
            if (ts.isUnionTypeNode(type)) {
                const { types } = type;
                const relations = types.map(ele => {
                    (0, assert_1.default)(ts.isLiteralTypeNode(ele) && ts.isStringLiteral(ele.literal));
                    return ele.literal.text;
                });
                entityRelations.push([(0, string_1.firstLetterLowerCase)(entity), relations]);
            }
            else {
                (0, assert_1.default)(ts.isLiteralTypeNode(type));
                (0, assert_1.default)(ts.isStringLiteral(type.literal));
                const relations = [type.literal.text];
                entityRelations.push([(0, string_1.firstLetterLowerCase)(entity), relations]);
            }
        }
    }
    const stmts = [
        factory.createImportDeclaration(undefined, undefined, factory.createImportClause(false, undefined, factory.createNamedImports([
            factory.createImportSpecifier(false, undefined, factory.createIdentifier("AuthCascadePath")),
            factory.createImportSpecifier(false, undefined, factory.createIdentifier("AuthDeduceRelationMap"))
        ])), factory.createStringLiteral(`${(0, env_1.TYPE_PATH_IN_OAK_DOMAIN)(1)}Entity`), undefined),
        factory.createImportDeclaration(undefined, undefined, factory.createImportClause(false, undefined, factory.createNamedImports([factory.createImportSpecifier(false, undefined, factory.createIdentifier("EntityDict"))])), factory.createStringLiteral("./EntityDict"), undefined),
        factory.createImportDeclaration(undefined, undefined, factory.createImportClause(false, undefined, factory.createNamedImports([factory.createImportSpecifier(false, factory.createIdentifier("CreateOperationData"), factory.createIdentifier("Relation"))])), factory.createStringLiteral("./Relation/Schema"), undefined),
        factory.createVariableStatement([factory.createToken(ts.SyntaxKind.ExportKeyword)], factory.createVariableDeclarationList([factory.createVariableDeclaration(factory.createIdentifier("ActionCascadePathGraph"), undefined, factory.createArrayTypeNode(factory.createTypeReferenceNode(factory.createIdentifier("AuthCascadePath"), [factory.createTypeReferenceNode(factory.createIdentifier("EntityDict"), undefined)])), factory.createArrayLiteralExpression(actionPath.map(([entity, path, root, isRelation]) => factory.createArrayLiteralExpression([
                factory.createStringLiteral(entity),
                factory.createStringLiteral(path),
                factory.createStringLiteral(root),
                isRelation ? factory.createTrue() : factory.createFalse()
            ], false)), true))], ts.NodeFlags.Const)),
        factory.createVariableStatement([factory.createToken(ts.SyntaxKind.ExportKeyword)], factory.createVariableDeclarationList([factory.createVariableDeclaration(factory.createIdentifier("RelationCascadePathGraph"), undefined, factory.createArrayTypeNode(factory.createTypeReferenceNode(factory.createIdentifier("AuthCascadePath"), [factory.createTypeReferenceNode(factory.createIdentifier("EntityDict"), undefined)])), factory.createArrayLiteralExpression(relationPath.map(([entity, path, root, isRelation]) => factory.createArrayLiteralExpression([
                factory.createStringLiteral(entity),
                factory.createStringLiteral(path),
                factory.createStringLiteral(root),
                isRelation ? factory.createTrue() : factory.createFalse()
            ], false)), true))], ts.NodeFlags.Const)),
        factory.createVariableStatement([factory.createToken(ts.SyntaxKind.ExportKeyword)], factory.createVariableDeclarationList([factory.createVariableDeclaration(factory.createIdentifier("relations"), undefined, factory.createArrayTypeNode(factory.createTypeReferenceNode(factory.createIdentifier("Relation"), undefined)), factory.createArrayLiteralExpression((0, lodash_1.flatten)(entityRelations.map(([entity, relations]) => relations.map((relation) => factory.createObjectLiteralExpression([
                factory.createPropertyAssignment(factory.createIdentifier("id"), factory.createStringLiteral((0, uuid_1.formUuid)(entity, relation))),
                factory.createPropertyAssignment(factory.createIdentifier("entity"), factory.createStringLiteral(entity)),
                factory.createPropertyAssignment(factory.createIdentifier("name"), factory.createStringLiteral(relation))
            ], true)))), true))], ts.NodeFlags.Const))
    ];
    stmts.push(factory.createVariableStatement([
        factory.createToken(ts.SyntaxKind.ExportKeyword)
    ], factory.createVariableDeclarationList([
        factory.createVariableDeclaration(factory.createIdentifier("deducedRelationMap"), undefined, factory.createTypeReferenceNode(factory.createIdentifier("AuthDeduceRelationMap"), [factory.createTypeReferenceNode(factory.createIdentifier("EntityDict"), undefined)]), factory.createObjectLiteralExpression(Object.keys(DEDUCED_RELATION_MAP).map(ele => factory.createPropertyAssignment(factory.createIdentifier((0, string_1.firstLetterLowerCase)(ele)), factory.createStringLiteral(DEDUCED_RELATION_MAP[ele]))), true))
    ], ts.NodeFlags.Const)));
    stmts.push(factory.createVariableStatement([
        factory.createToken(ts.SyntaxKind.ExportKeyword)
    ], factory.createVariableDeclarationList([factory.createVariableDeclaration(factory.createIdentifier("selectFreeEntities"), undefined, factory.createArrayTypeNode(factory.createParenthesizedType(factory.createTypeOperatorNode(ts.SyntaxKind.KeyOfKeyword, factory.createTypeReferenceNode(factory.createIdentifier("EntityDict"), undefined)))), factory.createArrayLiteralExpression(SELECT_FREE_ENTITIES.map(ele => factory.createStringLiteral(ele)), false))], ts.NodeFlags.Const)), factory.createVariableStatement([
        factory.createToken(ts.SyntaxKind.ExportKeyword)
    ], factory.createVariableDeclarationList([factory.createVariableDeclaration(factory.createIdentifier("updateFreeEntities"), undefined, factory.createArrayTypeNode(factory.createParenthesizedType(factory.createTypeOperatorNode(ts.SyntaxKind.KeyOfKeyword, factory.createTypeReferenceNode(factory.createIdentifier("EntityDict"), undefined)))), factory.createArrayLiteralExpression(UPDATE_FREE_ENTITIES.map(ele => factory.createStringLiteral(ele)), false))], ts.NodeFlags.Const)), factory.createVariableStatement([
        factory.createToken(ts.SyntaxKind.ExportKeyword)
    ], factory.createVariableDeclarationList([factory.createVariableDeclaration(factory.createIdentifier("createFreeEntities"), undefined, factory.createArrayTypeNode(factory.createParenthesizedType(factory.createTypeOperatorNode(ts.SyntaxKind.KeyOfKeyword, factory.createTypeReferenceNode(factory.createIdentifier("EntityDict"), undefined)))), factory.createArrayLiteralExpression(CREATE_FREE_ENTITIES.map(ele => factory.createStringLiteral(ele)), false))], ts.NodeFlags.Const)));
    const result = printer.printList(ts.ListFormat.SourceFileStatements, factory.createNodeArray(stmts), ts.createSourceFile("someFileName.ts", "", ts.ScriptTarget.Latest, /*setParentNodes*/ false, ts.ScriptKind.TS));
    const filename = path_1.default.join(outputDir, 'Relation.ts');
    (0, fs_1.writeFileSync)(filename, result, { flag: 'w' });
}
function analyzeEntities(inputDir, relativePath) {
    const files = (0, fs_1.readdirSync)(inputDir);
    const fullFilenames = files.map(ele => {
        const entity = ele.slice(0, ele.indexOf('.'));
        if (env_1.RESERVED_ENTITY_NAMES.includes(entity) || env_1.RESERVED_ENTITY_NAMES.find(ele2 => entity.startsWith(ele2))) {
            throw new Error(`${ele}是系统保留字，请勿使用其当对象名或对象名前缀`);
        }
        return `${inputDir}/${ele}`;
    });
    const program = ts.createProgram(fullFilenames, { allowJs: true });
    files.forEach((filename) => {
        analyzeEntity(filename, inputDir, program, relativePath);
    });
    analyzeInModi();
    uniqRelationships();
}
exports.analyzeEntities = analyzeEntities;
function buildSchema(outputDir) {
    addReverseRelationship();
    // setRelationEntities();
    const printer = ts.createPrinter({ newLine: ts.NewLineKind.LineFeed });
    resetOutputDir(outputDir);
    outputSchema(outputDir, printer);
    outputLocale(outputDir, printer);
    outputSubQuery(outputDir, printer);
    outputAction(outputDir, printer);
    outputEntityDict(outputDir, printer);
    outputStorage(outputDir, printer);
    outputRelation(outputDir, printer);
    outputIndexTs(outputDir);
    if (!process.env.COMPLING_AS_LIB) {
        outputPackageJson(outputDir);
    }
}
exports.buildSchema = buildSchema;
