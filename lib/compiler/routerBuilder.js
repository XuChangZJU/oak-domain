"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.buildRouter = void 0;
const tslib_1 = require("tslib");
const path_1 = require("path");
const fs_extra_1 = require("fs-extra");
const assert_1 = tslib_1.__importDefault(require("assert"));
const ts = tslib_1.__importStar(require("typescript"));
const node_watch_1 = tslib_1.__importDefault(require("node-watch"));
const { factory } = ts;
const NameSpaceDescDict = {};
function checkPageDir(dir, relativePath, ns, type) {
    let changed = false;
    const { pages } = NameSpaceDescDict[ns];
    const subdirs = [];
    const files = (0, fs_extra_1.readdirSync)(dir);
    files.forEach((file) => {
        const filepath = (0, path_1.join)(dir, file);
        const stat = (0, fs_extra_1.statSync)(filepath);
        if (stat.isFile() &&
            ['web.tsx', 'web.pc.tsx', 'render.native.tsx', 'render.ios.tsx', 'render.android.tsx', 'index.xml'].includes(file)) {
            if (!pages.hasOwnProperty(dir)) {
                const indexJsonFile = (0, path_1.join)(dir, 'index.json');
                let oakDisablePulldownRefresh = false;
                if ((0, fs_extra_1.existsSync)(indexJsonFile)) {
                    const { enablePullDownRefresh = true, } = require(indexJsonFile);
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
        }
        else if (stat.isDirectory()) {
            subdirs.push(file);
        }
    });
    return {
        subdirs,
        changed,
    };
}
function traverseNsDir(nsDir, ns, type) {
    NameSpaceDescDict[ns] = {
        pages: {}
    };
    const { pages } = NameSpaceDescDict[ns];
    const traverse = (dir, relativePath) => {
        const { subdirs } = checkPageDir(dir, relativePath, ns, type);
        subdirs.forEach((subdir) => {
            const dir2 = (0, path_1.join)(dir, subdir);
            const relativePath2 = (0, path_1.join)(relativePath, subdir);
            traverse(dir2, relativePath2);
        });
    };
    traverse(nsDir, '');
}
function traversePageDir(projectDir, type) {
    const pageDir = (0, path_1.join)(projectDir, 'src', 'pages');
    const namespaces = (0, fs_extra_1.readdirSync)(pageDir);
    namespaces.forEach((ns) => {
        const nsDir = (0, path_1.join)(pageDir, ns);
        const stat = (0, fs_extra_1.statSync)(nsDir);
        if (stat.isDirectory()) {
            traverseNsDir(nsDir, ns, type);
        }
    });
}
function makeWebAllRouters(namespaceDir, projectDir, routerFileDir) {
    const nss = (0, fs_extra_1.readdirSync)(namespaceDir);
    return factory.createArrayLiteralExpression(nss.map((ns) => {
        (0, assert_1.default)(NameSpaceDescDict[ns], `${ns}在pages下没有对应的目录`);
        const { pages } = NameSpaceDescDict[ns];
        const nsIndexJsonFile = (0, path_1.join)(namespaceDir, ns, 'index.json');
        let path2 = `/${ns}`;
        let notFound2 = '', first2 = '';
        if ((0, fs_extra_1.existsSync)(nsIndexJsonFile)) {
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
        const children = Object.values(pages).filter((ele) => ele.hasWeb).map(({ path, oakDisablePulldownRefresh }) => {
            const properties = [
                factory.createPropertyAssignment('path', factory.createStringLiteral(path)),
                factory.createPropertyAssignment('namespace', factory.createStringLiteral(path2)),
                factory.createPropertyAssignment('meta', factory.createObjectLiteralExpression([
                    factory.createPropertyAssignment('oakDisablePulldownRefresh', oakDisablePulldownRefresh ? factory.createTrue() : factory.createFalse())
                ])),
                factory.createPropertyAssignment(factory.createIdentifier("Component"), factory.createCallExpression(factory.createPropertyAccessExpression(factory.createIdentifier("React"), factory.createIdentifier("lazy")), undefined, [factory.createArrowFunction(undefined, undefined, [], undefined, factory.createToken(ts.SyntaxKind.EqualsGreaterThanToken), factory.createCallExpression(factory.createIdentifier('import'), undefined, [
                        factory.createStringLiteral((0, path_1.relative)(routerFileDir, (0, path_1.join)(projectDir, 'src', 'pages', ns, path)).replace(/\\/g, '/'))
                    ]))]))
            ];
            if (first2 === path) {
                const firstProperties = [...properties];
                firstProperties.push(factory.createPropertyAssignment('isFirst', factory.createTrue()));
                firstPage = factory.createObjectLiteralExpression(firstProperties, true);
            }
            return factory.createObjectLiteralExpression(properties, true);
        });
        if (firstPage) {
            children.push(firstPage);
        }
        if (notFound2) {
            children.push(factory.createObjectLiteralExpression([
                factory.createPropertyAssignment('path', factory.createStringLiteral('*')),
                factory.createPropertyAssignment('namespace', factory.createStringLiteral(path2)),
                factory.createPropertyAssignment(factory.createIdentifier("Component"), factory.createCallExpression(factory.createPropertyAccessExpression(factory.createIdentifier("React"), factory.createIdentifier("lazy")), undefined, [factory.createArrowFunction(undefined, undefined, [], undefined, factory.createToken(ts.SyntaxKind.EqualsGreaterThanToken), factory.createCallExpression(factory.createIdentifier('import'), undefined, [
                        factory.createStringLiteral((0, path_1.relative)(routerFileDir, (0, path_1.join)(projectDir, 'src', 'pages', ns, notFound2)).replace(/\\/g, '/'))
                    ]))]))
            ], true));
        }
        return factory.createObjectLiteralExpression([
            factory.createPropertyAssignment('path', factory.createStringLiteral(path2)),
            factory.createPropertyAssignment('namespace', factory.createStringLiteral(path2)),
            factory.createPropertyAssignment(factory.createIdentifier("Component"), factory.createCallExpression(factory.createPropertyAccessExpression(factory.createIdentifier("React"), factory.createIdentifier("lazy")), undefined, [factory.createArrowFunction(undefined, undefined, [], undefined, factory.createToken(ts.SyntaxKind.EqualsGreaterThanToken), factory.createCallExpression(factory.createIdentifier('import'), undefined, [
                    factory.createStringLiteral((0, path_1.relative)(routerFileDir, (0, path_1.join)(namespaceDir, ns)).replace(/\\/g, '/'))
                ]))])),
            factory.createPropertyAssignment('children', factory.createArrayLiteralExpression(children))
        ], true);
    }), true);
}
function judgeUseOakRouterBuilder(statements) {
    const stmt = statements[0];
    return ts.isExpressionStatement(stmt) && ts.isStringLiteral(stmt.expression) && stmt.expression.text === 'use oak router builder';
}
function outputInWebAppDir(appDir) {
    const routerFileName = (0, path_1.join)(appDir, 'router', 'allRouters.ts');
    const templateFileName = (0, path_1.join)(appDir, 'router', 'allRoutersTemplate.ts');
    if ((0, fs_extra_1.existsSync)(templateFileName)) {
        const program = ts.createProgram([templateFileName], {
            removeComments: false,
        });
        const routerFile = program.getSourceFile(templateFileName);
        (0, assert_1.default)(routerFile);
        const namespaceDir = (0, path_1.join)(appDir, 'namespaces');
        const { statements } = routerFile;
        if (judgeUseOakRouterBuilder(statements)) {
            statements.forEach((statement) => {
                if (ts.isVariableStatement(statement)) {
                    const declaration = statement.declarationList.declarations.find(declaration => ts.isIdentifier(declaration.name) && declaration.name.text === 'allRouters');
                    if (declaration) {
                        Object.assign(declaration, {
                            initializer: makeWebAllRouters(namespaceDir, (0, path_1.join)(appDir, '../../../..'), (0, path_1.dirname)(templateFileName))
                        });
                    }
                }
            });
            const printer = ts.createPrinter({ newLine: ts.NewLineKind.LineFeed, removeComments: false });
            const result = printer.printNode(ts.EmitHint.Unspecified, routerFile, routerFile);
            (0, fs_extra_1.writeFileSync)(routerFileName, result);
        }
    }
    else {
        console.warn(`${appDir}的目录结构未按照标准建立，缺少了${templateFileName}，请从模板中补充`);
    }
}
function outputInWebDir(dir) {
    const srcAppDir = (0, path_1.join)(dir, 'src', 'app');
    const apps = (0, fs_extra_1.readdirSync)(srcAppDir);
    apps.forEach((app) => {
        const appDir = (0, path_1.join)(srcAppDir, app);
        const stat = (0, fs_extra_1.statSync)(appDir);
        if (stat.isDirectory()) {
            outputInWebAppDir(appDir);
        }
    });
}
function watchDir(projectDir, startupDir, type) {
    const srcPageDir = (0, path_1.join)(projectDir, 'src', 'pages');
    console.log('watch dir ', srcPageDir);
    if (startupDir.startsWith('web')) {
        const srcAppDir = (0, path_1.join)(projectDir, startupDir, 'src', 'app');
        const apps = (0, fs_extra_1.readdirSync)(srcAppDir);
        const tryOutputAppDir = (ns) => {
            apps.forEach((app) => {
                const appDir = (0, path_1.join)(srcAppDir, app);
                const namespaceDir = (0, path_1.join)(appDir, 'namespaces');
                const namespaces = (0, fs_extra_1.readdirSync)(namespaceDir);
                if (namespaces.includes(ns)) {
                    outputInWebAppDir(appDir);
                }
            });
        };
        (0, node_watch_1.default)(srcPageDir, {
            recursive: true,
            filter: new RegExp('web\.tsx|web\.pc\.tsx|index\.xml|render\.(native|ios|android)\.tsx'),
        }, (evt, filepath) => {
            const dir = (0, path_1.dirname)(filepath);
            const relativeDir = (0, path_1.relative)((0, path_1.join)(projectDir, 'src', 'pages'), filepath);
            const ns = relativeDir.split('\\')[0];
            const relativePath = (0, path_1.relative)(ns, (0, path_1.dirname)(relativeDir));
            const { pages } = NameSpaceDescDict[ns];
            if (evt === 'remove') {
                if ((0, fs_extra_1.existsSync)(dir)) {
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
function buildRouter(projectDir, startupDir, watch) {
    const type = startupDir.startsWith('web') ? 'web' : (startupDir.startsWith('native') ? 'native' : 'wechatMp');
    traversePageDir(projectDir, type);
    const subDir = (0, fs_extra_1.readdirSync)(projectDir);
    (0, assert_1.default)(subDir.includes(startupDir));
    if (startupDir.startsWith('web')) {
        outputInWebDir((0, path_1.join)(projectDir, startupDir));
    }
    // todo native
    if (watch) {
        watchDir(projectDir, startupDir, type);
    }
}
exports.buildRouter = buildRouter;
