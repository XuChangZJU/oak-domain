declare function isASCIIDigit(c: number): boolean;
declare function isASCIIAlpha(c: number): boolean;
declare function isASCIIAlphanumeric(c: number): boolean;
declare function isASCIIHex(c: number): boolean;
export { isASCIIDigit, isASCIIAlpha, isASCIIAlphanumeric, isASCIIHex, };
declare const _default: {
    isASCIIDigit: typeof isASCIIDigit;
    isASCIIAlpha: typeof isASCIIAlpha;
    isASCIIAlphanumeric: typeof isASCIIAlphanumeric;
    isASCIIHex: typeof isASCIIHex;
};
export default _default;
