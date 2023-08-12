"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.desc = void 0;
var action_1 = require("../../actions/action");
exports.desc = {
    attributes: {
        module: {
            notNull: true,
            type: "varchar",
            params: {
                length: 64
            }
        },
        position: {
            notNull: true,
            type: "varchar",
            params: {
                length: 256
            }
        },
        languange: {
            notNull: true,
            type: "varchar",
            params: {
                length: 32
            }
        },
        data: {
            notNull: true,
            type: "object"
        }
    },
    actionType: "crud",
    actions: action_1.genericActions
};
