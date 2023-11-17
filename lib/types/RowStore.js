"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.RowStore = void 0;
const lodash_1 = require("../utils/lodash");
class RowStore {
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
    mergeMultipleResults(toBeMerged) {
        const result = {};
        toBeMerged.forEach(ele => this.mergeOperationResult(result, ele));
        return result;
    }
}
exports.RowStore = RowStore;
;
