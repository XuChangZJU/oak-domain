"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.composeUrl = void 0;
const url_1 = require("url");
function composeUrl(url, params) {
    const urlSp = new url_1.URLSearchParams(params);
    if (url.includes('?')) {
        return `${url}&${urlSp}`;
    }
    return `${url}?${urlSp}`;
}
exports.composeUrl = composeUrl;
