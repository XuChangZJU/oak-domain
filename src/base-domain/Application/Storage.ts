import { StorageDesc } from "../../types/Storage";
import { OpSchema } from "./Schema";
export const desc: StorageDesc<OpSchema> = {
    attributes: {
        name: {
            type: "varchar",
            params: {
                width: 32
            }
        },
        description: {
            type: "text"
        },
        type: {
            type: "varchar",
            params: {
                length: 16
            }
        },
        systemId: {
            type: "ref",
            ref: "system"
        }
    }
};