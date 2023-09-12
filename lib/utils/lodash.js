"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.unionBy = exports.groupBy = exports.difference = exports.union = exports.isEqual = exports.pick = exports.cloneDeep = exports.merge = exports.omit = exports.intersection = exports.set = exports.get = exports.uniqBy = exports.uniq = exports.pull = exports.unset = void 0;
const tslib_1 = require("tslib");
/**
 * 避免lodash打包体积过大
 * 像assign, keys尽量使用Object的函数
 */
const unset_1 = tslib_1.__importDefault(require("lodash/unset"));
exports.unset = unset_1.default;
const uniqBy_1 = tslib_1.__importDefault(require("lodash/uniqBy"));
exports.uniqBy = uniqBy_1.default;
const pull_1 = tslib_1.__importDefault(require("lodash/pull"));
exports.pull = pull_1.default;
const uniq_1 = tslib_1.__importDefault(require("lodash/uniq"));
exports.uniq = uniq_1.default;
const get_1 = tslib_1.__importDefault(require("lodash/get"));
exports.get = get_1.default;
const set_1 = tslib_1.__importDefault(require("lodash/set"));
exports.set = set_1.default;
const intersection_1 = tslib_1.__importDefault(require("lodash/intersection"));
exports.intersection = intersection_1.default;
const omit_1 = tslib_1.__importDefault(require("lodash/omit"));
exports.omit = omit_1.default;
const merge_1 = tslib_1.__importDefault(require("lodash/merge"));
exports.merge = merge_1.default;
const cloneDeep_1 = tslib_1.__importDefault(require("lodash/cloneDeep"));
exports.cloneDeep = cloneDeep_1.default;
const pick_1 = tslib_1.__importDefault(require("lodash/pick"));
exports.pick = pick_1.default;
const isEqual_1 = tslib_1.__importDefault(require("lodash/isEqual"));
exports.isEqual = isEqual_1.default;
const union_1 = tslib_1.__importDefault(require("lodash/union"));
exports.union = union_1.default;
const difference_1 = tslib_1.__importDefault(require("lodash/difference"));
exports.difference = difference_1.default;
const groupBy_1 = tslib_1.__importDefault(require("lodash/groupBy"));
exports.groupBy = groupBy_1.default;
const unionBy_1 = tslib_1.__importDefault(require("lodash/unionBy"));
exports.unionBy = unionBy_1.default;
