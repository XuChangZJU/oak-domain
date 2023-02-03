"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ActionDefDict = exports.actions = void 0;
exports.actions = ["count", "stat", "download", "select", "aggregate", "create", "remove", "update", "grant", "revoke", "mergeTo"];
var UserActionDef = {
    stm: {
        mergeTo: ['normal', 'merged']
    }
};
exports.ActionDefDict = {
    userState: UserActionDef
};
