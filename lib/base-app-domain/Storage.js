"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.storageSchema = void 0;
const Storage_1 = require("./ActionAuth/Storage");
const Storage_2 = require("./I18n/Storage");
const Storage_3 = require("./Modi/Storage");
const Storage_4 = require("./ModiEntity/Storage");
const Storage_5 = require("./Oper/Storage");
const Storage_6 = require("./OperEntity/Storage");
const Storage_7 = require("./Path/Storage");
const Storage_8 = require("./Relation/Storage");
const Storage_9 = require("./RelationAuth/Storage");
const Storage_10 = require("./User/Storage");
const Storage_11 = require("./UserEntityClaim/Storage");
const Storage_12 = require("./UserEntityGrant/Storage");
const Storage_13 = require("./UserRelation/Storage");
exports.storageSchema = {
    actionAuth: Storage_1.desc,
    i18n: Storage_2.desc,
    modi: Storage_3.desc,
    modiEntity: Storage_4.desc,
    oper: Storage_5.desc,
    operEntity: Storage_6.desc,
    path: Storage_7.desc,
    relation: Storage_8.desc,
    relationAuth: Storage_9.desc,
    user: Storage_10.desc,
    userEntityClaim: Storage_11.desc,
    userEntityGrant: Storage_12.desc,
    userRelation: Storage_13.desc
};
