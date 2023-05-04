"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.desc = void 0;
var Action_1 = require("./Action");
exports.desc = {
    attributes: {
        name: {
            type: "varchar",
            params: {
                length: 16
            }
        },
        nickname: {
            type: "varchar",
            params: {
                length: 64
            }
        },
        password: {
            type: "text"
        },
        refId: {
            type: "ref",
            ref: "user"
        },
        userState: {
            type: "enum",
            enumeration: ["normal", "merged"]
        }
    },
    actionType: "crud",
    actions: Action_1.actions
};
