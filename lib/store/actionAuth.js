"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.triggers = void 0;
const uuid_1 = require("../utils/uuid");
exports.triggers = [
    {
        name: '当actionAuth的deActions被置空后，删除此条数据',
        entity: 'actionAuth',
        action: 'update',
        fn: async ({ operation }, context, option) => {
            const { data, filter } = operation;
            if (data.deActions && data.deActions.length === 0) {
                await context.operate('actionAuth', {
                    id: await (0, uuid_1.generateNewIdAsync)(),
                    action: 'remove',
                    data: {},
                    filter,
                }, option);
                return 1;
            }
            return 0;
        },
        when: 'after',
    }
];
