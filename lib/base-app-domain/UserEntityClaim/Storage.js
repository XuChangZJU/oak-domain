"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.desc = void 0;
const action_1 = require("../../actions/action");
exports.desc = {
    attributes: {
        uegId: {
            notNull: true,
            type: "ref",
            ref: "userEntityGrant"
        },
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
        claimEntityId: {
            notNull: true,
            type: "varchar",
            params: {
                length: 64
            }
        },
        userRelationId: {
            notNull: true,
            type: "ref",
            ref: "userRelation"
        }
    },
    actionType: "crud",
    actions: action_1.genericActions
};
