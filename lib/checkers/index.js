"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createDynamicCheckers = void 0;
const checker_1 = require("../store/checker");
const modi_1 = require("../store/modi");
function createDynamicCheckers(schema) {
    const checkers = [];
    checkers.push(...(0, modi_1.createModiRelatedCheckers)(schema));
    checkers.push(...(0, checker_1.createRemoveCheckers)(schema));
    checkers.push(...(0, checker_1.createCreateCheckers)(schema));
    return checkers;
}
exports.createDynamicCheckers = createDynamicCheckers;
