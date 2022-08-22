/**
 * 判断一个action是不是延时性操作，如果是则返回动作本身
 * @param action 
 * @returns 
 */
export function isLaterAction(action: string) {
    if (action.endsWith('-l')) {
        return action.slice(0, action.length -2);
    }
}