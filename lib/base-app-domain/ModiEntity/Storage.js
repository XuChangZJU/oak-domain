"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.desc = void 0;
var action_1 = require("../../actions/action");
exports.desc = {
    attributes: {
        modiId: {
            notNull: true,
            type: "ref",
            ref: "modi"
        },
        entity: {
            notNull: true,
            type: "varchar",
            params: {
                length: 32
            },
            ref: ["actionAuth", "i18n", "relation", "relationAuth", "user", "userEntityGrant", "userRelation"]
        },
        entityId: {
            notNull: true,
            type: "varchar",
            params: {
                length: 64
            }
        }
    },
    actionType: "appendOnly",
    actions: action_1.appendOnlyActions
};
