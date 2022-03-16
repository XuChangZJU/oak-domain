import assert from 'assert';
import fs from 'fs';
import { copySync, ensureDirSync } from 'fs-extra';
import { assign, cloneDeep, keys, uniq } from 'lodash';
import * as ts from 'typescript';
const { factory } = ts;
import {
    ELEMENT_PATH_IN_OAK_DOMAIN,
} from './env';

/**
 * 将element文件编译到每个entity的目录之下，对文件中所定义的相关element，增加$v/$g/$action等常用的props
 * @param program 
 * @param printer 
 * @param inputDir 
 * @param file 
 * @param inputImportPath 
 * @returns 
 */
function constructElementFile(program: ts.Program, printer: ts.Printer, inputDir: string, file: string): string {
    const sourceFile = program.getSourceFile(`${inputDir}/${file}`);

    const filePfx = file.slice(0, file.lastIndexOf('.'));
    const statements = [];
    if (process.env.IN_OAK_DOMAIN) {
        statements.push(
            factory.createImportDeclaration(
                undefined,
                undefined,
                factory.createImportClause(
                    false,
                    undefined,
                    factory.createNamespaceImport(factory.createIdentifier("Element"))
                ),
                factory.createStringLiteral(`${ELEMENT_PATH_IN_OAK_DOMAIN}/${filePfx}`),
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
                    factory.createNamespaceImport(factory.createIdentifier("Element"))
                ),
                factory.createStringLiteral(`../../element/${filePfx}`),
                undefined
            )
        );
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
                    factory.createIdentifier("FullAttr")
                )])
            ),
            factory.createStringLiteral("../Schema"),
            undefined
        ),
        factory.createInterfaceDeclaration(
            undefined,
            undefined,
            factory.createIdentifier("RefValueParams"),
            undefined,
            undefined,
            [
                factory.createPropertySignature(
                    undefined,
                    factory.createIdentifier("$v"),
                    factory.createToken(ts.SyntaxKind.QuestionToken),
                    factory.createTypeReferenceNode(
                        factory.createIdentifier("FullAttr"),
                        undefined
                    )
                ),
                factory.createPropertySignature(
                    undefined,
                    factory.createIdentifier("$value"),
                    factory.createToken(ts.SyntaxKind.QuestionToken),
                    factory.createTypeReferenceNode(
                        factory.createIdentifier("FullAttr"),
                        undefined
                    )
                ),
                factory.createPropertySignature(
                    undefined,
                    factory.createIdentifier("$g"),
                    factory.createToken(ts.SyntaxKind.QuestionToken),
                    factory.createKeywordTypeNode(ts.SyntaxKind.StringKeyword)
                ),
                factory.createPropertySignature(
                    undefined,
                    factory.createIdentifier("$global"),
                    factory.createToken(ts.SyntaxKind.QuestionToken),
                    factory.createKeywordTypeNode(ts.SyntaxKind.StringKeyword)
                )
            ]
        )

    );
    /**
     * import { Action } from '../Action';
     * interface RefActionParams {
            $a?: Action;
            $action?: Action;
        };
     */
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
                    factory.createIdentifier("Action")
                )])
            ),
            factory.createStringLiteral("../Action"),
            undefined
        ),
        factory.createInterfaceDeclaration(
            undefined,
            undefined,
            factory.createIdentifier("RefActionParams"),
            undefined,
            undefined,
            [
                factory.createPropertySignature(
                    undefined,
                    factory.createIdentifier("$a"),
                    factory.createToken(ts.SyntaxKind.QuestionToken),
                    factory.createTypeReferenceNode(
                        factory.createIdentifier("Action"),
                        undefined
                    )
                ),
                factory.createPropertySignature(
                    undefined,
                    factory.createIdentifier("$action"),
                    factory.createToken(ts.SyntaxKind.QuestionToken),
                    factory.createTypeReferenceNode(
                        factory.createIdentifier("Action"),
                        undefined
                    )
                )
            ]
        )
    );

    ts.forEachChild(sourceFile!, (ele) => {
        if (ts.isFunctionDeclaration(ele) && ts.isModifier(ele.modifiers![0]) && ts.SyntaxKind.ExportKeyword === ele.modifiers![0]!.kind) {
            const fnName = ele.name!.text;
            assert(ele.parameters.length === 1, `[ELEMENT BUILDER]文件${file}的函数${fnName}有多于一个的参数`);
            const [param] = ele.parameters;
            assert(ts.isIdentifier(param.name) && param.name.text === 'props', `[ELEMENT BUILDER]文件${file}的函数${fnName}的参数名称不是props`);
            const { type } = param;
            assert(type);

            const checker = program.getTypeChecker();
            const attributes = checker.getTypeFromTypeNode(type);
            const valueAttr = checker.getPropertyOfType(attributes, 'value');
            const onChangeAttr = checker.getPropertyOfType(attributes, 'onChange');
            const onClickAttr = checker.getPropertyOfType(attributes, 'onClick');

            const intersectionNodes: ts.TypeNode[] = [
                factory.createIndexedAccessTypeNode(
                    factory.createTypeReferenceNode(
                        factory.createIdentifier("Parameters"),
                        [factory.createTypeQueryNode(factory.createQualifiedName(
                            factory.createIdentifier("Element"),
                            factory.createIdentifier(fnName)
                        ))]
                    ),
                    factory.createLiteralTypeNode(factory.createNumericLiteral("0"))
                )
            ];

            if (valueAttr) {
                // 显示元件，加上$v和$g
                intersectionNodes.push(
                    factory.createTypeReferenceNode(
                        factory.createIdentifier("RefValueParams"),
                        undefined
                    )
                );
            }
            else if (onClickAttr) {
                // 如果没有value但是有onClick，是action组件，加上$a
                intersectionNodes.push(
                    factory.createTypeReferenceNode(
                        factory.createIdentifier("RefActionParams"),
                        undefined
                    )
                );

            }


            statements.push(
                factory.createFunctionDeclaration(
                    undefined,
                    [factory.createModifier(ts.SyntaxKind.ExportKeyword)],
                    undefined,
                    factory.createIdentifier(fnName),
                    undefined,
                    [factory.createParameterDeclaration(
                        undefined,
                        undefined,
                        undefined,
                        factory.createIdentifier("props"),
                        undefined,
                        factory.createIntersectionTypeNode(
                            intersectionNodes
                        ),
                        undefined
                    )],
                    factory.createTypeReferenceNode(
                        factory.createIdentifier("ReturnType"),
                        [factory.createTypeQueryNode(factory.createQualifiedName(
                            factory.createIdentifier("Element"),
                            factory.createIdentifier(fnName)
                        ))]
                    ),
                    factory.createBlock(
                        [factory.createReturnStatement(factory.createCallExpression(
                            factory.createPropertyAccessExpression(
                                factory.createIdentifier("Element"),
                                factory.createIdentifier(fnName)
                            ),
                            undefined,
                            [factory.createAsExpression(
                                factory.createIdentifier("props"),
                                factory.createIndexedAccessTypeNode(
                                    factory.createTypeReferenceNode(
                                        factory.createIdentifier("Parameters"),
                                        [factory.createTypeQueryNode(factory.createQualifiedName(
                                            factory.createIdentifier("Element"),
                                            factory.createIdentifier(fnName)
                                        ))]
                                    ),
                                    factory.createLiteralTypeNode(factory.createNumericLiteral("0"))
                                )
                            )]
                        ))],
                        true
                    )
                )
            );
        }
    });

    const resultFile = ts.createSourceFile("someFileName.ts", "", ts.ScriptTarget.Latest, /*setParentNodes*/ false, ts.ScriptKind.TS);
    const result = printer.printNode(
        ts.EmitHint.Unspecified,
        factory.createSourceFile(statements, factory.createToken(ts.SyntaxKind.EndOfFileToken),
            ts.NodeFlags.None),
        resultFile
    );

    return result;
}

function makeElementFile(inputDir: string, filename: string, outputDir: string, program: ts.Program) {
    // 对目录下面每个entity，建立对应的element文件
    const entities = fs.readdirSync(outputDir);
    const printer = ts.createPrinter({ newLine: ts.NewLineKind.LineFeed });

    entities.forEach(
        (ele) => {
            if (fs.statSync(`${outputDir}/${ele}`).isDirectory()) {
                const elementDir = `${outputDir}/${ele}/element`;
                ensureDirSync(elementDir);
                const outputFile = `${elementDir}/${filename}`;
                if (fs.existsSync(outputFile) && process.env.NODE_ENV !== 'development') {
                    throw new Error(`${outputFile}已经存在`);
                }

                const content = constructElementFile(program, printer, inputDir, filename);

                fs.writeFileSync(outputFile, content, { flag: 'w' });
            }
        }
    );
}

export default function buildElements(inputDir: string, outputDir: string) {
    const files = fs.readdirSync(inputDir);

    if (!process.env.IN_OAK_DOMAIN) {
        if (!fs.existsSync(`${outputDir}/element`)) {
            fs.mkdirSync(`${outputDir}/element`);
        }
        copySync(inputDir, `${outputDir}/element`, { errorOnExist: true });
    }

    const fullFilenames = files.filter(
        ele => ele.endsWith('.tsx')
    ).map(
        ele => `${inputDir}/${ele}`
    );
    const program = ts.createProgram(fullFilenames, { allowJs: true });

    files.forEach(
        (filename) => {
            if (filename.endsWith('.tsx')) {
                makeElementFile(inputDir, filename, outputDir, program);
            }
        }
    );
}