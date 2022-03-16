"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.desc = void 0;
exports.desc = {
    attributes: {
        mobile: {
            type: "varchar",
            params: {
                width: 16
            }
        },
        userId: {
            type: "ref",
            ref: "user"
        }
    }
};
