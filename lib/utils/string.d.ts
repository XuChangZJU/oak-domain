export declare function firstLetterLowerCase(s: string): string;
export declare function firstLetterUpperCase(s: string): string;
/**
 * 模板字符串 使用 定义const NotFilled = template`${0}未填写`; 调用NotFilled('姓名') 等于姓名未填写
 * @param strings
 * @param keys
 * @returns {function(...[*]): string}
 */
export declare const template: (strings: TemplateStringsArray, ...keys: Array<any>) => (...values: Array<any>) => string;
/**
 * 随机生成字符串
 * @param randomLength
 * @returns
 */
export declare const random: (randomLength?: number) => string;
/**
 * 随机生成带前缀的字符串
 * @param prefix 第一个参数为你想生成的固定的文字开头比如: 微信用户xxxxx
 * @param randomLength 第二个为你想生成出固定开头文字外的随机长度
 * @returns
 */
export declare const randomName: (prefix?: string, randomLength?: number) => string;
/**
 * 将字符串中的u16编码转换回汉字
 * @param str
 * @returns
 */
export declare function unescapeUnicode(str: string): string;
