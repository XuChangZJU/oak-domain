"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.desc = void 0;
exports.desc = {
    attributes: {
        origin: {
            type: "varchar",
            params: {
                length: 16
            }
        },
        openId: {
            type: "varchar",
            params: {
                width: 32
            }
        },
        unionId: {
            type: "varchar",
            params: {
                width: 32
            }
        },
        accessToken: {
            type: "varchar",
            params: {
                width: 32
            }
        },
        sessionKey: {
            type: "varchar",
            params: {
                width: 64
            }
        },
        subscribed: {
            type: "boolean"
        },
        subscribedAt: {
            type: "datetime"
        },
        unsubscribedAt: {
            type: "datetime"
        },
        userId: {
            type: "ref",
            ref: "user"
        },
        applicationId: {
            type: "ref",
            ref: "application"
        }
    }
};
