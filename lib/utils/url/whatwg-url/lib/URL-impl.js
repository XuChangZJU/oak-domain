"use strict";
// @ts-nocheck
Object.defineProperty(exports, "__esModule", { value: true });
const tslib_1 = require("tslib");
const url_state_machine_1 = tslib_1.__importDefault(require("./url-state-machine"));
const urlencoded_1 = tslib_1.__importDefault(require("./urlencoded"));
const URLSearchParams_1 = tslib_1.__importDefault(require("./URLSearchParams"));
const implementation = class URLImpl {
    constructor(globalObject, constructorArgs) {
        const url = constructorArgs[0];
        const base = constructorArgs[1];
        let parsedBase = null;
        if (base !== undefined) {
            parsedBase = url_state_machine_1.default.basicURLParse(base);
            if (parsedBase === null) {
                throw new TypeError(`Invalid base URL: ${base}`);
            }
        }
        const parsedURL = url_state_machine_1.default.basicURLParse(url, { baseURL: parsedBase });
        if (parsedURL === null) {
            throw new TypeError(`Invalid URL: ${url}`);
        }
        const query = parsedURL.query !== null ? parsedURL.query : "";
        this._url = parsedURL;
        // We cannot invoke the "new URLSearchParams object" algorithm without going through the constructor, which strips
        // question mark by default. Therefore the doNotStripQMark hack is used.
        this._query = URLSearchParams_1.default.createImpl(globalObject, [query], { doNotStripQMark: true });
        this._query._url = this;
    }
    get href() {
        return url_state_machine_1.default.serializeURL(this._url);
    }
    set href(v) {
        const parsedURL = url_state_machine_1.default.basicURLParse(v);
        if (parsedURL === null) {
            throw new TypeError(`Invalid URL: ${v}`);
        }
        this._url = parsedURL;
        this._query._list.splice(0);
        const { query } = parsedURL;
        if (query !== null) {
            this._query._list = urlencoded_1.default.parseUrlencoded(query);
        }
    }
    get origin() {
        return url_state_machine_1.default.serializeURLOrigin(this._url);
    }
    get protocol() {
        return this._url.scheme + ":";
    }
    set protocol(v) {
        url_state_machine_1.default.basicURLParse(v + ":", { url: this._url, stateOverride: "scheme start" });
    }
    get username() {
        return this._url.username;
    }
    set username(v) {
        if (url_state_machine_1.default.cannotHaveAUsernamePasswordPort(this._url)) {
            return;
        }
        url_state_machine_1.default.setTheUsername(this._url, v);
    }
    get password() {
        return this._url.password;
    }
    set password(v) {
        if (url_state_machine_1.default.cannotHaveAUsernamePasswordPort(this._url)) {
            return;
        }
        url_state_machine_1.default.setThePassword(this._url, v);
    }
    get host() {
        const url = this._url;
        if (url.host === null) {
            return "";
        }
        if (url.port === null) {
            return url_state_machine_1.default.serializeHost(url.host);
        }
        return url_state_machine_1.default.serializeHost(url.host) + ":" + url_state_machine_1.default.serializeInteger(url.port);
    }
    set host(v) {
        if (this._url.cannotBeABaseURL) {
            return;
        }
        url_state_machine_1.default.basicURLParse(v, { url: this._url, stateOverride: "host" });
    }
    get hostname() {
        if (this._url.host === null) {
            return "";
        }
        return url_state_machine_1.default.serializeHost(this._url.host);
    }
    set hostname(v) {
        if (this._url.cannotBeABaseURL) {
            return;
        }
        url_state_machine_1.default.basicURLParse(v, { url: this._url, stateOverride: "hostname" });
    }
    get port() {
        if (this._url.port === null) {
            return "";
        }
        return url_state_machine_1.default.serializeInteger(this._url.port);
    }
    set port(v) {
        if (url_state_machine_1.default.cannotHaveAUsernamePasswordPort(this._url)) {
            return;
        }
        if (v === "") {
            this._url.port = null;
        }
        else {
            url_state_machine_1.default.basicURLParse(v, { url: this._url, stateOverride: "port" });
        }
    }
    get pathname() {
        if (this._url.cannotBeABaseURL) {
            return this._url.path[0];
        }
        if (this._url.path.length === 0) {
            return "";
        }
        return "/" + this._url.path.join("/");
    }
    set pathname(v) {
        if (this._url.cannotBeABaseURL) {
            return;
        }
        this._url.path = [];
        url_state_machine_1.default.basicURLParse(v, { url: this._url, stateOverride: "path start" });
    }
    get search() {
        if (this._url.query === null || this._url.query === "") {
            return "";
        }
        return "?" + this._url.query;
    }
    set search(v) {
        const url = this._url;
        if (v === "") {
            url.query = null;
            this._query._list = [];
            return;
        }
        const input = v[0] === "?" ? v.substring(1) : v;
        url.query = "";
        url_state_machine_1.default.basicURLParse(input, { url, stateOverride: "query" });
        this._query._list = urlencoded_1.default.parseUrlencoded(input);
    }
    get searchParams() {
        return this._query;
    }
    get hash() {
        if (this._url.fragment === null || this._url.fragment === "") {
            return "";
        }
        return "#" + this._url.fragment;
    }
    set hash(v) {
        if (v === "") {
            this._url.fragment = null;
            return;
        }
        const input = v[0] === "#" ? v.substring(1) : v;
        this._url.fragment = "";
        url_state_machine_1.default.basicURLParse(input, { url: this._url, stateOverride: "fragment" });
    }
    toJSON() {
        return this.href;
    }
};
exports.default = {
    implementation
};
