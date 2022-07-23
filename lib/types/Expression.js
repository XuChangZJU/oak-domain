"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.execOp = exports.opMultipleParams = exports.isExpression = exports.isMathExpression = exports.isCompareExpression = exports.isBoolExpression = exports.isLogicExpression = exports.isDateExpression = exports.isGeoExpression = void 0;
const assert_1 = __importDefault(require("assert"));
const dayjs_1 = __importDefault(require("dayjs"));
const weekOfYear_1 = __importDefault(require("dayjs/plugin/weekOfYear"));
const dayOfYear_1 = __importDefault(require("dayjs/plugin/dayOfYear"));
const geo_1 = require("../utils/geo");
dayjs_1.default.extend(weekOfYear_1.default);
dayjs_1.default.extend(dayOfYear_1.default);
;
;
;
;
;
;
;
;
;
;
;
;
;
;
;
;
;
;
;
;
;
;
;
;
;
;
;
;
;
;
;
;
;
function isGeoExpression(expression) {
    if (Object.keys(expression).length == 1) {
        const op = Object.keys(expression)[0];
        if (['$contains', '$distance'].includes(op)) {
            return true;
        }
    }
    return false;
}
exports.isGeoExpression = isGeoExpression;
function isDateExpression(expression) {
    if (Object.keys(expression).length == 1) {
        const op = Object.keys(expression)[0];
        if (['$year', '$month', '$weekday', '$weekOfYear', '$day', '$dayOfMonth',
            '$dayOfWeek', '$dayOfYear', '$dateDiff', '$dateCeil', '$dateFloor'].includes(op)) {
            return true;
        }
    }
    return false;
}
exports.isDateExpression = isDateExpression;
function isLogicExpression(expression) {
    if (Object.keys(expression).length == 1) {
        const op = Object.keys(expression)[0];
        if (['$and', '$or', '$not'].includes(op)) {
            return true;
        }
    }
    return false;
}
exports.isLogicExpression = isLogicExpression;
function isBoolExpression(expression) {
    if (Object.keys(expression).length == 1) {
        const op = Object.keys(expression)[0];
        if (['$true', '$false'].includes(op)) {
            return true;
        }
    }
    return false;
}
exports.isBoolExpression = isBoolExpression;
function isCompareExpression(expression) {
    if (Object.keys(expression).length == 1) {
        const op = Object.keys(expression)[0];
        if (['$gt', '$lt', '$gte', '$lte', '$eq', '$ne',
            '$startsWith', '$endsWith', '$includes'].includes(op)) {
            return true;
        }
    }
    return false;
}
exports.isCompareExpression = isCompareExpression;
function isMathExpression(expression) {
    if (Object.keys(expression).length == 1) {
        const op = Object.keys(expression)[0];
        if (['$add', '$subtract', '$multiply', '$divide', '$abs', '$pow',
            '$round', '$floor', '$ceil'].includes(op)) {
            return true;
        }
    }
    return false;
}
exports.isMathExpression = isMathExpression;
function isExpression(expression) {
    return typeof expression === 'object' && Object.keys(expression).length === 1 && Object.keys(expression)[0].startsWith('$');
}
exports.isExpression = isExpression;
function opMultipleParams(op) {
    return !['$year', '$month', '$weekday', '$weekOfYear', '$day', '$dayOfMonth',
        '$dayOfWeek', '$dayOfYear', '$not', '$true', '$false', '$abs', '$round', '$floor', '$ceil'].includes(op);
}
exports.opMultipleParams = opMultipleParams;
function execOp(op, params, obscure) {
    if (obscure && (params === undefined || params.includes(undefined))) {
        return true;
    }
    switch (op) {
        case '$gt': {
            return params[0] > params[1];
        }
        case '$lt': {
            return params[0] < params[1];
        }
        case '$gte': {
            return params[0] >= params[1];
        }
        case '$lte': {
            return params[0] <= params[1];
        }
        case '$eq': {
            return params[0] === params[1];
        }
        case '$ne': {
            return params[0] !== params[1];
        }
        case '$startsWith': {
            return params[0].startsWith(params[1]);
        }
        case '$endsWith': {
            return params[0].endsWith(params[1]);
        }
        case '$includes': {
            return params[0].includes(params[1]);
        }
        case '$add': {
            if (typeof params[0] === 'number') {
                let result = 0;
                params.forEach((ele) => result += ele);
                return result;
            }
            else {
                let result = '';
                params.forEach((ele) => result += ele);
                return result;
            }
        }
        case '$subtract': {
            return params[0] - params[1];
        }
        case '$multiply': {
            let result = 1;
            params.forEach((ele) => result = result * ele);
            return result;
        }
        case '$divide': {
            return params[0] / params[1];
        }
        case '$abs': {
            return Math.abs(params);
        }
        case '$round': {
            return Math.round(params);
        }
        case '$ceil': {
            return Math.ceil(params);
        }
        case '$floor': {
            return Math.floor(params);
        }
        case '$round': {
            return Math.round(params);
        }
        case '$pow': {
            return Math.pow(params[0], params[1]);
        }
        case '$true': {
            return !!params;
        }
        case '$false':
        case '$not': {
            return !params;
        }
        case '$and': {
            for (const p of params) {
                if (!p) {
                    return false;
                }
            }
            return true;
        }
        case '$or': {
            for (const p of params) {
                if (!!p) {
                    return true;
                }
            }
            return false;
        }
        case '$year': {
            const value = (0, dayjs_1.default)(params);
            return value.year();
        }
        case '$month': {
            const value = (0, dayjs_1.default)(params);
            return value.month();
        }
        case '$weekday': {
            const value = (0, dayjs_1.default)(params);
            return value.day(); // 0~6
        }
        case '$weekOfYear': {
            const value = (0, dayjs_1.default)(params);
            return value.week();
        }
        case '$day':
        case '$dayOfMonth': {
            const value = (0, dayjs_1.default)(params);
            return value.date();
        }
        case '$dayOfWeek': {
            const value = (0, dayjs_1.default)(params);
            return value.day(); // 0~6
        }
        case '$dayOfYear': {
            const value = (0, dayjs_1.default)(params);
            return value.dayOfYear(); // 0~6
        }
        case '$dateDiff': {
            const value1 = (0, dayjs_1.default)(params[0]);
            const value2 = (0, dayjs_1.default)(params[1]);
            switch (params[2]) {
                case 'y':
                case 'M':
                case 'd':
                case 'h':
                case 'm':
                case 's': {
                    return value1.diff(value2, params[2]);
                }
                default: {
                    (0, assert_1.default)(false);
                }
            }
        }
        case '$dateCeil': {
            const value = (0, dayjs_1.default)(params[0]);
            switch (params[1]) {
                case 'y': {
                    return value.startOf('year').millisecond();
                }
                case 'M': {
                    return value.startOf('month').millisecond();
                }
                case 'd': {
                    return value.startOf('day').millisecond();
                }
                case 'h': {
                    return value.startOf('hour').millisecond();
                }
                case 'm': {
                    return value.startOf('minute').millisecond();
                }
                case 's': {
                    return value.startOf('second').millisecond();
                }
                default: {
                    (0, assert_1.default)(false);
                }
            }
        }
        case '$dateFloor': {
            const value = (0, dayjs_1.default)(params[0]);
            switch (params[1]) {
                case 'y': {
                    return value.endOf('year').millisecond();
                }
                case 'M': {
                    return value.endOf('month').millisecond();
                }
                case 'd': {
                    return value.endOf('day').millisecond();
                }
                case 'h': {
                    return value.endOf('hour').millisecond();
                }
                case 'm': {
                    return value.endOf('minute').millisecond();
                }
                case 's': {
                    return value.endOf('second').millisecond();
                }
                default: {
                    (0, assert_1.default)(false);
                }
            }
        }
        case '$distance': {
            const [geo1, geo2] = params;
            const { type: type1, coordinate: coordinate1 } = geo1;
            const { type: type2, coordinate: coordinate2 } = geo2;
            if (type1 !== 'point' || type2 !== 'point') {
                throw new Error('目前只支持point类型的距离运算');
            }
            return (0, geo_1.getDistanceBetweenPoints)(coordinate1[1], coordinate1[0], coordinate2[1], coordinate2[0]);
        }
        case '$contains': {
            throw new Error('$contains类型未实现');
        }
        default: {
            (0, assert_1.default)(false, `不能识别的expression运算符：${op}`);
        }
    }
}
exports.execOp = execOp;
