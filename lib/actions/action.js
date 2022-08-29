"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.makeAbleActionDef = exports.genericActions = exports.excludeUpdateActions = exports.appendOnlyActions = exports.readOnlyActions = void 0;
exports.readOnlyActions = ['count', 'stat', 'download', 'select'];
exports.appendOnlyActions = exports.readOnlyActions.concat('create');
exports.excludeUpdateActions = exports.appendOnlyActions.concat('remove');
exports.genericActions = exports.excludeUpdateActions.concat('update');
var makeAbleActionDef = function (initialState) { return ({
    stm: {
        enable: ['disabled', 'enabled'],
        disable: ['enabled', 'disabled'],
    },
    is: initialState,
}); };
exports.makeAbleActionDef = makeAbleActionDef;
