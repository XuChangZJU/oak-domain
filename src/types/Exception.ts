import { EntityDict, OpRecord } from "./Entity";

// 在系统更新数据时，以下三个异常应按规范依次抛出。
/**
 * 数据不一致异常，系统认为现有的数据不允许相应的动作时抛此异常
 * 
 */
 export class DataInconsistencyException<ED extends EntityDict> extends Error {
    private data: OpRecord<ED>;
    constructor(data: OpRecord<ED>, message?: string) {
        super(message);
        this.data = data;
    }

    getData() {
        return this.data;
    }
};

/**
 * 当输入的数据非法时抛此异常，attributes表示非法的属性
 */
export class InputIllegalException extends Error {
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
};

/**
 * 用户权限不够时抛的异常
 */
export class UserUnpermittedException extends Error {

};


// 以下是应用公共的异常定义
export class UserException extends Error {
    // 继承了这个类的异常统一视为“可接受的、由用户操作造成的异常”
};
export class UnloggedInException extends UserException {
    constructor(message?: string) {
        super(message || '您尚未登录');
    }
};
export class NotEnoughMoneyException extends UserException {
    constructor(message?: string) {
        super(message || '您的余额不足');
    }
};