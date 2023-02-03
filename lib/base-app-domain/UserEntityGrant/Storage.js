"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.desc = void 0;
var action_1 = require("../../actions/action");
exports.desc = {
    attributes: {
        entity: {
            type: "varchar",
            params: {
                length: 32
            }
        },
        entityId: {
            type: "varchar",
            params: {
                length: 64
            }
        },
        relation: {
            type: "varchar",
            params: {
                length: 32
            }
        }
    },
    actionType: "crud",
    actions: action_1.genericActions
};
