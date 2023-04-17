"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.storageSchema = void 0;
var Storage_1 = require("./ActionAuth/Storage");
var Storage_2 = require("./Modi/Storage");
var Storage_3 = require("./ModiEntity/Storage");
var Storage_4 = require("./Oper/Storage");
var Storage_5 = require("./OperEntity/Storage");
var Storage_6 = require("./Relation/Storage");
var Storage_7 = require("./RelationAuth/Storage");
var Storage_8 = require("./User/Storage");
var Storage_9 = require("./UserEntityGrant/Storage");
var Storage_10 = require("./UserRelation/Storage");
exports.storageSchema = {
    actionAuth: Storage_1.desc,
    modi: Storage_2.desc,
    modiEntity: Storage_3.desc,
    oper: Storage_4.desc,
    operEntity: Storage_5.desc,
    relation: Storage_6.desc,
    relationAuth: Storage_7.desc,
    user: Storage_8.desc,
    userEntityGrant: Storage_9.desc,
    userRelation: Storage_10.desc
};
