import { StorageDesc } from "../../types/Storage";
import { OpSchema } from "./Schema";
export const desc: StorageDesc<OpSchema> = {
    attributes: {
        applicationId: {
            type: "ref",
            ref: "application"
        },
        entity: {
            type: "varchar",
            params: {
                width: 32
            }
        },
        entityId: {
            type: "varchar",
            params: {
                width: 64
            }
        },
        userId: {
            type: "ref",
            ref: "user"
        },
        playerId: {
            type: "ref",
            ref: "user"
        },
        ableState: {
            type: "varchar",
            params: {
                length: 16
            }
        }
    }
};