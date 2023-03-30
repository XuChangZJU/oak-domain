"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.desc = void 0;
var action_1 = require("../../actions/action");
exports.desc = {
    attributes: {
        operId: {
            type: "ref",
            ref: "oper"
        },
        targetEntityId: {
            type: "varchar",
            params: {
                length: 64
            }
        }
    },
    actionType: "appendOnly",
    actions: action_1.appendOnlyActions
};
