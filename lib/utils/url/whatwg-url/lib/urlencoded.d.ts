/// <reference types="node" />
import { Buffer } from 'buffer';
declare function percentEncode(c: number): string;
declare function percentDecode(input: Buffer): Buffer;
declare function serializeUrlencoded(tuples: any[], encodingOverride?: undefined): string;
declare function parseUrlencoded(input: WithImplicitCoercion<ArrayBuffer | SharedArrayBuffer>): string[][];
declare function ucs2decode(string: string): number[];
declare const _default: {
    percentEncode: typeof percentEncode;
    percentDecode: typeof percentDecode;
    parseUrlencoded: typeof parseUrlencoded;
    serializeUrlencoded: typeof serializeUrlencoded;
    ucs2decode: typeof ucs2decode;
};
export default _default;
