"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.urlSearchParams = exports.url = void 0;
const whatwg_url_1 = require("whatwg-url");
const url = whatwg_url_1.URL;
exports.url = url;
const urlSearchParams = whatwg_url_1.URLSearchParams;
exports.urlSearchParams = urlSearchParams;
