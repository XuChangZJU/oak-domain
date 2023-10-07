"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.desc = void 0;
const action_1 = require("../../actions/action");
exports.desc = {
    attributes: {
        userId: {
            notNull: true,
            type: "ref",
            ref: "user"
        },
        relationId: {
            notNull: true,
            type: "ref",
            ref: "relation"
        },
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
        }
    },
    actionType: "crud",
    actions: action_1.genericActions,
    indexes: [
        {
            name: 'index_user_entity_entityId_relation',
            attributes: [
                {
                    name: "userId",
                },
                {
                    name: 'entity',
                },
                {
                    name: 'entityId',
                },
                {
                    name: "relationId",
                },
            ],
            config: {
                unique: true,
            },
        }
    ]
};
