"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createDynamicCheckers = void 0;
var tslib_1 = require("tslib");
var modi_1 = require("../store/modi");
function createDynamicCheckers(schema, authDict) {
    var checkers = [];
    checkers.push.apply(checkers, tslib_1.__spreadArray([], tslib_1.__read((0, modi_1.createModiRelatedCheckers)(schema)), false));
    /* if (authDict) {
        checkers.push(...createAuthCheckers<ED, Cxt>(schema, authDict));
    } */
    return checkers;
}
exports.createDynamicCheckers = createDynamicCheckers;
