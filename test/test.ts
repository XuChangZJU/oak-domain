import { createHash } from 'crypto';

const hash = createHash('md5');

hash.update('oak-frontend-base-c-list-columnSetting-zh-CN9999999999999999999-adab');
const v = hash.digest('hex');
console.log(v, v.length);