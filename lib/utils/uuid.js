"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.generateNewId = exports.setGenerateIdOption = exports.generateNewIdAsync = exports.expandUuidTo36Bytes = exports.shrinkUuidTo32Bytes = void 0;
var tslib_1 = require("tslib");
var assert_1 = tslib_1.__importDefault(require("assert"));
var uuid_1 = require("uuid");
var random_1 = require("./random/random");
function shrinkUuidTo32Bytes(uuid) {
    return uuid.replaceAll('-', '');
}
exports.shrinkUuidTo32Bytes = shrinkUuidTo32Bytes;
function expandUuidTo36Bytes(uuidShrinked) {
    return "".concat(uuidShrinked.slice(0, 8), "-").concat(uuidShrinked.slice(8, 12), "-").concat(uuidShrinked.slice(12, 16), "-").concat(uuidShrinked.slice(16, 20), "-").concat(uuidShrinked.slice(20));
}
exports.expandUuidTo36Bytes = expandUuidTo36Bytes;
// 直接生成uuid的接口，为了适配各种环境，写成异步
function generateNewIdAsync(option) {
    return tslib_1.__awaiter(this, void 0, void 0, function () {
        var option2, _a, _b;
        var _c, _d;
        return tslib_1.__generator(this, function (_e) {
            switch (_e.label) {
                case 0:
                    option2 = option || ID_OPTION;
                    if (!((option2 === null || option2 === void 0 ? void 0 : option2.shuffle) && process.env.NODE_ENV === 'development')) return [3 /*break*/, 2];
                    _a = uuid_1.v4;
                    _c = {};
                    return [4 /*yield*/, (0, random_1.getRandomValues)(16)];
                case 1: return [2 /*return*/, _a.apply(void 0, [(_c.random = _e.sent(), _c)])];
                case 2:
                    _b = uuid_1.v1;
                    _d = {};
                    return [4 /*yield*/, (0, random_1.getRandomValues)(16)];
                case 3: return [2 /*return*/, _b.apply(void 0, [(_d.random = _e.sent(), _d)])];
            }
        });
    });
}
exports.generateNewIdAsync = generateNewIdAsync;
// 实现同步的id缓存接口，以便于前台使用
var ID_BUFFER = [];
var ID_OPTION = {};
function produceIds() {
    return tslib_1.__awaiter(this, void 0, void 0, function () {
        var iter, _a, _b;
        return tslib_1.__generator(this, function (_c) {
            switch (_c.label) {
                case 0:
                    iter = 0;
                    _c.label = 1;
                case 1:
                    if (!(iter < 50)) return [3 /*break*/, 4];
                    _b = (_a = ID_BUFFER).push;
                    return [4 /*yield*/, generateNewIdAsync()];
                case 2:
                    _b.apply(_a, [_c.sent()]);
                    _c.label = 3;
                case 3:
                    iter++;
                    return [3 /*break*/, 1];
                case 4: return [2 /*return*/];
            }
        });
    });
}
produceIds();
function setGenerateIdOption(option) {
    ID_OPTION = option;
    ID_BUFFER.splice(0, ID_BUFFER.length);
    return produceIds();
}
exports.setGenerateIdOption = setGenerateIdOption;
function generateNewId() {
    (0, assert_1.default)(ID_BUFFER.length > 0, 'id已经用完');
    var id = ID_BUFFER.pop();
    if (ID_BUFFER.length < 30) {
        produceIds();
    }
    return id;
}
exports.generateNewId = generateNewId;
