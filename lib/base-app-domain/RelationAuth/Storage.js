"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.desc = void 0;
var action_1 = require("../../actions/action");
exports.desc = {
    attributes: {
        relationId: {
            notNull: true,
            type: "ref",
            ref: "relation"
        },
        path: {
            notNull: true,
            type: "varchar",
            params: {
                length: 256
            }
        },
        destEntity: {
            notNull: true,
            type: "varchar",
            params: {
                length: 32
            }
        },
        deRelations: {
            notNull: true,
            type: "object"
        }
    },
    actionType: "crud",
    actions: action_1.genericActions,
    indexes: [
        {
            name: 'index_entity_relation_path',
            attributes: [
                {
                    name: 'destEntity'
                },
                {
                    name: "relationId"
                },
                {
                    name: 'path'
                },
            ],
            config: {
                unique: true
            }
        }
    ]
};
