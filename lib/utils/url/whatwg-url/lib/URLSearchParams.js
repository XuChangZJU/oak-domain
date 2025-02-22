"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const tslib_1 = require("tslib");
// @ts-nocheck
const webidl_conversions_1 = tslib_1.__importDefault(require("webidl-conversions"));
const utils_1 = tslib_1.__importDefault(require("./utils"));
const impl = utils_1.default.implSymbol;
const ctorRegistry = utils_1.default.ctorRegistrySymbol;
const IteratorPrototype = Object.create(utils_1.default.IteratorPrototype, {
    next: {
        value: function next() {
            const internal = this[utils_1.default.iterInternalSymbol];
            const { target, kind, index } = internal;
            const values = Array.from(target[impl]);
            const len = values.length;
            if (index >= len) {
                return { value: undefined, done: true };
            }
            const pair = values[index];
            internal.index = index + 1;
            const [key, value] = pair.map(utils_1.default.tryWrapperForImpl);
            let result;
            switch (kind) {
                case 'key':
                    result = key;
                    break;
                case 'value':
                    result = value;
                    break;
                case 'key+value':
                    result = [key, value];
                    break;
            }
            return { value: result, done: false };
        },
        writable: true,
        enumerable: true,
        configurable: true,
    },
    [Symbol.toStringTag]: {
        value: 'URLSearchParams Iterator',
        configurable: true,
    },
});
const iface = {
    // When an interface-module that implements this interface as a mixin is loaded, it will append its own `.is()`
    // method into this array. It allows objects that directly implements *those* interfaces to be recognized as
    // implementing this mixin interface.
    _mixedIntoPredicates: [],
    is(obj) {
        if (obj) {
            if (utils_1.default.hasOwn(obj, impl) &&
                obj[impl] instanceof URLSearchParams_impl_1.default.implementation) {
                return true;
            }
            for (const isMixedInto of module.exports._mixedIntoPredicates) {
                if (isMixedInto(obj)) {
                    return true;
                }
            }
        }
        return false;
    },
    isImpl(obj) {
        if (obj) {
            if (obj instanceof URLSearchParams_impl_1.default.implementation) {
                return true;
            }
            const wrapper = utils_1.default.wrapperForImpl(obj);
            for (const isMixedInto of module.exports._mixedIntoPredicates) {
                if (isMixedInto(wrapper)) {
                    return true;
                }
            }
        }
        return false;
    },
    convert(obj, { context = 'The provided value' } = {}) {
        if (module.exports.is(obj)) {
            return utils_1.default.implForWrapper(obj);
        }
        throw new TypeError(`${context} is not of type 'URLSearchParams'.`);
    },
    createDefaultIterator(target, kind) {
        const iterator = Object.create(IteratorPrototype);
        Object.defineProperty(iterator, utils_1.default.iterInternalSymbol, {
            value: { target, kind, index: 0 },
            configurable: true,
        });
        return iterator;
    },
    create(globalObject, constructorArgs, privateData) {
        if (globalObject[ctorRegistry] === undefined) {
            throw new Error('Internal error: invalid global object');
        }
        const ctor = globalObject[ctorRegistry]['URLSearchParams'];
        if (ctor === undefined) {
            throw new Error('Internal error: constructor URLSearchParams is not installed on the passed global object');
        }
        let obj = Object.create(ctor.prototype);
        obj = iface.setup(obj, globalObject, constructorArgs, privateData);
        return obj;
    },
    createImpl(globalObject, constructorArgs, privateData) {
        const obj = iface.create(globalObject, constructorArgs, privateData);
        return utils_1.default.implForWrapper(obj);
    },
    _internalSetup(obj) { },
    setup(obj, globalObject, constructorArgs = [], privateData = {}) {
        privateData.wrapper = obj;
        iface._internalSetup(obj);
        Object.defineProperty(obj, impl, {
            value: new URLSearchParams_impl_1.default.implementation(globalObject, constructorArgs, privateData),
            configurable: true,
        });
        obj[impl][utils_1.default.wrapperSymbol] = obj;
        if (URLSearchParams_impl_1.default.init) {
            URLSearchParams_impl_1.default.init(obj[impl], privateData);
        }
        return obj;
    },
    install(globalObject) {
        class URLSearchParams {
            constructor() {
                const args = [];
                {
                    let curArg = arguments[0];
                    if (curArg !== undefined) {
                        if (utils_1.default.isObject(curArg)) {
                            if (curArg[Symbol.iterator] !== undefined) {
                                if (!utils_1.default.isObject(curArg)) {
                                    throw new TypeError("Failed to construct 'URLSearchParams': parameter 1" +
                                        ' sequence' +
                                        ' is not an iterable object.');
                                }
                                else {
                                    const V = [];
                                    const tmp = curArg;
                                    for (let nextItem of tmp) {
                                        if (!utils_1.default.isObject(nextItem)) {
                                            throw new TypeError("Failed to construct 'URLSearchParams': parameter 1" +
                                                ' sequence' +
                                                "'s element" +
                                                ' is not an iterable object.');
                                        }
                                        else {
                                            const V = [];
                                            const tmp = nextItem;
                                            for (let nextItem of tmp) {
                                                nextItem = webidl_conversions_1.default['USVString'](nextItem, {
                                                    context: "Failed to construct 'URLSearchParams': parameter 1" +
                                                        ' sequence' +
                                                        "'s element" +
                                                        "'s element",
                                                });
                                                V.push(nextItem);
                                            }
                                            nextItem = V;
                                        }
                                        V.push(nextItem);
                                    }
                                    curArg = V;
                                }
                            }
                            else {
                                if (!utils_1.default.isObject(curArg)) {
                                    throw new TypeError("Failed to construct 'URLSearchParams': parameter 1" +
                                        ' record' +
                                        ' is not an object.');
                                }
                                else {
                                    const result = Object.create(null);
                                    for (const key of Reflect.ownKeys(curArg)) {
                                        const desc = Object.getOwnPropertyDescriptor(curArg, key);
                                        if (desc && desc.enumerable) {
                                            let typedKey = key;
                                            typedKey = webidl_conversions_1.default['USVString'](typedKey, {
                                                context: "Failed to construct 'URLSearchParams': parameter 1" +
                                                    ' record' +
                                                    "'s key",
                                            });
                                            let typedValue = curArg[key];
                                            typedValue = webidl_conversions_1.default['USVString'](typedValue, {
                                                context: "Failed to construct 'URLSearchParams': parameter 1" +
                                                    ' record' +
                                                    "'s value",
                                            });
                                            result[typedKey] = typedValue;
                                        }
                                    }
                                    curArg = result;
                                }
                            }
                        }
                        else {
                            curArg = webidl_conversions_1.default['USVString'](curArg, {
                                context: "Failed to construct 'URLSearchParams': parameter 1",
                            });
                        }
                    }
                    else {
                        curArg = '';
                    }
                    args.push(curArg);
                }
                return iface.setup(Object.create(this.constructor.prototype), globalObject, args);
            }
            append(name, value) {
                if (!this || !module.exports.is(this)) {
                    throw new TypeError('Illegal invocation');
                }
                if (arguments.length < 2) {
                    throw new TypeError("Failed to execute 'append' on 'URLSearchParams': 2 arguments required, but only " +
                        arguments.length +
                        ' present.');
                }
                const args = [];
                {
                    let curArg = arguments[0];
                    curArg = webidl_conversions_1.default['USVString'](curArg, {
                        context: "Failed to execute 'append' on 'URLSearchParams': parameter 1",
                    });
                    args.push(curArg);
                }
                {
                    let curArg = arguments[1];
                    curArg = webidl_conversions_1.default['USVString'](curArg, {
                        context: "Failed to execute 'append' on 'URLSearchParams': parameter 2",
                    });
                    args.push(curArg);
                }
                return this[impl].append(...args);
            }
            delete(name) {
                if (!this || !module.exports.is(this)) {
                    throw new TypeError('Illegal invocation');
                }
                if (arguments.length < 1) {
                    throw new TypeError("Failed to execute 'delete' on 'URLSearchParams': 1 argument required, but only " +
                        arguments.length +
                        ' present.');
                }
                const args = [];
                {
                    let curArg = arguments[0];
                    curArg = webidl_conversions_1.default['USVString'](curArg, {
                        context: "Failed to execute 'delete' on 'URLSearchParams': parameter 1",
                    });
                    args.push(curArg);
                }
                return this[impl].delete(...args);
            }
            get(name) {
                if (!this || !module.exports.is(this)) {
                    throw new TypeError('Illegal invocation');
                }
                if (arguments.length < 1) {
                    throw new TypeError("Failed to execute 'get' on 'URLSearchParams': 1 argument required, but only " +
                        arguments.length +
                        ' present.');
                }
                const args = [];
                {
                    let curArg = arguments[0];
                    curArg = webidl_conversions_1.default['USVString'](curArg, {
                        context: "Failed to execute 'get' on 'URLSearchParams': parameter 1",
                    });
                    args.push(curArg);
                }
                return this[impl].get(...args);
            }
            getAll(name) {
                if (!this || !module.exports.is(this)) {
                    throw new TypeError('Illegal invocation');
                }
                if (arguments.length < 1) {
                    throw new TypeError("Failed to execute 'getAll' on 'URLSearchParams': 1 argument required, but only " +
                        arguments.length +
                        ' present.');
                }
                const args = [];
                {
                    let curArg = arguments[0];
                    curArg = webidl_conversions_1.default['USVString'](curArg, {
                        context: "Failed to execute 'getAll' on 'URLSearchParams': parameter 1",
                    });
                    args.push(curArg);
                }
                return utils_1.default.tryWrapperForImpl(this[impl].getAll(...args));
            }
            has(name) {
                if (!this || !module.exports.is(this)) {
                    throw new TypeError('Illegal invocation');
                }
                if (arguments.length < 1) {
                    throw new TypeError("Failed to execute 'has' on 'URLSearchParams': 1 argument required, but only " +
                        arguments.length +
                        ' present.');
                }
                const args = [];
                {
                    let curArg = arguments[0];
                    curArg = webidl_conversions_1.default['USVString'](curArg, {
                        context: "Failed to execute 'has' on 'URLSearchParams': parameter 1",
                    });
                    args.push(curArg);
                }
                return this[impl].has(...args);
            }
            set(name, value) {
                if (!this || !module.exports.is(this)) {
                    throw new TypeError('Illegal invocation');
                }
                if (arguments.length < 2) {
                    throw new TypeError("Failed to execute 'set' on 'URLSearchParams': 2 arguments required, but only " +
                        arguments.length +
                        ' present.');
                }
                const args = [];
                {
                    let curArg = arguments[0];
                    curArg = webidl_conversions_1.default['USVString'](curArg, {
                        context: "Failed to execute 'set' on 'URLSearchParams': parameter 1",
                    });
                    args.push(curArg);
                }
                {
                    let curArg = arguments[1];
                    curArg = webidl_conversions_1.default['USVString'](curArg, {
                        context: "Failed to execute 'set' on 'URLSearchParams': parameter 2",
                    });
                    args.push(curArg);
                }
                return this[impl].set(...args);
            }
            sort() {
                if (!this || !module.exports.is(this)) {
                    throw new TypeError('Illegal invocation');
                }
                return this[impl].sort();
            }
            toString() {
                if (!this || !module.exports.is(this)) {
                    throw new TypeError('Illegal invocation');
                }
                return this[impl].toString();
            }
            keys() {
                if (!this || !module.exports.is(this)) {
                    throw new TypeError('Illegal invocation');
                }
                return module.exports.createDefaultIterator(this, 'key');
            }
            values() {
                if (!this || !module.exports.is(this)) {
                    throw new TypeError('Illegal invocation');
                }
                return module.exports.createDefaultIterator(this, 'value');
            }
            entries() {
                if (!this || !module.exports.is(this)) {
                    throw new TypeError('Illegal invocation');
                }
                return module.exports.createDefaultIterator(this, 'key+value');
            }
            forEach(callback) {
                if (!this || !module.exports.is(this)) {
                    throw new TypeError('Illegal invocation');
                }
                if (arguments.length < 1) {
                    throw new TypeError("Failed to execute 'forEach' on 'iterable': 1 argument required, " +
                        'but only 0 present.');
                }
                if (typeof callback !== 'function') {
                    throw new TypeError("Failed to execute 'forEach' on 'iterable': The callback provided " +
                        'as parameter 1 is not a function.');
                }
                const thisArg = arguments[1];
                let pairs = Array.from(this[impl]);
                let i = 0;
                while (i < pairs.length) {
                    const [key, value] = pairs[i].map(utils_1.default.tryWrapperForImpl);
                    callback.call(thisArg, value, key, this);
                    pairs = Array.from(this[impl]);
                    i++;
                }
            }
        }
        Object.defineProperties(URLSearchParams.prototype, {
            append: { enumerable: true },
            delete: { enumerable: true },
            get: { enumerable: true },
            getAll: { enumerable: true },
            has: { enumerable: true },
            set: { enumerable: true },
            sort: { enumerable: true },
            toString: { enumerable: true },
            keys: { enumerable: true },
            values: { enumerable: true },
            entries: { enumerable: true },
            forEach: { enumerable: true },
            [Symbol.toStringTag]: {
                value: 'URLSearchParams',
                configurable: true,
            },
            [Symbol.iterator]: {
                value: URLSearchParams.prototype.entries,
                configurable: true,
                writable: true,
            },
        });
        if (globalObject[ctorRegistry] === undefined) {
            globalObject[ctorRegistry] = Object.create(null);
        }
        globalObject[ctorRegistry]['URLSearchParams'] = URLSearchParams;
        Object.defineProperty(globalObject, 'URLSearchParams', {
            configurable: true,
            writable: true,
            value: URLSearchParams,
        });
    },
};
// iface
module.exports = iface;
// const Impl = require('./URLSearchParams-impl')
const URLSearchParams_impl_1 = tslib_1.__importDefault(require("./URLSearchParams-impl"));
