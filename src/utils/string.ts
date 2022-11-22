export function firstLetterLowerCase(s: string) {
    return s.slice(0, 1).toLowerCase().concat(s.slice(1));
}

export function firstLetterUpperCase(s: string) {
    return s.slice(0, 1).toUpperCase().concat(s.slice(1));
}

/**
 * 模板字符串 使用 定义const NotFilled = template`${0}未填写`; 调用NotFilled('姓名') 等于姓名未填写
 * @param strings
 * @param keys
 * @returns {function(...[*]): string}
 */
export const template = (strings: TemplateStringsArray, ...keys: Array<any>): (...values: Array<any>) => string => {
    return (function (...values) {
        const dict = values[values.length - 1] || {};
        const result = [strings[0]];
        keys.forEach((key, i) => {
            const value = Number.isInteger(key) ? values[key] : dict[key];
            result.push(value, strings[i + 1]);
        });
        return result.join('');
    });
}


/**
 * 随机生成字符串
 * @param randomLength 
 * @returns 
 */
export const random = (randomLength: number = 16): string => {
    // 默认去掉了容易混淆的字符oOLl,9gq,Vv,Uu,I1
    const DICT = 'ABCDEFGHJKMNPQRSTWXYZabcdefhijkmnprstwxyz2345678';
    const maxPos = DICT.length;
    let pwd = '';
    for (let i = 0; i < randomLength; i++) {
        pwd += DICT.charAt(Math.floor(Math.random() * maxPos));
    }
    return pwd;
};

/**
 * 随机生成带前缀的字符串
 * @param prefix 第一个参数为你想生成的固定的文字开头比如: 微信用户xxxxx
 * @param randomLength 第二个为你想生成出固定开头文字外的随机长度
 * @returns 
 */
export const randomName = (prefix?: string, randomLength: number = 8): string => {
    // 默认去掉了容易混淆的字符oOLl,9gq,Vv,Uu,I1
    const DICT = 'ABCDEFGHJKMNPQRSTWXYZabcdefhijkmnprstwxyz2345678';
    const maxPos = DICT.length;
    let name = prefix === undefined ? '' : prefix;
    name += random(randomLength);
    return name;
};