"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createCheckers = void 0;
var modi_1 = require("../store/modi");
function createCheckers(schema) {
    return (0, modi_1.createModiRelatedCheckers)(schema);
}
exports.createCheckers = createCheckers;
