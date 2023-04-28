"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.storageSchema = void 0;
var Storage_1 = require("./ActionAuth/Storage");
var Storage_2 = require("./DirectActionAuth/Storage");
var Storage_3 = require("./FreeActionAuth/Storage");
var Storage_4 = require("./Modi/Storage");
var Storage_5 = require("./ModiEntity/Storage");
var Storage_6 = require("./Oper/Storage");
var Storage_7 = require("./OperEntity/Storage");
var Storage_8 = require("./Relation/Storage");
var Storage_9 = require("./RelationAuth/Storage");
var Storage_10 = require("./User/Storage");
var Storage_11 = require("./UserEntityGrant/Storage");
var Storage_12 = require("./UserRelation/Storage");
exports.storageSchema = {
    actionAuth: Storage_1.desc,
    directActionAuth: Storage_2.desc,
    freeActionAuth: Storage_3.desc,
    modi: Storage_4.desc,
    modiEntity: Storage_5.desc,
    oper: Storage_6.desc,
    operEntity: Storage_7.desc,
    relation: Storage_8.desc,
    relationAuth: Storage_9.desc,
    user: Storage_10.desc,
    userEntityGrant: Storage_11.desc,
    userRelation: Storage_12.desc
};
