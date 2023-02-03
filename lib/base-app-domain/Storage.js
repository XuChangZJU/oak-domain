"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.storageSchema = void 0;
var Storage_1 = require("./Modi/Storage");
var Storage_2 = require("./ModiEntity/Storage");
var Storage_3 = require("./Oper/Storage");
var Storage_4 = require("./OperEntity/Storage");
var Storage_5 = require("./User/Storage");
var Storage_6 = require("./UserEntityGrant/Storage");
exports.storageSchema = {
    modi: Storage_1.desc,
    modiEntity: Storage_2.desc,
    oper: Storage_3.desc,
    operEntity: Storage_4.desc,
    user: Storage_5.desc,
    userEntityGrant: Storage_6.desc
};
