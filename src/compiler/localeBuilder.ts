import assert from 'assert';
import * as ts from 'typescript';
const { factory } = ts;
import { join } from 'path';
import { Hash, createHash } from 'crypto';
import fs from 'fs';
import { OAK_EXTERNAL_LIBS_FILEPATH } from './env';
import { firstLetterLowerCase, unescapeUnicode } from '../utils/string';

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
    hash: Hash;

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
        this.hash = createHash('md5');
    }

    /**
     * 将locales输出成为data/i18n.ts中的数据
     * 如果有Dependency需要引出来
     */
    private outputDataFile() {
        const statements: ts.Statement[] = [
            factory.createImportDeclaration(
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

        // 改为在初始化时合并
        /*  if (this.dependencies) {
             this.dependencies.forEach(
                 (ele, idx) => statements.push(
                     factory.createImportDeclaration(
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
         } */

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

                                    // 用哈希计算来保证id唯一性
                                    const h = this.hash.copy();
                                    h.update(`${k}-${language}`);
                                    const id = h.digest('hex');
                                    assert(id.length <= 36);

                                    return factory.createObjectLiteralExpression(
                                        [
                                            factory.createPropertyAssignment(
                                                factory.createIdentifier("id"),
                                                factory.createStringLiteral(id)
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

        /* if (this.dependencies.length > 0) {
            statements.push(
                factory.createExportAssignment(
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
        else { */
        statements.push(
            factory.createExportAssignment(
                undefined,
                undefined,
                factory.createIdentifier("i18ns")
            )
        );
        /* } */

        const printer = ts.createPrinter({ newLine: ts.NewLineKind.LineFeed });
        const result = printer.printList(
            ts.ListFormat.SourceFileStatements,
            factory.createNodeArray(statements),
            ts.createSourceFile("someFileName.ts", "", ts.ScriptTarget.Latest, false, ts.ScriptKind.TS));
        const filename = join(this.pwd, 'src', 'data', 'i18n.ts');
        const result2 = unescapeUnicode(`// 本文件为自动编译产生，请勿直接修改\n\n${result}`);
        fs.writeFileSync(filename, result2, { flag: 'w' });
    }

    /**
     * 这里不能直接用require, webpack貌似有缓存
     * @param filepath 
     */
    private readLocaleFileContent(filepath: string) {
        assert(filepath.endsWith('.json'));
        const content = fs.readFileSync(filepath, {
            encoding: 'utf-8',
        });
        return JSON.parse(content);
    }

    private parseFile(module: string, namespace: string, position: string, filename: string, filepath: string, watch?: boolean) {
        const language = (filename.split('.')[0]).replace('_', '-');            // 历史原因，会命名成zh_CN.json
        const data = this.readLocaleFileContent(filepath);
        const ns = module ? `${module}-${namespace}` : firstLetterLowerCase(namespace);
        this.locales[ns] = [module, position.replace(/\\/g, '/'), language, data];

        if (watch) {
            fs.watch(filepath, () => {
                const data = this.readLocaleFileContent(filepath);
                this.locales[ns] = [module, position.replace(/\\/g, '/'), language, data];
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
                    const nsPrefix2 = nsPrefix ? `${nsPrefix}-${file}` : file;
                    const isLocaleFolder = file === localeFolderName;
                    this.traverse(module, isLocaleFolder ? nsPrefix : nsPrefix2, isLocaleFolder ? position : join(position, file), join(dirPath, file), isLocaleFolder, localeFolderName, watch);
                }
            }
        );
    }

    private buildproject(root: string, src?: boolean, watch?: boolean) {
        const packageJson = join(root, 'package.json');
        const { name } = require(packageJson);
        const pagePath = join(root, src ? 'src' : 'lib', 'pages');//编译i18时font中的componentPath缺少根目录导致编译不出
        if (fs.existsSync(pagePath)) {
            this.traverse(name, 'p', pagePath, join(root, pagePath), false, 'locales', watch);
        }

        const componentPath = join(root, src ? 'src' : 'lib', 'components');
        if (fs.existsSync(componentPath)) {
            this.traverse(name, 'c', componentPath, join(root, componentPath), false, 'locales', watch);
        }

        const localePath = join(root, src ? 'src' : 'lib', 'locales');
        if (fs.existsSync(localePath)) {
            const files = fs.readdirSync(localePath);
            files.forEach(
                (file) => {
                    const filepath = join(localePath, file);
                    const stat = fs.statSync(filepath);
                    if (stat.isDirectory()) {
                        this.traverse(name, `l-${file}`, join('locales', file), join(localePath, file), true, file, watch);
                    }
                }
            );
        }

        if (!this.asLib && src) {
            // 不是lib的话将oak-app-domain中的对象的locale也收集起来
            const domainPath = join(root, 'src', 'oak-app-domain');
            if (fs.existsSync(domainPath)) {
                this.traverse('', '', 'oak-app-domain', domainPath, false, 'locales', watch);
            }

            // 还有web和wechatMp的目录            
            const webSrcPath = join('web', 'src');
            this.traverse(name, 'w', webSrcPath, join(root, webSrcPath), false, 'locales', watch);

            // 小程序可能有多于一个，按规范用wechatMp, wechatMp2这样命名
            const wechatMpSrcPath = join('wechatMp', 'src');
            this.traverse(name, 'wmp', wechatMpSrcPath, join(root, webSrcPath), false, 'locales', watch);
            let iter = 1;
            while (true) {
                const mpSrcPath = `${wechatMpSrcPath}${iter}`;
                if (fs.existsSync(join(root, mpSrcPath))) {
                    this.traverse(name, `wmp${iter}`, mpSrcPath, join(root, mpSrcPath), false, 'locales', watch);
                    iter++;
                }
                else {
                    break;
                }
            }

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