"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CHECKER_PRIORITY_MAP = exports.CHECKER_MAX_PRIORITY = exports.TRIGGER_MAX_PRIORITY = exports.TRIGGER_DEFAULT_PRIORITY = exports.TRIGGER_MIN_PRIORITY = void 0;
/**
 * 优先级越小，越早执行。定义在1～99之间
 */
exports.TRIGGER_MIN_PRIORITY = 1;
exports.TRIGGER_DEFAULT_PRIORITY = 25;
exports.TRIGGER_MAX_PRIORITY = 50;
exports.CHECKER_MAX_PRIORITY = 99;
/**
 * logical可能会更改row和data的值，应当最先执行，data和row不能修改相关的值，如果要修改，手动置priority小一点以确保安全
 */
exports.CHECKER_PRIORITY_MAP = {
    logical: 33,
    row: 51,
    data: 61,
    logicalData: 61,
};
;
;
;
;
;
;
;
;
;
;
;
;
;
;
