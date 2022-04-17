"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AttrIllegalError = void 0;
class AttrIllegalError extends Error {
    attributes;
    constructor(attributes, message) {
        super(message);
        this.attributes = attributes;
    }
    getAttributes() {
        return this.attributes;
    }
}
exports.AttrIllegalError = AttrIllegalError;
;
