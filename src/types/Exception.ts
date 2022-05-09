import { EntityDict, OpRecord } from "./Entity";

export class OakException extends Error {
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
};

/**
 * 用户权限不够时抛的异常
 */
export class OakUserUnpermittedException extends OakUserException {

};

