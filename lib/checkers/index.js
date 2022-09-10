"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createDynamicCheckers = void 0;
var modi_1 = require("../store/modi");
function createDynamicCheckers(schema) {
    return (0, modi_1.createModiRelatedCheckers)(schema);
}
exports.createDynamicCheckers = createDynamicCheckers;
