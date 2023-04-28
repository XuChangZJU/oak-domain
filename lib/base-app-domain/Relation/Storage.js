"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.desc = void 0;
var action_1 = require("../../actions/action");
exports.desc = {
    attributes: {
        entity: {
            notNull: true,
            type: "varchar",
            params: {
                length: 32
            }
        },
        entityId: {
            type: "varchar",
            params: {
                length: 64
            }
        },
        name: {
            type: "varchar",
            params: {
                length: 32
            }
        },
        display: {
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
            name: 'index_targetEntity_entityId_name',
            attributes: [
                {
                    name: 'entity'
                },
                {
                    name: 'entityId'
                },
                {
                    name: 'name'
                }
            ],
            config: {
                unique: true
            }
        }
    ]
};
