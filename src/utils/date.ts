import dayjs from 'dayjs';

export function excelStringToDate(str: string | number) {
    if (!str) {
        return undefined;
    }
    if (typeof str === 'number') {
        if (str < 100000) {
            return dayjs((((str - 25569) * 24 - 8) * 3600) * 1000).valueOf(); // excel日期可能为1900-1-1至今的天数
        }
        return dayjs(str).valueOf();
    }
    return Date.parse(str);
}