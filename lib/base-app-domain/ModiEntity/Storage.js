"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.desc = void 0;
var action_1 = require("../../actions/action");
exports.desc = {
    attributes: {
        modiId: {
            type: "ref",
            ref: "modi"
        },
        entity: {
            type: "varchar",
            params: {
                length: 32
            },
            ref: ["user"]
        },
        entityId: {
            type: "varchar",
            params: {
                length: 64
            }
        }
    },
    actionType: "appendOnly",
    actions: action_1.appendOnlyActions
};
