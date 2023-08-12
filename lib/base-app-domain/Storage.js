"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.storageSchema = void 0;
var Storage_1 = require("./ActionAuth/Storage");
var Storage_2 = require("./I18n/Storage");
var Storage_3 = require("./Modi/Storage");
var Storage_4 = require("./ModiEntity/Storage");
var Storage_5 = require("./Oper/Storage");
var Storage_6 = require("./OperEntity/Storage");
var Storage_7 = require("./Relation/Storage");
var Storage_8 = require("./RelationAuth/Storage");
var Storage_9 = require("./User/Storage");
var Storage_10 = require("./UserEntityGrant/Storage");
var Storage_11 = require("./UserRelation/Storage");
exports.storageSchema = {
    actionAuth: Storage_1.desc,
    i18n: Storage_2.desc,
    modi: Storage_3.desc,
    modiEntity: Storage_4.desc,
    oper: Storage_5.desc,
    operEntity: Storage_6.desc,
    relation: Storage_7.desc,
    relationAuth: Storage_8.desc,
    user: Storage_9.desc,
    userEntityGrant: Storage_10.desc,
    userRelation: Storage_11.desc
};
