"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.buildSchema = exports.analyzeEntities = void 0;
var tslib_1 = require("tslib");
var path_1 = tslib_1.__importDefault(require("path"));
var assert_1 = tslib_1.__importDefault(require("assert"));
var fs_1 = require("fs");
var fs_extra_1 = require("fs-extra");
var lodash_1 = require("lodash");
var ts = tslib_1.__importStar(require("typescript"));
var factory = ts.factory;
var env_1 = require("./env");
var string_1 = require("../utils/string");
var Schema = {};
var OneToMany = {};
var ManyToOne = {};
var ReversePointerEntities = {};
var ReversePointerRelations = {};
var ActionImportStatements = function () { return [
    factory.createImportDeclaration(undefined, undefined, factory.createImportClause(false, undefined, factory.createNamedImports([factory.createImportSpecifier(false, undefined, factory.createIdentifier("ActionDef"))])), factory.createStringLiteral("".concat((0, env_1.TYPE_PATH_IN_OAK_DOMAIN)(), "Action")), undefined),
    factory.createImportDeclaration(undefined, undefined, factory.createImportClause(false, undefined, factory.createNamedImports([
        factory.createImportSpecifier(false, undefined, factory.createIdentifier("GenericAction")),
        factory.createImportSpecifier(false, undefined, factory.createIdentifier("AppendOnlyAction")),
        factory.createImportSpecifier(false, undefined, factory.createIdentifier("ReadOnlyAction")),
        factory.createImportSpecifier(false, undefined, factory.createIdentifier("ExcludeUpdateAction")),
        factory.createImportSpecifier(false, undefined, factory.createIdentifier("ExcludeRemoveAction")),
        factory.createImportSpecifier(false, undefined, factory.createIdentifier("RelationAction")),
    ])), factory.createStringLiteral((0, env_1.ACTION_CONSTANT_IN_OAK_DOMAIN)()), undefined)
]; };
var ActionAsts = {};
var SchemaAsts = {};
function addRelationship(many, one, key, notNull) {
    var _a, _b;
    var _c = ManyToOne, _d = many, manySet = _c[_d];
    var one2 = one === 'Schema' ? many : one;
    if (manySet) {
        manySet.push([one2, key, notNull]);
    }
    else {
        (0, lodash_1.assign)(ManyToOne, (_a = {},
            _a[many] = [[one2, key, notNull]],
            _a));
    }
    var _e = OneToMany, _f = one2, oneSet = _e[_f];
    if (oneSet) {
        oneSet.push([many, key, notNull]);
    }
    else {
        (0, lodash_1.assign)(OneToMany, (_b = {},
            _b[one2] = [[many, key, notNull]],
            _b));
    }
}
function createForeignRef(entity, foreignKey, ref) {
    if (entity === foreignKey) {
        return factory.createIdentifier(ref);
    }
    return factory.createQualifiedName(factory.createIdentifier(foreignKey), factory.createIdentifier(ref));
}
function pushStatementIntoActionAst(moduleName, node, sourceFile) {
    var _a;
    // let actionNames;
    var actionDefName;
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
        var declarations = node.declarationList.declarations;
        declarations.forEach(function (declaration) {
            if (ts.isIdentifier(declaration.name) && declaration.name.text.endsWith('ActionDef')) {
                var text = declaration.name.text;
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
        (0, lodash_1.assign)(ActionAsts, (_a = {},
            _a[moduleName] = {
                statements: tslib_1.__spreadArray(tslib_1.__spreadArray([], tslib_1.__read(ActionImportStatements()), false), [node], false),
                sourceFile: sourceFile,
                importedFrom: {},
                // actionNames,
                actionDefNames: actionDefName ? [actionDefName] : [],
            },
            _a));
    }
}
function pushStatementIntoSchemaAst(moduleName, statement, sourceFile) {
    var _a;
    if (SchemaAsts[moduleName]) {
        SchemaAsts[moduleName].statements.push(statement);
    }
    else {
        (0, lodash_1.assign)(SchemaAsts, (_a = {},
            _a[moduleName] = {
                statements: [statement],
                sourceFile: sourceFile,
            },
            _a));
    }
}
/**
 * 检查ActionDef是否满足合法的定义
 * 1、ActionDef, Action, State三者命名是否一致
 * @param actionDefNode
 */
function checkActionDefNameConsistent(filename, actionDefNode) {
    var name = actionDefNode.name, type = actionDefNode.type;
    (0, assert_1.default)(ts.isTypeReferenceNode(type));
    var typeArguments = type.typeArguments;
    (0, assert_1.default)(typeArguments.length === 2);
    var _a = tslib_1.__read(typeArguments, 2), actionNode = _a[0], stateNode = _a[1];
    (0, assert_1.default)(ts.isIdentifier(name), "\u6587\u4EF6".concat(filename, "\u4E2D\u7684ActionDef").concat(name.text, "\u4E0D\u662F\u4E00\u4E2A\u6709\u6548\u7684\u53D8\u91CF"));
    (0, assert_1.default)(name.text.endsWith('ActionDef'), "\u6587\u4EF6".concat(filename, "\u4E2D\u7684ActionDef").concat(name.text, "\u672A\u4EE5ActionDef\u7ED3\u5C3E"));
    (0, assert_1.default)(ts.isTypeReferenceNode(actionNode) && ts.isTypeReferenceNode(stateNode), "\u6587\u4EF6".concat(filename, "\u4E2D\u7684ActionDef").concat(name.text, "\u7C7B\u578B\u58F0\u660E\u4E2D\u7684action\u548Cstate\u975E\u6CD5"));
    (0, assert_1.default)(ts.isIdentifier(actionNode.typeName) && ts.isIdentifier(stateNode.typeName));
    (0, assert_1.default)(actionNode.typeName.text.endsWith('Action'), "\u6587\u4EF6".concat(filename, "\u4E2D\u7684ActionDef").concat(name.text, "\u6240\u5F15\u7528\u7684Action").concat(actionNode.typeName, "\u672A\u4EE5Action\u7ED3\u5C3E"));
    (0, assert_1.default)(stateNode.typeName.text.endsWith('State'), "\u6587\u4EF6".concat(filename, "\u4E2D\u7684ActionDef").concat(name.text, "\u6240\u5F15\u7528\u7684Action").concat(stateNode.typeName, "\u672A\u4EE5Action\u7ED3\u5C3E"));
    var adfName = name.text.slice(0, name.text.length - 9);
    var aName = actionNode.typeName.text.slice(0, actionNode.typeName.text.length - 6);
    var sName = stateNode.typeName.text.slice(0, stateNode.typeName.text.length - 5);
    (0, assert_1.default)(adfName === aName && aName === sName, "\u6587\u4EF6".concat(filename, "\u4E2D\u7684ActionDef").concat(name.text, "\u4E2DActionDef, Action\u548CState\u7684\u547D\u540D\u89C4\u5219\u4E0D\u4E00\u81F4"));
}
function addActionSource(moduleName, name, node) {
    var _a;
    var ast = ActionAsts[moduleName];
    var moduleSpecifier = node.moduleSpecifier;
    // todo 目前应该只会引用oak-domain/src/actions/action里的公共action，未来如果有交叉引用这里代码要修正（如果domain中也有引用action_constants这里应该也会错）
    (0, assert_1.default)(ts.isStringLiteral(moduleSpecifier) && moduleSpecifier.text === (0, env_1.ACTION_CONSTANT_IN_OAK_DOMAIN)());
    (0, lodash_1.assign)(ast.importedFrom, (_a = {},
        _a[name.text] = node,
        _a));
}
function getStringTextFromUnionStringLiterals(moduleName, filename, node, program) {
    var _a;
    var checker = program.getTypeChecker();
    var symbol = checker.getSymbolAtLocation(node.typeName);
    var declaration = symbol === null || symbol === void 0 ? void 0 : symbol.getDeclarations()[0];
    var isImport = false;
    /* const typee = checker.getDeclaredTypeOfSymbol(symbol!);

    const declaration = typee.aliasSymbol!.getDeclarations()![0]; */
    if (ts.isImportSpecifier(declaration)) {
        isImport = true;
        var typee = checker.getDeclaredTypeOfSymbol(symbol);
        declaration = typee.aliasSymbol.getDeclarations()[0];
    }
    (0, assert_1.default)(ts.isTypeAliasDeclaration(declaration));
    var type = declaration.type, name = declaration.name;
    // assert(ts.isUnionTypeNode(type!) || ts.isLiteralTypeNode(type!), `${filename}中引用的action「${(<ts.Identifier>name).text}」的定义不是union和stringLiteral类型`);
    // 如果这个action是从外部导入的，在这里要记下来此entity和这个导入之间的关系
    if (isImport) {
        var importDeclartion = symbol.getDeclarations()[0].parent.parent.parent;
        (0, assert_1.default)(ts.isImportDeclaration(importDeclartion));
        addActionSource(moduleName, name, importDeclartion);
    }
    else {
        var ast = ActionAsts[moduleName];
        (0, lodash_1.assign)(ast.importedFrom, (_a = {},
            _a[name.text] = 'local',
            _a));
    }
    var getStringLiteral = function (ele) {
        (0, assert_1.default)(ts.isLiteralTypeNode(ele) && ts.isStringLiteral(ele.literal), "".concat(filename, "\u4E2D\u5F15\u7528\u7684action").concat(name.text, "\u4E2D\u5B58\u5728\u4E0D\u662Fstringliteral\u7684\u7C7B\u578B"));
        (0, assert_1.default)(!ele.literal.text.includes('$'), "".concat(filename, "\u4E2D\u5F15\u7528\u7684action").concat(name.text, "\u4E2D\u7684action\u300C").concat(ele.literal.text, "\u300D\u5305\u542B\u975E\u6CD5\u5B57\u7B26$"));
        (0, assert_1.default)(ele.literal.text.length > 0, "".concat(filename, "\u4E2D\u5F15\u7528\u7684action").concat(name.text, "\u4E2D\u7684action\u300C").concat(ele.literal.text, "\u300D\u957F\u5EA6\u975E\u6CD5"));
        (0, assert_1.default)(ele.literal.text.length < env_1.STRING_LITERAL_MAX_LENGTH, "".concat(filename, "\u4E2D\u5F15\u7528\u7684action").concat(name.text, "\u4E2D\u7684action\u300C").concat(ele.literal.text, "\u300D\u957F\u5EA6\u8FC7\u957F"));
        return ele.literal.text;
    };
    if (ts.isUnionTypeNode(type)) {
        var actions = type.types.map(function (ele) { return getStringLiteral(ele); });
        return actions;
    }
    else {
        (0, assert_1.default)(ts.isLiteralTypeNode(type), "".concat(filename, "\u4E2D\u5F15\u7528\u7684action\u300C").concat(name.text, "\u300D\u7684\u5B9A\u4E49\u4E0D\u662Funion\u548CstringLiteral\u7C7B\u578B"));
        var action = getStringLiteral(type);
        return [action];
    }
}
var RESERVED_ACTION_NAMES = ['GenericAction', 'ParticularAction', 'ExcludeRemoveAction', 'ExcludeUpdateAction', 'ReadOnlyAction', 'AppendOnlyAction', 'RelationAction'];
var action_1 = require("../actions/action");
var DataType_1 = require("../types/DataType");
var Entity_1 = require("../types/Entity");
var OriginActionDict = {
    'crud': 'GenericAction',
    'excludeUpdate': 'ExcludeUpdateAction',
    'excludeRemove': 'ExcludeRemoveAction',
    'appendOnly': 'AppendOnlyAction',
    'readOnly': 'ReadOnlyAction',
};
function dealWithActions(moduleName, filename, node, program, sourceFile, hasRelationDef) {
    var actionTexts = action_1.genericActions.map(function (ele) { return ele; });
    if (hasRelationDef) {
        actionTexts.push.apply(actionTexts, tslib_1.__spreadArray([], tslib_1.__read(action_1.relationActions), false));
    }
    if (ts.isUnionTypeNode(node)) {
        var actionNames = node.types.map(function (ele) {
            if (ts.isTypeReferenceNode(ele) && ts.isIdentifier(ele.typeName)) {
                return ele.typeName.text;
            }
        }).filter(function (ele) { return !!ele; });
        (0, assert_1.default)((0, lodash_1.intersection)(actionNames, env_1.RESERVED_ENTITIES).length === 0, "".concat(filename, "\u4E2D\u7684Action\u547D\u540D\u4E0D\u80FD\u662F\u300C").concat(RESERVED_ACTION_NAMES.join(','), "\u300D\u4E4B\u4E00"));
        node.types.forEach(function (ele) {
            if (ts.isTypeReferenceNode(ele)) {
                actionTexts.push.apply(actionTexts, tslib_1.__spreadArray([], tslib_1.__read(getStringTextFromUnionStringLiterals(moduleName, filename, ele, program)), false));
            }
            else {
                (0, assert_1.default)(ts.isLiteralTypeNode(ele) && ts.isStringLiteral(ele.literal), "\u3010".concat(moduleName, "\u3011action\u7684\u5B9A\u4E49\u65E2\u975EType\u4E5F\u4E0D\u662Fstring"));
                actionTexts.push(ele.literal.text);
            }
        });
    }
    else if (ts.isTypeReferenceNode(node)) {
        if (ts.isIdentifier(node.typeName)) {
            (0, assert_1.default)(!RESERVED_ACTION_NAMES.includes(node.typeName.text), "".concat(filename, "\u4E2D\u7684Action\u547D\u540D\u4E0D\u80FD\u662F\u300C").concat(RESERVED_ACTION_NAMES.join(','), "\u300D\u4E4B\u4E00"));
        }
        actionTexts.push.apply(actionTexts, tslib_1.__spreadArray([], tslib_1.__read(getStringTextFromUnionStringLiterals(moduleName, filename, node, program)), false));
    }
    else {
        (0, assert_1.default)(ts.isLiteralTypeNode(node) && ts.isStringLiteral(node.literal), "\u3010".concat(moduleName, "\u3011action\u7684\u5B9A\u4E49\u65E2\u975EType\u4E5F\u4E0D\u662Fstring"));
        actionTexts.push(node.literal.text);
    }
    // 所有的action定义不能有重名
    var ActionDict = {};
    actionTexts.forEach(function (action) {
        var _a;
        (0, assert_1.default)(action.length <= env_1.STRING_LITERAL_MAX_LENGTH, "".concat(filename, "\u4E2D\u7684Action\u300C").concat(action, "\u300D\u547D\u540D\u957F\u5EA6\u5927\u4E8E").concat(env_1.STRING_LITERAL_MAX_LENGTH));
        (0, assert_1.default)(/^[a-z][a-z|A-Z]+$/.test(action), "".concat(filename, "\u4E2D\u7684Action\u300C").concat(action, "\u300D\u547D\u540D\u4E0D\u5408\u6CD5\uFF0C\u5FC5\u987B\u4EE5\u5C0F\u5B57\u5B57\u6BCD\u5F00\u5934\u4E14\u53EA\u80FD\u5305\u542B\u5B57\u6BCD"));
        if (ActionDict.hasOwnProperty(action)) {
            throw new Error("\u6587\u4EF6".concat(filename, "\u4E2D\uFF0CAction\u5B9A\u4E49\u4E0A\u7684\u3010").concat(action, "\u3011\u52A8\u4F5C\u5B58\u5728\u540C\u540D"));
        }
        else {
            (0, lodash_1.assign)(ActionDict, (_a = {},
                _a[action] = 1,
                _a));
        }
    });
    pushStatementIntoActionAst(moduleName, factory.createVariableStatement([factory.createModifier(ts.SyntaxKind.ExportKeyword)], factory.createVariableDeclarationList([factory.createVariableDeclaration(factory.createIdentifier("actions"), undefined, undefined, factory.createArrayLiteralExpression(actionTexts.map(function (ele) { return factory.createStringLiteral(ele); }), false))], ts.NodeFlags.Const)), sourceFile);
}
/**
 * entity的引用一定要以 import { Schema as XXX } from '..../XXX'这种形式
 * @param declaration
 * @param filename
 * @returns
 */
function getEntityImported(declaration) {
    var moduleSpecifier = declaration.moduleSpecifier, importClause = declaration.importClause;
    var entityImported;
    if (ts.isStringLiteral(moduleSpecifier)) {
        var importedFileName_1 = path_1.default.parse(moduleSpecifier.text).name;
        var namedBindings = importClause.namedBindings;
        if (namedBindings && ts.isNamedImports(namedBindings)) {
            var elements = namedBindings.elements;
            if (elements.find(function (ele) { var _a; return ts.isImportSpecifier(ele) && ele.name.text === importedFileName_1 && ((_a = ele.propertyName) === null || _a === void 0 ? void 0 : _a.text) === 'Schema'; })) {
                entityImported = importedFileName_1;
            }
        }
    }
    return entityImported;
}
function checkLocaleEnumAttrs(node, attrs, filename) {
    var members = node.members;
    var memberKeys = members.map(function (ele) {
        (0, assert_1.default)(ts.isPropertySignature(ele) && ts.isIdentifier(ele.name));
        return ele.name.text;
    });
    var lack = (0, lodash_1.difference)(attrs, memberKeys);
    if (lack.length > 0) {
        throw new Error("".concat(filename, "\u4E2D\u7F3A\u5C11\u4E86\u5BF9").concat(lack.join(','), "\u5C5E\u6027\u7684locale\u5B9A\u4E49"));
    }
}
function checkLocaleExpressionPropertyExists(root, attr, exists, filename) {
    var properties = root.properties;
    properties.forEach(function (ele) {
        (0, assert_1.default)(ts.isPropertyAssignment(ele) && (ts.isIdentifier(ele.name) || ts.isStringLiteral(ele.name)) && ts.isObjectLiteralExpression(ele.initializer));
        var p2 = ele.initializer.properties;
        var pp = p2.find(function (ele2) {
            (0, assert_1.default)(ts.isPropertyAssignment(ele2) && ts.isIdentifier(ele2.name));
            return ele2.name.text === attr;
        });
        if (exists && !pp) {
            throw new Error("".concat(filename, "\u4E2D\u7684locale\u5B9A\u4E49\u4E2D\u7684").concat(ele.name.text, "\u4E2D\u7F3A\u5C11\u4E86").concat(attr, "\u7684\u5B9A\u4E49"));
        }
        else if (!exists && pp) {
            throw new Error("".concat(filename, "\u4E2D\u7684locale\u5B9A\u4E49\u4E2D\u7684").concat(ele.name.text, "\u4E2D\u6709\u591A\u4F59\u7684").concat(attr, "\u5B9A\u4E49"));
        }
    });
}
function analyzeEntity(filename, path, program, relativePath) {
    var _a;
    var fullPath = "".concat(path, "/").concat(filename);
    var sourceFile = program.getSourceFile(fullPath);
    var moduleName = filename.split('.')[0];
    if (Schema.hasOwnProperty(moduleName)) {
        if (!path.includes('oak-general-business')) {
            console.log("\u51FA\u73B0\u4E86\u540C\u540D\u7684Entity\u5B9A\u4E49\u300C".concat(moduleName, "\u300D\uFF0C\u5C06\u4F7F\u7528\u60A8\u6240\u5B9A\u4E49\u7684\u5BF9\u8C61\u7ED3\u6784\u53D6\u4EE3\u6389\u9ED8\u8BA4\u5BF9\u8C61\uFF0C\u8BF7\u786E\u8BA4"));
        }
    }
    var referencedSchemas = [];
    var schemaAttrs = [];
    var hasFulltextIndex = false;
    var indexes;
    var beforeSchema = true;
    var hasActionDef = false;
    var hasRelationDef = false;
    var hasActionOrStateDef = false;
    var toModi = false;
    var actionType = 'crud';
    var _static = false;
    var enumStringAttrs = [];
    var states = [];
    var localEnumStringTypes = [];
    var additionalImports = [];
    var localeDef = undefined;
    ts.forEachChild(sourceFile, function (node) {
        var _a, _b, _c, _d;
        if (ts.isImportDeclaration(node)) {
            var entityImported = getEntityImported(node);
            if (entityImported) {
                referencedSchemas.push(entityImported);
            }
            else if (!process.env.COMPLING_IN_DOMAIN && !(relativePath === null || relativePath === void 0 ? void 0 : relativePath.startsWith(env_1.LIB_OAK_DOMAIN))) {
                /**import了domain以外的其它定义类型，需要被复制到生成的Schema文件中
                 * 这里必须注意，1、假设了domain当中定义的几个entity不会引用其它文件上的定义（除了type里的那些通用类型，默认都会被输出到文件中）
                 * 2、假设了其它项目文件不会引用domain当中除了type通用类型之外的其它内容，否则不会被输出到文件中
                 * 这里主要是对import的处理比较粗略，日后有需要的时候再精修
                */
                var moduleSpecifier = node.moduleSpecifier, importClause = node.importClause;
                if (ts.isStringLiteral(moduleSpecifier) && !moduleSpecifier.text.startsWith(env_1.LIB_OAK_DOMAIN)) {
                    // 编译后的路径默认要深一层
                    var moduleSpecifier2Text = relativePath
                        ? path_1.default.join(relativePath, moduleSpecifier.text).replace(/\\/g, '/')
                        : path_1.default.join('..', moduleSpecifier.text).replace(/\\/g, '/');
                    additionalImports.push(factory.updateImportDeclaration(node, undefined, undefined, importClause, factory.createStringLiteral(moduleSpecifier2Text), undefined));
                }
            }
        }
        if (ts.isInterfaceDeclaration(node)) {
            // schema 定义
            if (node.name.text === 'Schema') {
                (0, assert_1.default)(!localeDef, "\u3010".concat(filename, "\u3011locale\u5B9A\u4E49\u987B\u5728Schema\u4E4B\u540E"));
                var hasEntityAttr_1 = false;
                var hasEntityIdAttr_1 = false;
                var members = node.members, heritageClauses = node.heritageClauses;
                (0, assert_1.default)(['EntityShape', 'FileCarrierEntityShape'].includes(heritageClauses[0].types[0].expression.text));
                members.forEach(function (attrNode) {
                    var _a, _b;
                    var _c = attrNode, type = _c.type, name = _c.name, questionToken = _c.questionToken;
                    var attrName = name.text;
                    if (ts.isTypeReferenceNode(type)
                        && ts.isIdentifier(type.typeName)) {
                        if ((referencedSchemas.includes(type.typeName.text) || type.typeName.text === 'Schema')) {
                            addRelationship(moduleName, type.typeName.text, attrName, !!questionToken);
                            schemaAttrs.push(attrNode);
                        }
                        else if (type.typeName.text === 'Array') {
                            // 这是一对多的反向指针的引用，需要特殊处理
                            var typeArguments = type.typeArguments;
                            (0, assert_1.default)(typeArguments.length === 1
                                && ts.isTypeReferenceNode(typeArguments[0])
                                && ts.isIdentifier(typeArguments[0].typeName)
                                && referencedSchemas.includes(typeArguments[0].typeName.text), "\u300C".concat(filename, "\u300D\u975E\u6CD5\u7684\u5C5E\u6027\u5B9A\u4E49\u300C").concat(attrName, "\u300D"));
                            var reverseEntity = typeArguments[0].typeName.text;
                            if (ReversePointerRelations[reverseEntity]) {
                                ReversePointerRelations[reverseEntity].push(moduleName);
                            }
                            else {
                                (0, lodash_1.assign)(ReversePointerRelations, (_a = {},
                                    _a[reverseEntity] = [moduleName],
                                    _a));
                            }
                            if (reverseEntity === 'Modi') {
                                toModi = true;
                            }
                        }
                        else {
                            schemaAttrs.push(attrNode);
                            if (localEnumStringTypes.includes(type.typeName.text)) {
                                enumStringAttrs.push(name.text);
                            }
                        }
                    }
                    else if (ts.isArrayTypeNode(type) && ts.isTypeReferenceNode(type.elementType) && ts.isIdentifier(type.elementType.typeName)) {
                        var typeName = type.elementType.typeName;
                        if (referencedSchemas.includes(typeName.text)) {
                            // 这也是一对多的反指定义 
                            var reverseEntity = typeName.text;
                            if (ReversePointerRelations[reverseEntity]) {
                                ReversePointerRelations[reverseEntity].push(moduleName);
                            }
                            else {
                                (0, lodash_1.assign)(ReversePointerRelations, (_b = {},
                                    _b[reverseEntity] = [moduleName],
                                    _b));
                            }
                            if (reverseEntity === 'Modi') {
                                toModi = true;
                            }
                        }
                        else {
                            throw new Error("\u5BF9\u8C61".concat(moduleName, "\u4E2D\u5B9A\u4E49\u7684\u5C5E\u6027").concat(attrName, "\u662F\u4E0D\u53EF\u8BC6\u522B\u7684\u6570\u7EC4\u7C7B\u522B"));
                        }
                    }
                    else {
                        schemaAttrs.push(attrNode);
                        if (ts.isUnionTypeNode(type)) {
                            var types = type.types;
                            if (ts.isLiteralTypeNode(types[0]) && ts.isStringLiteral(types[0].literal)) {
                                enumStringAttrs.push(name.text);
                                types.forEach(function (ele) {
                                    (0, assert_1.default)(ts.isLiteralTypeNode(ele) && ts.isStringLiteral(ele.literal), "\u300C".concat(filename, "\u300D\u4E0D\u652F\u6301\u6DF7\u5408\u578B\u7684\u679A\u4E3E\u5C5E\u6027\u5B9A\u4E49\u300C").concat(attrName, "\u300D"));
                                    (0, assert_1.default)(ele.literal.text.length < env_1.STRING_LITERAL_MAX_LENGTH, "\u300C".concat(filename, "\u300D\u4E2D\u5B9A\u4E49\u7684\u5C5E\u6027\u679A\u4E3E\u300C").concat(attrName, "\u300D\u7684\u5B57\u7B26\u4E32\u957F\u5EA6\u5E94\u5C0F\u4E8E").concat(env_1.STRING_LITERAL_MAX_LENGTH));
                                });
                            }
                        }
                    }
                    if (attrName === 'entity'
                        && ts.isTypeReferenceNode(type)
                        && ts.isIdentifier(type.typeName)) {
                        var typeArguments = type.typeArguments;
                        if (type.typeName.text === 'String'
                            && typeArguments
                            && typeArguments.length === 1) {
                            var _d = tslib_1.__read(typeArguments, 1), node_1 = _d[0];
                            if (ts.isLiteralTypeNode(node_1) && ts.isNumericLiteral(node_1.literal)) {
                                if (parseInt(node_1.literal.text) > 32) {
                                    console.warn("\u300C\u300D\u4E2Dentity\u5C5E\u6027\u5B9A\u4E49\u7684\u957F\u5EA6\u5927\u4E8E32\uFF0C\u8BF7\u786E\u8BA4\u5B83\u4E0D\u662F\u4E00\u4E2A\u53CD\u6307\u5BF9\u8C61");
                                }
                                else {
                                    hasEntityAttr_1 = true;
                                }
                            }
                        }
                    }
                    if (attrName === 'entityId'
                        && ts.isTypeReferenceNode(type)
                        && ts.isIdentifier(type.typeName)) {
                        var typeArguments = type.typeArguments;
                        if (type.typeName.text === 'String'
                            && typeArguments
                            && typeArguments.length === 1) {
                            var _e = tslib_1.__read(typeArguments, 1), node_2 = _e[0];
                            if (ts.isLiteralTypeNode(node_2) && ts.isNumericLiteral(node_2.literal)) {
                                if (parseInt(node_2.literal.text) !== 64) {
                                    console.warn("\u300C".concat(filename, "\u300D\u4E2DentityId\u5C5E\u6027\u5B9A\u4E49\u7684\u957F\u5EA6\u4E0D\u7B49\u4E8E64\uFF0C\u8BF7\u786E\u8BA4\u5B83\u4E0D\u662F\u4E00\u4E2A\u53CD\u6307\u5BF9\u8C61"));
                                }
                                else {
                                    hasEntityIdAttr_1 = true;
                                }
                            }
                        }
                    }
                });
                if (hasEntityAttr_1 && hasEntityIdAttr_1) {
                    (0, lodash_1.assign)(ReversePointerEntities, (_a = {},
                        _a[moduleName] = 1,
                        _a));
                }
                beforeSchema = false;
                // 对于不是Oper的对象，全部建立和OperEntity的反指关系
                if (!['Oper', 'OperEntity', 'ModiEntity'].includes(moduleName)) {
                    if (ReversePointerRelations['OperEntity'] && !ReversePointerRelations['OperEntity'].includes(moduleName)) {
                        ReversePointerRelations['OperEntity'].push(moduleName);
                    }
                    else {
                        (0, lodash_1.assign)(ReversePointerRelations, (_b = {},
                            _b['OperEntity'] = [moduleName],
                            _b));
                    }
                    // 对于不是Modi的对象，全部建立和ModiEntity的反指关系
                    if (!['Modi'].includes(moduleName) && !toModi) {
                        if (ReversePointerRelations['ModiEntity'] && !ReversePointerRelations['ModiEntity'].includes(moduleName)) {
                            ReversePointerRelations['ModiEntity'].push(moduleName);
                        }
                        else {
                            (0, lodash_1.assign)(ReversePointerRelations, (_c = {},
                                _c['ModiEntity'] = [moduleName],
                                _c));
                        }
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
                (0, assert_1.default)(!localeDef, "\u3010".concat(filename, "\u3011locale\u5B9A\u4E49\u987B\u5728Action\u4E4B\u540E"));
                hasActionDef = true;
                var modifiers = [factory.createModifier(ts.SyntaxKind.ExportKeyword)];
                pushStatementIntoActionAst(moduleName, factory.updateTypeAliasDeclaration(node, node.decorators, modifiers, factory.createIdentifier('ParticularAction'), node.typeParameters, node.type), sourceFile);
                var actionDefNodes = [
                    factory.createTypeReferenceNode(OriginActionDict[actionType], undefined),
                    factory.createTypeReferenceNode('ParticularAction', undefined)
                ];
                if (hasRelationDef || moduleName === 'User') {
                    actionDefNodes.push(factory.createTypeReferenceNode('RelationAction', undefined));
                }
                pushStatementIntoActionAst(moduleName, factory.createTypeAliasDeclaration(undefined, [factory.createModifier(ts.SyntaxKind.ExportKeyword)], factory.createIdentifier("Action"), undefined, factory.createUnionTypeNode(actionDefNodes)), sourceFile);
                dealWithActions(moduleName, filename, node.type, program, sourceFile, hasRelationDef || moduleName === 'User');
            }
            else if (node.name.text === 'Relation') {
                (0, assert_1.default)(!hasActionDef, "\u3010".concat(filename, "\u3011action\u5B9A\u4E49\u987B\u5728Relation\u4E4B\u540E"));
                (0, assert_1.default)(!localeDef, "\u3010".concat(filename, "\u3011locale\u5B9A\u4E49\u987B\u5728Relation\u4E4B\u540E"));
                // 增加userXXX对象的描述
                if (ts.isLiteralTypeNode(node.type)) {
                    (0, assert_1.default)(ts.isStringLiteral(node.type.literal));
                    (0, assert_1.default)(node.type.literal.text.length < env_1.STRING_LITERAL_MAX_LENGTH, "Relation\u5B9A\u4E49\u7684\u5B57\u7B26\u4E32\u957F\u5EA6\u4E0D\u957F\u4E8E".concat(env_1.STRING_LITERAL_MAX_LENGTH, "\uFF08").concat(filename, "\uFF0C").concat(node.type.literal.text, "\uFF09"));
                }
                else {
                    (0, assert_1.default)(ts.isUnionTypeNode(node.type), "Relation\u7684\u5B9A\u4E49\u53EA\u80FD\u662Fstring\u7C7B\u578B\uFF08".concat(filename, "\uFF09"));
                    node.type.types.forEach(function (ele) {
                        (0, assert_1.default)(ts.isLiteralTypeNode(ele) && ts.isStringLiteral(ele.literal), "Relation\u7684\u5B9A\u4E49\u53EA\u80FD\u662Fstring\u7C7B\u578B\uFF08".concat(filename, "\uFF09"));
                        (0, assert_1.default)(ele.literal.text.length < env_1.STRING_LITERAL_MAX_LENGTH, "Relation\u5B9A\u4E49\u7684\u5B57\u7B26\u4E32\u957F\u5EA6\u4E0D\u957F\u4E8E".concat(env_1.STRING_LITERAL_MAX_LENGTH, "\uFF08").concat(filename, "\uFF0C").concat(ele.literal.text, "\uFF09"));
                    });
                }
                var entityLc = (0, string_1.firstLetterLowerCase)(moduleName);
                var relationEntityName = "User".concat(moduleName);
                var relationSchemaAttrs = [
                    factory.createPropertySignature(undefined, factory.createIdentifier("user"), undefined, factory.createTypeReferenceNode(factory.createIdentifier("User"), undefined)),
                    factory.createPropertySignature(undefined, factory.createIdentifier(entityLc), undefined, factory.createTypeReferenceNode(factory.createIdentifier(moduleName), undefined)),
                    factory.createPropertySignature(undefined, factory.createIdentifier('relation'), undefined, node.type),
                ];
                (0, lodash_1.assign)(Schema, (_d = {},
                    _d[relationEntityName] = {
                        schemaAttrs: relationSchemaAttrs,
                        sourceFile: sourceFile,
                        actionType: 'excludeUpdate',
                    },
                    _d));
                addRelationship(relationEntityName, 'User', 'user', true);
                addRelationship(relationEntityName, moduleName, entityLc, true);
                hasRelationDef = true;
            }
            else if (node.name.text.endsWith('Action') || node.name.text.endsWith('State')) {
                (0, assert_1.default)(!localeDef, "\u3010".concat(filename, "\u3011locale\u5B9A\u4E49\u987B\u5728Action/State\u4E4B\u540E"));
                hasActionOrStateDef = true;
                pushStatementIntoActionAst(moduleName, factory.updateTypeAliasDeclaration(node, node.decorators, [factory.createModifier(ts.SyntaxKind.ExportKeyword)], node.name, node.typeParameters, node.type), sourceFile);
            }
            else if (beforeSchema) {
                // 本地规定的一些形状定义，直接使用
                pushStatementIntoSchemaAst(moduleName, node, sourceFile);
                if (ts.isUnionTypeNode(node.type) && ts.isLiteralTypeNode(node.type.types[0]) && ts.isStringLiteral(node.type.types[0].literal)) {
                    // 本文件内定义的枚举类型
                    localEnumStringTypes.push(node.name.text);
                    node.type.types.forEach(function (ele) {
                        (0, assert_1.default)(ts.isLiteralTypeNode(ele) && ts.isStringLiteral(ele.literal), "\u300C".concat(filename, "\u300D\u4E0D\u652F\u6301\u6DF7\u5408\u578B\u7684\u5E38\u91CF\u5B9A\u4E49\u300C").concat(node.name.text, "\u300D"));
                        (0, assert_1.default)(ele.literal.text.length < env_1.STRING_LITERAL_MAX_LENGTH, "\u300C".concat(filename, "\u300D\u4E2D\u5B9A\u4E49\u7684\u5E38\u91CF\u679A\u4E3E\u300C").concat(node.name.text, "\u300D\u7684\u5B57\u7B26\u4E32\u957F\u5EA6\u5E94\u5C0F\u4E8E").concat(env_1.STRING_LITERAL_MAX_LENGTH));
                    });
                }
            }
        }
        if (ts.isVariableStatement(node)) {
            var declarations = node.declarationList.declarations;
            declarations.forEach(function (declaration) {
                if (ts.isIdentifier(declaration.name) && declaration.name.text.endsWith('ActionDef')) {
                    if (declaration.type && ts.isTypeReferenceNode(declaration.type) && ts.isIdentifier(declaration.type.typeName) && declaration.type.typeName.text === 'ActionDef') {
                        // 是显示的actionDef定义
                        checkActionDefNameConsistent(filename, declaration);
                        var typeArguments = declaration.type.typeArguments;
                        (0, assert_1.default)(typeArguments.length === 2);
                        var _a = tslib_1.__read(typeArguments, 2), actionNode = _a[0], stateNode = _a[1];
                        var checker = program.getTypeChecker();
                        var symbol = checker.getSymbolAtLocation(actionNode.typeName);
                        var declaration2_1 = symbol.getDeclarations()[0];
                        if (declaration2_1.getSourceFile() === sourceFile) {
                            // pushStatementIntoActionAst(moduleName, <ts.TypeAliasDeclaration>declaration2, sourceFile);
                        }
                        symbol = checker.getSymbolAtLocation(stateNode.typeName);
                        declaration2_1 = symbol.getDeclarations()[0];
                        if (declaration2_1.getSourceFile() === sourceFile) {
                            // 检查state的定义合法
                            (0, assert_1.default)(ts.isTypeAliasDeclaration(declaration2_1) && ts.isUnionTypeNode(declaration2_1.type), "\u300C".concat(filename, "\u300DState\u300C").concat(declaration2_1.name, "\u300D\u7684\u5B9A\u4E49\u53EA\u80FD\u662F\u6216\u7ED3\u70B9"));
                            declaration2_1.type.types.forEach(function (type) {
                                (0, assert_1.default)(ts.isLiteralTypeNode(type) && ts.isStringLiteral(type.literal), "\u300C".concat(filename, "\u300DState\u300C").concat(declaration2_1.name, "\u300D\u7684\u5B9A\u4E49\u53EA\u80FD\u662F\u5B57\u7B26\u4E32"));
                                (0, assert_1.default)(type.literal.text.length < env_1.STRING_LITERAL_MAX_LENGTH, "\u300C".concat(filename, "\u300DState\u300C").concat(type.literal.text, "\u300D\u7684\u957F\u5EA6\u5927\u4E8E\u300C").concat(env_1.STRING_LITERAL_MAX_LENGTH, "\u300D"));
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
                    var adName = declaration.name.text.slice(0, declaration.name.text.length - 9);
                    var attr = adName.concat('State');
                    schemaAttrs.push(factory.createPropertySignature(undefined, factory.createIdentifier((0, string_1.firstLetterLowerCase)(attr)), factory.createToken(ts.SyntaxKind.QuestionToken), factory.createTypeReferenceNode(factory.createIdentifier(attr))));
                    states.push((0, string_1.firstLetterLowerCase)(attr));
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
                    var indexNameDict_1 = {};
                    (0, assert_1.default)(ts.isArrayLiteralExpression(declaration.initializer), "\u300C".concat(filename, "\u300DIndex\u300C").concat(declaration.name.getText(), "\u300D\u7684\u5B9A\u4E49\u5FC5\u987B\u7B26\u5408\u89C4\u8303"));
                    // todo 这里应该先做一个类型检查的，但不知道怎么写  by Xc
                    // 检查索引的属性是否合法
                    var elements = declaration.initializer.elements;
                    elements.forEach(function (ele) {
                        var _a;
                        var isFulltextIndex = false;
                        (0, assert_1.default)(ts.isObjectLiteralExpression(ele));
                        var properties = ele.properties;
                        var attrProperty = properties.find(function (ele2) {
                            (0, assert_1.default)(ts.isPropertyAssignment(ele2));
                            return ele2.name.getText() === 'attributes';
                        });
                        (0, assert_1.default)(ts.isArrayLiteralExpression(attrProperty.initializer));
                        var nameProperty = properties.find(function (ele2) {
                            (0, assert_1.default)(ts.isPropertyAssignment(ele2));
                            return ele2.name.getText() === 'name';
                        });
                        (0, assert_1.default)(ts.isStringLiteral(nameProperty.initializer));
                        var indexName = nameProperty.initializer.text;
                        if (indexNameDict_1[indexName]) {
                            throw new Error("\u300C".concat(filename, "\u300D\u7D22\u5F15\u5B9A\u4E49\u91CD\u540D\u300C").concat(indexName, "\u300D"));
                        }
                        (0, lodash_1.assign)(indexNameDict_1, (_a = {},
                            _a[indexName] = true,
                            _a));
                        var configProperty = properties.find(function (ele2) {
                            (0, assert_1.default)(ts.isPropertyAssignment(ele2));
                            return ele2.name.getText() === 'config';
                        });
                        if (configProperty) {
                            (0, assert_1.default)(ts.isObjectLiteralExpression(configProperty.initializer));
                            var properties2 = configProperty.initializer.properties;
                            var typeProperty = properties2.find(function (ele2) {
                                (0, assert_1.default)(ts.isPropertyAssignment(ele2));
                                return ele2.name.getText() === 'type';
                            });
                            if (typeProperty && typeProperty.initializer.text === 'fulltext') {
                                // 定义了全文索引
                                if (hasFulltextIndex) {
                                    throw new Error("\u300C".concat(filename, "\u300D\u53EA\u80FD\u5B9A\u4E49\u4E00\u4E2A\u5168\u6587\u7D22\u5F15"));
                                }
                                hasFulltextIndex = true;
                                isFulltextIndex = true;
                            }
                        }
                        var elements = attrProperty.initializer.elements;
                        // 每个属性都应该在schema中有值，且对象类型是可索引值
                        elements.forEach(function (ele2) {
                            (0, assert_1.default)(ts.isObjectLiteralExpression(ele2));
                            var properties2 = ele2.properties;
                            var nameProperty = properties2.find(function (ele3) {
                                (0, assert_1.default)(ts.isPropertyAssignment(ele3));
                                return ele3.name.getText() === 'name';
                            });
                            var indexAttrName = nameProperty.initializer.text;
                            if (!Entity_1.initinctiveAttributes.includes(indexAttrName)) {
                                var schemaNode = schemaAttrs.find(function (ele3) {
                                    (0, assert_1.default)(ts.isPropertySignature(ele3));
                                    return ele3.name.text === indexAttrName;
                                });
                                if (!schemaNode) {
                                    throw new Error("\u300C".concat(filename, "\u300D\u4E2D\u7D22\u5F15\u300C").concat(indexName, "\u300D\u7684\u5C5E\u6027\u300C").concat(indexAttrName, "\u300D\u5B9A\u4E49\u975E\u6CD5"));
                                }
                                var type = schemaNode.type, name_1 = schemaNode.name;
                                var entity = (0, string_1.firstLetterLowerCase)(moduleName);
                                var _a = ManyToOne, _b = entity, manyToOneSet = _a[_b];
                                if (ts.isTypeReferenceNode(type)) {
                                    var typeName = type.typeName;
                                    if (ts.isIdentifier(typeName)) {
                                        var text = typeName.text;
                                        var text2_1 = text === 'Schema' ? entity : text;
                                        var manyToOneItem = manyToOneSet && manyToOneSet.find(function (_a) {
                                            var _b = tslib_1.__read(_a, 2), refEntity = _b[0], attrName = _b[1];
                                            return refEntity === text2_1 && attrName === name_1.text;
                                        });
                                        if (!manyToOneItem) {
                                            // 如果不是外键，则不能是Text, File 
                                            if (isFulltextIndex) {
                                                (0, assert_1.default)(['Text', 'String'].includes(text2_1), "\u300C".concat(filename, "\u300D\u4E2D\u5168\u6587\u7D22\u5F15\u300C").concat(indexName, "\u300D\u5B9A\u4E49\u7684\u5C5E\u6027\u300C").concat(indexAttrName, "\u300D\u7C7B\u578B\u975E\u6CD5\uFF0C\u53EA\u80FD\u662FText/String"));
                                            }
                                            else {
                                                (0, assert_1.default)(!DataType_1.unIndexedTypes.includes(text2_1), "\u300C".concat(filename, "\u300D\u4E2D\u7D22\u5F15\u300C").concat(indexName, "\u300D\u7684\u5C5E\u6027\u300C").concat(indexAttrName, "\u300D\u7684\u7C7B\u578B\u4E3A\u300C").concat(text2_1, "\u300D\uFF0C\u4E0D\u53EF\u7D22\u5F15"));
                                            }
                                        }
                                        else {
                                            (0, assert_1.default)(!isFulltextIndex, "\u300C".concat(filename, "\u300D\u4E2D\u5168\u6587\u7D22\u5F15\u300C").concat(indexName, "\u300D\u7684\u5C5E\u6027\u300C").concat(indexAttrName, "\u300D\u7C7B\u578B\u975E\u6CD5\uFF0C\u53EA\u80FD\u4E3AText/String"));
                                        }
                                    }
                                    else {
                                        (0, assert_1.default)(false); // 这是什么case，不确定
                                    }
                                }
                                else {
                                    (0, assert_1.default)(!isFulltextIndex, "\u300C".concat(filename, "\u300D\u4E2D\u5168\u6587\u7D22\u5F15\u300C").concat(indexName, "\u300D\u7684\u5C5E\u6027\u300C").concat(indexAttrName, "\u300D\u7C7B\u578B\u53EA\u80FD\u4E3AText/String"));
                                    (0, assert_1.default)(ts.isUnionTypeNode(type) || ts.isLiteralTypeNode(type), "".concat(entity, "\u4E2D\u7D22\u5F15\u300C").concat(indexName, "\u300D\u7684\u5C5E\u6027").concat(name_1.text, "\u6709\u5B9A\u4E49\u975E\u6CD5"));
                                }
                            }
                        });
                    });
                    indexes = declaration.initializer;
                }
                else if (ts.isTypeReferenceNode(declaration.type) && ts.isIdentifier(declaration.type.typeName) && declaration.type.typeName.text === 'LocaleDef') {
                    // locale定义
                    var type = declaration.type, initializer = declaration.initializer;
                    (0, assert_1.default)(ts.isObjectLiteralExpression(initializer));
                    var properties = initializer.properties;
                    (0, assert_1.default)(properties.length > 0, "".concat(filename, "\u81F3\u5C11\u9700\u8981\u6709\u4E00\u79CDlocale\u5B9A\u4E49"));
                    var allEnumStringAttrs = enumStringAttrs.concat(states);
                    var typeArguments = type.typeArguments;
                    (0, assert_1.default)(typeArguments &&
                        ts.isTypeReferenceNode(typeArguments[0])
                        && ts.isIdentifier(typeArguments[0].typeName) && typeArguments[0].typeName.text === 'Schema', "".concat(filename, "\u4E2D\u7F3A\u5C11locale\u5B9A\u4E49\uFF0C\u6216\u8005locale\u7C7B\u578B\u5B9A\u4E49\u7684\u7B2C\u4E00\u4E2A\u53C2\u6570\u4E0D\u662FSchema"));
                    if (hasActionDef) {
                        (0, assert_1.default)(ts.isTypeReferenceNode(typeArguments[1])
                            && ts.isIdentifier(typeArguments[1].typeName) && typeArguments[1].typeName.text === 'Action', "".concat(filename, "\u4E2Dlocale\u7C7B\u578B\u5B9A\u4E49\u7684\u7B2C\u4E8C\u4E2A\u53C2\u6570\u4E0D\u662FAction"));
                        // 检查每种locale定义中都应该有'action'域
                        checkLocaleExpressionPropertyExists(initializer, 'action', true, filename);
                    }
                    else {
                        (0, assert_1.default)(ts.isLiteralTypeNode(typeArguments[1])
                            && ts.isStringLiteral(typeArguments[1].literal), "".concat(filename, "\u4E2Dlocale\u7C7B\u578B\u5B9A\u4E49\u7684\u7B2C\u4E8C\u4E2A\u53C2\u6570\u4E0D\u662F\u5B57\u7B26\u4E32"));
                        checkLocaleExpressionPropertyExists(initializer, 'action', false, filename);
                    }
                    if (hasRelationDef) {
                        (0, assert_1.default)(ts.isTypeReferenceNode(typeArguments[2])
                            && ts.isIdentifier(typeArguments[2].typeName)
                            && typeArguments[2].typeName.text === 'Relation', "".concat(filename, "\u4E2D\u7684locale\u7C7B\u578B\u5B9A\u4E49\u7684\u7B2C\u4E09\u4E2A\u53C2\u6570\u4E0D\u662FRelation"));
                        // 检查每种locale定义中都应该有'r'域
                        checkLocaleExpressionPropertyExists(initializer, 'r', true, filename);
                    }
                    else {
                        (0, assert_1.default)(ts.isLiteralTypeNode(typeArguments[2])
                            && ts.isStringLiteral(typeArguments[2].literal), "".concat(filename, "\u4E2Dlocale\u7C7B\u578B\u5B9A\u4E49\u7684\u7B2C\u4E09\u4E2A\u53C2\u6570\u4E0D\u662F\u7A7A\u5B57\u7B26\u4E32"));
                        checkLocaleExpressionPropertyExists(initializer, 'r', false, filename);
                    }
                    if (allEnumStringAttrs.length > 0) {
                        (0, assert_1.default)(ts.isTypeLiteralNode(typeArguments[3]), "".concat(filename, "\u4E2D\u7684locale\u7C7B\u578B\u5B9A\u4E49\u7684\u7B2C\u56DB\u4E2A\u53C2\u6570\u4E0D\u662F{}"));
                        checkLocaleEnumAttrs(typeArguments[3], allEnumStringAttrs, filename);
                        // 检查每种locale定义中都应该有'v'域
                        checkLocaleExpressionPropertyExists(initializer, 'v', true, filename);
                    }
                    else {
                        (0, assert_1.default)(ts.isTypeLiteralNode(typeArguments[3]), "".concat(filename, "\u4E2D\u7684locale\u7C7B\u578B\u5B9A\u4E49\u7684\u7B2C\u56DB\u4E2A\u53C2\u6570\u4E0D\u662F{}"));
                        (0, assert_1.default)(typeArguments[3].members.length == 0, "".concat(filename, "\u4E2Dlocale\u7C7B\u578B\u5B9A\u4E49\u7684\u7B2C\u56DB\u4E2A\u53C2\u6570\u4E0D\u5E94\u5B58\u5728\u76F8\u5E94\u7684v\u5B9A\u4E49"));
                        // 检查每种locale定义中都应该有'v'域
                        checkLocaleExpressionPropertyExists(initializer, 'v', false, filename);
                    }
                    localeDef = initializer;
                }
                else if (ts.isTypeReferenceNode(declaration.type) && ts.isIdentifier(declaration.type.typeName) && declaration.type.typeName.text === 'Configuration') {
                    (0, assert_1.default)(!hasActionDef, "".concat(moduleName, "\u4E2D\u7684Configuration\u5B9A\u4E49\u5728Action\u4E4B\u540E"));
                    (0, assert_1.default)(ts.isObjectLiteralExpression(declaration.initializer));
                    var properties = declaration.initializer.properties;
                    var atProperty = properties.find(function (ele) { return ts.isPropertyAssignment(ele) && ts.isIdentifier(ele.name) && ele.name.text === 'actionType'; });
                    var staticProperty = properties.find(function (ele) { return ts.isPropertyAssignment(ele) && ts.isIdentifier(ele.name) && ele.name.text === 'static'; });
                    if (atProperty) {
                        actionType = atProperty.initializer.text;
                    }
                    if (staticProperty) {
                        _static = true; // static如果有值只能为true
                    }
                }
                else {
                    throw new Error("".concat(moduleName, "\uFF1A\u4E0D\u80FD\u7406\u89E3\u7684\u5B9A\u4E49\u5185\u5BB9").concat(declaration.name.getText()));
                }
            });
        }
    });
    if (!hasActionDef && hasActionOrStateDef) {
        throw new Error("".concat(filename, "\u4E2D\u6709Action\u6216State\u5B9A\u4E49\uFF0C\u4F46\u6CA1\u6709\u5B9A\u4E49\u5B8C\u6574\u7684Action\u7C7B\u578B"));
    }
    if (hasActionDef && actionType !== 'crud') {
        throw new Error("".concat(filename, "\u4E2D\u6709Action\u5B9A\u4E49\uFF0C\u4F46\u5374\u5B9A\u4E49\u4E86actionType\u4E0D\u662Fcrud"));
    }
    (0, assert_1.default)(schemaAttrs.length > 0, "\u5BF9\u8C61".concat(moduleName, "\u6CA1\u6709\u4EFB\u4F55\u5C5E\u6027\u5B9A\u4E49"));
    var schema = {
        schemaAttrs: schemaAttrs,
        sourceFile: sourceFile,
        toModi: toModi,
        actionType: actionType,
        static: _static,
        hasRelationDef: hasRelationDef,
        enumStringAttrs: enumStringAttrs.concat(states),
        additionalImports: additionalImports,
    };
    if (hasFulltextIndex) {
        (0, lodash_1.assign)(schema, {
            fulltextIndex: true,
        });
    }
    if (indexes) {
        (0, lodash_1.assign)(schema, {
            indexes: indexes,
        });
    }
    if (!localeDef) {
        throw new Error("".concat(filename, "\u4E2D\u7F3A\u5C11\u4E86locale\u5B9A\u4E49"));
    }
    else {
        (0, lodash_1.assign)(schema, {
            locale: localeDef,
        });
    }
    (0, lodash_1.assign)(Schema, (_a = {},
        _a[moduleName] = schema,
        _a));
}
/**
 * 生成Schema
 * @param statements
 * @param schemaAttrs
 * @param entity
 */
function constructSchema(statements, entity) {
    var e_1, _a, e_2, _b;
    var schemaAttrs = Schema[entity].schemaAttrs;
    var members = [
        // id: String<64>
        factory.createPropertySignature(undefined, factory.createIdentifier('id'), undefined, factory.createTypeReferenceNode(factory.createIdentifier('PrimaryKey'))),
        // $$createAt$$: Datetime
        factory.createPropertySignature(undefined, factory.createIdentifier('$$createAt$$'), undefined, factory.createTypeReferenceNode(factory.createIdentifier('Datetime'))),
        // $$updateAt$$: Datetime
        factory.createPropertySignature(undefined, factory.createIdentifier('$$updateAt$$'), undefined, factory.createTypeReferenceNode(factory.createIdentifier('Datetime'))),
        // $$updateAt$$: Datetime
        factory.createPropertySignature(undefined, factory.createIdentifier('$$deleteAt$$'), factory.createToken(ts.SyntaxKind.QuestionToken), factory.createUnionTypeNode([
            factory.createTypeReferenceNode(factory.createIdentifier('Datetime')),
            factory.createLiteralTypeNode(factory.createNull())
        ]))
    ];
    var members2 = [];
    var _c = ManyToOne, _d = entity, manyToOneSet = _c[_d];
    var _e = OneToMany, _f = entity, oneToManySet = _e[_f];
    var referenceEntities = [];
    var _loop_1 = function (attr) {
        var type = attr.type, name_2 = attr.name, questionToken = attr.questionToken;
        var attrName = name_2.text;
        if (ts.isTypeReferenceNode(type)) {
            var typeName = type.typeName;
            if (ts.isIdentifier(typeName)) {
                var text = typeName.text;
                var text2_2 = text === 'Schema' ? entity : text;
                var manyToOneItem = manyToOneSet && manyToOneSet.find(function (_a) {
                    var _b = tslib_1.__read(_a, 2), refEntity = _b[0], attrName = _b[1];
                    return refEntity === text2_2 && attrName === attrName;
                });
                if (manyToOneItem) {
                    referenceEntities.push(text2_2);
                    members2.push(factory.createPropertySignature(undefined, name_2, questionToken, questionToken ? factory.createUnionTypeNode([
                        factory.createTypeReferenceNode(createForeignRef(entity, text2_2, 'Schema')),
                        factory.createLiteralTypeNode(factory.createNull())
                    ]) : factory.createTypeReferenceNode(createForeignRef(entity, text2_2, 'Schema'))));
                    var foreignKey = "".concat(attrName, "Id");
                    members.push(factory.createPropertySignature(undefined, factory.createIdentifier(foreignKey), questionToken, questionToken ? factory.createUnionTypeNode([
                        factory.createTypeReferenceNode(factory.createIdentifier('ForeignKey'), [
                            factory.createLiteralTypeNode(factory.createStringLiteral((0, string_1.firstLetterLowerCase)(text2_2)))
                        ]),
                        factory.createLiteralTypeNode(factory.createNull())
                    ]) : factory.createTypeReferenceNode(factory.createIdentifier('ForeignKey'), [
                        factory.createLiteralTypeNode(factory.createStringLiteral((0, string_1.firstLetterLowerCase)(text2_2)))
                    ])));
                }
                else {
                    // assert(types.includes(text), `${entity}中的属性${name.toString()}有非法的属性类型定义`);
                    // 处理entity这种特殊情况
                    if (ReversePointerRelations[entity] && attrName === 'entity') {
                        var entityUnionTypeNode = ReversePointerRelations[entity].map(function (ele) { return factory.createLiteralTypeNode(factory.createStringLiteral((0, string_1.firstLetterLowerCase)(ele))); });
                        if (process.env.COMPLING_AS_LIB) {
                            // 如果是建立 base-domain，还要容纳可能的其它对象引用
                            entityUnionTypeNode.push(factory.createKeywordTypeNode(ts.SyntaxKind.StringKeyword));
                        }
                        members.push(factory.createPropertySignature(undefined, name_2, questionToken, questionToken ? factory.createUnionTypeNode([
                            factory.createUnionTypeNode(entityUnionTypeNode),
                            factory.createLiteralTypeNode(factory.createNull())
                        ]) : factory.createUnionTypeNode(entityUnionTypeNode)));
                    }
                    else {
                        members.push(factory.createPropertySignature(undefined, name_2, questionToken, questionToken ? factory.createUnionTypeNode([
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
            (0, assert_1.default)(ts.isUnionTypeNode(type) || ts.isLiteralTypeNode(type), "".concat(entity, "\u6709\u975E\u6CD5\u7684\u5C5E\u6027\u7C7B\u578B\u5B9A\u4E49").concat(name_2.text));
            members.push(factory.createPropertySignature(undefined, name_2, questionToken, questionToken ? factory.createUnionTypeNode([
                type,
                factory.createLiteralTypeNode(factory.createNull())
            ]) : type));
        }
    };
    try {
        for (var schemaAttrs_1 = tslib_1.__values(schemaAttrs), schemaAttrs_1_1 = schemaAttrs_1.next(); !schemaAttrs_1_1.done; schemaAttrs_1_1 = schemaAttrs_1.next()) {
            var attr = schemaAttrs_1_1.value;
            _loop_1(attr);
        }
    }
    catch (e_1_1) { e_1 = { error: e_1_1 }; }
    finally {
        try {
            if (schemaAttrs_1_1 && !schemaAttrs_1_1.done && (_a = schemaAttrs_1.return)) _a.call(schemaAttrs_1);
        }
        finally { if (e_1) throw e_1.error; }
    }
    // 处理reverserPointer
    var reverseOnes = ReversePointerRelations[entity];
    if (reverseOnes) {
        reverseOnes.forEach(function (one) {
            referenceEntities.push(one);
            members2.push(factory.createPropertySignature(undefined, (0, string_1.firstLetterLowerCase)(one), factory.createToken(ts.SyntaxKind.QuestionToken), factory.createTypeReferenceNode(createForeignRef(entity, one, 'Schema'))));
        });
    }
    var foreignKeySet = {};
    if (oneToManySet) {
        try {
            for (var oneToManySet_1 = tslib_1.__values(oneToManySet), oneToManySet_1_1 = oneToManySet_1.next(); !oneToManySet_1_1.done; oneToManySet_1_1 = oneToManySet_1.next()) {
                var oneToManyItem = oneToManySet_1_1.value;
                var _g = tslib_1.__read(oneToManyItem, 2), entityName = _g[0], foreignKey = _g[1];
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
        }
        catch (e_2_1) { e_2 = { error: e_2_1 }; }
        finally {
            try {
                if (oneToManySet_1_1 && !oneToManySet_1_1.done && (_b = oneToManySet_1.return)) _b.call(oneToManySet_1);
            }
            finally { if (e_2) throw e_2.error; }
        }
        var _loop_2 = function (entityName) {
            var entityNameLc = (0, string_1.firstLetterLowerCase)(entityName);
            foreignKeySet[entityName].forEach(function (foreignKey) {
                var identifier = "".concat(entityNameLc, "$").concat(foreignKey);
                members2.push(factory.createPropertySignature(undefined, identifier, factory.createToken(ts.SyntaxKind.QuestionToken), factory.createTypeReferenceNode(factory.createIdentifier("Array"), [factory.createTypeReferenceNode(createForeignRef(entity, entityName, 'Schema'), undefined)])));
            });
        };
        for (var entityName in foreignKeySet) {
            _loop_2(entityName);
        }
    }
    (0, lodash_1.uniq)(referenceEntities).forEach(function (ele) {
        if (ele !== entity) {
            statements.push(factory.createImportDeclaration(undefined, undefined, factory.createImportClause(false, undefined, factory.createNamespaceImport(factory.createIdentifier(ele))), factory.createStringLiteral("../".concat(ele, "/Schema"))));
        }
    });
    // 在这里把需要直接拷贝过来的语句写入
    if (SchemaAsts[entity]) {
        statements.push.apply(statements, tslib_1.__spreadArray([], tslib_1.__read(SchemaAsts[entity].statements), false));
    }
    statements.push(factory.createTypeAliasDeclaration(undefined, [
        factory.createModifier(ts.SyntaxKind.ExportKeyword)
    ], factory.createIdentifier('OpSchema'), undefined, factory.createTypeLiteralNode(members)), factory.createTypeAliasDeclaration(undefined, [factory.createModifier(ts.SyntaxKind.ExportKeyword)], factory.createIdentifier("OpAttr"), undefined, factory.createTypeOperatorNode(ts.SyntaxKind.KeyOfKeyword, factory.createTypeReferenceNode(factory.createIdentifier("OpSchema"), undefined))));
    statements.push(factory.createTypeAliasDeclaration(undefined, [
        factory.createModifier(ts.SyntaxKind.ExportKeyword)
    ], factory.createIdentifier('Schema'), undefined, factory.createIntersectionTypeNode([
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
    var e_3, _a;
    var _b = Schema[entity], schemaAttrs = _b.schemaAttrs, fulltextIndex = _b.fulltextIndex;
    var members = [
        // id: Q_StringValue
        factory.createPropertySignature(undefined, factory.createIdentifier('id'), undefined, factory.createUnionTypeNode([
            factory.createTypeReferenceNode(factory.createIdentifier('Q_StringValue')),
            factory.createTypeReferenceNode(factory.createQualifiedName(factory.createIdentifier("SubQuery"), factory.createIdentifier("".concat(entity, "IdSubQuery"))))
        ])),
        // $$createAt$$: Q_DateValue
        factory.createPropertySignature(undefined, factory.createIdentifier('$$createAt$$'), undefined, factory.createTypeReferenceNode(factory.createIdentifier('Q_DateValue'))),
        // $$updateAt$$: Q_DateValue
        factory.createPropertySignature(undefined, factory.createIdentifier('$$updateAt$$'), undefined, factory.createTypeReferenceNode(factory.createIdentifier('Q_DateValue')))
    ];
    var _c = ManyToOne, _d = entity, manyToOneSet = _c[_d];
    var _loop_3 = function (attr) {
        var _e = attr, type = _e.type, name_3 = _e.name;
        var attrName = name_3.text;
        if (ts.isTypeReferenceNode(type)) {
            var typeName = type.typeName;
            if (ts.isIdentifier(typeName)) {
                var text = typeName.text;
                var type2 = void 0;
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
                        var text2_3 = text === 'Schema' ? entity : text;
                        var manyToOneItem = manyToOneSet && manyToOneSet.find(function (_a) {
                            var _b = tslib_1.__read(_a, 1), refEntity = _b[0];
                            return refEntity === text2_3;
                        });
                        if (manyToOneItem) {
                            // 外键可能落到相应的子查询中
                            members.push(factory.createPropertySignature(undefined, "".concat(name_3.text, "Id"), undefined, factory.createUnionTypeNode([
                                factory.createTypeReferenceNode(factory.createIdentifier('Q_StringValue')),
                                factory.createTypeReferenceNode(factory.createQualifiedName(factory.createIdentifier("SubQuery"), factory.createIdentifier("".concat(text2_3, "IdSubQuery"))), undefined)
                            ])));
                            type2 = factory.createTypeReferenceNode(createForeignRef(entity, text2_3, 'Filter'));
                        }
                        else {
                            // 这里应该都是引用某个UnionType类型的定义了，如何判断？
                            // const words = getStringTextFromUnionStringLiterals();
                            type2 = factory.createTypeReferenceNode(factory.createIdentifier('Q_EnumValue'), [
                                factory.createTypeReferenceNode(factory.createIdentifier(text), undefined)
                            ]);
                        }
                    }
                }
                if (type2) {
                    members.push(factory.createPropertySignature(undefined, name_3, undefined, type2));
                }
            }
        }
        else if (ts.isUnionTypeNode(type) && ts.isLiteralTypeNode(type.types[0]) || ts.isLiteralTypeNode(type)) {
            members.push(factory.createPropertySignature(undefined, name_3, undefined, factory.createTypeReferenceNode(factory.createIdentifier('Q_EnumValue'), [
                type
            ])));
        }
        else {
            // 此时应当是引用本地定义的shape
        }
    };
    try {
        for (var schemaAttrs_2 = tslib_1.__values(schemaAttrs), schemaAttrs_2_1 = schemaAttrs_2.next(); !schemaAttrs_2_1.done; schemaAttrs_2_1 = schemaAttrs_2.next()) {
            var attr = schemaAttrs_2_1.value;
            _loop_3(attr);
        }
    }
    catch (e_3_1) { e_3 = { error: e_3_1 }; }
    finally {
        try {
            if (schemaAttrs_2_1 && !schemaAttrs_2_1.done && (_a = schemaAttrs_2.return)) _a.call(schemaAttrs_2);
        }
        finally { if (e_3) throw e_3.error; }
    }
    // type AttrFilter = {};
    if (ReversePointerRelations[entity]) {
        // 有反向指针，将反向指针关联的对象的Filter也注入
        ReversePointerRelations[entity].forEach(function (ele) {
            return members.push(factory.createPropertySignature(undefined, (0, string_1.firstLetterLowerCase)(ele), undefined, factory.createTypeReferenceNode(createForeignRef(entity, ele, 'Filter'))));
        });
    }
    var eumUnionTypeNode = ReversePointerRelations[entity] && ReversePointerRelations[entity].map(function (ele) { return factory.createLiteralTypeNode(factory.createStringLiteral((0, string_1.firstLetterLowerCase)(ele))); });
    if (process.env.COMPLING_AS_LIB) {
        eumUnionTypeNode && eumUnionTypeNode.push(factory.createKeywordTypeNode(ts.SyntaxKind.StringKeyword));
    }
    statements.push(factory.createTypeAliasDeclaration(undefined, undefined, factory.createIdentifier('AttrFilter'), ReversePointerRelations[entity] ? [
        factory.createTypeParameterDeclaration(undefined, factory.createIdentifier("E"), undefined)
    ] : undefined, factory.createTypeLiteralNode(members)));
    /**
     *
    export type Filter = AttrFilter | Partial<ExprOp<OpSchema> | {
            [F in Q_LogicKey]: Filter[];
        } | {
            [F in Q_FullTextKey]: Q_FullTextValue;
        }>;

     */
    var types = [
        factory.createTypeReferenceNode(factory.createIdentifier("AttrFilter"), ReversePointerRelations[entity] ? [factory.createTypeReferenceNode('E')] : undefined),
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
    statements.push(factory.createTypeAliasDeclaration(undefined, [factory.createModifier(ts.SyntaxKind.ExportKeyword)], factory.createIdentifier("Filter"), ReversePointerRelations[entity] ? [
        factory.createTypeParameterDeclaration(undefined, factory.createIdentifier("E"), undefined, factory.createTypeReferenceNode(factory.createIdentifier("Q_EnumValue"), [
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
    var _a, e_4, _b, e_5, _c;
    var schemaAttrs = Schema[entity].schemaAttrs;
    var properties = [
        ['id', true],
        ['$$createAt$$', false],
        ['$$updateAt$$', false],
    ];
    var foreignKeyProperties = (_a = {},
        _a[entity] = [''],
        _a);
    var _d = ManyToOne, _e = entity, manyToOneSet = _d[_e];
    var _loop_4 = function (attr) {
        var _j;
        var _k = attr, type = _k.type, name_4 = _k.name;
        var attrName = name_4.text;
        if (ts.isTypeReferenceNode(type)) {
            var typeName = type.typeName;
            if (ts.isIdentifier(typeName)) {
                var text = typeName.text;
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
                        properties.push([name_4, false]);
                        break;
                    }
                    default: {
                        var text2_4 = text === 'Schema' ? entity : text;
                        var manyToOneItem = manyToOneSet && manyToOneSet.find(function (_a) {
                            var _b = tslib_1.__read(_a, 1), refEntity = _b[0];
                            return refEntity === text2_4;
                        });
                        if (manyToOneItem) {
                            // 外键投影
                            properties.push(["".concat(attrName, "Id"), false, undefined], [name_4, false, factory.createTypeReferenceNode(createForeignRef(entity, text2_4, 'Projection')), factory.createTypeReferenceNode(createForeignRef(entity, text2_4, 'ExportProjection'))]);
                            if (foreignKeyProperties.hasOwnProperty(text2_4)) {
                                foreignKeyProperties[text2_4].push(attrName);
                            }
                            else {
                                (0, lodash_1.assign)(foreignKeyProperties, (_j = {},
                                    _j[text2_4] = [attrName],
                                    _j));
                            }
                        }
                        else {
                            // todo 此处是对State的专门处理
                            if (text.endsWith('State')) {
                                properties.push([name_4, false, undefined]);
                            }
                            else {
                                // 引用的shape
                                properties.push([name_4, false, undefined]);
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
            properties.push([name_4, false, undefined]);
        }
    };
    try {
        for (var schemaAttrs_3 = tslib_1.__values(schemaAttrs), schemaAttrs_3_1 = schemaAttrs_3.next(); !schemaAttrs_3_1.done; schemaAttrs_3_1 = schemaAttrs_3.next()) {
            var attr = schemaAttrs_3_1.value;
            _loop_4(attr);
        }
    }
    catch (e_4_1) { e_4 = { error: e_4_1 }; }
    finally {
        try {
            if (schemaAttrs_3_1 && !schemaAttrs_3_1.done && (_b = schemaAttrs_3.return)) _b.call(schemaAttrs_3);
        }
        finally { if (e_4) throw e_4.error; }
    }
    if (ReversePointerRelations[entity]) {
        ReversePointerRelations[entity].forEach(function (one) {
            var _a;
            var text2 = one === 'Schema' ? entity : one;
            properties.push([(0, string_1.firstLetterLowerCase)(one), false, factory.createTypeReferenceNode(createForeignRef(entity, one, 'Projection')), factory.createTypeReferenceNode(createForeignRef(entity, one, 'ExportProjection'))]);
            if (foreignKeyProperties.hasOwnProperty(one)) {
                foreignKeyProperties[text2].push('entity');
            }
            else {
                (0, lodash_1.assign)(foreignKeyProperties, (_a = {},
                    _a[text2] = ['entity'],
                    _a));
            }
        });
    }
    // 一对多的projection
    var _f = OneToMany, _g = entity, oneToManySet = _f[_g];
    if (oneToManySet) {
        var foreignKeySet = {};
        try {
            for (var oneToManySet_2 = tslib_1.__values(oneToManySet), oneToManySet_2_1 = oneToManySet_2.next(); !oneToManySet_2_1.done; oneToManySet_2_1 = oneToManySet_2.next()) {
                var oneToManyItem = oneToManySet_2_1.value;
                var _h = tslib_1.__read(oneToManyItem, 2), entityName = _h[0], foreignKey = _h[1];
                if (foreignKeySet.hasOwnProperty(entityName)) {
                    foreignKeySet[entityName].push(foreignKey);
                }
                else {
                    foreignKeySet[entityName] = [foreignKey];
                }
            }
        }
        catch (e_5_1) { e_5 = { error: e_5_1 }; }
        finally {
            try {
                if (oneToManySet_2_1 && !oneToManySet_2_1.done && (_c = oneToManySet_2.return)) _c.call(oneToManySet_2);
            }
            finally { if (e_5) throw e_5.error; }
        }
        var _loop_5 = function (entityName) {
            var entityNameLc = (0, string_1.firstLetterLowerCase)(entityName);
            foreignKeySet[entityName].forEach(function (foreignKey) {
                var identifier = "".concat(entityNameLc, "$").concat(foreignKey);
                properties.push([identifier, false,
                    factory.createIntersectionTypeNode([
                        factory.createTypeReferenceNode(createForeignRef(entity, entityName, 'Selection'), undefined),
                        factory.createTypeLiteralNode([
                            factory.createPropertySignature(undefined, factory.createIdentifier("$entity"), undefined, factory.createLiteralTypeNode(factory.createStringLiteral((0, string_1.firstLetterLowerCase)(entityName))))
                        ])
                    ]),
                    factory.createIntersectionTypeNode([
                        factory.createTypeReferenceNode(createForeignRef(entity, entityName, 'Exportation'), undefined),
                        factory.createTypeLiteralNode([
                            factory.createPropertySignature(undefined, factory.createIdentifier("$entity"), undefined, factory.createLiteralTypeNode(factory.createStringLiteral((0, string_1.firstLetterLowerCase)(entityName))))
                        ])
                    ])
                ]);
            });
        };
        for (var entityName in foreignKeySet) {
            _loop_5(entityName);
        }
    }
    var exprNode = factory.createTypeReferenceNode(factory.createIdentifier("Partial"), [
        factory.createTypeReferenceNode(factory.createIdentifier("ExprOp"), [
            process.env.COMPLING_AS_LIB ?
                factory.createUnionTypeNode([
                    factory.createTypeReferenceNode(factory.createIdentifier('OpAttr')),
                    factory.createKeywordTypeNode(ts.SyntaxKind.StringKeyword)
                ]) :
                factory.createTypeReferenceNode(factory.createIdentifier('OpAttr'))
        ])
    ]);
    var MetaPropertySignaturs = [
        factory.createPropertySignature(undefined, factory.createStringLiteral("#id"), factory.createToken(ts.SyntaxKind.QuestionToken), factory.createTypeReferenceNode('NodeId'))
    ];
    if (process.env.COMPLING_AS_LIB) {
        MetaPropertySignaturs.push(factory.createIndexSignature(undefined, undefined, [factory.createParameterDeclaration(undefined, undefined, undefined, factory.createIdentifier("k"), undefined, factory.createKeywordTypeNode(ts.SyntaxKind.StringKeyword), undefined)], factory.createKeywordTypeNode(ts.SyntaxKind.AnyKeyword)));
    }
    // Projection，正常查询的投影
    statements.push(factory.createTypeAliasDeclaration(undefined, [factory.createModifier(ts.SyntaxKind.ExportKeyword)], factory.createIdentifier("Projection"), undefined, factory.createIntersectionTypeNode([
        factory.createTypeLiteralNode(MetaPropertySignaturs.concat(properties.map(function (_a) {
            var _b = tslib_1.__read(_a, 3), n = _b[0], q = _b[1], v = _b[2];
            return factory.createPropertySignature(undefined, n, q ? undefined : factory.createToken(ts.SyntaxKind.QuestionToken), v || factory.createLiteralTypeNode(factory.createNumericLiteral("1")));
        }))),
        exprNode,
    ])));
    // ExportProjection，下载查询的投影
    statements.push(factory.createTypeAliasDeclaration(undefined, [factory.createModifier(ts.SyntaxKind.ExportKeyword)], factory.createIdentifier("ExportProjection"), undefined, factory.createIntersectionTypeNode([
        factory.createTypeLiteralNode(MetaPropertySignaturs.concat(properties.map(function (_a) {
            var _b = tslib_1.__read(_a, 4), n = _b[0], q = _b[1], v = _b[2], v2 = _b[3];
            return factory.createPropertySignature(undefined, n, factory.createToken(ts.SyntaxKind.QuestionToken), v2 || factory.createKeywordTypeNode(ts.SyntaxKind.StringKeyword));
        }))),
        exprNode,
    ])));
    // ${Entity}Projection，外键查询的专用投影
    for (var foreignKey in foreignKeyProperties) {
        var identifier = "".concat(foreignKey, "IdProjection");
        statements.push(factory.createTypeAliasDeclaration(undefined, undefined, factory.createIdentifier(identifier), undefined, factory.createTypeReferenceNode(factory.createIdentifier("OneOf"), [
            factory.createTypeLiteralNode(foreignKeyProperties[foreignKey].map(function (attr) { return factory.createPropertySignature(undefined, attr ? factory.createIdentifier("".concat(attr, "Id")) : 'id', undefined, factory.createLiteralTypeNode(factory.createNumericLiteral("1"))); }))
        ])));
    }
}
/**
 * 构造Query
 * @param statements
 * @param entity
 */
function constructQuery(statements, entity) {
    var entityLc = (0, string_1.firstLetterLowerCase)(entity);
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
    var _a = ManyToOne, _b = entity, manyToOneSet = _a[_b];
    var manyToSelf = false;
    if (manyToOneSet) {
        (0, lodash_1.uniqBy)(manyToOneSet, function (_a) {
            var _b = tslib_1.__read(_a, 1), a = _b[0];
            return a;
        }).forEach(function (_a) {
            var _b = tslib_1.__read(_a, 2), oneEntity = _b[0], foreignKey = _b[1];
            statements.push(factory.createTypeAliasDeclaration(undefined, [factory.createModifier(ts.SyntaxKind.ExportKeyword)], factory.createIdentifier("".concat(oneEntity, "IdSubQuery")), undefined, factory.createTypeReferenceNode(factory.createIdentifier("Selection"), [factory.createTypeReferenceNode(factory.createIdentifier("".concat(oneEntity, "IdProjection")), undefined)])));
            if (oneEntity === entity) {
                manyToSelf = true;
            }
        });
    }
    // 主键可能产生的子查询
    if (!manyToSelf) {
        statements.push(factory.createTypeAliasDeclaration(undefined, [factory.createModifier(ts.SyntaxKind.ExportKeyword)], factory.createIdentifier("".concat(entity, "IdSubQuery")), undefined, factory.createTypeReferenceNode(factory.createIdentifier("Selection"), [factory.createTypeReferenceNode(factory.createIdentifier("".concat(entity, "IdProjection")), undefined)])));
    }
}
/**
 * 构造Sort
 * @param statements
 * @param entity
 */
function constructSorter(statements, entity) {
    var e_6, _a;
    var schemaAttrs = Schema[entity].schemaAttrs;
    var members = [
        // id: 1
        factory.createTypeLiteralNode([factory.createPropertySignature(undefined, factory.createIdentifier("id"), undefined, factory.createLiteralTypeNode(factory.createNumericLiteral("1")))]),
        // $$createAt$$: 1
        factory.createTypeLiteralNode([factory.createPropertySignature(undefined, factory.createIdentifier("$$createAt$$"), undefined, factory.createLiteralTypeNode(factory.createNumericLiteral("1")))]),
        // $$updateAt$$: 1
        factory.createTypeLiteralNode([factory.createPropertySignature(undefined, factory.createIdentifier("$$updateAt$$"), undefined, factory.createLiteralTypeNode(factory.createNumericLiteral("1")))]),
    ];
    var _b = ManyToOne, _c = entity, manyToOneSet = _b[_c];
    var _loop_6 = function (attr) {
        var _d = attr, type = _d.type, name_5 = _d.name, questionToken = _d.questionToken;
        if (ts.isTypeReferenceNode(type)) {
            var typeName = type.typeName;
            if (ts.isIdentifier(typeName)) {
                var text = typeName.text;
                var type2 = void 0;
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
                        var text2_5 = text === 'Schema' ? entity : text;
                        var manyToOneItem = manyToOneSet && manyToOneSet.find(function (_a) {
                            var _b = tslib_1.__read(_a, 1), refEntity = _b[0];
                            return refEntity === text2_5;
                        });
                        if (manyToOneItem) {
                            type2 = factory.createTypeReferenceNode(createForeignRef(entity, text2_5, 'SortAttr'));
                            members.push(factory.createTypeLiteralNode([factory.createPropertySignature(undefined, factory.createIdentifier("".concat(name_5.text, "Id")), undefined, factory.createLiteralTypeNode(factory.createNumericLiteral("1")))]));
                        }
                        else if (!['Object'].includes(text)) {
                            // todo 对State的专门处理
                            type2 = factory.createLiteralTypeNode(factory.createNumericLiteral("1"));
                        }
                    }
                }
                if (type2) {
                    members.push(factory.createTypeLiteralNode([factory.createPropertySignature(undefined, name_5, undefined, type2)]));
                }
            }
        }
        else if (ts.isUnionTypeNode(type) && ts.isLiteralTypeNode(type.types[0]) || ts.isLiteralTypeNode(type)) {
            members.push(factory.createTypeLiteralNode([factory.createPropertySignature(undefined, name_5, undefined, factory.createLiteralTypeNode(factory.createNumericLiteral("1")))]));
        }
        else {
            // 本地规定的shape，非结构化属性不参与排序
        }
    };
    try {
        for (var schemaAttrs_4 = tslib_1.__values(schemaAttrs), schemaAttrs_4_1 = schemaAttrs_4.next(); !schemaAttrs_4_1.done; schemaAttrs_4_1 = schemaAttrs_4.next()) {
            var attr = schemaAttrs_4_1.value;
            _loop_6(attr);
        }
    }
    catch (e_6_1) { e_6 = { error: e_6_1 }; }
    finally {
        try {
            if (schemaAttrs_4_1 && !schemaAttrs_4_1.done && (_a = schemaAttrs_4.return)) _a.call(schemaAttrs_4);
        }
        finally { if (e_6) throw e_6.error; }
    }
    if (ReversePointerRelations[entity]) {
        ReversePointerRelations[entity].forEach(function (one) {
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
    var e_7, _a, e_8, _b;
    var _c = ManyToOne, _d = entity, manyToOneSet = _c[_d];
    var _e = OneToMany, _f = entity, oneToManySet = _e[_f];
    if (manyToOneSet && manyToOneSet.length) {
        var mtoAttrs = [];
        try {
            for (var manyToOneSet_1 = tslib_1.__values(manyToOneSet), manyToOneSet_1_1 = manyToOneSet_1.next(); !manyToOneSet_1_1.done; manyToOneSet_1_1 = manyToOneSet_1.next()) {
                var item = manyToOneSet_1_1.value;
                var _g = tslib_1.__read(item, 2), one = _g[0], key = _g[1];
                if (one === entity) {
                    // 递归引用自身，因为typescript本身不支持递归，因此这里做一个显式的三层递归应该够用了
                    mtoAttrs.push(factory.createTemplateLiteralType(factory.createTemplateHead("".concat(key, "."), "".concat(key, ".")), [factory.createTemplateLiteralTypeSpan(factory.createTypeReferenceNode(factory.createIdentifier("OpAttr"), undefined), factory.createTemplateTail("", ""))]), factory.createTemplateLiteralType(factory.createTemplateHead("".concat(key, ".").concat(key, "."), "".concat(key, ".").concat(key, ".")), [factory.createTemplateLiteralTypeSpan(factory.createTypeReferenceNode(factory.createIdentifier("OpAttr"), undefined), factory.createTemplateTail("", ""))]), factory.createTemplateLiteralType(factory.createTemplateHead("".concat(key, ".").concat(key, ".").concat(key, "."), "".concat(key, ".").concat(key, ".").concat(key, ".")), [factory.createTemplateLiteralTypeSpan(factory.createTypeReferenceNode(factory.createIdentifier("OpAttr"), undefined), factory.createTemplateTail("", ""))]));
                }
                else {
                    mtoAttrs.push(factory.createTemplateLiteralType(factory.createTemplateHead("".concat(key, "."), "".concat(key, ".")), [factory.createTemplateLiteralTypeSpan(factory.createTypeReferenceNode(factory.createQualifiedName(factory.createIdentifier(one), factory.createIdentifier("NativeAttr")), undefined), factory.createTemplateTail("", ""))
                    ]));
                }
            }
        }
        catch (e_7_1) { e_7 = { error: e_7_1 }; }
        finally {
            try {
                if (manyToOneSet_1_1 && !manyToOneSet_1_1.done && (_a = manyToOneSet_1.return)) _a.call(manyToOneSet_1);
            }
            finally { if (e_7) throw e_7.error; }
        }
        statements.push(factory.createTypeAliasDeclaration(undefined, [factory.createModifier(ts.SyntaxKind.ExportKeyword)], factory.createIdentifier("NativeAttr"), undefined, factory.createUnionTypeNode(tslib_1.__spreadArray([
            factory.createTypeReferenceNode(factory.createIdentifier("OpAttr"), undefined)
        ], tslib_1.__read(mtoAttrs), false))));
    }
    else {
        statements.push(factory.createTypeAliasDeclaration(undefined, [factory.createModifier(ts.SyntaxKind.ExportKeyword)], factory.createIdentifier("NativeAttr"), undefined, factory.createTypeReferenceNode(factory.createIdentifier("OpAttr"), undefined)));
    }
    var foreignKeySet = {};
    if (oneToManySet && oneToManySet.length > 0) {
        try {
            for (var oneToManySet_3 = tslib_1.__values(oneToManySet), oneToManySet_3_1 = oneToManySet_3.next(); !oneToManySet_3_1.done; oneToManySet_3_1 = oneToManySet_3.next()) {
                var oneToManyItem = oneToManySet_3_1.value;
                var _h = tslib_1.__read(oneToManyItem, 2), entityName = _h[0], foreignKey = _h[1];
                if (foreignKeySet.hasOwnProperty(entityName)) {
                    foreignKeySet[entityName].push(foreignKey);
                }
                else {
                    foreignKeySet[entityName] = [foreignKey];
                }
            }
        }
        catch (e_8_1) { e_8 = { error: e_8_1 }; }
        finally {
            try {
                if (oneToManySet_3_1 && !oneToManySet_3_1.done && (_b = oneToManySet_3.return)) _b.call(oneToManySet_3);
            }
            finally { if (e_8) throw e_8.error; }
        }
        var otmAttrs_1 = [];
        var _loop_7 = function (entityName) {
            var entityNameLc = (0, string_1.firstLetterLowerCase)(entityName);
            if (foreignKeySet[entityName].length > 1) {
                foreignKeySet[entityName].forEach(function (foreignKey) {
                    var head = "".concat(entityNameLc, "s$").concat(foreignKey);
                    otmAttrs_1.push(factory.createTemplateLiteralType(factory.createTemplateHead("".concat(head, "$"), "".concat(head, "$")), [
                        factory.createTemplateLiteralTypeSpan(factory.createKeywordTypeNode(ts.SyntaxKind.NumberKeyword), factory.createTemplateMiddle(".", ".")),
                        factory.createTemplateLiteralTypeSpan(factory.createTypeReferenceNode(entityName === entity
                            ? factory.createIdentifier("NativeAttr")
                            : factory.createQualifiedName(factory.createIdentifier(entityName), factory.createIdentifier("NativeAttr")), undefined), factory.createTemplateTail("", ""))
                    ]));
                });
            }
            else {
                otmAttrs_1.push(factory.createTemplateLiteralType(factory.createTemplateHead("".concat(entityNameLc, "s$"), "".concat(entityNameLc, "s$")), [
                    factory.createTemplateLiteralTypeSpan(factory.createKeywordTypeNode(ts.SyntaxKind.NumberKeyword), factory.createTemplateMiddle(".", ".")),
                    factory.createTemplateLiteralTypeSpan(factory.createTypeReferenceNode(entityName === entity
                        ? factory.createIdentifier("NativeAttr")
                        : factory.createQualifiedName(factory.createIdentifier(entityName), factory.createIdentifier("NativeAttr")), undefined), factory.createTemplateTail("", ""))
                ]));
            }
        };
        for (var entityName in foreignKeySet) {
            _loop_7(entityName);
        }
        statements.push(factory.createTypeAliasDeclaration(undefined, [factory.createModifier(ts.SyntaxKind.ExportKeyword)], factory.createIdentifier("FullAttr"), undefined, factory.createUnionTypeNode(tslib_1.__spreadArray([
            factory.createTypeReferenceNode(factory.createIdentifier("NativeAttr"), undefined)
        ], tslib_1.__read(otmAttrs_1), false))));
    }
    else {
        statements.push(factory.createTypeAliasDeclaration(undefined, [factory.createModifier(ts.SyntaxKind.ExportKeyword)], factory.createIdentifier("FullAttr"), undefined, factory.createTypeReferenceNode(factory.createIdentifier("NativeAttr"), undefined)));
    }
}
function constructActions(statements, entity) {
    var e_9, _a, e_10, _b, e_11, _c, e_12, _d, e_13, _e, e_14, _f, e_15, _g, e_16, _h, e_17, _j;
    // Selection
    statements.push(factory.createTypeAliasDeclaration(undefined, [factory.createModifier(ts.SyntaxKind.ExportKeyword)], factory.createIdentifier("SelectOperation"), [
        factory.createTypeParameterDeclaration(undefined, factory.createIdentifier("P"), factory.createTypeReferenceNode(factory.createIdentifier("Object"), undefined), factory.createTypeReferenceNode(factory.createIdentifier("Projection"), undefined))
    ], factory.createTypeReferenceNode(factory.createIdentifier("Omit"), [
        factory.createTypeReferenceNode(factory.createIdentifier("OakOperation"), [
            factory.createLiteralTypeNode(factory.createStringLiteral("select")),
            factory.createTypeReferenceNode(factory.createIdentifier("P"), undefined),
            factory.createTypeReferenceNode(factory.createIdentifier("Filter"), undefined),
            factory.createTypeReferenceNode(factory.createIdentifier("Sorter"), undefined)
        ]),
        factory.createLiteralTypeNode(factory.createStringLiteral("id"))
    ])), factory.createTypeAliasDeclaration(undefined, [factory.createModifier(ts.SyntaxKind.ExportKeyword)], factory.createIdentifier("Selection"), [
        factory.createTypeParameterDeclaration(undefined, factory.createIdentifier("P"), factory.createTypeReferenceNode(factory.createIdentifier("Object"), undefined), factory.createTypeReferenceNode(factory.createIdentifier("Projection"), undefined))
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
    var _k = ManyToOne, _l = entity, manyToOneSet = _k[_l];
    var _m = OneToMany, _o = entity, oneToManySet = _m[_o];
    var foreignKeySet = {};
    if (oneToManySet) {
        try {
            for (var oneToManySet_4 = tslib_1.__values(oneToManySet), oneToManySet_4_1 = oneToManySet_4.next(); !oneToManySet_4_1.done; oneToManySet_4_1 = oneToManySet_4.next()) {
                var oneToManyItem = oneToManySet_4_1.value;
                var _p = tslib_1.__read(oneToManyItem, 2), entityName = _p[0], foreignKey = _p[1];
                if (foreignKeySet.hasOwnProperty(entityName)) {
                    foreignKeySet[entityName].push(foreignKey);
                }
                else {
                    foreignKeySet[entityName] = [foreignKey];
                }
            }
        }
        catch (e_9_1) { e_9 = { error: e_9_1 }; }
        finally {
            try {
                if (oneToManySet_4_1 && !oneToManySet_4_1.done && (_a = oneToManySet_4.return)) _a.call(oneToManySet_4);
            }
            finally { if (e_9) throw e_9.error; }
        }
    }
    // CreateOperationData
    var foreignKeyAttr = [];
    if (ReversePointerEntities[entity]) {
        foreignKeyAttr.push('entity', 'entityId');
    }
    if (manyToOneSet) {
        try {
            for (var manyToOneSet_2 = tslib_1.__values(manyToOneSet), manyToOneSet_2_1 = manyToOneSet_2.next(); !manyToOneSet_2_1.done; manyToOneSet_2_1 = manyToOneSet_2.next()) {
                var one = manyToOneSet_2_1.value;
                if (!ReversePointerRelations[entity] || !ReversePointerRelations[entity].includes(one[1])) {
                    foreignKeyAttr.push("".concat(one[1], "Id"));
                }
            }
        }
        catch (e_10_1) { e_10 = { error: e_10_1 }; }
        finally {
            try {
                if (manyToOneSet_2_1 && !manyToOneSet_2_1.done && (_b = manyToOneSet_2.return)) _b.call(manyToOneSet_2);
            }
            finally { if (e_10) throw e_10.error; }
        }
    }
    var adNodes = [
        factory.createTypeReferenceNode(factory.createIdentifier("FormCreateData"), [
            foreignKeyAttr.length > 0
                ? factory.createTypeReferenceNode(factory.createIdentifier("Omit"), [
                    factory.createTypeReferenceNode(factory.createIdentifier("OpSchema"), undefined),
                    factory.createUnionTypeNode((0, lodash_1.uniq)(foreignKeyAttr).map(function (ele) { return factory.createLiteralTypeNode(factory.createStringLiteral(ele)); }))
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
        var upsertOneNodes = [];
        try {
            for (var manyToOneSet_3 = tslib_1.__values(manyToOneSet), manyToOneSet_3_1 = manyToOneSet_3.next(); !manyToOneSet_3_1.done; manyToOneSet_3_1 = manyToOneSet_3.next()) {
                var one = manyToOneSet_3_1.value;
                if (!ReversePointerRelations[entity] || !ReversePointerRelations[entity].includes(one[0])) {
                    var oneEntity = one[0];
                    var cascadeCreateNode = factory.createTypeLiteralNode([
                        factory.createPropertySignature(undefined, factory.createIdentifier("".concat(one[1], "Id")), factory.createToken(ts.SyntaxKind.QuestionToken), factory.createKeywordTypeNode(ts.SyntaxKind.NeverKeyword)),
                        factory.createPropertySignature(undefined, factory.createIdentifier(one[1]), one[2] ? factory.createToken(ts.SyntaxKind.QuestionToken) : undefined, factory.createTypeReferenceNode(createForeignRef(entity, one[0], 'CreateSingleOperation')))
                    ]);
                    var cascadeUpdateNode = factory.createTypeLiteralNode([
                        factory.createPropertySignature(undefined, factory.createIdentifier("".concat(one[1], "Id")), undefined, factory.createTypeReferenceNode(factory.createIdentifier("String"), [factory.createLiteralTypeNode(factory.createNumericLiteral("64"))])),
                        factory.createPropertySignature(undefined, factory.createIdentifier(one[1]), factory.createToken(ts.SyntaxKind.QuestionToken), factory.createTypeReferenceNode(createForeignRef(entity, one[0], 'UpdateOperation')))
                    ]);
                    var noCascadeNode = factory.createTypeLiteralNode([
                        factory.createPropertySignature(undefined, factory.createIdentifier("".concat(one[1], "Id")), one[2] ? factory.createToken(ts.SyntaxKind.QuestionToken) : undefined, factory.createTypeReferenceNode(factory.createIdentifier("String"), [factory.createLiteralTypeNode(factory.createNumericLiteral("64"))]))
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
        }
        catch (e_11_1) { e_11 = { error: e_11_1 }; }
        finally {
            try {
                if (manyToOneSet_3_1 && !manyToOneSet_3_1.done && (_c = manyToOneSet_3.return)) _c.call(manyToOneSet_3);
            }
            finally { if (e_11) throw e_11.error; }
        }
        if (upsertOneNodes.length > 0) {
            adNodes.push(factory.createIntersectionTypeNode(upsertOneNodes));
        }
    }
    var reverseOneNodes = [];
    if (ReversePointerEntities[entity]) {
        if (ReversePointerRelations[entity]) {
            try {
                for (var _q = tslib_1.__values(ReversePointerRelations[entity]), _r = _q.next(); !_r.done; _r = _q.next()) {
                    var one = _r.value;
                    var cascadeCreateNode = factory.createTypeLiteralNode([
                        factory.createPropertySignature(undefined, factory.createIdentifier('entity'), factory.createToken(ts.SyntaxKind.QuestionToken), factory.createKeywordTypeNode(ts.SyntaxKind.NeverKeyword)),
                        factory.createPropertySignature(undefined, factory.createIdentifier('entityId'), factory.createToken(ts.SyntaxKind.QuestionToken), factory.createKeywordTypeNode(ts.SyntaxKind.NeverKeyword)),
                        factory.createPropertySignature(undefined, factory.createIdentifier((0, string_1.firstLetterLowerCase)(one)), undefined, // 反向指针好像不能为空，以后或许会有特例  by Xc
                        factory.createTypeReferenceNode(createForeignRef(entity, one, 'CreateSingleOperation')))
                    ]);
                    var cascadeUpdateNode = factory.createTypeLiteralNode([
                        factory.createPropertySignature(undefined, factory.createIdentifier('entity'), undefined, // 反向指针好像不能为空，以后或许会有特例  by Xc
                        factory.createLiteralTypeNode(factory.createStringLiteral("".concat((0, string_1.firstLetterLowerCase)(one))))),
                        factory.createPropertySignature(undefined, factory.createIdentifier('entityId'), undefined, // 反向指针好像不能为空，以后或许会有特例  by Xc
                        factory.createTypeReferenceNode(factory.createIdentifier("String"), [factory.createLiteralTypeNode(factory.createNumericLiteral("64"))])),
                        factory.createPropertySignature(undefined, factory.createIdentifier((0, string_1.firstLetterLowerCase)(one)), undefined, factory.createTypeReferenceNode(createForeignRef(entity, one, 'UpdateOperation')))
                    ]);
                    var noCascadeNode = factory.createTypeLiteralNode([
                        factory.createPropertySignature(undefined, factory.createIdentifier('entity'), undefined, // 反向指针好像不能为空，以后或许会有特例  by Xc
                        factory.createLiteralTypeNode(factory.createStringLiteral("".concat((0, string_1.firstLetterLowerCase)(one))))),
                        factory.createPropertySignature(undefined, factory.createIdentifier('entityId'), undefined, // 反向指针好像不能为空，以后或许会有特例  by Xc
                        factory.createTypeReferenceNode(factory.createIdentifier("String"), [factory.createLiteralTypeNode(factory.createNumericLiteral("64"))]))
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
            catch (e_12_1) { e_12 = { error: e_12_1 }; }
            finally {
                try {
                    if (_r && !_r.done && (_d = _q.return)) _d.call(_q);
                }
                finally { if (e_12) throw e_12.error; }
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
    var propertySignatures = [];
    if (oneToManySet) {
        var _loop_8 = function (entityName) {
            var entityNameLc = (0, string_1.firstLetterLowerCase)(entityName);
            foreignKeySet[entityName].forEach(function (foreignKey) {
                var identifier = "".concat(entityNameLc, "$").concat(foreignKey);
                var otmCreateOperationDataNode = factory.createTypeReferenceNode(factory.createIdentifier("Omit"), [
                    factory.createTypeReferenceNode(createForeignRef(entity, entityName, 'CreateOperationData'), undefined),
                    factory.createUnionTypeNode(foreignKey === 'entity' ? [
                        factory.createLiteralTypeNode(factory.createStringLiteral("entity")),
                        factory.createLiteralTypeNode(factory.createStringLiteral("entityId"))
                    ] : [
                        factory.createLiteralTypeNode(factory.createStringLiteral(foreignKey)),
                        factory.createLiteralTypeNode(factory.createStringLiteral("".concat(foreignKey, "Id")))
                    ])
                ]);
                var otmCreateSingleOperationNode = factory.createTypeReferenceNode(factory.createIdentifier("OakOperation"), [
                    factory.createLiteralTypeNode(factory.createStringLiteral("create")),
                    otmCreateOperationDataNode
                ]);
                var otmCreateMultipleOperationNode = factory.createTypeReferenceNode(factory.createIdentifier("OakOperation"), [
                    factory.createLiteralTypeNode(factory.createStringLiteral("create")),
                    factory.createArrayTypeNode(otmCreateOperationDataNode)
                ]);
                var otmUpdateOperationNode = factory.createTypeReferenceNode(factory.createIdentifier("OakOperation"), [
                    factory.createIndexedAccessTypeNode(factory.createTypeReferenceNode(createForeignRef(entity, entityName, 'UpdateOperation'), undefined), factory.createLiteralTypeNode(factory.createStringLiteral("action"))),
                    factory.createTypeReferenceNode(factory.createIdentifier("Omit"), [
                        factory.createTypeReferenceNode(createForeignRef(entity, entityName, 'UpdateOperationData'), undefined),
                        factory.createUnionTypeNode(foreignKey === 'entity' ? [
                            factory.createLiteralTypeNode(factory.createStringLiteral("entity")),
                            factory.createLiteralTypeNode(factory.createStringLiteral("entityId"))
                        ] : [
                            factory.createLiteralTypeNode(factory.createStringLiteral(foreignKey)),
                            factory.createLiteralTypeNode(factory.createStringLiteral("".concat(foreignKey, "Id")))
                        ])
                    ]),
                    factory.createTypeReferenceNode(createForeignRef(entity, entityName, 'Filter'), undefined)
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
        };
        for (var entityName in foreignKeySet) {
            _loop_8(entityName);
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
        try {
            for (var manyToOneSet_4 = tslib_1.__values(manyToOneSet), manyToOneSet_4_1 = manyToOneSet_4.next(); !manyToOneSet_4_1.done; manyToOneSet_4_1 = manyToOneSet_4.next()) {
                var one = manyToOneSet_4_1.value;
                if (!ReversePointerRelations[entity] || !ReversePointerRelations[entity].includes(one[1])) {
                    foreignKeyAttr.push("".concat(one[1], "Id"));
                }
            }
        }
        catch (e_13_1) { e_13 = { error: e_13_1 }; }
        finally {
            try {
                if (manyToOneSet_4_1 && !manyToOneSet_4_1.done && (_e = manyToOneSet_4.return)) _e.call(manyToOneSet_4);
            }
            finally { if (e_13) throw e_13.error; }
        }
    }
    adNodes = [
        factory.createTypeReferenceNode(factory.createIdentifier("FormUpdateData"), [
            foreignKeyAttr.length > 0 ? factory.createTypeReferenceNode(factory.createIdentifier("Omit"), [
                factory.createTypeReferenceNode(factory.createIdentifier("OpSchema"), undefined),
                factory.createUnionTypeNode((0, lodash_1.uniq)(foreignKeyAttr).map(function (ele) { return factory.createLiteralTypeNode(factory.createStringLiteral(ele)); }))
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
        var upsertOneNodes = [];
        try {
            for (var manyToOneSet_5 = tslib_1.__values(manyToOneSet), manyToOneSet_5_1 = manyToOneSet_5.next(); !manyToOneSet_5_1.done; manyToOneSet_5_1 = manyToOneSet_5.next()) {
                var one = manyToOneSet_5_1.value;
                if (!ReversePointerRelations[entity] || !ReversePointerRelations[entity].includes(one[0])) {
                    var cascadeCreateNode = factory.createTypeLiteralNode([
                        factory.createPropertySignature(undefined, factory.createIdentifier(one[1]), undefined, factory.createTypeReferenceNode(createForeignRef(entity, one[0], 'CreateSingleOperation'))),
                        factory.createPropertySignature(undefined, factory.createIdentifier("".concat(one[1], "Id")), factory.createToken(ts.SyntaxKind.QuestionToken), factory.createKeywordTypeNode(ts.SyntaxKind.NeverKeyword)),
                    ]);
                    var cascadeUpdateNode = factory.createTypeLiteralNode([
                        factory.createPropertySignature(undefined, factory.createIdentifier(one[1]), undefined, factory.createTypeReferenceNode(createForeignRef(entity, one[0], 'UpdateOperation'))),
                        factory.createPropertySignature(undefined, factory.createIdentifier("".concat(one[1], "Id")), factory.createToken(ts.SyntaxKind.QuestionToken), factory.createKeywordTypeNode(ts.SyntaxKind.NeverKeyword)),
                    ]);
                    var cascadeRemoveNode = factory.createTypeLiteralNode([
                        factory.createPropertySignature(undefined, factory.createIdentifier(one[1]), undefined, factory.createTypeReferenceNode(createForeignRef(entity, one[0], 'RemoveOperation'))),
                        factory.createPropertySignature(undefined, factory.createIdentifier("".concat(one[1], "Id")), factory.createToken(ts.SyntaxKind.QuestionToken), factory.createKeywordTypeNode(ts.SyntaxKind.NeverKeyword)),
                    ]);
                    var noCascadeNode = factory.createTypeLiteralNode([
                        factory.createPropertySignature(undefined, factory.createIdentifier(one[1]), factory.createToken(ts.SyntaxKind.QuestionToken), factory.createKeywordTypeNode(ts.SyntaxKind.NeverKeyword)),
                        factory.createPropertySignature(undefined, factory.createIdentifier("".concat(one[1], "Id")), factory.createToken(ts.SyntaxKind.QuestionToken), factory.createUnionTypeNode([
                            factory.createTypeReferenceNode(factory.createIdentifier("String"), [factory.createLiteralTypeNode(factory.createNumericLiteral("64"))]),
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
        }
        catch (e_14_1) { e_14 = { error: e_14_1 }; }
        finally {
            try {
                if (manyToOneSet_5_1 && !manyToOneSet_5_1.done && (_f = manyToOneSet_5.return)) _f.call(manyToOneSet_5);
            }
            finally { if (e_14) throw e_14.error; }
        }
        if (upsertOneNodes.length > 0) {
            adNodes.push(factory.createIntersectionTypeNode(upsertOneNodes));
        }
        var reverseOneNodes_1 = [];
        if (ReversePointerRelations[entity]) {
            var refEntityLitrals = [];
            try {
                for (var _s = tslib_1.__values(ReversePointerRelations[entity]), _t = _s.next(); !_t.done; _t = _s.next()) {
                    var one = _t.value;
                    refEntityLitrals.push(factory.createLiteralTypeNode(factory.createStringLiteral("".concat((0, string_1.firstLetterLowerCase)(one)))));
                    var actionNodes = [];
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
                        reverseOneNodes_1.push(factory.createTypeLiteralNode([
                            factory.createPropertySignature(undefined, factory.createIdentifier((0, string_1.firstLetterLowerCase)(one)), factory.createToken(ts.SyntaxKind.QuestionToken), factory.createUnionTypeNode(actionNodes)),
                            factory.createPropertySignature(undefined, factory.createIdentifier('entityId'), factory.createToken(ts.SyntaxKind.QuestionToken), factory.createKeywordTypeNode(ts.SyntaxKind.NeverKeyword)),
                            factory.createPropertySignature(undefined, factory.createIdentifier('entity'), factory.createToken(ts.SyntaxKind.QuestionToken), factory.createKeywordTypeNode(ts.SyntaxKind.NeverKeyword))
                        ]));
                    }
                }
            }
            catch (e_15_1) { e_15 = { error: e_15_1 }; }
            finally {
                try {
                    if (_t && !_t.done && (_g = _s.return)) _g.call(_s);
                }
                finally { if (e_15) throw e_15.error; }
            }
            if (process.env.COMPLING_AS_LIB) {
                // 如果是base，要包容更多可能的反指
                refEntityLitrals.push(factory.createKeywordTypeNode(ts.SyntaxKind.StringKeyword));
            }
            reverseOneNodes_1.push(factory.createTypeLiteralNode([
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
        if (reverseOneNodes_1.length > 0) {
            adNodes.push(factory.createUnionTypeNode(reverseOneNodes_1));
        }
    }
    var propertySignatures2 = [];
    if (process.env.COMPLING_AS_LIB) {
        propertySignatures2.push(factory.createIndexSignature(undefined, undefined, [factory.createParameterDeclaration(undefined, undefined, undefined, factory.createIdentifier("k"), undefined, factory.createKeywordTypeNode(ts.SyntaxKind.StringKeyword), undefined)], factory.createKeywordTypeNode(ts.SyntaxKind.AnyKeyword)));
    }
    if (oneToManySet) {
        var _loop_9 = function (entityName) {
            var entityNameLc = (0, string_1.firstLetterLowerCase)(entityName);
            foreignKeySet[entityName].forEach(function (foreignKey) {
                var identifier = "".concat(entityNameLc, "s$").concat(foreignKey);
                var otmCreateOperationDataNode = factory.createTypeReferenceNode(factory.createIdentifier("Omit"), [
                    factory.createTypeReferenceNode(createForeignRef(entity, entityName, 'CreateOperationData'), undefined),
                    factory.createUnionTypeNode(foreignKey === 'entity' ? [
                        factory.createLiteralTypeNode(factory.createStringLiteral("entity")),
                        factory.createLiteralTypeNode(factory.createStringLiteral("entityId"))
                    ] : [
                        factory.createLiteralTypeNode(factory.createStringLiteral(foreignKey)),
                        factory.createLiteralTypeNode(factory.createStringLiteral("".concat(foreignKey, "Id")))
                    ])
                ]);
                var otmCreateSingleOperationNode = factory.createTypeReferenceNode(factory.createIdentifier("OakOperation"), [
                    factory.createLiteralTypeNode(factory.createStringLiteral("create")),
                    otmCreateOperationDataNode
                ]);
                var otmCreateMultipleOperationNode = factory.createTypeReferenceNode(factory.createIdentifier("OakOperation"), [
                    factory.createLiteralTypeNode(factory.createStringLiteral("create")),
                    factory.createArrayTypeNode(otmCreateOperationDataNode)
                ]);
                var otmUpdateOperationNode = factory.createTypeReferenceNode(createForeignRef(entity, entityName, 'UpdateOperation'), undefined);
                var otmRemoveOperationNode = factory.createTypeReferenceNode(createForeignRef(entity, entityName, 'RemoveOperation'), undefined);
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
        };
        for (var entityName in foreignKeySet) {
            _loop_9(entityName);
        }
    }
    if (propertySignatures2.length > 0) {
        adNodes.push(factory.createTypeLiteralNode(propertySignatures2));
    }
    statements.push(factory.createTypeAliasDeclaration(undefined, [factory.createModifier(ts.SyntaxKind.ExportKeyword)], factory.createIdentifier("UpdateOperationData"), undefined, factory.createIntersectionTypeNode(adNodes)));
    // UpdateOperation
    var actionTypeNodes = [factory.createLiteralTypeNode(factory.createStringLiteral("update"))];
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
        var upsertOneNodes = [];
        try {
            for (var manyToOneSet_6 = tslib_1.__values(manyToOneSet), manyToOneSet_6_1 = manyToOneSet_6.next(); !manyToOneSet_6_1.done; manyToOneSet_6_1 = manyToOneSet_6.next()) {
                var one = manyToOneSet_6_1.value;
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
        }
        catch (e_16_1) { e_16 = { error: e_16_1 }; }
        finally {
            try {
                if (manyToOneSet_6_1 && !manyToOneSet_6_1.done && (_h = manyToOneSet_6.return)) _h.call(manyToOneSet_6);
            }
            finally { if (e_16) throw e_16.error; }
        }
        var reverseOneNodes_2 = [];
        if (ReversePointerRelations[entity]) {
            var refEntityLitrals = [];
            try {
                for (var _u = tslib_1.__values(ReversePointerRelations[entity]), _v = _u.next(); !_v.done; _v = _u.next()) {
                    var one = _v.value;
                    refEntityLitrals.push(factory.createLiteralTypeNode(factory.createStringLiteral("".concat((0, string_1.firstLetterLowerCase)(one)))));
                    if (!Schema[one].static) {
                        switch (Schema[one].actionType) {
                            case 'crud': {
                                reverseOneNodes_2.push(factory.createTypeLiteralNode([
                                    factory.createPropertySignature(undefined, factory.createIdentifier((0, string_1.firstLetterLowerCase)(one)), factory.createToken(ts.SyntaxKind.QuestionToken), factory.createUnionTypeNode([
                                        factory.createTypeReferenceNode(createForeignRef(entity, one, 'UpdateOperation')),
                                        factory.createTypeReferenceNode(createForeignRef(entity, one, 'RemoveOperation'))
                                    ]))
                                ]));
                                break;
                            }
                            case 'excludeUpdate': {
                                reverseOneNodes_2.push(factory.createTypeLiteralNode([
                                    factory.createPropertySignature(undefined, factory.createIdentifier((0, string_1.firstLetterLowerCase)(one)), factory.createToken(ts.SyntaxKind.QuestionToken), factory.createTypeReferenceNode(createForeignRef(entity, one, 'RemoveOperation')))
                                ]));
                                break;
                            }
                            case 'excludeRemove': {
                                reverseOneNodes_2.push(factory.createTypeLiteralNode([
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
            }
            catch (e_17_1) { e_17 = { error: e_17_1 }; }
            finally {
                try {
                    if (_v && !_v.done && (_j = _u.return)) _j.call(_u);
                }
                finally { if (e_17) throw e_17.error; }
            }
            if (process.env.COMPLING_AS_LIB) {
                reverseOneNodes_2.push(factory.createTypeLiteralNode([
                    factory.createIndexSignature(undefined, undefined, [factory.createParameterDeclaration(undefined, undefined, undefined, factory.createIdentifier("k"), undefined, factory.createKeywordTypeNode(ts.SyntaxKind.StringKeyword), undefined)], factory.createKeywordTypeNode(ts.SyntaxKind.AnyKeyword))
                ]));
            }
        }
        if (upsertOneNodes.length > 0) {
            adNodes.push(factory.createIntersectionTypeNode(upsertOneNodes));
        }
        if (reverseOneNodes_2.length > 0) {
            adNodes.push(factory.createUnionTypeNode(reverseOneNodes_2));
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
        factory.createTypeReferenceNode(factory.createIdentifier("RemoveOperation"), undefined),
        factory.createTypeReferenceNode(factory.createIdentifier("SelectOperation"), undefined)
    ])));
}
var initialStatements = function () { return [
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
        factory.createImportSpecifier(false, undefined, factory.createIdentifier('Geo')),
        factory.createImportSpecifier(false, undefined, factory.createIdentifier('SingleGeo'))
    ])), factory.createStringLiteral("".concat((0, env_1.TYPE_PATH_IN_OAK_DOMAIN)(), "DataType"))),
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
    ])), factory.createStringLiteral("".concat((0, env_1.TYPE_PATH_IN_OAK_DOMAIN)(), "Demand"))),
    factory.createImportDeclaration(undefined, undefined, factory.createImportClause(false, undefined, factory.createNamedImports([
        factory.createImportSpecifier(false, undefined, factory.createIdentifier("OneOf")),
        factory.createImportSpecifier(false, undefined, factory.createIdentifier("ValueOf"))
    ])), factory.createStringLiteral("".concat((0, env_1.TYPE_PATH_IN_OAK_DOMAIN)(), "Polyfill"))),
    // import * as SubQuery from '../_SubQuery';
    factory.createImportDeclaration(undefined, undefined, factory.createImportClause(false, undefined, factory.createNamespaceImport(factory.createIdentifier("SubQuery"))), factory.createStringLiteral("../_SubQuery")),
    // import { Filter as OakFilter } from 'oak-domain/src/types/Entity';
    factory.createImportDeclaration(undefined, undefined, factory.createImportClause(false, undefined, factory.createNamedImports([
        factory.createImportSpecifier(false, undefined, factory.createIdentifier("FormCreateData")),
        factory.createImportSpecifier(false, undefined, factory.createIdentifier("FormUpdateData")),
        factory.createImportSpecifier(false, factory.createIdentifier("Operation"), factory.createIdentifier("OakOperation")),
        factory.createImportSpecifier(false, factory.createIdentifier("MakeAction"), factory.createIdentifier("OakMakeAction"))
    ])), factory.createStringLiteral("".concat((0, env_1.TYPE_PATH_IN_OAK_DOMAIN)(), "Entity")), undefined)
]; };
function outputSubQuery(outputDir, printer) {
    var statements = [];
    if (process.env.COMPLING_AS_LIB) {
        statements.push(factory.createImportDeclaration(undefined, undefined, factory.createImportClause(false, undefined, factory.createNamedImports([factory.createImportSpecifier(false, undefined, factory.createIdentifier("Selection"))])), factory.createStringLiteral((0, env_1.TYPE_PATH_IN_OAK_DOMAIN)(1)), undefined));
    }
    for (var entity in Schema) {
        // import * as User from '../User/Schema';
        statements.push(factory.createImportDeclaration(undefined, undefined, factory.createImportClause(false, undefined, factory.createNamespaceImport(factory.createIdentifier(entity))), factory.createStringLiteral("./".concat(entity, "/Schema"))));
    }
    var entities = (0, lodash_1.keys)(Schema);
    var _loop_10 = function (one) {
        var identifier = "".concat(one, "IdSubQuery");
        var fromEntites = OneToMany[one] ? (0, lodash_1.uniq)(OneToMany[one]
            .filter(function (_a) {
            var _b = tslib_1.__read(_a, 2), e = _b[0], f = _b[1];
            return f !== 'entity';
        }).map(function (_a) {
            var _b = tslib_1.__read(_a, 1), e = _b[0];
            return e;
        })) : [];
        fromEntites.push(one);
        var inUnionTypeNode = fromEntites.map(function (ele) { return factory.createIntersectionTypeNode([
            factory.createTypeReferenceNode(factory.createQualifiedName(factory.createIdentifier(ele), factory.createIdentifier(identifier)), undefined),
            factory.createTypeLiteralNode([factory.createPropertySignature(undefined, factory.createIdentifier("entity"), undefined, factory.createLiteralTypeNode(factory.createStringLiteral((0, string_1.firstLetterLowerCase)(ele))))])
        ]); });
        if (process.env.COMPLING_AS_LIB) {
            // 如果是建立 base，这里要加上额外可能的对象信息
            inUnionTypeNode.push(factory.createKeywordTypeNode(ts.SyntaxKind.AnyKeyword));
        }
        statements.push(factory.createTypeAliasDeclaration(undefined, [factory.createModifier(ts.SyntaxKind.ExportKeyword)], factory.createIdentifier(identifier), undefined, factory.createMappedTypeNode(undefined, factory.createTypeParameterDeclaration(undefined, factory.createIdentifier("K"), factory.createUnionTypeNode([
            factory.createLiteralTypeNode(factory.createStringLiteral("$in")),
            factory.createLiteralTypeNode(factory.createStringLiteral("$nin"))
        ]), undefined), undefined, factory.createToken(ts.SyntaxKind.QuestionToken), factory.createUnionTypeNode(inUnionTypeNode), undefined)));
    };
    // 每个有manyToOne的Entity都会输出${One}IdSubQuery
    for (var one in Schema) {
        _loop_10(one);
    }
    var resultFile = ts.createSourceFile("someFileName.ts", "", ts.ScriptTarget.Latest, /*setParentNodes*/ false, ts.ScriptKind.TS);
    var result = printer.printNode(ts.EmitHint.Unspecified, factory.createSourceFile(statements, factory.createToken(ts.SyntaxKind.EndOfFileToken), ts.NodeFlags.None), resultFile);
    var fileName = path_1.default.join(outputDir, '_SubQuery.ts');
    (0, fs_1.writeFileSync)(fileName, result, { flag: 'w' });
}
function outputEntityDict(outputDir, printer) {
    var statements = [];
    var propertySignatures = [];
    for (var entity in Schema) {
        // import * as User from '../User/Schema';
        statements.push(factory.createImportDeclaration(undefined, undefined, factory.createImportClause(false, undefined, factory.createNamedImports([factory.createImportSpecifier(false, factory.createIdentifier("EntityDef"), factory.createIdentifier(entity))])), factory.createStringLiteral("./".concat(entity, "/Schema"))));
        var entityLc = (0, string_1.firstLetterLowerCase)(entity);
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
    var resultFile = ts.createSourceFile("someFileName.ts", "", ts.ScriptTarget.Latest, /*setParentNodes*/ false, ts.ScriptKind.TS);
    var result = printer.printNode(ts.EmitHint.Unspecified, factory.createSourceFile(statements, factory.createToken(ts.SyntaxKind.EndOfFileToken), ts.NodeFlags.None), resultFile);
    var fileName = path_1.default.join(outputDir, 'EntityDict.ts');
    (0, fs_1.writeFileSync)(fileName, result, { flag: 'w' });
}
function outputSchema(outputDir, printer) {
    for (var entity in Schema) {
        var statements = initialStatements();
        if (ActionAsts[entity]) {
            var _a = ActionAsts[entity], importedFrom = _a.importedFrom, actionDefNames = _a.actionDefNames;
            var localActions = ['Action', 'ParticularAction'];
            for (var a in importedFrom) {
                (0, assert_1.default)(a.endsWith('Action'));
                var s = a.slice(0, a.length - 6).concat('State');
                if (importedFrom[a] === 'local' && actionDefNames.includes((0, string_1.firstLetterLowerCase)(a.slice(0, a.length - 6)))) {
                    localActions.push(s);
                }
                else if (actionDefNames.includes((0, string_1.firstLetterLowerCase)(a.slice(0, a.length - 6)))) {
                    var moduleSpecifier = importedFrom[a].moduleSpecifier;
                    statements.push(factory.createImportDeclaration(undefined, undefined, factory.createImportClause(false, undefined, factory.createNamedImports([
                        factory.createImportSpecifier(false, undefined, factory.createIdentifier(s))
                    ])), moduleSpecifier, undefined));
                }
            }
            statements.push(factory.createImportDeclaration(undefined, undefined, factory.createImportClause(false, undefined, factory.createNamedImports(localActions.map(function (ele) { return factory.createImportSpecifier(false, undefined, factory.createIdentifier(ele)); }))), factory.createStringLiteral('./Action'), undefined), factory.createImportDeclaration(undefined, undefined, factory.createImportClause(false, undefined, factory.createNamedImports([
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
        var additionalImports = Schema[entity].additionalImports;
        if ((additionalImports === null || additionalImports === void 0 ? void 0 : additionalImports.length) > 0) {
            statements.push.apply(statements, tslib_1.__spreadArray([], tslib_1.__read(additionalImports), false));
        }
        constructSchema(statements, entity);
        constructFilter(statements, entity);
        constructProjection(statements, entity);
        constructSorter(statements, entity);
        constructActions(statements, entity);
        constructQuery(statements, entity);
        constructFullAttrs(statements, entity);
        var makeActionArguments = [];
        if (ActionAsts[entity]) {
            makeActionArguments.push(factory.createTypeReferenceNode('Action'));
        }
        else {
            makeActionArguments.push(factory.createTypeReferenceNode(OriginActionDict[Schema[entity].actionType]));
        }
        if (Schema[entity].hasRelationDef || entity === 'User') {
            makeActionArguments.push(factory.createTypeReferenceNode('RelationAction'));
        }
        var actionTypeNode = factory.createTypeReferenceNode(factory.createIdentifier('OakMakeAction'), makeActionArguments.length === 1 ? makeActionArguments : [factory.createUnionTypeNode(makeActionArguments)]);
        var EntityDefAttrs = [
            factory.createPropertySignature(undefined, factory.createIdentifier("Schema"), undefined, factory.createTypeReferenceNode(factory.createIdentifier("Schema"), undefined)),
            factory.createPropertySignature(undefined, factory.createIdentifier("OpSchema"), undefined, factory.createTypeReferenceNode(factory.createIdentifier("OpSchema"), undefined)),
            factory.createPropertySignature(undefined, factory.createIdentifier("Action"), undefined, process.env.COMPLING_AS_LIB ?
                factory.createUnionTypeNode([
                    actionTypeNode,
                    factory.createKeywordTypeNode(ts.SyntaxKind.StringKeyword)
                ]) : actionTypeNode),
            factory.createPropertySignature(undefined, factory.createIdentifier("Selection"), undefined, factory.createTypeReferenceNode(factory.createIdentifier("Selection"), undefined)),
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
        statements.push(factory.createTypeAliasDeclaration(undefined, [factory.createModifier(ts.SyntaxKind.ExportKeyword)], factory.createIdentifier("EntityDef"), undefined, factory.createTypeLiteralNode(EntityDefAttrs)));
        var result = printer.printList(ts.ListFormat.SourceFileStatements, factory.createNodeArray(statements), Schema[entity].sourceFile);
        var fileName = path_1.default.join(outputDir, entity, 'Schema.ts');
        (0, fs_1.writeFileSync)(fileName, result, { flag: 'w' });
    }
}
function outputAction(outputDir, printer) {
    var actionDictStatements = [];
    var propertyAssignments = [];
    for (var entity in ActionAsts) {
        var _a = ActionAsts[entity], sourceFile = _a.sourceFile, statements = _a.statements, importedFrom = _a.importedFrom, actionDefNames = _a.actionDefNames;
        var importStatements = [];
        for (var k in importedFrom) {
            (0, assert_1.default)(k.endsWith('Action'));
            if (importedFrom[k] !== 'local') {
                importStatements.push(importedFrom[k]);
            }
        }
        /* const actionDiff = difference(actionNames, actionDefNames);
        if (actionDiff.length > 0) {
            throw new Error(`action not conform to actionDef: ${actionDiff.join(',')}, entity: ${entity}`);
        } */
        statements.push(factory.createVariableStatement([factory.createModifier(ts.SyntaxKind.ExportKeyword)], factory.createVariableDeclarationList([factory.createVariableDeclaration(factory.createIdentifier("ActionDefDict"), undefined, undefined, factory.createObjectLiteralExpression(actionDefNames.map(function (ele) { return factory.createPropertyAssignment(factory.createIdentifier("".concat(ele, "State")), factory.createIdentifier("".concat((0, string_1.firstLetterUpperCase)(ele), "ActionDef"))); }), true))], ts.NodeFlags.Const)));
        /*  const result = printer.printNode(
             ts.EmitHint.Unspecified,
             factory.createSourceFile(statements,
                 factory.createToken(ts.SyntaxKind.EndOfFileToken),
                 ts.NodeFlags.None),
             sourceFile
         ); */
        // 这里如果用printNode，stringLiteral的输出始终有个bug不知道如何处理
        var result_1 = printer.printList(ts.ListFormat.SourceFileStatements, factory.createNodeArray(importStatements.concat(statements)), sourceFile);
        var filename = path_1.default.join(outputDir, entity, 'Action.ts');
        (0, fs_1.writeFileSync)(filename, result_1, { flag: 'w' });
        actionDictStatements.push(factory.createImportDeclaration(undefined, undefined, factory.createImportClause(false, undefined, factory.createNamedImports([factory.createImportSpecifier(false, factory.createIdentifier("ActionDefDict"), factory.createIdentifier(entity))])), factory.createStringLiteral("./".concat(entity, "/Action"))));
        propertyAssignments.push(factory.createPropertyAssignment(factory.createIdentifier((0, string_1.firstLetterLowerCase)(entity)), factory.createIdentifier(entity)));
    }
    actionDictStatements.push(factory.createVariableStatement([factory.createModifier(ts.SyntaxKind.ExportKeyword)], factory.createVariableDeclarationList([factory.createVariableDeclaration(factory.createIdentifier("ActionDefDict"), undefined, undefined, factory.createObjectLiteralExpression(propertyAssignments, true))], ts.NodeFlags.Const)));
    var resultFile = ts.createSourceFile("someFileName.ts", "", ts.ScriptTarget.Latest, /*setParentNodes*/ false, ts.ScriptKind.TS);
    var result = printer.printNode(ts.EmitHint.Unspecified, factory.createSourceFile(actionDictStatements, factory.createToken(ts.SyntaxKind.EndOfFileToken), ts.NodeFlags.None), resultFile);
    var fileName = path_1.default.join(outputDir, 'ActionDefDict.ts');
    (0, fs_1.writeFileSync)(fileName, result, { flag: 'w' });
}
function constructAttributes(entity) {
    var _a = Schema[entity], schemaAttrs = _a.schemaAttrs, enumStringAttrs = _a.enumStringAttrs;
    var _b = ManyToOne, _c = entity, manyToOneSet = _b[_c];
    var result = [];
    schemaAttrs.forEach(function (attr) {
        var attrAssignments = [];
        var name = attr.name, type = attr.type;
        var name2 = name;
        if (ts.isTypeReferenceNode(type)) {
            var typeName = type.typeName, typeArguments = type.typeArguments;
            if (ts.isIdentifier(typeName)) {
                var text = typeName.text;
                switch (text) {
                    case 'String': {
                        attrAssignments.push(factory.createPropertyAssignment(factory.createIdentifier("type"), factory.createStringLiteral("varchar")), factory.createPropertyAssignment(factory.createIdentifier("params"), factory.createObjectLiteralExpression([
                            factory.createPropertyAssignment(factory.createIdentifier("length"), factory.createNumericLiteral(typeArguments[0].literal.text)),
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
                        var text2_6 = text === 'Schema' ? entity : text;
                        var manyToOneItem = manyToOneSet && manyToOneSet.find(function (_a) {
                            var _b = tslib_1.__read(_a, 2), refEntity = _b[0], attrName = _b[1];
                            return refEntity === text2_6 && attrName === attrName;
                        });
                        if (manyToOneItem) {
                            // 外键
                            name2 = factory.createIdentifier("".concat(name.text, "Id"));
                            attrAssignments.push(factory.createPropertyAssignment(factory.createIdentifier("type"), factory.createStringLiteral("ref")), factory.createPropertyAssignment(factory.createIdentifier("ref"), factory.createStringLiteral((0, string_1.firstLetterLowerCase)(text2_6))));
                        }
                        else {
                            if (enumStringAttrs.includes(name.text)) {
                                attrAssignments.push(factory.createPropertyAssignment(factory.createIdentifier("type"), factory.createStringLiteral("varchar")), factory.createPropertyAssignment(factory.createIdentifier("params"), factory.createObjectLiteralExpression([factory.createPropertyAssignment(factory.createIdentifier("length"), factory.createNumericLiteral(env_1.STRING_LITERAL_MAX_LENGTH))], true)));
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
                        attrAssignments.push(factory.createPropertyAssignment(factory.createIdentifier("type"), factory.createStringLiteral("varchar")), factory.createPropertyAssignment(factory.createIdentifier("params"), factory.createObjectLiteralExpression([factory.createPropertyAssignment(factory.createIdentifier("length"), factory.createNumericLiteral(env_1.STRING_LITERAL_MAX_LENGTH))], true)));
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
    var locales = {};
    var entities = [];
    var _loop_11 = function (entity) {
        var _a = Schema[entity], locale = _a.locale, sourceFile = _a.sourceFile;
        if (locale) {
            var properties = locale.properties;
            properties.forEach(function (ele) {
                (0, assert_1.default)(ts.isPropertyAssignment(ele) && (ts.isIdentifier(ele.name) || ts.isStringLiteral(ele.name)) && ts.isObjectLiteralExpression(ele.initializer));
                var lng = ele.name.text;
                var result = printer.printList(ts.ListFormat.SourceFileStatements, factory.createNodeArray([
                    factory.createReturnStatement(ele.initializer)
                ]), sourceFile);
                var data = Function(result)();
                var filename = path_1.default.join(outputDir, entity, 'locales', "".concat(lng, ".json"));
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
    };
    for (var entity in Schema) {
        _loop_11(entity);
    }
    for (var lng in locales) {
        if (locales[lng].length < entities.length) {
            var lack = (0, lodash_1.difference)(entities, locales[lng]);
            throw new Error("".concat(lng, "\u8BED\u8A00\u5B9A\u4E49\u4E2D\u7F3A\u5C11\u4E86\u5BF9\u8C61").concat(lack.join(','), "\u7684\u5B9A\u4E49\uFF0C\u8BF7\u68C0\u67E5\u76F8\u5E94\u7684\u5B9A\u4E49\u6587\u4EF6"));
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
    var importStatements = [
        factory.createImportDeclaration(undefined, undefined, factory.createImportClause(false, undefined, factory.createNamedImports([factory.createImportSpecifier(false, undefined, factory.createIdentifier("StorageSchema"))])), factory.createStringLiteral("".concat((0, env_1.TYPE_PATH_IN_OAK_DOMAIN)(1), "Storage")), undefined),
        factory.createImportDeclaration(undefined, undefined, factory.createImportClause(false, undefined, factory.createNamedImports([factory.createImportSpecifier(false, undefined, factory.createIdentifier("EntityDict"))])), factory.createStringLiteral("./EntityDict"), undefined)
    ];
    var entityAssignments = [];
    for (var entity in Schema) {
        var indexExpressions = [];
        var _a = Schema[entity], sourceFile = _a.sourceFile, inModi = _a.inModi, indexes = _a.indexes, toModi = _a.toModi, actionType = _a.actionType, _static = _a.static;
        var statements = [
            factory.createImportDeclaration(undefined, undefined, factory.createImportClause(false, undefined, factory.createNamedImports([factory.createImportSpecifier(false, undefined, factory.createIdentifier("StorageDesc"))])), factory.createStringLiteral("".concat((0, env_1.TYPE_PATH_IN_OAK_DOMAIN)(), "Storage")), undefined),
            factory.createImportDeclaration(undefined, undefined, factory.createImportClause(false, undefined, factory.createNamedImports([factory.createImportSpecifier(false, undefined, factory.createIdentifier("OpSchema"))])), factory.createStringLiteral("./Schema"), undefined)
        ];
        var needImportActions = [];
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
        var propertyAssignments = [];
        var attributes = constructAttributes(entity);
        propertyAssignments.push(factory.createPropertyAssignment(factory.createIdentifier("attributes"), factory.createObjectLiteralExpression(attributes, true)));
        if (indexes) {
            indexExpressions.push.apply(indexExpressions, tslib_1.__spreadArray([], tslib_1.__read(indexes.elements), false));
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
        if (Schema[entity].hasRelationDef || entity === 'User') {
            propertyAssignments.push(factory.createPropertyAssignment(factory.createIdentifier("actions"), factory.createCallExpression(factory.createPropertyAccessExpression(factory.createIdentifier("actions"), factory.createIdentifier("concat")), undefined, [factory.createIdentifier("relationActions")])));
        }
        else {
            propertyAssignments.push(factory.createShorthandPropertyAssignment(factory.createIdentifier("actions"), undefined));
        }
        if (indexExpressions.length > 0) {
            propertyAssignments.push(factory.createPropertyAssignment(factory.createIdentifier("indexes"), factory.createArrayLiteralExpression(indexExpressions, true)));
        }
        statements.push(factory.createVariableStatement([factory.createModifier(ts.SyntaxKind.ExportKeyword)], factory.createVariableDeclarationList([factory.createVariableDeclaration(factory.createIdentifier("desc"), undefined, factory.createTypeReferenceNode(factory.createIdentifier("StorageDesc"), [
                factory.createTypeReferenceNode(factory.createIdentifier("OpSchema"), undefined)
            ]), factory.createObjectLiteralExpression(propertyAssignments, true))], ts.NodeFlags.Const)));
        var result_2 = printer.printList(ts.ListFormat.SourceFileStatements, factory.createNodeArray(statements), sourceFile);
        var filename_1 = path_1.default.join(outputDir, entity, 'Storage.ts');
        (0, fs_1.writeFileSync)(filename_1, result_2, { flag: 'w' });
        importStatements.push(factory.createImportDeclaration(undefined, undefined, factory.createImportClause(false, undefined, factory.createNamedImports([
            factory.createImportSpecifier(false, factory.createIdentifier("desc"), factory.createIdentifier("".concat((0, string_1.firstLetterLowerCase)(entity), "Desc")))
        ])), factory.createStringLiteral("./".concat(entity, "/Storage")), undefined));
        entityAssignments.push(factory.createPropertyAssignment((0, string_1.firstLetterLowerCase)(entity), factory.createIdentifier("".concat((0, string_1.firstLetterLowerCase)(entity), "Desc"))));
    }
    importStatements.push(factory.createVariableStatement([factory.createModifier(ts.SyntaxKind.ExportKeyword)], factory.createVariableDeclarationList([factory.createVariableDeclaration(factory.createIdentifier("storageSchema"), undefined, factory.createTypeReferenceNode(factory.createIdentifier("StorageSchema"), [
            factory.createTypeReferenceNode('EntityDict')
        ]), factory.createObjectLiteralExpression(entityAssignments, true))], ts.NodeFlags.Const)));
    var result = printer.printList(ts.ListFormat.SourceFileStatements, factory.createNodeArray(importStatements), ts.createSourceFile("someFileName.ts", "", ts.ScriptTarget.Latest, /*setParentNodes*/ false, ts.ScriptKind.TS));
    var filename = path_1.default.join(outputDir, 'Storage.ts');
    (0, fs_1.writeFileSync)(filename, result, { flag: 'w' });
}
function resetOutputDir(outputDir) {
    (0, fs_extra_1.emptydirSync)(outputDir);
    for (var moduleName in Schema) {
        (0, fs_1.mkdirSync)(path_1.default.join(outputDir, moduleName));
        (0, fs_1.mkdirSync)(path_1.default.join(outputDir, moduleName, 'locales'));
    }
    (0, fs_1.mkdirSync)(path_1.default.join(outputDir, '_locales'));
}
function addReverseRelationship() {
    var e_18, _a;
    for (var reverseEntity in ReversePointerRelations) {
        if (!ReversePointerEntities.hasOwnProperty(reverseEntity)) {
            throw new Error("\u300C".concat(reverseEntity, "\u300D\u88AB\u5F15\u7528\u4E3A\u4E00\u4E2A\u53CD\u6307\u5BF9\u8C61\uFF0C\u4F46\u5176\u5B9A\u4E49\u4E2D\u7684entity\u548CentityId\u4E0D\u7B26\u5408\u8981\u6C42"));
        }
        try {
            for (var _b = (e_18 = void 0, tslib_1.__values(ReversePointerRelations[reverseEntity])), _c = _b.next(); !_c.done; _c = _b.next()) {
                var one = _c.value;
                addRelationship(reverseEntity, one, 'entity', false);
            }
        }
        catch (e_18_1) { e_18 = { error: e_18_1 }; }
        finally {
            try {
                if (_c && !_c.done && (_a = _b.return)) _a.call(_b);
            }
            finally { if (e_18) throw e_18.error; }
        }
    }
}
function outputIndexTs(outputDir) {
    var indexTs = "export * from './EntityDict';\n    export * from './Storage';\n    export * from './ActionDefDict';\n    ";
    var filename = path_1.default.join(outputDir, 'index.ts');
    (0, fs_1.writeFileSync)(filename, indexTs, { flag: 'w' });
}
function outputPackageJson(outputDir) {
    var pj = {
        "name": process.env.COMPLING_AS_LIB ? "general-app-domain" : "oak-app-domain",
        "main": "index.ts"
    };
    var filename = path_1.default.join(outputDir, 'package.json');
    (0, fs_1.writeFileSync)(filename, JSON.stringify(pj), { flag: 'w' });
}
/**
 * （从toModi的对象开始）分析可能被modi指向的对象
 */
function analyzeInModi() {
    var getRelateEntities = function (entity) {
        var result = [];
        if (ManyToOne[entity]) {
            // 用反指指针指向的对象可以忽略，因为前端不可能设计出这样的更新页面
            result = ManyToOne[entity].filter(function (ele) { return ele[1] !== 'entity'; }).map(function (ele) { return ele[0]; });
        }
        if (OneToMany[entity]) {
            result.push.apply(result, tslib_1.__spreadArray([], tslib_1.__read(OneToMany[entity].map(function (ele) { return ele[0]; })), false));
        }
        return (0, lodash_1.uniq)(result);
    };
    var setInModi = function (entity) {
        if (['Modi', 'ModiEntity', 'Oper', 'OperEntity', 'User'].includes(entity)) {
            return;
        }
        var schema = Schema[entity];
        if (schema.toModi || schema.inModi || schema.actionType === 'readOnly' || schema.static) {
            return;
        }
        schema.inModi = true;
        var related = getRelateEntities(entity);
        related.forEach(function (ele) { return setInModi(ele); });
    };
    for (var entity in Schema) {
        if (Schema[entity].toModi) {
            var related = getRelateEntities(entity);
            related.forEach(function (ele) { return setInModi(ele); });
        }
    }
}
function analyzeEntities(inputDir, relativePath) {
    var files = (0, fs_1.readdirSync)(inputDir);
    var fullFilenames = files.map(function (ele) {
        var entity = ele.slice(0, ele.indexOf('.'));
        if (env_1.RESERVED_ENTITIES.includes(entity) || env_1.RESERVED_ENTITIES.find(function (ele2) { return entity.startsWith(ele2); })) {
            throw new Error("".concat(ele, "\u662F\u7CFB\u7EDF\u4FDD\u7559\u5B57\uFF0C\u8BF7\u52FF\u4F7F\u7528\u5176\u5F53\u5BF9\u8C61\u540D\u6216\u5BF9\u8C61\u540D\u524D\u7F00"));
        }
        return "".concat(inputDir, "/").concat(ele);
    });
    var program = ts.createProgram(fullFilenames, { allowJs: true });
    files.forEach(function (filename) {
        analyzeEntity(filename, inputDir, program, relativePath);
    });
    analyzeInModi();
}
exports.analyzeEntities = analyzeEntities;
function buildSchema(outputDir) {
    addReverseRelationship();
    var printer = ts.createPrinter({ newLine: ts.NewLineKind.LineFeed });
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
exports.buildSchema = buildSchema;
