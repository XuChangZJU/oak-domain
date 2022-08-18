"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.RWLock = void 0;
var tslib_1 = require("tslib");
var assert_1 = tslib_1.__importDefault(require("assert"));
/**
 * 模拟一个读写锁，用于同步。
 * 注意，千万不要发生自己等自己
 */
var RWLock = /** @class */ (function () {
    function RWLock() {
        this.readNumber = 0;
        this.writeNumber = 0;
        this.readWaiter = [];
        this.writeWaiter = [];
    }
    RWLock.prototype.acquire = function (mode) {
        return tslib_1.__awaiter(this, void 0, void 0, function () {
            var p, p;
            var _this = this;
            return tslib_1.__generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        if (!(mode === 'S')) return [3 /*break*/, 4];
                        _a.label = 1;
                    case 1:
                        if (!(this.writeNumber > 0)) return [3 /*break*/, 3];
                        p = new Promise(function (resolve) { return _this.readWaiter.push(resolve); });
                        return [4 /*yield*/, p];
                    case 2:
                        _a.sent();
                        return [3 /*break*/, 1];
                    case 3:
                        this.readNumber++;
                        return [3 /*break*/, 7];
                    case 4:
                        if (!(this.writeNumber || this.readNumber)) return [3 /*break*/, 6];
                        p = new Promise(function (resolve) { return _this.writeWaiter.push(resolve); });
                        return [4 /*yield*/, p];
                    case 5:
                        _a.sent();
                        return [3 /*break*/, 4];
                    case 6:
                        this.writeNumber++;
                        _a.label = 7;
                    case 7: return [2 /*return*/];
                }
            });
        });
    };
    RWLock.prototype.release = function () {
        var e_1, _a;
        if (this.writeNumber) {
            (0, assert_1.default)(this.writeNumber === 1);
            this.writeNumber = 0;
            if (this.readWaiter.length > 0) {
                try {
                    for (var _b = tslib_1.__values(this.readWaiter), _c = _b.next(); !_c.done; _c = _b.next()) {
                        var f = _c.value;
                        f(undefined);
                    }
                }
                catch (e_1_1) { e_1 = { error: e_1_1 }; }
                finally {
                    try {
                        if (_c && !_c.done && (_a = _b.return)) _a.call(_b);
                    }
                    finally { if (e_1) throw e_1.error; }
                }
                this.readWaiter = [];
            }
            else if (this.writeWaiter.length > 0) {
                var f = this.writeWaiter.pop();
                f(undefined);
            }
        }
        else {
            (0, assert_1.default)(this.readNumber > 0);
            (0, assert_1.default)(this.readWaiter.length === 0);
            this.readNumber--;
            if (this.readNumber === 0) {
                var f = this.writeWaiter.pop();
                f && f(undefined);
            }
        }
    };
    return RWLock;
}());
exports.RWLock = RWLock;
