"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.desc = void 0;
const action_1 = require("../../actions/action");
exports.desc = {
    attributes: {
        module: {
            notNull: true,
            type: "varchar",
            params: {
                length: 64
            }
        },
        position: {
            notNull: true,
            type: "varchar",
            params: {
                length: 188
            }
        },
        namespace: {
            notNull: true,
            type: "varchar",
            params: {
                length: 256
            }
        },
        language: {
            notNull: true,
            type: "varchar",
            params: {
                length: 32
            }
        },
        data: {
            notNull: true,
            type: "object"
        }
    },
    static: true,
    actionType: "readOnly",
    actions: action_1.readOnlyActions,
    indexes: [
        {
            name: 'namespace_language',
            attributes: [
                {
                    name: 'namespace'
                },
                {
                    name: 'language'
                }
            ],
            config: {
                unique: true
            }
        }
    ]
};
