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
    RowStore.prototype.mergeMultipleResults = function (toBeMerged) {
        var _this = this;
        var result = {};
        toBeMerged.forEach(function (ele) { return _this.mergeOperationResult(result, ele); });
        return result;
    };
    return RowStore;
}());
exports.RowStore = RowStore;
;
