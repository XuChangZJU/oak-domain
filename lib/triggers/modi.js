"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var tslib_1 = require("tslib");
var triggers = [
    {
        name: '当modi被应用时，将相应的operate完成',
        entity: 'modi',
        action: 'apply',
        when: 'after',
        fn: function (_a, context, option) {
            var operation = _a.operation;
            return tslib_1.__awaiter(void 0, void 0, void 0, function () {
                var filter, modies, modies_1, modies_1_1, modi, targetEntity, id, action, data, filter_1, targets, e_1_1;
                var e_1, _b;
                return tslib_1.__generator(this, function (_c) {
                    switch (_c.label) {
                        case 0:
                            filter = operation.filter;
                            return [4 /*yield*/, context.rowStore.select('modi', {
                                    data: {
                                        id: 1,
                                        action: 1,
                                        data: 1,
                                        filter: 1,
                                        targetEntity: 1,
                                    },
                                    filter: filter,
                                }, context, option)];
                        case 1:
                            modies = (_c.sent()).result;
                            _c.label = 2;
                        case 2:
                            _c.trys.push([2, 8, 9, 10]);
                            modies_1 = tslib_1.__values(modies), modies_1_1 = modies_1.next();
                            _c.label = 3;
                        case 3:
                            if (!!modies_1_1.done) return [3 /*break*/, 7];
                            modi = modies_1_1.value;
                            targetEntity = modi.targetEntity, id = modi.id, action = modi.action, data = modi.data, filter_1 = modi.filter;
                            return [4 /*yield*/, context.rowStore.select(targetEntity, {
                                    data: {
                                        id: 1,
                                    },
                                    filter: filter_1,
                                }, context, Object.assign({}, option, {
                                    blockTrigger: true,
                                }))];
                        case 4:
                            targets = _c.sent();
                            return [4 /*yield*/, context.rowStore.operate(targetEntity, {
                                    id: id,
                                    action: action,
                                    data: data,
                                    filter: targets.result.map(function (ele) { return ele.id; }),
                                }, context, Object.assign({}, option, {
                                    blockTrigger: true,
                                }))];
                        case 5:
                            _c.sent();
                            _c.label = 6;
                        case 6:
                            modies_1_1 = modies_1.next();
                            return [3 /*break*/, 3];
                        case 7: return [3 /*break*/, 10];
                        case 8:
                            e_1_1 = _c.sent();
                            e_1 = { error: e_1_1 };
                            return [3 /*break*/, 10];
                        case 9:
                            try {
                                if (modies_1_1 && !modies_1_1.done && (_b = modies_1.return)) _b.call(modies_1);
                            }
                            finally { if (e_1) throw e_1.error; }
                            return [7 /*endfinally*/];
                        case 10: return [2 /*return*/, modies.length];
                    }
                });
            });
        }
    }
];
exports.default = triggers;
