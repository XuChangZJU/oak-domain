"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.storageSchema = void 0;
const Storage_1 = require("./Address/Storage");
const Storage_2 = require("./Application/Storage");
const Storage_3 = require("./Area/Storage");
const Storage_4 = require("./ExtraFile/Storage");
const Storage_5 = require("./Mobile/Storage");
const Storage_6 = require("./UserSystem/Storage");
const Storage_7 = require("./System/Storage");
const Storage_8 = require("./Token/Storage");
const Storage_9 = require("./User/Storage");
const Storage_10 = require("./WechatUser/Storage");
exports.storageSchema = {
    address: Storage_1.desc,
    application: Storage_2.desc,
    area: Storage_3.desc,
    extraFile: Storage_4.desc,
    mobile: Storage_5.desc,
    userSystem: Storage_6.desc,
    system: Storage_7.desc,
    token: Storage_8.desc,
    user: Storage_9.desc,
    wechatUser: Storage_10.desc
};
