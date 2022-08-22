"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.isLaterAction = void 0;
/**
 * 判断一个action是不是延时性操作，如果是则返回动作本身
 * @param action
 * @returns
 */
function isLaterAction(action) {
    if (action.endsWith('-l')) {
        return action.slice(0, action.length - 2);
    }
}
exports.isLaterAction = isLaterAction;
