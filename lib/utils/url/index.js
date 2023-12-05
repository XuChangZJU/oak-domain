"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.urlSearchParams = exports.url = void 0;
const node_url_1 = require("node:url");
const url = node_url_1.URL;
exports.url = url;
const urlSearchParams = node_url_1.URLSearchParams;
exports.urlSearchParams = urlSearchParams;
