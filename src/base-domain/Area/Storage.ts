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
        level: {
            type: "varchar",
            params: {
                length: 16
            }
        },
        parentId: {
            type: "ref",
            ref: "area"
        },
        code: {
            type: "varchar",
            params: {
                width: 12
            }
        }
    }
};