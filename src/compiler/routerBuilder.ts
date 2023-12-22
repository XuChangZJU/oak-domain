import { join } from 'path';
import { readdirSync, statSync, existsSync } from 'fs-extra';
import assert from 'assert';
import * as ts from 'typescript';
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

function traverseNsDir(nsDir: string, ns: string) {
    NameSpaceDescDict[ns] = {
        pages: {}
    };
    const { pages } = NameSpaceDescDict[ns];
    const traverse = (dir: string, relativePath: string) => {
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
                }
                else {
                    if (['render.native.tsx', 'render.ios.tsx', 'render.android.tsx'].includes(file)) {
                        pages[dir].hasNative = true;
                    }
                    else if (['web.tsx', 'web.pc.tsx'].includes(file)) {
                        pages[dir].hasWeb = true;
                    }
                    else {
                        pages[dir].hasWechatMp = true;
                    }
                }
            } else if (stat.isDirectory()) {
                const dir2 = join(dir, file);
                const relativePath2 = join(relativePath, file);
                traverse(dir2, relativePath2);
            }
        });
    };

    traverse(nsDir, '');
}

function traversePageDir(projectDir: string) {
    const pageDir = join(projectDir, 'src', 'pages');

    const namespaces = readdirSync(pageDir);
    namespaces.forEach(
        (ns) => {
            const nsDir = join(pageDir, ns);
            const stat = statSync(nsDir);
            if (stat.isDirectory()) {
                traverseNsDir(nsDir, ns);
            }
        }
    );
}


function outputInWebDir(dir: string, ns?: string) {
    const srcAppDir = join (dir, 'src', 'app');
    const apps = readdirSync(srcAppDir);
    apps.forEach(
        (app) => {
            const appDir = join(srcAppDir, app);
            const stat = statSync(appDir);

            if (stat.isDirectory()) {
                const routerFileName = join(appDir, 'router', 'index.ts');
                const namespaceDir = join(appDir, 'namespaces');
                const program = ts.createProgram([routerFileName], {});
                const routerFile = program.getSourceFile(routerFileName);
                assert(routerFile);
                if (routerFile.text.includes('using-oak-router-builder')) {
                    routerFile.statements.forEach(
                        (statement) => {
                            if (ts.isVariableStatement(statement)) {
                                statement.declarationList.declarations.forEach(
                                    (declaration) => {
                                        if (ts.isIdentifier(declaration.name) && declaration.name.text === 'allRouters') {
                                            const { initializer } = declaration;

                                            console.log(initializer);
                                        }
                                    }
                                )
                            }
                        }
                    );
                }


                const nss = readdirSync(namespaceDir);

                if (ns) {
                    assert(nss.includes(ns));
                }                
            }
        }
    )
}

export function buildRouter(projectDir: string) {
    traversePageDir(projectDir);

    const subDir = readdirSync(projectDir);

    subDir.forEach(
        (dirname) => {
            if (dirname.startsWith('web')) {
                const webPrjDir = join(projectDir, dirname);
                const stat = statSync(webPrjDir);
                if (stat.isDirectory()) {
                    outputInWebDir(webPrjDir);
                }
            }
        }
    )
}