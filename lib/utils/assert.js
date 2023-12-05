"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.assert = void 0;
const tslib_1 = require("tslib");
/**
 * 防止assert打包体积过大，从这里引用
 */
const assert_1 = tslib_1.__importDefault(require("assert"));
exports.assert = assert_1.default;
