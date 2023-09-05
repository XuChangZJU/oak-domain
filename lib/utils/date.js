"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.excelStringToDate = void 0;
const tslib_1 = require("tslib");
const dayjs_1 = tslib_1.__importDefault(require("dayjs"));
function excelStringToDate(str) {
    if (!str) {
        return undefined;
    }
    if (typeof str === 'number') {
        if (str < 100000) {
            return (0, dayjs_1.default)((((str - 25569) * 24 - 8) * 3600) * 1000).valueOf(); // excel日期可能为1900-1-1至今的天数
        }
        return (0, dayjs_1.default)(str).valueOf();
    }
    return Date.parse(str);
}
exports.excelStringToDate = excelStringToDate;
