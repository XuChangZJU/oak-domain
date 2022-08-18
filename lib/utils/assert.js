"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.assert = void 0;
var tslib_1 = require("tslib");
/**
 * 防止assert打包体积过大，从这里引用
 */
var assert_1 = tslib_1.__importDefault(require("assert"));
exports.assert = assert_1.default;
