import { EntityDict, OpRecord, SelectOpResult } from "./Entity";
export declare class OakException<ED extends EntityDict> extends Error {
    opRecord: SelectOpResult<ED>;
    constructor(message?: string);
    addData<T extends keyof ED>(entity: T, rows: Partial<ED[T]['OpSchema']>[]): void;
    setOpRecords(opRecord: SelectOpResult<ED>): void;
    toString(): string;
}
export declare class OakDataException<ED extends EntityDict> extends OakException<ED> {
}
export declare class OakUniqueViolationException<ED extends EntityDict> extends OakException<ED> {
    rows: Array<{
        id?: string;
        attrs: string[];
    }>;
    constructor(rows: Array<{
        id?: string;
        attrs: string[];
    }>, message?: string);
}
export declare class OakImportDataParseException<ED extends EntityDict> extends OakException<ED> {
    line: number;
    header?: string;
    constructor(message: string, line: number, header?: string);
}
export declare class OakNoRelationDefException<ED extends EntityDict, T extends keyof ED> extends OakDataException<ED> {
    entity: T;
    actions: ED[T]['Action'][];
    constructor(entity: T, actions: ED[T]['Action'][], msg?: string);
    toString(): string;
}
export declare class OakOperExistedException<ED extends EntityDict> extends OakDataException<ED> {
}
export declare class OakRowUnexistedException<ED extends EntityDict> extends OakDataException<ED> {
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
/**
 * 生态外部造成的异常，比如网络中断
 */
export declare class OakExternalException extends Error {
}
/**
 * 可接受的、由用户操作造成的异常
 */
export declare class OakUserException<ED extends EntityDict> extends OakException<ED> {
}
/**
 * 数据不一致异常，系统认为现有的数据不允许相应的动作时抛此异常
 *
 */
export declare class OakRowInconsistencyException<ED extends EntityDict> extends OakUserException<ED> {
    constructor(data?: OpRecord<ED>, message?: string);
    toString(): string;
}
/**
 * 当输入的数据非法时抛此异常，attributes表示非法的属性
 */
export declare class OakInputIllegalException<ED extends EntityDict> extends OakUserException<ED> {
    private attributes;
    private entity;
    constructor(entity: keyof ED, attributes: string[], message?: string);
    getEntity(): keyof ED;
    getAttributes(): string[];
    addAttributesPrefix(prefix: string): void;
    toString(): string;
}
/**
 * 属性为空时抛的异常
 */
export declare class OakAttrNotNullException<ED extends EntityDict> extends OakInputIllegalException<ED> {
    constructor(entity: keyof ED, attributes: string[], message?: string);
}
/**
 * 用户权限不够时抛的异常
 */
export declare class OakUserUnpermittedException<ED extends EntityDict> extends OakUserException<ED> {
}
/**
 * 用户查询权限不够抛出异常
 */
export declare class OakUserInvisibleException<ED extends EntityDict> extends OakUserException<ED> {
}
/**
 * 用户未登录抛的异常
 */
export declare class OakUnloggedInException<ED extends EntityDict> extends OakUserException<ED> {
    constructor(message?: string);
}
/**
 * 用户未登录抛的异常
 */
export declare class OakRowLockedException<ED extends EntityDict> extends OakUserException<ED> {
    constructor(message?: string);
}
/**
 * 要插入行时，发现已经有相同的行数据
 */
export declare class OakCongruentRowExists<ED extends EntityDict, T extends keyof ED> extends OakUserException<ED> {
    private data;
    private entity;
    constructor(entity: T, data: ED[T]['OpSchema'], message?: string);
    getData(): ED[T]["OpSchema"];
    getEntity(): T;
    toString(): string;
}
/**
 * 死锁抛的异常
 */
export declare class OakDeadlock<ED extends EntityDict> extends OakUserException<ED> {
    constructor(message?: string | undefined);
}
/**
 * 前置条件不满足抛的异常
 */
export declare class OakPreConditionUnsetException<ED extends EntityDict> extends OakUserException<ED> {
    entity?: keyof ED;
    code?: string;
    constructor(message?: string | undefined, entity?: keyof ED | undefined, code?: string | undefined);
    toString(): string;
}
export declare function makeException<ED extends EntityDict>(data: {
    name: string;
    message?: string;
    opRecords: SelectOpResult<ED>;
    [A: string]: any;
}): OakException<EntityDict> | undefined;
