import assert from "assert";
import { EntityDict, OpRecord, SelectOpResult } from "./Entity";

export class OakException<ED extends EntityDict> extends Error {
    opRecord: SelectOpResult<ED>;
    constructor(message?: string) {
        super(message);
        this.name = new.target.name;
        if (typeof (Error as any).captureStackTrace === 'function') {
            (Error as any).captureStackTrace(this, new.target);
        }
        if (typeof Object.setPrototypeOf === 'function') {
            Object.setPrototypeOf(this, new.target.prototype);
        } else {
            (this as any).__proto__ = new.target.prototype;
        }
        this.opRecord = {
            a: 's',
            d: {},
        };
    }

    addData<T extends keyof ED>(entity: T, rows: Partial<ED[T]['OpSchema']>[]) {
        const { d } = this.opRecord;
        const addSingleRow = (rowRoot: Record<string, Partial<ED[T]['OpSchema']>>, row: Partial<ED[T]['OpSchema']>) => {
            const { id } = row;
            if (rowRoot[id!]) {
                Object.assign(rowRoot[id!], row);
            }
            else {
                rowRoot[id!] = row;
            }
        };
        if (!d[entity]) {
            d[entity] = {};
        }
        rows.forEach(
            row => addSingleRow(d[entity]!, row)
        );
    }

    setOpRecords(opRecord: SelectOpResult<ED>) {
        this.opRecord = opRecord;
    }

    toString() {
        return JSON.stringify({
            name: this.constructor.name,
            message: this.message,
            opRecord: this.opRecord,
        });
    }
}

export class OakDataException<ED extends EntityDict> extends OakException<ED> {
    // 表示由数据层发现的异常
}

export class OakUniqueViolationException<ED extends EntityDict> extends OakException<ED> {
    rows: Array<{
        id?: string;
        attrs: string[];
    }>;
    constructor(rows: Array<{
        id?: string;
        attrs: string[];
    }>, message?: string) {
        super(message || '您更新的数据违反了唯一性约束');
        this.rows = rows;
    }
}

export class OakImportDataParseException<ED extends EntityDict> extends OakException<ED> {
    line: number;
    header?: string;

    // message必传，描述具体错误的数据内容
    constructor(message: string, line: number, header?: string) {
        super(message);
        this.line = line;
        this.header = header;
    }
}

export class OakNoRelationDefException<ED extends EntityDict, T extends keyof ED> extends OakDataException<ED> {
    entity: T;
    actions: ED[T]['Action'][];
    constructor(entity: T, actions: ED[T]['Action'][], msg?: string) {
        super(msg || `对象${entity as string}的操作${actions.join(',')}找不到有效的relation定义`);
        this.entity = entity;
        this.actions = actions;
    }
    
    toString(): string {
        return JSON.stringify({
            name: this.constructor.name,
            message: this.message,
            entity: this.entity,
            action: this.actions,
        });
    }
}

export class OakOperExistedException<ED extends EntityDict> extends OakDataException<ED> {
    // 进行操作时发现同样id的Oper对象已经存在
}

export class OakRowUnexistedException<ED extends EntityDict> extends OakDataException<ED> {
    private rows: Array<{
        entity: any;
        selection: any;
    }>
    // 指定主键查询时却发现行不存在，一般发生在缓存中
    constructor(rows: Array<{entity: any, selection: any}>) {
        super(`查询${rows.map(ele => ele.entity).join(',')}对象时发现了空指针，请检查数据一致性`);
        this.rows = rows;
    }

    toString() {
        return JSON.stringify({rows: this.rows });
    }

    getRows() {
        return this.rows;
    }
}

/**
 * 可接受的、由用户操作造成的异常
 */
export class OakUserException<ED extends EntityDict> extends OakException<ED> {
    // 继承了这个类的异常统一视为“可接受的、由用户操作造成的异常”
};

/**
 * 网络中断异常
 */
export class OakNetworkException<ED extends EntityDict> extends OakException<ED> {
    // 网络访问异常
}

// 
export class OakServerProxyException<ED extends EntityDict> extends OakException<ED> {
    // 服务器反射异常（请求未能到达应用服务程序）
}


// 在系统更新数据时，以下三个异常应按规范依次抛出。
/**
 * 数据不一致异常，系统认为现有的数据不允许相应的动作时抛此异常
 * 
 */
export class OakRowInconsistencyException<ED extends EntityDict> extends OakUserException<ED> {
    constructor(data?: OpRecord<ED>, message?: string) {
        super(message);
        assert(!data, '现在使用addData接口来传数据');
    }

    toString(): string {
        return JSON.stringify({
            name: this.constructor.name,
            message: this.message,
        });
    }
};

/**
 * 当输入的数据非法时抛此异常，attributes表示非法的属性
 */
export class OakInputIllegalException<ED extends EntityDict> extends OakUserException<ED> {
    private attributes: string[];
    private entity: keyof ED;
    constructor(entity: keyof ED, attributes: string[], message?: string) {
        super(message);
        this.entity = entity;
        this.attributes = attributes;
    }

    getEntity() {
        return this.entity;
    }

    getAttributes() {
        return this.attributes;
    }

    addAttributesPrefix(prefix: string) {
        this.attributes = this.attributes.map(
            ele => `${prefix}.${ele}`
        );
    }

    toString(): string {
        return JSON.stringify({
            entity: this.entity,
            name: this.constructor.name,
            message: this.message,
            attributes: this.attributes,
        });
    }
};

/**
 * 属性为空时抛的异常
 */
export class OakAttrNotNullException<ED extends EntityDict> extends OakInputIllegalException<ED> {
    constructor(entity: keyof ED, attributes: string[], message?: string) {
        super(entity, attributes, message || `属性[${attributes.join(',')}]不允许为空`);
    }
}

/**
 * 属性不允许更新抛的异常，前端可以用这个异常来处理update时对应属性的露出
 */
export class OakAttrCantUpdateException<ED extends EntityDict> extends OakInputIllegalException<ED> {
    constructor(entity: keyof ED, attributes: string[], message?: string) {
        super(entity, attributes, message || `属性[${attributes.join(',')}]不允许更新`);
    }
}

/**
 * 用户权限不够时抛的异常
 */
export class OakUserUnpermittedException<ED extends EntityDict, T extends keyof ED> extends OakUserException<ED> {
    private entity: T;
    private operation: ED[T]['Selection'] | ED[T]['Operation'];

    constructor(entity: T, operation: ED[T]['Selection'] | ED[T]['Operation'], message?: string) {
        super(message || '用户操作权限不足');
        this.entity = entity;
        this.operation = operation;
    }


    toString(): string {
        return JSON.stringify({
            entity: this.entity,
            name: this.constructor.name,
            message: this.message,
            operation: this.operation,
        });
    }
};

/**
 * 用户查询权限不够抛出异常
 */
export class OakUserInvisibleException<ED extends EntityDict, T extends keyof ED> extends OakUserException<ED> {
    private entity: T;
    private operation: ED[T]['Selection'] | ED[T]['Operation'];

    constructor(entity: T, operation: ED[T]['Selection'] | ED[T]['Operation'], message?: string) {
        super(message || '用户查询权限不足');
        this.entity = entity;
        this.operation = operation;
    }


    toString(): string {
        return JSON.stringify({
            entity: this.entity,
            name: this.constructor.name,
            message: this.message,
            operation: this.operation,
        });
    }
};


/**
 * 用户未登录抛的异常
 */
export class OakUnloggedInException<ED extends EntityDict> extends OakUserException<ED> {
    constructor(message?: string) {
        super(message || '您尚未登录');
    }
};


/**
 * 用户未登录抛的异常
 */
 export class OakRowLockedException<ED extends EntityDict> extends OakUserException<ED> {
    constructor(message?: string) {
        super(message || '该行数据正在被更新中，请稍后再试');
    }
};
/**
 * 要插入行时，发现已经有相同的行数据
 */
export class OakCongruentRowExists<ED extends EntityDict, T extends keyof ED> extends OakUserException<ED> {
    private data: ED[T]['OpSchema'];
    private entity: T;
    constructor(entity: T, data: ED[T]['OpSchema'], message?: string) {
        super(message);
        this.data = data;
        this.entity = entity;
    }

    getData() {
        return this.data;
    }

    getEntity() {
        return this.entity;
    }

    toString(): string {
        return JSON.stringify({
            name: this.constructor.name,
            message: this.message,
            data: this.data,
            entity: this.entity,
        });
    }
}

/**
 * 死锁抛的异常
 */
export class OakDeadlock<ED extends EntityDict> extends OakUserException<ED> {
    constructor(message?: string | undefined) {
        super(message || '发现死锁');
    }
};

/**
 * 前置条件不满足抛的异常
 */
export class OakPreConditionUnsetException<ED extends EntityDict> extends OakUserException<ED> {
    entity?: keyof ED;
    code?: string;

    constructor(message?: string | undefined, entity?: keyof ED | undefined, code?: string | undefined) {
        super(message || '前置条件不满足');
        this.entity = entity,
        this.code = code;
    }

    
    toString(): string {
        return JSON.stringify({
            name: this.constructor.name,
            message: this.message,
            code: this.code,
            entity: this.entity,
        });
    }
}

/**
 * 调用外部接口抛出的异常
 */
export class OakExternalException<ED extends EntityDict> extends OakUserException<ED> {
    code?: string;
    source: string;
    data?: any;

    constructor(source: string, code?: string, message?: string, data?: any) {
        super(message);
        this.code = code;
        this.source = source;
        this.data = data;
    }

    toString(): string {
        return JSON.stringify({
            code: this.code,
            message: this.message,
            source: this.source,
            data: this.data,
        });
    }
}

export function makeException<ED extends EntityDict>(data: {
    name: string;
    message?: string;
    opRecords: SelectOpResult<ED>;
    [A: string]: any;
}) {
    const { name } = data;
    let e: OakException<ED> | undefined = undefined;
    switch (name) {
        case 'OakException': {
            e = new OakException(data.message);
            break;
        }
        case 'OakUserException': {
            const e = new OakUserException(data.message);
            break;
        }
        case 'OakRowInconsistencyException': {
            const e = new OakRowInconsistencyException(data.data, data.message);
            break;
        }
        case 'OakInputIllegalException': {
            const e = new OakInputIllegalException(data.entity, data.attributes, data.message);
            break;
        }
        case 'OakAttrCantUpdateException': {
            const e = new OakAttrCantUpdateException(data.entity, data.attributes, data.message);
            break;
        }
        case 'OakUserUnpermittedException': {
            const e = new OakUserUnpermittedException(data.entity, data.operation, data.message);
            break;
        }
        case 'OakUserInvisibleException': {
            const e = new OakUserInvisibleException(data.entity, data.operation, data.message);
            break;
        }
        case 'OakUnloggedInException': {
            const e = new OakUnloggedInException(data.message);
            break;
        }
        case 'OakCongruentRowExists': {
            const e = new OakCongruentRowExists(data.entity, data.data, data.message);
            break;
        }
        case 'OakRowLockedException': {
            const e = new OakRowLockedException(data.message);
            break;
        }
        case 'OakRowUnexistedException': {
            const e = new OakRowUnexistedException(data.rows);
            break;
        }
        case 'OakDeadlock': {
            const e = new OakDeadlock(data.message);
            break;
        }
        case 'OakDataException': {
            const e = new OakDataException(data.message);
            break;
        }
        case 'OakNoRelationDefException': {
            const e = new OakNoRelationDefException(data.entity, data.action, data.message);
            break;
        }
        case 'OakUniqueViolationException': {
            const e = new OakUniqueViolationException(data.rows, data.message);
            break;
        }
        case 'OakImportDataParseException': {
            const e = new OakImportDataParseException(data.message!, data.line, data.header);
            break;
        }
        case 'OakPreConditionUnsetException': {
            const e = new OakPreConditionUnsetException(data.message, data.entity, data.code);
            break;
        }
        case 'OakAttrNotNullException': {
            const e = new OakAttrNotNullException(
                data.entity,
                data.attributes,
                data.message
            );
            break;
        }
        case 'OakExternalException': {
            const e = new OakExternalException(data.source, data.code, data.message, data.data);
            break;
        }
        case 'OakNetworkException': {
            const e = new OakNetworkException(data.message);
            break;
        }
        case 'OakServerProxyException': {
            const e = new OakServerProxyException(data.message);
            break;
        }
        default:
            return;
    }
    if (e) {
        e.setOpRecords(data.opRecords);
        return e;
    }
}