"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.RowStore = void 0;
var lodash_1 = require("../utils/lodash");
var RowStore = /** @class */ (function () {
    function RowStore(storageSchema) {
        this.storageSchema = storageSchema;
    }
    RowStore.prototype.getSchema = function () {
        return this.storageSchema;
    };
    RowStore.prototype.mergeOperationResult = function (result, toBeMerged) {
        for (var entity in toBeMerged) {
            for (var action in toBeMerged[entity]) {
                var value = (0, lodash_1.get)(result, "".concat(entity, ".").concat(action));
                if (typeof value === 'number') {
                    (0, lodash_1.set)(result, "".concat(entity, ".").concat(action), value + toBeMerged[entity][action]);
                }
                else {
                    (0, lodash_1.set)(result, "".concat(entity, ".").concat(action), toBeMerged[entity][action]);
                }
            }
        }
    };
    RowStore.$$LEVEL = 'store';
    RowStore.$$CODES = {
        primaryKeyConfilict: [1, '主键重复'],
        expressionUnresolved: [2, '表达式无法计算完成'],
        nodeIdRepeated: [3, '查询或投影中的nodeId重复'],
    };
    return RowStore;
}());
exports.RowStore = RowStore;
