"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.storageSchema = void 0;
var Storage_1 = require("./ActionAuth/Storage");
var Storage_2 = require("./DirectActionAuth/Storage");
var Storage_3 = require("./DirectRelationAuth/Storage");
var Storage_4 = require("./FreeActionAuth/Storage");
var Storage_5 = require("./Modi/Storage");
var Storage_6 = require("./ModiEntity/Storage");
var Storage_7 = require("./Oper/Storage");
var Storage_8 = require("./OperEntity/Storage");
var Storage_9 = require("./Relation/Storage");
var Storage_10 = require("./RelationAuth/Storage");
var Storage_11 = require("./User/Storage");
var Storage_12 = require("./UserEntityGrant/Storage");
var Storage_13 = require("./UserRelation/Storage");
exports.storageSchema = {
    actionAuth: Storage_1.desc,
    directActionAuth: Storage_2.desc,
    directRelationAuth: Storage_3.desc,
    freeActionAuth: Storage_4.desc,
    modi: Storage_5.desc,
    modiEntity: Storage_6.desc,
    oper: Storage_7.desc,
    operEntity: Storage_8.desc,
    relation: Storage_9.desc,
    relationAuth: Storage_10.desc,
    user: Storage_11.desc,
    userEntityGrant: Storage_12.desc,
    userRelation: Storage_13.desc
};
