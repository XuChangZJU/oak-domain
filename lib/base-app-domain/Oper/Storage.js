"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.desc = void 0;
const action_1 = require("../../actions/action");
exports.desc = {
    attributes: {
        action: {
            notNull: true,
            type: "varchar",
            params: {
                length: 16
            }
        },
        data: {
            notNull: true,
            type: "object"
        },
        filter: {
            type: "object"
        },
        extra: {
            type: "object"
        },
        operatorId: {
            type: "ref",
            ref: "user"
        },
        targetEntity: {
            notNull: true,
            type: "varchar",
            params: {
                length: 32
            }
        }
    },
    actionType: "appendOnly",
    actions: action_1.appendOnlyActions
};
