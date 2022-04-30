"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.firstLetterUpperCase = exports.firstLetterLowerCase = void 0;
function firstLetterLowerCase(s) {
    return s.slice(0, 1).toLowerCase().concat(s.slice(1));
}
exports.firstLetterLowerCase = firstLetterLowerCase;
function firstLetterUpperCase(s) {
    return s.slice(0, 1).toUpperCase().concat(s.slice(1));
}
exports.firstLetterUpperCase = firstLetterUpperCase;
