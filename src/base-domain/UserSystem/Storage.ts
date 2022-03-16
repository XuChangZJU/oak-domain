import { StorageDesc } from "../../types/Storage";
import { OpSchema } from "./Schema";
export const desc: StorageDesc<OpSchema> = {
    attributes: {
        userId: {
            type: "ref",
            ref: "user"
        },
        systemId: {
            type: "ref",
            ref: "system"
        },
        relation: {
            type: "varchar",
            params: {
                length: 16
            }
        }
    }
};