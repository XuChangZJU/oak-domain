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
const assert_1 = __importDefault(require("assert"));
const fs_1 = __importDefault(require("fs"));
const fs_extra_1 = require("fs-extra");
const ts = __importStar(require("typescript"));
const { factory } = ts;
const env_1 = require("./env");
/**
 * 将element文件编译到每个entity的目录之下，对文件中所定义的相关element，增加$v/$g/$action等常用的props
 * @param program
 * @param printer
 * @param inputDir
 * @param file
 * @param inputImportPath
 * @returns
 */
function constructElementFile(program, printer, inputDir, file) {
    const sourceFile = program.getSourceFile(`${inputDir}/${file}`);
    const filePfx = file.slice(0, file.lastIndexOf('.'));
    const statements = [];
    if (process.env.IN_OAK_DOMAIN) {
        statements.push(factory.createImportDeclaration(undefined, undefined, factory.createImportClause(false, undefined, factory.createNamespaceImport(factory.createIdentifier("Element"))), factory.createStringLiteral(`${env_1.ELEMENT_PATH_IN_OAK_DOMAIN}/${filePfx}`), undefined));
    }
    else {
        statements.push(factory.createImportDeclaration(undefined, undefined, factory.createImportClause(false, undefined, factory.createNamespaceImport(factory.createIdentifier("Element"))), factory.createStringLiteral(`../../element/${filePfx}`), undefined));
    }
    /**
     * import { FullAttr } from '../Schema';
     * interface RefValueParams {
            $v?: FullAttr;
            $value?: FullAttr;
            $g?: string;
            $global?: string;
        };
     */
    statements.push(factory.createImportDeclaration(undefined, undefined, factory.createImportClause(false, undefined, factory.createNamedImports([factory.createImportSpecifier(false, undefined, factory.createIdentifier("FullAttr"))])), factory.createStringLiteral("../Schema"), undefined), factory.createInterfaceDeclaration(undefined, undefined, factory.createIdentifier("RefValueParams"), undefined, undefined, [
        factory.createPropertySignature(undefined, factory.createIdentifier("$v"), factory.createToken(ts.SyntaxKind.QuestionToken), factory.createTypeReferenceNode(factory.createIdentifier("FullAttr"), undefined)),
        factory.createPropertySignature(undefined, factory.createIdentifier("$value"), factory.createToken(ts.SyntaxKind.QuestionToken), factory.createTypeReferenceNode(factory.createIdentifier("FullAttr"), undefined)),
        factory.createPropertySignature(undefined, factory.createIdentifier("$g"), factory.createToken(ts.SyntaxKind.QuestionToken), factory.createKeywordTypeNode(ts.SyntaxKind.StringKeyword)),
        factory.createPropertySignature(undefined, factory.createIdentifier("$global"), factory.createToken(ts.SyntaxKind.QuestionToken), factory.createKeywordTypeNode(ts.SyntaxKind.StringKeyword))
    ]));
    /**
     * import { Action } from '../Action';
     * interface RefActionParams {
            $a?: Action;
            $action?: Action;
        };
     */
    statements.push(factory.createImportDeclaration(undefined, undefined, factory.createImportClause(false, undefined, factory.createNamedImports([factory.createImportSpecifier(false, undefined, factory.createIdentifier("Action"))])), factory.createStringLiteral("../Action"), undefined), factory.createInterfaceDeclaration(undefined, undefined, factory.createIdentifier("RefActionParams"), undefined, undefined, [
        factory.createPropertySignature(undefined, factory.createIdentifier("$a"), factory.createToken(ts.SyntaxKind.QuestionToken), factory.createTypeReferenceNode(factory.createIdentifier("Action"), undefined)),
        factory.createPropertySignature(undefined, factory.createIdentifier("$action"), factory.createToken(ts.SyntaxKind.QuestionToken), factory.createTypeReferenceNode(factory.createIdentifier("Action"), undefined))
    ]));
    ts.forEachChild(sourceFile, (ele) => {
        if (ts.isFunctionDeclaration(ele) && ts.isModifier(ele.modifiers[0]) && ts.SyntaxKind.ExportKeyword === ele.modifiers[0].kind) {
            const fnName = ele.name.text;
            (0, assert_1.default)(ele.parameters.length === 1, `[ELEMENT BUILDER]文件${file}的函数${fnName}有多于一个的参数`);
            const [param] = ele.parameters;
            (0, assert_1.default)(ts.isIdentifier(param.name) && param.name.text === 'props', `[ELEMENT BUILDER]文件${file}的函数${fnName}的参数名称不是props`);
            const { type } = param;
            (0, assert_1.default)(type);
            const checker = program.getTypeChecker();
            const attributes = checker.getTypeFromTypeNode(type);
            const valueAttr = checker.getPropertyOfType(attributes, 'value');
            const onChangeAttr = checker.getPropertyOfType(attributes, 'onChange');
            const onClickAttr = checker.getPropertyOfType(attributes, 'onClick');
            const intersectionNodes = [
                factory.createIndexedAccessTypeNode(factory.createTypeReferenceNode(factory.createIdentifier("Parameters"), [factory.createTypeQueryNode(factory.createQualifiedName(factory.createIdentifier("Element"), factory.createIdentifier(fnName)))]), factory.createLiteralTypeNode(factory.createNumericLiteral("0")))
            ];
            if (valueAttr) {
                // 显示元件，加上$v和$g
                intersectionNodes.push(factory.createTypeReferenceNode(factory.createIdentifier("RefValueParams"), undefined));
            }
            else if (onClickAttr) {
                // 如果没有value但是有onClick，是action组件，加上$a
                intersectionNodes.push(factory.createTypeReferenceNode(factory.createIdentifier("RefActionParams"), undefined));
            }
            statements.push(factory.createFunctionDeclaration(undefined, [factory.createModifier(ts.SyntaxKind.ExportKeyword)], undefined, factory.createIdentifier(fnName), undefined, [factory.createParameterDeclaration(undefined, undefined, undefined, factory.createIdentifier("props"), undefined, factory.createIntersectionTypeNode(intersectionNodes), undefined)], factory.createTypeReferenceNode(factory.createIdentifier("ReturnType"), [factory.createTypeQueryNode(factory.createQualifiedName(factory.createIdentifier("Element"), factory.createIdentifier(fnName)))]), factory.createBlock([factory.createReturnStatement(factory.createCallExpression(factory.createPropertyAccessExpression(factory.createIdentifier("Element"), factory.createIdentifier(fnName)), undefined, [factory.createAsExpression(factory.createIdentifier("props"), factory.createIndexedAccessTypeNode(factory.createTypeReferenceNode(factory.createIdentifier("Parameters"), [factory.createTypeQueryNode(factory.createQualifiedName(factory.createIdentifier("Element"), factory.createIdentifier(fnName)))]), factory.createLiteralTypeNode(factory.createNumericLiteral("0"))))]))], true)));
        }
    });
    const resultFile = ts.createSourceFile("someFileName.ts", "", ts.ScriptTarget.Latest, /*setParentNodes*/ false, ts.ScriptKind.TS);
    const result = printer.printNode(ts.EmitHint.Unspecified, factory.createSourceFile(statements, factory.createToken(ts.SyntaxKind.EndOfFileToken), ts.NodeFlags.None), resultFile);
    return result;
}
function makeElementFile(inputDir, filename, outputDir, program) {
    // 对目录下面每个entity，建立对应的element文件
    const entities = fs_1.default.readdirSync(outputDir);
    const printer = ts.createPrinter({ newLine: ts.NewLineKind.LineFeed });
    entities.forEach((ele) => {
        if (fs_1.default.statSync(`${outputDir}/${ele}`).isDirectory()) {
            const elementDir = `${outputDir}/${ele}/element`;
            (0, fs_extra_1.ensureDirSync)(elementDir);
            const outputFile = `${elementDir}/${filename}`;
            if (fs_1.default.existsSync(outputFile) && process.env.NODE_ENV !== 'development') {
                throw new Error(`${outputFile}已经存在`);
            }
            const content = constructElementFile(program, printer, inputDir, filename);
            fs_1.default.writeFileSync(outputFile, content, { flag: 'w' });
        }
    });
}
function buildElements(inputDir, outputDir) {
    const files = fs_1.default.readdirSync(inputDir);
    if (!process.env.IN_OAK_DOMAIN) {
        if (!fs_1.default.existsSync(`${outputDir}/element`)) {
            fs_1.default.mkdirSync(`${outputDir}/element`);
        }
        (0, fs_extra_1.copySync)(inputDir, `${outputDir}/element`, { errorOnExist: true });
    }
    const fullFilenames = files.filter(ele => ele.endsWith('.tsx')).map(ele => `${inputDir}/${ele}`);
    const program = ts.createProgram(fullFilenames, { allowJs: true });
    files.forEach((filename) => {
        if (filename.endsWith('.tsx')) {
            makeElementFile(inputDir, filename, outputDir, program);
        }
    });
}
exports.default = buildElements;
