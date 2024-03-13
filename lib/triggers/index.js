"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createDynamicTriggers = void 0;
const modi_1 = require("../store/modi");
/* function createOperTriggers<ED extends EntityDict & BaseEntityDict, Cxt extends AsyncContext<ED> | SyncContext<ED>>() {
    return [
        {
            name: 'assign initial bornAt for local oper',
            entity: 'oper',
            action: 'create',
            when: 'before',
            fn({ operation }) {
                const { data } = operation;
                assert(!(data instanceof Array));
                if (!data.bornAt) {
                    data.bornAt = Date.now();
                }
                return 1;
            }
        } as CreateTrigger<ED, 'oper', Cxt>
    ] as Trigger<ED, keyof ED, Cxt>[];
} */
function createDynamicTriggers(schema) {
    return (0, modi_1.createModiRelatedTriggers)(schema);
}
exports.createDynamicTriggers = createDynamicTriggers;
