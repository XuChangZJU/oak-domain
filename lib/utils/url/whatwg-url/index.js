"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.URLSearchParams = exports.URL = void 0;
/**
 * 为了能在小程序中使用URL、URLSearchParams
 * 但whatwg-url-without-unicode这个库未更新，把其的代码放本地进行更新
 */
const whatwgUrl = require('./lib/URL');
const whatwgUrlSearchParams = require('./lib/URLSearchParams');
const sharedGlobalObject = {};
whatwgUrl.install(sharedGlobalObject);
whatwgUrlSearchParams.install(sharedGlobalObject);
const URL = sharedGlobalObject.URL;
exports.URL = URL;
const URLSearchParams = sharedGlobalObject.URLSearchParams;
exports.URLSearchParams = URLSearchParams;
