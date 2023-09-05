"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ActionDefDict = void 0;
const Action_1 = require("./Modi/Action");
const Action_2 = require("./User/Action");
const Action_3 = require("./UserEntityGrant/Action");
exports.ActionDefDict = {
    modi: Action_1.ActionDefDict,
    user: Action_2.ActionDefDict,
    userEntityGrant: Action_3.ActionDefDict
};
