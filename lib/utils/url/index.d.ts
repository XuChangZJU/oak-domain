/// <reference types="node" />
import { URL, URLSearchParams } from 'node:url';
import type { UrlObject } from 'node:url';
declare const url: typeof URL;
declare const urlSearchParams: typeof URLSearchParams;
type urlObject = UrlObject;
export { url, urlSearchParams, urlObject };
