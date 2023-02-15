"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.composeUrl = void 0;
var url_1 = require("url");
function composeUrl(url, params) {
    var urlSp = new url_1.URLSearchParams(params);
    if (url.includes('?')) {
        return "".concat(url, "&").concat(urlSp);
    }
    return "".concat(url, "?").concat(urlSp);
}
exports.composeUrl = composeUrl;
