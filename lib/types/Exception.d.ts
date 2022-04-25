import { EntityDict, OpRecord } from "./Entity";
/**
 * 数据不一致异常，系统认为现有的数据不允许相应的动作时抛此异常
 *
 */
export declare class DataInconsistencyException<ED extends EntityDict> extends Error {
    private data;
    constructor(data: OpRecord<ED>, message?: string);
    getData(): OpRecord<ED>;
}
/**
 * 当输入的数据非法时抛此异常，attributes表示非法的属性
 */
export declare class InputIllegalException extends Error {
    private attributes;
    constructor(attributes: string[], message?: string);
    getAttributes(): string[];
    addAttributesPrefix(prefix: string): void;
}
/**
 * 用户权限不够时抛的异常
 */
export declare class UserUnpermittedException extends Error {
}
export declare class UserException extends Error {
}
export declare class UnloggedInException extends UserException {
    constructor(message?: string);
}
export declare class NotEnoughMoneyException extends UserException {
    constructor(message?: string);
}
