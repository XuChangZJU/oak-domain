"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.execOp = exports.opMultipleParams = exports.isExpression = exports.isMathExpression = exports.isCompareExpression = exports.isBoolExpression = exports.isLogicExpression = exports.isDateExpression = exports.isGeoExpression = void 0;
var tslib_1 = require("tslib");
var assert_1 = tslib_1.__importDefault(require("assert"));
var dayjs_1 = tslib_1.__importDefault(require("dayjs"));
var weekOfYear_1 = tslib_1.__importDefault(require("dayjs/plugin/weekOfYear"));
var dayOfYear_1 = tslib_1.__importDefault(require("dayjs/plugin/dayOfYear"));
var geo_1 = require("../utils/geo");
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
        var op = Object.keys(expression)[0];
        if (['$contains', '$distance'].includes(op)) {
            return true;
        }
    }
    return false;
}
exports.isGeoExpression = isGeoExpression;
function isDateExpression(expression) {
    if (Object.keys(expression).length == 1) {
        var op = Object.keys(expression)[0];
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
        var op = Object.keys(expression)[0];
        if (['$and', '$or', '$not'].includes(op)) {
            return true;
        }
    }
    return false;
}
exports.isLogicExpression = isLogicExpression;
function isBoolExpression(expression) {
    if (Object.keys(expression).length == 1) {
        var op = Object.keys(expression)[0];
        if (['$true', '$false'].includes(op)) {
            return true;
        }
    }
    return false;
}
exports.isBoolExpression = isBoolExpression;
function isCompareExpression(expression) {
    if (Object.keys(expression).length == 1) {
        var op = Object.keys(expression)[0];
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
        var op = Object.keys(expression)[0];
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
    var e_1, _a, e_2, _b;
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
                var result_1 = 0;
                params.forEach(function (ele) { return result_1 += ele; });
                return result_1;
            }
            else {
                var result_2 = '';
                params.forEach(function (ele) { return result_2 += ele; });
                return result_2;
            }
        }
        case '$subtract': {
            return params[0] - params[1];
        }
        case '$multiply': {
            var result_3 = 1;
            params.forEach(function (ele) { return result_3 = result_3 * ele; });
            return result_3;
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
            try {
                for (var params_1 = tslib_1.__values(params), params_1_1 = params_1.next(); !params_1_1.done; params_1_1 = params_1.next()) {
                    var p = params_1_1.value;
                    if (!p) {
                        return false;
                    }
                }
            }
            catch (e_1_1) { e_1 = { error: e_1_1 }; }
            finally {
                try {
                    if (params_1_1 && !params_1_1.done && (_a = params_1.return)) _a.call(params_1);
                }
                finally { if (e_1) throw e_1.error; }
            }
            return true;
        }
        case '$or': {
            try {
                for (var params_2 = tslib_1.__values(params), params_2_1 = params_2.next(); !params_2_1.done; params_2_1 = params_2.next()) {
                    var p = params_2_1.value;
                    if (!!p) {
                        return true;
                    }
                }
            }
            catch (e_2_1) { e_2 = { error: e_2_1 }; }
            finally {
                try {
                    if (params_2_1 && !params_2_1.done && (_b = params_2.return)) _b.call(params_2);
                }
                finally { if (e_2) throw e_2.error; }
            }
            return false;
        }
        case '$year': {
            var value = (0, dayjs_1.default)(params);
            return value.year();
        }
        case '$month': {
            var value = (0, dayjs_1.default)(params);
            return value.month();
        }
        case '$weekday': {
            var value = (0, dayjs_1.default)(params);
            return value.day(); // 0~6
        }
        case '$weekOfYear': {
            var value = (0, dayjs_1.default)(params);
            return value.week();
        }
        case '$day':
        case '$dayOfMonth': {
            var value = (0, dayjs_1.default)(params);
            return value.date();
        }
        case '$dayOfWeek': {
            var value = (0, dayjs_1.default)(params);
            return value.day(); // 0~6
        }
        case '$dayOfYear': {
            var value = (0, dayjs_1.default)(params);
            return value.dayOfYear(); // 0~6
        }
        case '$dateDiff': {
            var value1 = (0, dayjs_1.default)(params[0]);
            var value2 = (0, dayjs_1.default)(params[1]);
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
            var value = (0, dayjs_1.default)(params[0]);
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
            var value = (0, dayjs_1.default)(params[0]);
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
            var _c = tslib_1.__read(params, 2), geo1 = _c[0], geo2 = _c[1];
            var type1 = geo1.type, coordinate1 = geo1.coordinate;
            var type2 = geo2.type, coordinate2 = geo2.coordinate;
            if (type1 !== 'point' || type2 !== 'point') {
                throw new Error('目前只支持point类型的距离运算');
            }
            return (0, geo_1.getDistanceBetweenPoints)(coordinate1[1], coordinate1[0], coordinate2[1], coordinate2[0]);
        }
        case '$contains': {
            throw new Error('$contains类型未实现');
        }
        default: {
            (0, assert_1.default)(false, "\u4E0D\u80FD\u8BC6\u522B\u7684expression\u8FD0\u7B97\u7B26\uFF1A".concat(op));
        }
    }
}
exports.execOp = execOp;
