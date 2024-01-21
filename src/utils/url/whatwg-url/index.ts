

/**
 * 为了能在小程序中使用URL、URLSearchParams
 * 但whatwg-url-without-unicode这个库未更新，把其的代码放本地进行更新
 */
const whatwgUrl = require('./lib/URL');
const whatwgUrlSearchParams = require('./lib/URLSearchParams');

const sharedGlobalObject = {} as { URL: URL; URLSearchParams: URLSearchParams };
whatwgUrl.install(sharedGlobalObject);
whatwgUrlSearchParams.install(sharedGlobalObject);

const URL = sharedGlobalObject.URL;
const URLSearchParams = sharedGlobalObject.URLSearchParams;

export { URL, URLSearchParams };

