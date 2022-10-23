import { EntityDict, OpRecord } from "./Entity";
export declare class OakException extends Error {
    constructor(message?: string);
    toString(): string;
}
export declare class OakDataException extends OakException {
}
export declare class OakOperExistedException extends OakDataException {
}
export declare class OakRowUnexistedException extends OakDataException {
    private rows;
    constructor(rows: Array<{
        entity: any;
        selection: any;
    }>);
    toString(): string;
    getRows(): {
        entity: any;
        selection: any;
    }[];
}
export declare class OakExternalException extends Error {
}
export declare class OakUserException extends OakException {
}
/**
 * 数据不一致异常，系统认为现有的数据不允许相应的动作时抛此异常
 *
 */
export declare class OakRowInconsistencyException<ED extends EntityDict> extends OakUserException {
    private data?;
    constructor(data?: OpRecord<ED>, message?: string);
    getData(): OpRecord<ED> | undefined;
    toString(): string;
}
/**
 * 当输入的数据非法时抛此异常，attributes表示非法的属性
 */
export declare class OakInputIllegalException extends OakUserException {
    private attributes;
    private entity;
    constructor(entity: string, attributes: string[], message?: string);
    getEntity(): string;
    getAttributes(): string[];
    addAttributesPrefix(prefix: string): void;
    toString(): string;
}
/**
 * 用户权限不够时抛的异常
 */
export declare class OakUserUnpermittedException extends OakUserException {
}
/**
 * 用户未登录抛的异常
 */
export declare class OakUnloggedInException extends OakUserException {
    constructor(message?: string);
}
/**
 * 用户未登录抛的异常
 */
export declare class OakRowLockedException extends OakUserException {
    constructor(message?: string);
}
/**
 * 要插入行时，发现已经有相同的行数据
 */
export declare class OakCongruentRowExists<ED extends EntityDict, T extends keyof ED> extends OakUserException {
    private data;
    private entity;
    constructor(entity: T, data: ED[T]['OpSchema'], message?: string);
    getData(): ED[T]["OpSchema"];
    getEntity(): T;
    toString(): string;
}
export declare class OakDeadlock extends OakUserException {
    constructor(message?: string | undefined);
}
export declare function makeException(data: {
    name: string;
    message?: string;
    [A: string]: any;
}): OakException | OakExternalException | undefined;
