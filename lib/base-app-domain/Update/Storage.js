"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.desc = void 0;
exports.desc = {
    attributes: {
        action: {
            type: "varchar",
            params: {
                length: 16
            }
        },
        data: {
            type: "object"
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
