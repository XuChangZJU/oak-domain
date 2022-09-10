"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createDynamicTriggers = void 0;
var tslib_1 = require("tslib");
var modi_1 = tslib_1.__importDefault(require("./modi"));
var modi_2 = require("../store/modi");
exports.default = tslib_1.__spreadArray([], tslib_1.__read(modi_1.default), false);
function createDynamicTriggers(schema) {
    return (0, modi_2.createModiRelatedTriggers)(schema);
}
exports.createDynamicTriggers = createDynamicTriggers;
