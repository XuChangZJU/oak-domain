import assert from 'assert';
import * as ts from 'typescript';
const { factory } = ts;
import { join } from 'path';
import { v4 } from 'uuid';
import fs from 'fs';
import { OAK_EXTERNAL_LIBS_FILEPATH } from './env';
import { unescapeUnicode } from '../utils/string';

/**
 * 将一个object展开编译为一棵语法树，只有string和object两种键值对象
 * @param data 
 */
function transferObjectToObjectLiteral(data: Record<string, any>): ts.ObjectLiteralExpression {
    return factory.createObjectLiteralExpression(
        Object.keys(data).map(
            (k) => {
                const type = typeof data[k];
                if (type === 'string') {
                    return factory.createPropertyAssignment(
                        factory.createStringLiteral(k),
                        factory.createStringLiteral(data[k])
                    );
                }
                assert(type === 'object');
                return factory.createPropertyAssignment(
                    factory.createStringLiteral(k),
                    transferObjectToObjectLiteral(data[k])
                );
            }
        ),
        true
    )
}

/**
 * 这个类的作用是把项目和所有相关的模块下的locales编译成为src/data/i18n中的数据
 */
export default class LocaleBuilder {
    asLib: boolean
    dependencies: string[];
    pwd: string;
    locales: Record<string, [string, string, string, object]>;      // key: namespace, value: [module, position, language, data]

    constructor(asLib?: boolean) {
        const pwd = process.cwd();
        this.pwd = pwd;
        this.asLib = !!asLib;
        const dependencyFile = OAK_EXTERNAL_LIBS_FILEPATH(join(pwd, 'src'));
        if (fs.existsSync(dependencyFile)) {
            this.dependencies = require(dependencyFile);
        }
        else {
            this.dependencies = [];
        }
        this.locales = {};
    }

    /**
     * 将locales输出成为data/i18n.ts中的数据
     * 如果有Dependency需要引出来
     */
    private outputDataFile() {
        const statements: ts.Statement[] = [
            factory.createImportDeclaration(
                undefined,
                undefined,
                factory.createImportClause(
                    false,
                    undefined,
                    factory.createNamedImports([factory.createImportSpecifier(
                        false,
                        factory.createIdentifier("CreateOperationData"),
                        factory.createIdentifier("I18n")
                    )])
                ),
                factory.createStringLiteral("../oak-app-domain/I18n/Schema"),
                undefined
            )
        ];

        if (this.dependencies) {
            this.dependencies.forEach(
                (ele, idx) => statements.push(
                    factory.createImportDeclaration(
                        undefined,
                        undefined,
                        factory.createImportClause(
                            false,
                            factory.createIdentifier(`i18ns${idx}`),
                            undefined
                        ),
                        factory.createStringLiteral(`${ele}/lib/data/i18n`),
                        undefined
                    )
                )
            )
        }

        statements.push(
            factory.createVariableStatement(
                undefined,
                factory.createVariableDeclarationList(
                    [factory.createVariableDeclaration(
                        factory.createIdentifier("i18ns"),
                        undefined,
                        factory.createArrayTypeNode(factory.createTypeReferenceNode(
                            factory.createIdentifier("I18n"),
                            undefined
                        )),
                        factory.createArrayLiteralExpression(
                            Object.keys(this.locales).map(
                                (k) => {
                                    const [module, position, language, data] = this.locales[k];
                                    return factory.createObjectLiteralExpression(
                                        [
                                            factory.createPropertyAssignment(
                                                factory.createIdentifier("id"),
                                                factory.createStringLiteral(v4())
                                            ),
                                            factory.createPropertyAssignment(
                                                factory.createIdentifier("namespace"),
                                                factory.createStringLiteral(k)
                                            ),
                                            factory.createPropertyAssignment(
                                                factory.createIdentifier("language"),
                                                factory.createStringLiteral(language)
                                            ),
                                            factory.createPropertyAssignment(
                                                factory.createIdentifier("module"),
                                                factory.createStringLiteral(module)
                                            ),
                                            factory.createPropertyAssignment(
                                                factory.createIdentifier("position"),
                                                factory.createStringLiteral(position)
                                            ),
                                            factory.createPropertyAssignment(
                                                factory.createIdentifier("data"),
                                                transferObjectToObjectLiteral(data),
                                            )
                                        ],
                                        true
                                    )
                                }
                            ),
                            true
                        )

                    )],
                    ts.NodeFlags.Const
                )
            ),
        );

        if (this.dependencies.length > 0) {
            statements.push(
                factory.createExportAssignment(
                    undefined,
                    undefined,
                    undefined,
                    factory.createCallExpression(
                        factory.createPropertyAccessExpression(
                            factory.createIdentifier("i18ns"),
                            factory.createIdentifier("concat")
                        ),
                        undefined,
                        this.dependencies.map(
                            (ele, idx) => factory.createIdentifier(`i18ns${idx}`)
                        )
                    )
                )
            );
        }
        else {
            statements.push(
                factory.createExportAssignment(
                    undefined,
                    undefined,
                    undefined,
                    factory.createIdentifier("i18ns")
                )
            );
        }

        const printer = ts.createPrinter({ newLine: ts.NewLineKind.LineFeed });
        const result = printer.printList(
            ts.ListFormat.SourceFileStatements,
            factory.createNodeArray(statements),
            ts.createSourceFile("someFileName.ts", "", ts.ScriptTarget.Latest, false, ts.ScriptKind.TS));
        const filename = join(this.pwd, 'src', 'data', 'i18n.ts');
        const result2 = unescapeUnicode(`// 本文件为自动编译产生，请勿直接修改\n\n${result}`);
        fs.writeFileSync(filename, result2, { flag: 'w' });
    }

    private parseFile(module: string, namespace: string, position: string, filename: string, filepath: string, watch?: boolean) {
        const language = filename.split('.')[0];
        const data = require(filepath);
        const ns = `${module}-${namespace}`;
        this.locales[ns] = [module, position, language, data];

        if (watch) {
            fs.watch(filepath, () => {
                const data = require(filepath);
                this.locales[ns] = [module, position, language, data];
                this.outputDataFile();
            });
        }
    }

    private traverse(module: string, nsPrefix: string, position: string, dirPath: string, inLocale: boolean, localeFolderName: string, watch?: boolean) {
        const files = fs.readdirSync(dirPath);
        files.forEach(
            (file) => {
                const filepath = join(dirPath, file);
                const stat = fs.statSync(filepath);
                if (stat.isFile() && inLocale && file.endsWith('.json')) {
                    this.parseFile(module, nsPrefix, position, file, filepath, watch);
                }
                else if (stat.isDirectory() && !inLocale) {
                    const isLocaleFolder = file === localeFolderName;
                    this.traverse(module, isLocaleFolder ? nsPrefix : `${nsPrefix}-${file}`, isLocaleFolder ? position : join(position, file), join(dirPath, file), isLocaleFolder, localeFolderName, watch);
                }
            }
        );
    }

    private buildproject(root: string, src?: boolean, watch?: boolean) {
        const packageJson = join(root, 'package.json');
        const { name } = require(packageJson);
        const pagePath = join(src ? 'src' : 'lib', 'pages');
        this.traverse(name, 'p', 'pages', join(root, pagePath), false, 'locales', watch);
        const componentPath = join(src ? 'src' : 'lib', 'components');
        this.traverse(name, 'c', 'components', join(root, componentPath), false, 'locales', watch);

        const localePath = join(src ? 'src' : 'lib', 'locales');
        if (fs.existsSync(localePath)) {
            const files = fs.readdirSync(localePath);
            files.forEach(
                (file) => {
                    const filepath = join(localePath, file);
                    const stat = fs.statSync(filepath);
                    if (stat.isDirectory()) {
                        this.traverse(name, `l-${file}`, join('locales', file), join(root, localePath, file), true, file, watch);
                    }
                }
            );
        }
    }

    build(watch?: boolean) {
        this.buildproject(this.pwd, true, watch);
        if (!this.asLib) {
            // 如果不是lib，把front里的数据也处理掉
            const fbPath = join(this.pwd, 'node_modules', 'oak-frontend-base');
            this.buildproject(fbPath, false, watch)
        }
        this.outputDataFile();
    }
}