"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.makeAbleActionDef = exports.genericActions = void 0;
exports.genericActions = ['create', 'update', 'remove', 'count', 'stat', 'download', 'select'];
var makeAbleActionDef = function (initialState) { return ({
    stm: {
        enable: ['disabled', 'enabled'],
        disable: ['enabled', 'disabled'],
    },
    is: initialState,
}); };
exports.makeAbleActionDef = makeAbleActionDef;
