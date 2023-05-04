"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.desc = void 0;
var action_1 = require("../../actions/action");
exports.desc = {
    attributes: {
        path: {
            notNull: true,
            type: "varchar",
            params: {
                length: 256
            }
        },
        destRelationId: {
            notNull: true,
            type: "ref",
            ref: "relation"
        }
    },
    actionType: "crud",
    actions: action_1.genericActions,
    indexes: [
        {
            name: 'index_entity_relation_path',
            attributes: [
                {
                    name: 'path'
                },
                {
                    name: "destRelationId"
                },
            ],
            config: {
                unique: true
            }
        }
    ]
};
