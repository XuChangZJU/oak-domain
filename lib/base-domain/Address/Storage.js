"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.desc = void 0;
exports.desc = {
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
