import { join, relative, dirname } from 'path';
import { readdirSync, statSync, existsSync, writeFileSync } from 'fs-extra';
import assert from 'assert';
import * as ts from 'typescript';
import NodeWatch from 'node-watch';
const { factory } = ts;

/**
 * 一个项目，根据其pages下的目录结构，构建出web/native工程下的router以及pageMap
 * wechatMp暂不处理
 * 项目目录结构应为：
 * 
 * -src
 * --pages
 * ---${namespace1}
 * -----${page1}
 * -------${subPage1.1}
 * -------${subPage1.2}
 * -----${page2}
 * ---${namespace2}
 * -----${page3}
 * 
 * -web
 * --src
 * ---${appName}
 * -----namespaces
 * -------${namespace1}
 * ---------index.json      （此namespace下的配置）
 * ---------pageMap.json    （编译器将pageMap注入到这里）
 * -------${namespace2}
 * -----router
 * ---------index.ts        （编译器将router.ts注入到这里）
 * 
 * -native
 * --namspaces
 * ----${namespace1}
 * -------index.json      （此namespace下的配置）
 * -------pageMap.json    （编译器将pageMap注入到这里）
 * --router
 * ----index.ts             （编译器将router.ts注入到这里）
 * 
 */

type PageDesc = {
    path: string;
    oakDisablePulldownRefresh: boolean;
    hasWeb: boolean;
    hasNative: boolean;
    hasWechatMp: boolean;
}

type NamespaceDesc = {
    pages: Record<string, PageDesc>;
}

const NameSpaceDescDict: Record<string, NamespaceDesc> = {};

function checkPageDir(dir: string, relativePath: string, ns: string, type: 'native' | 'web' | 'wechatMp') {
    let changed = false;
    const { pages } = NameSpaceDescDict[ns];
    const subdirs: string[] = [];
    const files = readdirSync(dir);
    files.forEach((file) => {
        const filepath = join(dir, file);
        const stat = statSync(filepath);
        if (stat.isFile() &&
            ['web.tsx', 'web.pc.tsx', 'render.native.tsx', 'render.ios.tsx', 'render.android.tsx', 'index.xml'].includes(
                file
            )) {
            if (!pages.hasOwnProperty(dir)) {
                const indexJsonFile = join(dir, 'index.json');
                let oakDisablePulldownRefresh = false;
                if (existsSync(indexJsonFile)) {
                    const {
                        enablePullDownRefresh = true,
                    } = require(indexJsonFile);
                    oakDisablePulldownRefresh =
                        !enablePullDownRefresh;
                }
                pages[dir] = {
                    path: relativePath.replace(/\\/g, '/'),
                    oakDisablePulldownRefresh,
                    hasNative: ['render.native.tsx', 'render.ios.tsx', 'render.android.tsx'].includes(file),
                    hasWeb: ['web.tsx', 'web.pc.tsx'].includes(file),
                    hasWechatMp: file === 'index.xml',
                };
                changed = true;
            }
            else {
                if (['render.native.tsx', 'render.ios.tsx', 'render.android.tsx'].includes(file) && type === 'native') {
                    if (pages[dir].hasNative === false) {
                        pages[dir].hasNative = true;
                        changed = true;
                    }
                }
                else if (['web.tsx', 'web.pc.tsx'].includes(file) && type === 'web') {
                    if (pages[dir].hasWeb === false) {
                        pages[dir].hasWeb = true;
                        changed = true;
                    }
                }
                else {
                    if (pages[dir].hasWechatMp === false && type === 'wechatMp') {
                        pages[dir].hasWechatMp = true;
                    }
                }
            }
        } else if (stat.isDirectory()) {
            subdirs.push(file);
        }
    });
    return {
        subdirs,
        changed,
    };
}

function traverseNsDir(nsDir: string, ns: string, type: 'native' | 'web' | 'wechatMp') {
    NameSpaceDescDict[ns] = {
        pages: {}
    };
    const { pages } = NameSpaceDescDict[ns];
    const traverse = (dir: string, relativePath: string) => {
        const { subdirs } = checkPageDir(dir, relativePath, ns, type);
        subdirs.forEach(
            (subdir) => {
                const dir2 = join(dir, subdir);
                const relativePath2 = join(relativePath, subdir);
                traverse(dir2, relativePath2);
            }
        );
    };

    traverse(nsDir, '');
}

function traversePageDir(projectDir: string, type: 'native' | 'web' | 'wechatMp') {
    const pageDir = join(projectDir, 'src', 'pages');

    const namespaces = readdirSync(pageDir);
    namespaces.forEach(
        (ns) => {
            const nsDir = join(pageDir, ns);
            const stat = statSync(nsDir);
            if (stat.isDirectory()) {
                traverseNsDir(nsDir, ns, type);
            }
        }
    );
}

function makeWebAllRouters(namespaceDir: string, projectDir: string, routerFileDir: string) {
    const nss = readdirSync(namespaceDir);

    return factory.createArrayLiteralExpression(
        nss.map(
            (ns) => {
                assert(NameSpaceDescDict[ns], `${ns}在pages下没有对应的目录`);
                const { pages } = NameSpaceDescDict[ns];
                const nsIndexJsonFile = join(namespaceDir, ns, 'index.json');
                let path2 = `/${ns}`;
                let notFound2 = '', first2 = '';
                if (existsSync(nsIndexJsonFile)) {
                    const { path, notFound, first } = require(nsIndexJsonFile);
                    if (path) {
                        path2 = path.replace(/\\/g, '/');
                    }
                    if (notFound) {
                        notFound2 = notFound.replace(/\\/g, '/');
                    }
                    if (first) {
                        first2 = first.replace(/\\/g, '/');
                        if (first2.startsWith('/')) {
                            first2 = first2.slice(1);
                        }
                    }
                }
                let firstPage;
                const children = Object.values(pages).filter(
                    (ele) => ele.hasWeb
                ).map(
                    ({ path, oakDisablePulldownRefresh }) => {
                        const properties = [
                            factory.createPropertyAssignment(
                                'path',
                                factory.createStringLiteral(path)
                            ),
                            factory.createPropertyAssignment(
                                'namespace',
                                factory.createStringLiteral(path2)
                            ),
                            factory.createPropertyAssignment(
                                'meta',
                                factory.createObjectLiteralExpression(
                                    [
                                        factory.createPropertyAssignment(
                                            'oakDisablePulldownRefresh',
                                            oakDisablePulldownRefresh ? factory.createTrue() : factory.createFalse()
                                        )
                                    ]
                                )
                            ),
                            factory.createPropertyAssignment(
                                factory.createIdentifier("Component"),
                                factory.createCallExpression(
                                    factory.createPropertyAccessExpression(
                                        factory.createIdentifier("React"),
                                        factory.createIdentifier("lazy")
                                    ),
                                    undefined,
                                    [factory.createArrowFunction(
                                        undefined,
                                        undefined,
                                        [],
                                        undefined,
                                        factory.createToken(ts.SyntaxKind.EqualsGreaterThanToken),
                                        factory.createCallExpression(
                                            factory.createIdentifier('import'),
                                            undefined,
                                            [
                                                factory.createStringLiteral(
                                                    relative(routerFileDir, join(projectDir, 'src', 'pages', ns, path)).replace(/\\/g, '/')
                                                )
                                            ]
                                        )
                                    )]
                                )
                            )
                        ];
                        if (first2 === path) {
                            const firstProperties = [...properties];
                            firstProperties.push(
                                factory.createPropertyAssignment(
                                    'isFirst',
                                    factory.createTrue()
                                )
                            );
                            firstPage = factory.createObjectLiteralExpression(
                                firstProperties,
                                true
                            );
                        }
                        return factory.createObjectLiteralExpression(
                            properties,
                            true,
                        );
                    }
                );
                if (firstPage) {
                    children.push(firstPage);
                }

                if (notFound2) {
                    children.push(
                        factory.createObjectLiteralExpression(
                            [
                                factory.createPropertyAssignment(
                                    'path',
                                    factory.createStringLiteral('*')
                                ),
                                factory.createPropertyAssignment(
                                    'namespace',
                                    factory.createStringLiteral(path2)
                                ),
                                factory.createPropertyAssignment(
                                    factory.createIdentifier("Component"),
                                    factory.createCallExpression(
                                        factory.createPropertyAccessExpression(
                                            factory.createIdentifier("React"),
                                            factory.createIdentifier("lazy")
                                        ),
                                        undefined,
                                        [factory.createArrowFunction(
                                            undefined,
                                            undefined,
                                            [],
                                            undefined,
                                            factory.createToken(ts.SyntaxKind.EqualsGreaterThanToken),
                                            factory.createCallExpression(
                                                factory.createIdentifier('import'),
                                                undefined,
                                                [
                                                    factory.createStringLiteral(
                                                        relative(routerFileDir, join(projectDir, 'src', 'pages', ns, notFound2)).replace(/\\/g, '/')
                                                    )
                                                ]
                                            )
                                        )]
                                    )
                                )
                            ],
                            true
                        )
                    )
                }

                return factory.createObjectLiteralExpression(
                    [
                        factory.createPropertyAssignment(
                            'path',
                            factory.createStringLiteral(path2)
                        ),
                        factory.createPropertyAssignment(
                            'namespace',
                            factory.createStringLiteral(path2)
                        ),
                        factory.createPropertyAssignment(
                            factory.createIdentifier("Component"),
                            factory.createCallExpression(
                                factory.createPropertyAccessExpression(
                                    factory.createIdentifier("React"),
                                    factory.createIdentifier("lazy")
                                ),
                                undefined,
                                [factory.createArrowFunction(
                                    undefined,
                                    undefined,
                                    [],
                                    undefined,
                                    factory.createToken(ts.SyntaxKind.EqualsGreaterThanToken),
                                    factory.createCallExpression(
                                        factory.createIdentifier('import'),
                                        undefined,
                                        [
                                            factory.createStringLiteral(
                                                relative(routerFileDir, join(namespaceDir, ns)).replace(/\\/g, '/')
                                            )
                                        ]
                                    )
                                )]
                            )
                        ),
                        factory.createPropertyAssignment(
                            'children',
                            factory.createArrayLiteralExpression(
                                children
                            )
                        )
                    ],
                    true
                )
            }
        ),
        true
    );
}

function judgeUseOakRouterBuilder(statements: ts.NodeArray<ts.Statement>) {
    const stmt = statements[0];
    return ts.isExpressionStatement(stmt) && ts.isStringLiteral(stmt.expression) && stmt.expression.text === 'use oak router builder';
}

function outputInWebAppDir(appDir: string) {
    const routerFileName = join(appDir, 'router', 'allRouters.ts');
    if (existsSync(routerFileName)) {
        const program = ts.createProgram([routerFileName], {
            removeComments: false,
        });
        const routerFile = program.getSourceFile(routerFileName);
        assert(routerFile);
        const namespaceDir = join(appDir, 'namespaces');
        const { statements } = routerFile;
        if (judgeUseOakRouterBuilder(statements)) {
            statements.forEach(
                (statement) => {
                    if (ts.isVariableStatement(statement)) {
                        const declaration = statement.declarationList.declarations.find(
                            declaration => ts.isIdentifier(declaration.name) && declaration.name.text === 'allRouters'
                        );
                        if (declaration) {
                            Object.assign(declaration, {
                                initializer: makeWebAllRouters(namespaceDir, join(appDir, '../../../..'), dirname(routerFileName))
                            });
                        }
                    }
                }
            );


            const printer = ts.createPrinter({ newLine: ts.NewLineKind.LineFeed, removeComments: false });
            const result = printer.printNode(
                ts.EmitHint.Unspecified,
                routerFile,
                routerFile,
            );

            writeFileSync(routerFileName, result);
        }
    }
    else {
        console.warn(`${appDir}的目录结构未按照标准建立，缺少了${routerFileName}`);
    }
}

function outputInWebDir(dir: string) {
    const srcAppDir = join(dir, 'src', 'app');
    const apps = readdirSync(srcAppDir);
    apps.forEach(
        (app) => {
            const appDir = join(srcAppDir, app);
            const stat = statSync(appDir);

            if (stat.isDirectory()) {
                outputInWebAppDir(appDir);
            }
        }
    )
}

function watchDir(projectDir: string, startupDir: string, type: 'native' | 'web' | 'wechatMp') {
    const srcPageDir = join(projectDir, 'src', 'pages');
    console.log('watch dir ', srcPageDir);

    if (startupDir.startsWith('web')) {
        const srcAppDir = join(projectDir, startupDir, 'src', 'app');
        const apps = readdirSync(srcAppDir);
        const tryOutputAppDir = (ns: string) => {            
            apps.forEach(
                (app) => {
                    const appDir = join(srcAppDir, app);
                    const namespaceDir = join(appDir, 'namespaces');
                    const namespaces = readdirSync(namespaceDir);
                    if (namespaces.includes(ns)) {
                        outputInWebAppDir(appDir);
                    }
                }
            );
        }
        
        NodeWatch(srcPageDir, {
            recursive: true,
            filter: new RegExp('web\.tsx|web\.pc\.tsx|index\.xml|render\.(native|ios|android)\.tsx'),
        }, (evt, filepath) => {
            const dir = dirname(filepath);
            const relativeDir = relative(join(projectDir, 'src', 'pages'), filepath);
            const ns = relativeDir.split('\\')[0];
            const relativePath = relative(ns, dirname(relativeDir));
            const { pages } = NameSpaceDescDict[ns];
            console.log(filepath, dir, ns);
            if (evt === 'remove') {
                if (existsSync(dir)) {
                    const { changed } = checkPageDir(dir, relativePath, ns, type);
                    if (changed) {
                        tryOutputAppDir(ns);
                    }
                }
                else {
                    delete pages[dir];
                    tryOutputAppDir(ns);
                }
            }
            else {
                const { changed } = checkPageDir(dir, relativePath, ns, type);
                if (changed) {
                    tryOutputAppDir(ns);
                }
            }
        });
    }
}

export function buildRouter(projectDir: string, startupDir: string, watch?: boolean) {
    const type = startupDir.startsWith('web') ? 'web' : (startupDir.startsWith('native') ? 'native' : 'wechatMp');
    traversePageDir(projectDir, type);

    const subDir = readdirSync(projectDir);
    assert(subDir.includes(startupDir));

    if (startupDir.startsWith('web')) {
        outputInWebDir(join(projectDir, startupDir));
    }

    // todo native

    if (watch) {
        watchDir(projectDir, startupDir, type);
    }
}