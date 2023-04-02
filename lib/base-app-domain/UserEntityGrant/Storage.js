"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.desc = void 0;
var action_1 = require("../../actions/action");
exports.desc = {
    attributes: {
        entity: {
            notNull: true,
            type: "varchar",
            params: {
                length: 32
            }
        },
        entityId: {
            notNull: true,
            type: "varchar",
            params: {
                length: 64
            }
        },
        relation: {
            notNull: true,
            type: "varchar",
            params: {
                length: 32
            }
        }
    },
    actionType: "crud",
    actions: action_1.genericActions
};
