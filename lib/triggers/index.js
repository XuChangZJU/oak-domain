"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createDynamicTriggers = void 0;
var modi_1 = require("../store/modi");
function createDynamicTriggers(schema) {
    return (0, modi_1.createModiRelatedTriggers)(schema);
}
exports.createDynamicTriggers = createDynamicTriggers;
