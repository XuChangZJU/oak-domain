"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ActionDefDict = void 0;
var IActionDef = {
    stm: {
        apply: ['active', 'applied'],
        abandon: ['active', 'abandoned']
    },
    is: 'active'
};
exports.ActionDefDict = {
    iState: IActionDef
};
