"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ActionDefDict = exports.actions = void 0;
var IActionDef = {
    stm: {
        apply: ['active', 'applied'],
        abandon: ['active', 'abandoned']
    },
    is: 'active'
};
exports.actions = ["create", "update", "remove", "count", "stat", "download", "select", "apply", "abandon"];
exports.ActionDefDict = {
    iState: IActionDef
};
