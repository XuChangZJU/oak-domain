export type OakErrorDef = [number, string];
export type OakErrorDefDict = Record<string, OakErrorDef>;

export class OakError extends Error {
    $$level: string;
    $$code?: number;

    constructor(level: string, def?: OakErrorDef, message?: string) {
        super(message ? message : def && def[1]);
        this.$$level = level;
        this.$$code = def && def[0];
    }
}