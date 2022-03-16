import { StorageDesc } from "../../types/Storage";
import { OpSchema } from "./Schema";
export const desc: StorageDesc<OpSchema> = {
    attributes: {
        detail: {
            type: "varchar",
            params: {
                width: 32
            }
        },
        areaId: {
            type: "ref",
            ref: "area"
        },
        phone: {
            type: "varchar",
            params: {
                width: 12
            }
        },
        name: {
            type: "varchar",
            params: {
                width: 32
            }
        },
        default: {
            type: "boolean"
        },
        remark: {
            type: "text"
        }
    }
};