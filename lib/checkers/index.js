"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createDynamicCheckers = void 0;
var tslib_1 = require("tslib");
var checker_1 = require("../store/checker");
var modi_1 = require("../store/modi");
function createDynamicCheckers(schema) {
    var checkers = [];
    checkers.push.apply(checkers, tslib_1.__spreadArray([], tslib_1.__read((0, modi_1.createModiRelatedCheckers)(schema)), false));
    checkers.push.apply(checkers, tslib_1.__spreadArray([], tslib_1.__read((0, checker_1.createRemoveCheckers)(schema)), false));
    checkers.push.apply(checkers, tslib_1.__spreadArray([], tslib_1.__read((0, checker_1.createCreateCheckers)(schema)), false));
    return checkers;
}
exports.createDynamicCheckers = createDynamicCheckers;
