"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.RowStore = void 0;
const lodash_1 = require("lodash");
class RowStore {
    static $$LEVEL = 'store';
    static $$CODES = {
        primaryKeyConfilict: [1, '主键重复'],
        expressionUnresolved: [2, '表达式无法计算完成'],
        nodeIdRepeated: [3, '查询或投影中的nodeId重复'],
    };
    storageSchema;
    constructor(storageSchema) {
        this.storageSchema = storageSchema;
    }
    getSchema() {
        return this.storageSchema;
    }
    mergeOperationResult(result, toBeMerged) {
        for (const entity in toBeMerged) {
            for (const action in toBeMerged[entity]) {
                const value = (0, lodash_1.get)(result, `${entity}.${action}`);
                if (typeof value === 'number') {
                    (0, lodash_1.set)(result, `${entity}.${action}`, value + toBeMerged[entity][action]);
                }
                else {
                    (0, lodash_1.set)(result, `${entity}.${action}`, toBeMerged[entity][action]);
                }
            }
        }
    }
}
exports.RowStore = RowStore;
