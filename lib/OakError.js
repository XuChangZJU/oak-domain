"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.OakError = void 0;
class OakError extends Error {
    $$level;
    $$code;
    constructor(level, def, message) {
        super(message ? message : def && def[1]);
        this.$$level = level;
        this.$$code = def && def[0];
    }
}
exports.OakError = OakError;
