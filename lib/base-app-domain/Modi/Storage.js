"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.desc = void 0;
var Action_1 = require("./Action");
exports.desc = {
    attributes: {
        targetEntity: {
            type: "varchar",
            params: {
                length: 32
            }
        },
        entity: {
            type: "varchar",
            params: {
                length: 32
            }
        },
        entityId: {
            type: "varchar",
            params: {
                length: 64
            }
        },
        action: {
            type: "varchar",
            params: {
                length: 16
            }
        },
        data: {
            type: "object"
        },
        filter: {
            type: "object"
        },
        extra: {
            type: "object"
        },
        iState: {
            type: "varchar",
            params: {
                length: 16
            }
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
                    direction: 'ASC'
                }
            ]
        }
    ]
};
