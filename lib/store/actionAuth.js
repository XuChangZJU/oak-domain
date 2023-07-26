"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.triggers = void 0;
var tslib_1 = require("tslib");
var uuid_1 = require("../utils/uuid");
exports.triggers = [
    {
        name: '当actionAuth的deActions被置空后，删除此条数据',
        entity: 'actionAuth',
        action: 'update',
        fn: function (_a, context, option) {
            var operation = _a.operation;
            return tslib_1.__awaiter(void 0, void 0, void 0, function () {
                var data, filter, _b, _c, _d;
                var _e;
                return tslib_1.__generator(this, function (_f) {
                    switch (_f.label) {
                        case 0:
                            data = operation.data, filter = operation.filter;
                            if (!(data.deActions && data.deActions.length === 0)) return [3 /*break*/, 3];
                            _c = (_b = context).operate;
                            _d = ['actionAuth'];
                            _e = {};
                            return [4 /*yield*/, (0, uuid_1.generateNewIdAsync)()];
                        case 1: return [4 /*yield*/, _c.apply(_b, _d.concat([(_e.id = _f.sent(),
                                    _e.action = 'remove',
                                    _e.data = {},
                                    _e.filter = filter,
                                    _e), option]))];
                        case 2:
                            _f.sent();
                            return [2 /*return*/, 1];
                        case 3: return [2 /*return*/, 0];
                    }
                });
            });
        },
        when: 'after',
    }
];
