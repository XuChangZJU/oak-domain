"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.composeUrl = void 0;
function composeUrl(url, params) {
    const urlSp = new URLSearchParams(params);
    if (url.includes('?')) {
        return `${url}&${urlSp}`;
    }
    return `${url}?${urlSp}`;
}
exports.composeUrl = composeUrl;
