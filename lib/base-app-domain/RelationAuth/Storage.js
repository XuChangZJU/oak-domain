"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.desc = void 0;
const action_1 = require("../../actions/action");
exports.desc = {
    attributes: {
        sourceRelationId: {
            notNull: true,
            type: "ref",
            ref: "relation"
        },
        pathId: {
            notNull: true,
            type: "ref",
            ref: "path"
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
                    name: "sourceRelationId"
                },
                {
                    name: "pathId"
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
