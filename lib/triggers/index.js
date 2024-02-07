"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createDynamicTriggers = void 0;
const tslib_1 = require("tslib");
const assert_1 = tslib_1.__importDefault(require("assert"));
const modi_1 = require("../store/modi");
function createOperTriggers() {
    return [
        {
            name: 'assign initial bornAt for local oper',
            entity: 'oper',
            action: 'create',
            when: 'before',
            fn({ operation }) {
                const { data } = operation;
                (0, assert_1.default)(!(data instanceof Array) && data.$$createAt$$);
                if (!data.bornAt) {
                    data.bornAt = data.$$createAt$$;
                }
                return 1;
            }
        }
    ];
}
function createDynamicTriggers(schema) {
    return (0, modi_1.createModiRelatedTriggers)(schema).concat(createOperTriggers());
}
exports.createDynamicTriggers = createDynamicTriggers;
