"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var tslib_1 = require("tslib");
var assert_1 = tslib_1.__importDefault(require("assert"));
var ts = tslib_1.__importStar(require("typescript"));
var factory = ts.factory;
var path_1 = require("path");
var uuid_1 = require("uuid");
var fs_1 = tslib_1.__importDefault(require("fs"));
var env_1 = require("./env");
var string_1 = require("../utils/string");
/**
 * 将一个object展开编译为一棵语法树，只有string和object两种键值对象
 * @param data
 */
function transferObjectToObjectLiteral(data) {
    return factory.createObjectLiteralExpression(Object.keys(data).map(function (k) {
        var type = typeof data[k];
        if (type === 'string') {
            return factory.createPropertyAssignment(factory.createStringLiteral(k), factory.createStringLiteral(data[k]));
        }
        (0, assert_1.default)(type === 'object');
        return factory.createPropertyAssignment(factory.createStringLiteral(k), transferObjectToObjectLiteral(data[k]));
    }), true);
}
/**
 * 这个类的作用是把项目和所有相关的模块下的locales编译成为src/data/i18n中的数据
 */
var LocaleBuilder = /** @class */ (function () {
    function LocaleBuilder(asLib) {
        var pwd = process.cwd();
        this.pwd = pwd;
        this.asLib = !!asLib;
        var dependencyFile = (0, env_1.OAK_EXTERNAL_LIBS_FILEPATH)((0, path_1.join)(pwd, 'src'));
        if (fs_1.default.existsSync(dependencyFile)) {
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
    LocaleBuilder.prototype.outputDataFile = function () {
        var _this = this;
        var statements = [
            factory.createImportDeclaration(undefined, undefined, factory.createImportClause(false, undefined, factory.createNamedImports([factory.createImportSpecifier(false, factory.createIdentifier("CreateOperationData"), factory.createIdentifier("I18n"))])), factory.createStringLiteral("../oak-app-domain/I18n/Schema"), undefined)
        ];
        if (this.dependencies) {
            this.dependencies.forEach(function (ele, idx) { return statements.push(factory.createImportDeclaration(undefined, undefined, factory.createImportClause(false, factory.createIdentifier("i18ns".concat(idx)), undefined), factory.createStringLiteral("".concat(ele, "/lib/data/i18n")), undefined)); });
        }
        statements.push(factory.createVariableStatement(undefined, factory.createVariableDeclarationList([factory.createVariableDeclaration(factory.createIdentifier("i18ns"), undefined, factory.createArrayTypeNode(factory.createTypeReferenceNode(factory.createIdentifier("I18n"), undefined)), factory.createArrayLiteralExpression(Object.keys(this.locales).map(function (k) {
                var _a = tslib_1.__read(_this.locales[k], 4), module = _a[0], position = _a[1], language = _a[2], data = _a[3];
                return factory.createObjectLiteralExpression([
                    factory.createPropertyAssignment(factory.createIdentifier("id"), factory.createStringLiteral((0, uuid_1.v4)())),
                    factory.createPropertyAssignment(factory.createIdentifier("namespace"), factory.createStringLiteral(k)),
                    factory.createPropertyAssignment(factory.createIdentifier("language"), factory.createStringLiteral(language)),
                    factory.createPropertyAssignment(factory.createIdentifier("module"), factory.createStringLiteral(module)),
                    factory.createPropertyAssignment(factory.createIdentifier("position"), factory.createStringLiteral(position)),
                    factory.createPropertyAssignment(factory.createIdentifier("data"), transferObjectToObjectLiteral(data))
                ], true);
            }), true))], ts.NodeFlags.Const)));
        if (this.dependencies.length > 0) {
            statements.push(factory.createExportAssignment(undefined, undefined, undefined, factory.createCallExpression(factory.createPropertyAccessExpression(factory.createIdentifier("i18ns"), factory.createIdentifier("concat")), undefined, this.dependencies.map(function (ele, idx) { return factory.createIdentifier("i18ns".concat(idx)); }))));
        }
        else {
            statements.push(factory.createExportAssignment(undefined, undefined, undefined, factory.createIdentifier("i18ns")));
        }
        var printer = ts.createPrinter({ newLine: ts.NewLineKind.LineFeed });
        var result = printer.printList(ts.ListFormat.SourceFileStatements, factory.createNodeArray(statements), ts.createSourceFile("someFileName.ts", "", ts.ScriptTarget.Latest, false, ts.ScriptKind.TS));
        var filename = (0, path_1.join)(this.pwd, 'src', 'data', 'i18n.ts');
        var result2 = (0, string_1.unescapeUnicode)("// \u672C\u6587\u4EF6\u4E3A\u81EA\u52A8\u7F16\u8BD1\u4EA7\u751F\uFF0C\u8BF7\u52FF\u76F4\u63A5\u4FEE\u6539\n\n".concat(result));
        fs_1.default.writeFileSync(filename, result2, { flag: 'w' });
    };
    LocaleBuilder.prototype.parseFile = function (module, namespace, position, filename, filepath, watch) {
        var _this = this;
        var language = (filename.split('.')[0]).replace('_', '-'); // 历史原因，会命名成zh_CN.json
        var data = require(filepath);
        var ns = module ? "".concat(module, "-").concat(namespace) : (0, string_1.firstLetterLowerCase)(namespace);
        this.locales[ns] = [module, position.replace(/\\/g, '/'), language, data];
        if (watch) {
            fs_1.default.watch(filepath, function () {
                var data = require(filepath);
                _this.locales[ns] = [module, position.replace(/\\/g, '/'), language, data];
                _this.outputDataFile();
            });
        }
    };
    LocaleBuilder.prototype.traverse = function (module, nsPrefix, position, dirPath, inLocale, localeFolderName, watch) {
        var _this = this;
        var files = fs_1.default.readdirSync(dirPath);
        files.forEach(function (file) {
            var filepath = (0, path_1.join)(dirPath, file);
            var stat = fs_1.default.statSync(filepath);
            if (stat.isFile() && inLocale && file.endsWith('.json')) {
                _this.parseFile(module, nsPrefix, position, file, filepath, watch);
            }
            else if (stat.isDirectory() && !inLocale) {
                var nsPrefix2 = nsPrefix ? "".concat(nsPrefix, "-").concat(file) : file;
                var isLocaleFolder = file === localeFolderName;
                _this.traverse(module, isLocaleFolder ? nsPrefix : nsPrefix2, isLocaleFolder ? position : (0, path_1.join)(position, file), (0, path_1.join)(dirPath, file), isLocaleFolder, localeFolderName, watch);
            }
        });
    };
    LocaleBuilder.prototype.buildproject = function (root, src, watch) {
        var _this = this;
        var packageJson = (0, path_1.join)(root, 'package.json');
        var name = require(packageJson).name;
        var pagePath = (0, path_1.join)(src ? 'src' : 'lib', 'pages');
        this.traverse(name, 'p', pagePath, (0, path_1.join)(root, pagePath), false, 'locales', watch);
        var componentPath = (0, path_1.join)(src ? 'src' : 'lib', 'components');
        this.traverse(name, 'c', componentPath, (0, path_1.join)(root, componentPath), false, 'locales', watch);
        var localePath = (0, path_1.join)(root, src ? 'src' : 'lib', 'locales');
        if (fs_1.default.existsSync(localePath)) {
            var files = fs_1.default.readdirSync(localePath);
            files.forEach(function (file) {
                var filepath = (0, path_1.join)(localePath, file);
                var stat = fs_1.default.statSync(filepath);
                if (stat.isDirectory()) {
                    _this.traverse(name, "l-".concat(file), (0, path_1.join)('locales', file), (0, path_1.join)(localePath, file), true, file, watch);
                }
            });
        }
        if (!this.asLib && src) {
            // 不是lib的话将oak-app-domain中的对象的locale也收集起来
            var domainPath = (0, path_1.join)(root, 'src', 'oak-app-domain');
            if (fs_1.default.existsSync(domainPath)) {
                this.traverse('', '', 'oak-app-domain', domainPath, false, 'locales', watch);
            }
            // 还有web和wechatMp的目录            
            var webSrcPath = (0, path_1.join)('web', 'src');
            this.traverse(name, 'w', webSrcPath, (0, path_1.join)(root, webSrcPath), false, 'locales', watch);
            // 小程序可能有多于一个，按规范用wechatMp, wechatMp2这样命名
            var wechatMpSrcPath = (0, path_1.join)('wechatMp', 'src');
            this.traverse(name, 'wmp', wechatMpSrcPath, (0, path_1.join)(root, webSrcPath), false, 'locales', watch);
            var iter = 1;
            while (true) {
                var mpSrcPath = "".concat(wechatMpSrcPath).concat(iter);
                if (fs_1.default.existsSync((0, path_1.join)(root, mpSrcPath))) {
                    this.traverse(name, "wmp".concat(iter), mpSrcPath, (0, path_1.join)(root, mpSrcPath), false, 'locales', watch);
                    iter++;
                }
                else {
                    break;
                }
            }
        }
    };
    LocaleBuilder.prototype.build = function (watch) {
        this.buildproject(this.pwd, true, watch);
        if (!this.asLib) {
            // 如果不是lib，把front里的数据也处理掉
            var fbPath = (0, path_1.join)(this.pwd, 'node_modules', 'oak-frontend-base');
            this.buildproject(fbPath, false, watch);
        }
        this.outputDataFile();
    };
    return LocaleBuilder;
}());
exports.default = LocaleBuilder;
