"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.composeUrl = void 0;
const tslib_1 = require("tslib");
const url_1 = tslib_1.__importDefault(require("url"));
function composeUrl(url, params) {
    const urlSp = new url_1.default.URLSearchParams(params);
    if (url.includes('?')) {
        return `${url}&${urlSp}`;
    }
    return `${url}?${urlSp}`;
}
exports.composeUrl = composeUrl;
