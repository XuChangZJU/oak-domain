"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ActionDefDict = exports.UserActionDef = exports.actions = void 0;
exports.actions = ["count", "stat", "download", "select", "aggregate", "create", "remove", "update", "grant", "revoke", "mergeTo"];
exports.UserActionDef = {
    stm: {
        mergeTo: ['normal', 'merged'],
    },
};
exports.ActionDefDict = {
    userState: exports.UserActionDef
};
