
// Returns "Type(value) is Object" in ES terminology.
function isObject(value: null) {
  return typeof value === "object" && value !== null || typeof value === "function";
}

function hasOwn(obj: any, prop: PropertyKey) {
  return Object.prototype.hasOwnProperty.call(obj, prop);
}

const wrapperSymbol = Symbol("wrapper");
const implSymbol = Symbol("impl");
const sameObjectCaches = Symbol("SameObject caches");
const ctorRegistrySymbol = Symbol.for("[webidl2js]  constructor registry");

function getSameObject(wrapper: any, prop: string, creator: () => any) {
  if (!wrapper[sameObjectCaches]) {
    wrapper[sameObjectCaches] = Object.create(null);
  }

  if (prop in wrapper[sameObjectCaches]) {
    return wrapper[sameObjectCaches][prop];
  }

  wrapper[sameObjectCaches][prop] = creator();
  return wrapper[sameObjectCaches][prop];
}

function wrapperForImpl(impl: any) {
  return impl ? impl[wrapperSymbol] : null;
}

function implForWrapper(wrapper: any) {
    return wrapper ? wrapper[implSymbol] : null;
}

function tryWrapperForImpl(impl: any) {
    const wrapper = wrapperForImpl(impl);
    return wrapper ? wrapper : impl;
}

function tryImplForWrapper(wrapper: any) {
    const impl = implForWrapper(wrapper);
    return impl ? impl : wrapper;
}

const iterInternalSymbol = Symbol("internal");
const IteratorPrototype = Object.getPrototypeOf(Object.getPrototypeOf([][Symbol.iterator]()));

function isArrayIndexPropName(P: any) {
    if (typeof P !== 'string') {
        return false;
    }
    const i = (P as any) >>> 0;
    if (i === Math.pow(2, 32) - 1) {
        return false;
    }
    const s = `${i}`;
    if (P !== s) {
        return false;
    }
    return true;
}

const byteLengthGetter =
    Object.getOwnPropertyDescriptor(ArrayBuffer.prototype, "byteLength")!.get!;
function isArrayBuffer(value: any) {
  try {
    byteLengthGetter.call(value);
    return true;
  } catch (e) {
    return false;
  }
}

const supportsPropertyIndex = Symbol("supports property index");
const supportedPropertyIndices = Symbol("supported property indices");
const supportsPropertyName = Symbol("supports property name");
const supportedPropertyNames = Symbol("supported property names");
const indexedGet = Symbol("indexed property get");
const indexedSetNew = Symbol("indexed property set new");
const indexedSetExisting = Symbol("indexed property set existing");
const namedGet = Symbol("named property get");
const namedSetNew = Symbol("named property set new");
const namedSetExisting = Symbol("named property set existing");
const namedDelete = Symbol("named property delete");

export default {
  isObject,
  hasOwn,
  wrapperSymbol,
  implSymbol,
  getSameObject,
  ctorRegistrySymbol,
  wrapperForImpl,
  implForWrapper,
  tryWrapperForImpl,
  tryImplForWrapper,
  iterInternalSymbol,
  IteratorPrototype,
  isArrayBuffer,
  isArrayIndexPropName,
  supportsPropertyIndex,
  supportedPropertyIndices,
  supportsPropertyName,
  supportedPropertyNames,
  indexedGet,
  indexedSetNew,
  indexedSetExisting,
  namedGet,
  namedSetNew,
  namedSetExisting,
  namedDelete
};
