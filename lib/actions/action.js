"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.makeAbleActionDef = exports.relationActions = exports.genericActions = exports.excludeRemoveActions = exports.excludeUpdateActions = exports.appendOnlyActions = exports.readOnlyActions = void 0;
exports.readOnlyActions = ['count', 'stat', 'download', 'select', 'aggregate'];
exports.appendOnlyActions = exports.readOnlyActions.concat('create');
exports.excludeUpdateActions = exports.appendOnlyActions.concat('remove');
exports.excludeRemoveActions = exports.appendOnlyActions.concat('update');
exports.genericActions = exports.excludeUpdateActions.concat('update');
exports.relationActions = ['grant', 'revoke'];
var makeAbleActionDef = function (initialState) { return ({
    stm: {
        enable: ['disabled', 'enabled'],
        disable: ['enabled', 'disabled'],
    },
    is: initialState,
}); };
exports.makeAbleActionDef = makeAbleActionDef;
