export declare type OakErrorDef = [number, string];
export declare type OakErrorDefDict = Record<string, OakErrorDef>;
export declare class OakError extends Error {
    $$level: string;
    $$code?: number;
    constructor(level: string, def?: OakErrorDef, message?: string);
}
