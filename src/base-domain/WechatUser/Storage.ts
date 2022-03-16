import { StorageDesc } from "../../types/Storage";
import { OpSchema } from "./Schema";
export const desc: StorageDesc<OpSchema> = {
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