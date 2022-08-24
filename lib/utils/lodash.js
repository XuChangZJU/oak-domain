"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.union = exports.isEqual = exports.pick = exports.cloneDeep = exports.merge = exports.omit = exports.intersection = exports.set = exports.get = exports.uniq = exports.pull = exports.unset = void 0;
var tslib_1 = require("tslib");
/**
 * 避免lodash打包体积过大
 * 像assign, keys尽量使用Object的函数
 */
var unset_1 = tslib_1.__importDefault(require("lodash/unset"));
exports.unset = unset_1.default;
var pull_1 = tslib_1.__importDefault(require("lodash/pull"));
exports.pull = pull_1.default;
var uniq_1 = tslib_1.__importDefault(require("lodash/uniq"));
exports.uniq = uniq_1.default;
var get_1 = tslib_1.__importDefault(require("lodash/get"));
exports.get = get_1.default;
var set_1 = tslib_1.__importDefault(require("lodash/set"));
exports.set = set_1.default;
var intersection_1 = tslib_1.__importDefault(require("lodash/intersection"));
exports.intersection = intersection_1.default;
var omit_1 = tslib_1.__importDefault(require("lodash/omit"));
exports.omit = omit_1.default;
var merge_1 = tslib_1.__importDefault(require("lodash/merge"));
exports.merge = merge_1.default;
var cloneDeep_1 = tslib_1.__importDefault(require("lodash/cloneDeep"));
exports.cloneDeep = cloneDeep_1.default;
var pick_1 = tslib_1.__importDefault(require("lodash/pick"));
exports.pick = pick_1.default;
var isEqual_1 = tslib_1.__importDefault(require("lodash/isEqual"));
exports.isEqual = isEqual_1.default;
var union_1 = tslib_1.__importDefault(require("lodash/union"));
exports.union = union_1.default;
