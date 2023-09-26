"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.desc = void 0;
const action_1 = require("../../actions/action");
exports.desc = {
    attributes: {
        relationId: {
            type: "ref",
            ref: "relation"
        },
        paths: {
            notNull: true,
            type: "object"
        },
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
            name: 'index_entity_relation',
            attributes: [
                {
                    name: 'destEntity',
                },
                {
                    name: "relationId",
                },
            ],
        }
    ]
};
