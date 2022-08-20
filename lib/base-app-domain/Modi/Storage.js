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
