"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.assert = void 0;
/**
 * 防止assert打包体积过大，从这里引用
 */
const assert_1 = __importDefault(require("assert"));
exports.assert = assert_1.default;
