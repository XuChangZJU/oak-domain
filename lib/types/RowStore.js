"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.RowStore = void 0;
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
}
exports.RowStore = RowStore;
