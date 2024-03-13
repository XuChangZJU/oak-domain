"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.desc = void 0;
const Action_1 = require("./Action");
exports.desc = {
    attributes: {
        targetEntity: {
            notNull: true,
            type: "varchar",
            params: {
                length: 32
            }
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
        },
        action: {
            notNull: true,
            type: "varchar",
            params: {
                length: 24
            }
        },
        data: {
            notNull: true,
            type: "object"
        },
        filter: {
            type: "object"
        },
        extra: {
            type: "object"
        },
        iState: {
            type: "enum",
            enumeration: ["active", "applied", "abandoned"]
        }
    },
    actionType: "crud",
    actions: Action_1.actions,
    indexes: [
        {
            name: 'index_state',
            attributes: [
                {
                    name: 'iState',
                    direction: 'ASC',
                }
            ],
        }
    ]
};
