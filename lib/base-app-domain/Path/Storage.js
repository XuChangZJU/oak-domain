"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.desc = void 0;
const action_1 = require("../../actions/action");
exports.desc = {
    attributes: {
        destEntity: {
            notNull: true,
            type: "varchar",
            params: {
                length: 32
            }
        },
        value: {
            notNull: true,
            type: "varchar",
            params: {
                length: 256
            }
        },
        recursive: {
            notNull: true,
            type: "boolean"
        },
        sourceEntity: {
            notNull: true,
            type: "varchar",
            params: {
                length: 32
            }
        }
    },
    actionType: "crud",
    actions: action_1.genericActions,
    indexes: [
        {
            name: 'index_source_dest_path',
            attributes: [
                {
                    name: 'sourceEntity',
                },
                {
                    name: 'value',
                },
                {
                    name: 'destEntity',
                },
            ],
            config: {
                unique: true,
            },
        }
    ]
};
