"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.desc = void 0;
const action_1 = require("../../actions/action");
exports.desc = {
    attributes: {
        relationEntity: {
            notNull: true,
            type: "varchar",
            params: {
                length: 32
            }
        },
        relationEntityFilter: {
            notNull: true,
            type: "object"
        },
        relationIds: {
            notNull: true,
            type: "object"
        }
    },
    actionType: "crud",
    actions: action_1.genericActions
};
