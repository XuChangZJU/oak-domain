import { EntityDict, OpRecord } from "./Entity";

export class OakException extends Error {
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
    }

    toString() {
        return JSON.stringify({
            name: this.constructor.name,
            message: this.message,
        });
    }
}

export class OakDataException extends OakException {
    // 表示由数据层发现的异常
}

export class OakOperExistedException extends OakDataException {
    // 进行操作时发现同样id的Oper对象已经存在
}

export class OakRowUnexistedException extends OakDataException {
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

export class OakExternalException extends Error {
    // 表示由oak生态外部造成的异常，比如网络中断
}

export class OakUserException extends OakException {
    // 继承了这个类的异常统一视为“可接受的、由用户操作造成的异常”
};

// 在系统更新数据时，以下三个异常应按规范依次抛出。
/**
 * 数据不一致异常，系统认为现有的数据不允许相应的动作时抛此异常
 * 
 */
export class OakRowInconsistencyException<ED extends EntityDict> extends OakUserException {
    private data?: OpRecord<ED>;
    constructor(data?: OpRecord<ED>, message?: string) {
        super(message);
        this.data = data;
    }

    getData() {
        return this.data;
    }

    toString(): string {
        return JSON.stringify({
            name: this.constructor.name,
            message: this.message,
            data: this.data,
        });
    }
};

/**
 * 当输入的数据非法时抛此异常，attributes表示非法的属性
 */
export class OakInputIllegalException extends OakUserException {
    private attributes: string[];
    constructor(attributes: string[], message?: string) {
        super(message);
        this.attributes = attributes;
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
            name: this.constructor.name,
            message: this.message,
            attributes: this.attributes,
        });
    }
};

/**
 * 用户权限不够时抛的异常
 */
export class OakUserUnpermittedException extends OakUserException {

};

/**
 * 用户未登录抛的异常
 */
export class OakUnloggedInException extends OakUserException {
    constructor(message?: string) {
        super(message || '您尚未登录');
    }
};


/**
 * 用户未登录抛的异常
 */
 export class OakRowLockedException extends OakUserException {
    constructor(message?: string) {
        super(message || '该行数据正在被更新中，请稍后再试');
    }
};
/**
 * 要插入行时，发现已经有相同的行数据
 */
export class OakCongruentRowExists<ED extends EntityDict, T extends keyof ED> extends OakUserException {
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

export function makeException(data: {
    name: string;
    message?: string;
    [A: string]: any;
}) {
    const { name } = data;
    switch (name) {
        case OakException.name: {
            return new OakException(data.message);
        }
        case OakUserException.name: {
            return new OakUserException(data.message);
        }
        case OakExternalException.name: {
            return new OakExternalException(data.message);
        }
        case OakRowInconsistencyException.name: {
            return new OakRowInconsistencyException(data.data, data.message);
        }
        case OakInputIllegalException.name: {
            return new OakInputIllegalException(data.attributes, data.message);
        }
        case OakUserUnpermittedException.name: {
            return new OakUserUnpermittedException(data.message);
        }
        case OakUnloggedInException.name: {
            return new OakUnloggedInException(data.message);
        }
        case OakCongruentRowExists.name: {
            return new OakCongruentRowExists(data.entity, data.data, data.message);
        }
        case OakRowLockedException.name: {
            return new OakRowLockedException(data.message);
        }
        case OakRowUnexistedException.name: {
            return new OakRowUnexistedException(data.rows);
        }
        default:
            return;
    }
}