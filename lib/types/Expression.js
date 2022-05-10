"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.execOp = exports.opMultipleParams = exports.isExpression = exports.isMathExpression = exports.isCompareExpression = exports.isBoolExpression = exports.isLogicExpression = exports.isDateExpression = exports.isGeoExpression = void 0;
const assert_1 = __importDefault(require("assert"));
const luxon_1 = require("luxon");
const geo_1 = require("../utils/geo");
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
            return params[0] + params[1];
        }
        case '$subtract': {
            return params[0] - params[1];
        }
        case '$multiply': {
            return params[0] * params[1];
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
            const value = typeof params === 'number' ? luxon_1.DateTime.fromMillis(params) : luxon_1.DateTime.fromJSDate(params);
            return value.year;
        }
        case '$month': {
            const value = typeof params === 'number' ? luxon_1.DateTime.fromMillis(params) : luxon_1.DateTime.fromJSDate(params);
            return value.month;
        }
        case '$weekday': {
            const value = typeof params === 'number' ? luxon_1.DateTime.fromMillis(params) : luxon_1.DateTime.fromJSDate(params);
            return value.weekday;
        }
        case '$weekOfYear': {
            const value = typeof params === 'number' ? luxon_1.DateTime.fromMillis(params) : luxon_1.DateTime.fromJSDate(params);
            return value.weekYear;
        }
        case '$day':
        case '$dayOfMonth': {
            const value = typeof params === 'number' ? luxon_1.DateTime.fromMillis(params) : luxon_1.DateTime.fromJSDate(params);
            return value.day;
        }
        case '$dayOfWeek': {
            const value = typeof params === 'number' ? luxon_1.DateTime.fromMillis(params) : luxon_1.DateTime.fromJSDate(params);
            return value.weekday;
        }
        case '$dayOfYear': {
            const value = typeof params === 'number' ? luxon_1.DateTime.fromMillis(params) : luxon_1.DateTime.fromJSDate(params);
            return value.ordinal;
        }
        case '$dateDiff': {
            const value1 = typeof params[0] === 'number' ? luxon_1.DateTime.fromMillis(params[0]) : luxon_1.DateTime.fromJSDate(params[0]);
            const value2 = typeof params[1] === 'number' ? luxon_1.DateTime.fromMillis(params[1]) : luxon_1.DateTime.fromJSDate(params[1]);
            const i = luxon_1.Interval.fromDateTimes(value1, value2);
            switch (params[2]) {
                case 'y': {
                    return i.length('year');
                }
                case 'M': {
                    return i.length('month');
                }
                case 'd': {
                    return i.length('day');
                }
                case 'h': {
                    return i.length('hour');
                }
                case 'm': {
                    return i.length('minute');
                }
                case 's': {
                    return i.length('second');
                }
                default: {
                    (0, assert_1.default)(false);
                }
            }
        }
        case '$dateCeil': {
            const value = typeof params[0] === 'number' ? luxon_1.DateTime.fromMillis(params[0]) : luxon_1.DateTime.fromJSDate(params[0]);
            switch (params[1]) {
                case 'y': {
                    return value.startOf('year').toMillis();
                }
                case 'M': {
                    return value.startOf('month').toMillis();
                }
                case 'd': {
                    return value.startOf('day').toMillis();
                }
                case 'h': {
                    return value.startOf('hour').toMillis();
                }
                case 'm': {
                    return value.startOf('minute').toMillis();
                }
                case 's': {
                    return value.startOf('second').toMillis();
                }
                default: {
                    (0, assert_1.default)(false);
                }
            }
        }
        case '$dateFloor': {
            const value = typeof params[0] === 'number' ? luxon_1.DateTime.fromMillis(params[0]) : luxon_1.DateTime.fromJSDate(params[0]);
            switch (params[1]) {
                case 'y': {
                    return value.endOf('year').toMillis();
                }
                case 'M': {
                    return value.endOf('month').toMillis();
                }
                case 'd': {
                    return value.endOf('day').toMillis();
                }
                case 'h': {
                    return value.endOf('hour').toMillis();
                }
                case 'm': {
                    return value.endOf('minute').toMillis();
                }
                case 's': {
                    return value.endOf('second').toMillis();
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
        }
        default: {
            (0, assert_1.default)(false, `不能识别的expression运算符：${op}`);
        }
    }
}
exports.execOp = execOp;
