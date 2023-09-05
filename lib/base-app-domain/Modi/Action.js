"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ActionDefDict = exports.actions = void 0;
const IActionDef = {
    stm: {
        apply: ['active', 'applied'],
        abandon: ['active', 'abandoned']
    },
    is: 'active'
};
exports.actions = ["count", "stat", "download", "select", "aggregate", "create", "remove", "update", "apply", "abandon"];
exports.ActionDefDict = {
    iState: IActionDef
};
