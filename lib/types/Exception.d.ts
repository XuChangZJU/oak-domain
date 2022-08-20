import { EntityDict, OpRecord } from "./Entity";
export declare class OakException extends Error {
    constructor(message?: string);
    toString(): string;
}
export declare class OakDataException extends Error {
}
export declare class OakOperExistedException extends OakDataException {
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
    constructor(attributes: string[], message?: string);
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
 * 要插入行时，发现已经有相同的行数据
 */
export declare class OakCongruentRowExists<ED extends EntityDict, T extends keyof ED> extends OakUserException {
    private data;
    constructor(data: ED[T]['OpSchema'], message?: string);
    getData(): ED[T]["OpSchema"];
    toString(): string;
}
export declare function makeException(data: {
    name: string;
    message?: string;
    [A: string]: any;
}): OakException | OakExternalException | undefined;
