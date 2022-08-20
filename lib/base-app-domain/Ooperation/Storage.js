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
        filter: {
            type: "object"
        },
        extra: {
            type: "object"
        },
        operatorId: {
            type: "varchar",
            params: {
                length: 32
            }
        },
        operatorInfo: {
            type: "object"
        }
    }
};
