
/**
 * 版本比较
 * @param curVersion 当前版本
 * @param reqVersion 比较版本
 * @returns 
 */
export const compareVersion = (curVersion: string, reqVersion: string): number => {
    const v1 = curVersion.split('.');
    const v2 = reqVersion.split('.');

    for (let i = 0; i < Math.max(v1.length, v2.length); i++) {
        const num1 = i < v1.length ? parseInt(v1[i], 10) : 0;
        const num2 = i < v2.length ? parseInt(v2[i], 10) : 0;
        if (num1 !== num2) return num1 - num2;
    }
    return 0;
};