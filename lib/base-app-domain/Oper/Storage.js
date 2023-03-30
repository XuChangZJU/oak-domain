"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.desc = void 0;
var action_1 = require("../../actions/action");
exports.desc = {
    attributes: {
        action: {
            type: "varchar",
            params: {
                length: 16
            }
        },
        data: {
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
            type: "varchar",
            params: {
                length: 32
            }
        }
    },
    actionType: "appendOnly",
    actions: action_1.appendOnlyActions
};
