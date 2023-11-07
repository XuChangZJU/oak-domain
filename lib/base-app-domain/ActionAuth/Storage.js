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
        pathId: {
            notNull: true,
            type: "ref",
            ref: "path"
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
            name: 'index_relation_path',
            attributes: [
                {
                    name: "relationId"
                },
                {
                    name: "pathId"
                }
            ],
            config: {
                unique: true
            }
        }
    ]
};
