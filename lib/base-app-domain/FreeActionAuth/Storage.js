"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.desc = void 0;
var action_1 = require("../../actions/action");
exports.desc = {
    attributes: {
        destEntity: {
            notNull: true,
            type: "varchar",
            params: {
                length: 32
            }
        },
        deActions: {
            notNull: true,
            type: "object"
        }
    },
    actionType: "crud",
    actions: action_1.genericActions,
    indexes: [
        {
            name: 'index_entity',
            attributes: [
                {
                    name: 'destEntity'
                },
            ],
            config: {
                unique: true
            }
        }
    ]
};
