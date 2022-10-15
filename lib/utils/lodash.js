"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.groupBy = exports.difference = exports.union = exports.isEqual = exports.pick = exports.cloneDeep = exports.merge = exports.omit = exports.intersection = exports.set = exports.get = exports.uniqBy = exports.uniq = exports.pull = exports.unset = void 0;
/**
 * 避免lodash打包体积过大
 * 像assign, keys尽量使用Object的函数
 */
/* import unset from 'lodash/unset';
import uniqBy from 'lodash/uniqBy';
import pull from 'lodash/pull';
import uniq from 'lodash/uniq';
import get from 'lodash/get';
import set from 'lodash/set';
import intersection from 'lodash/intersection';
import omit from 'lodash/omit';
import merge from 'lodash/merge';
import cloneDeep from 'lodash/cloneDeep';
import pick from 'lodash/pick';
import isEqual from 'lodash/isEqual';
import union from 'lodash/union';
import difference from 'lodash/difference';
import groupBy from 'lodash/groupBy'; */
var lodash_1 = require("lodash");
Object.defineProperty(exports, "unset", { enumerable: true, get: function () { return lodash_1.unset; } });
Object.defineProperty(exports, "pull", { enumerable: true, get: function () { return lodash_1.pull; } });
Object.defineProperty(exports, "uniq", { enumerable: true, get: function () { return lodash_1.uniq; } });
Object.defineProperty(exports, "uniqBy", { enumerable: true, get: function () { return lodash_1.uniqBy; } });
Object.defineProperty(exports, "get", { enumerable: true, get: function () { return lodash_1.get; } });
Object.defineProperty(exports, "set", { enumerable: true, get: function () { return lodash_1.set; } });
Object.defineProperty(exports, "intersection", { enumerable: true, get: function () { return lodash_1.intersection; } });
Object.defineProperty(exports, "omit", { enumerable: true, get: function () { return lodash_1.omit; } });
Object.defineProperty(exports, "merge", { enumerable: true, get: function () { return lodash_1.merge; } });
Object.defineProperty(exports, "cloneDeep", { enumerable: true, get: function () { return lodash_1.cloneDeep; } });
Object.defineProperty(exports, "pick", { enumerable: true, get: function () { return lodash_1.pick; } });
Object.defineProperty(exports, "isEqual", { enumerable: true, get: function () { return lodash_1.isEqual; } });
Object.defineProperty(exports, "union", { enumerable: true, get: function () { return lodash_1.union; } });
Object.defineProperty(exports, "difference", { enumerable: true, get: function () { return lodash_1.difference; } });
Object.defineProperty(exports, "groupBy", { enumerable: true, get: function () { return lodash_1.groupBy; } });
