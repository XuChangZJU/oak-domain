import { createHash } from 'crypto';

const hash = createHash('md5');

let h = hash.copy();
h.update('oak-frontend-base-c-list-columnSetting-zh-CN9999999999999999999-adab');
let v = h.digest('hex');
console.log(v, v.length);

h = hash.copy();
h.update('oak-frontend-base-c-list-columnSetting-zh-CN9999999999999999999-adab');
v = h.digest('hex');
console.log(v, v.length);