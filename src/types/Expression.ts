import assert from 'assert';
import { RefAttr } from "./Demand";
import { Geo } from "./Geo";
import DayJs from 'dayjs';
import weekOfYear from 'dayjs/plugin/weekOfYear';
import dayOfYear from 'dayjs/plugin/dayOfYear';
import { getDistanceBetweenPoints } from '../utils/geo';

DayJs.extend(weekOfYear);
DayJs.extend(dayOfYear);


export type RefOrExpression<A> = RefAttr<A> | Expression<A>;

// Math
type MathType<A> = RefOrExpression<A> | number;
type StringType<A> = RefOrExpression<A> | string
interface Add<A> {
    $add: (MathType<A> | StringType<A>)[];
};
interface Subtract<A> {
    $subtract: [MathType<A>, MathType<A>];
};
interface Multiply<A> {
    $multiply: (MathType<A>)[];
};
interface Divide<A> {
    $divide: [MathType<A>, MathType<A>];
};
interface Abs<A> {
    $abs: MathType<A>;
};
interface Round<A> {
    $round: [MathType<A>, MathType<A>];
};
interface Floor<A> {
    $floor: MathType<A>;
};
interface Ceil<A> {
    $ceil: MathType<A>;
};
interface Pow<A> {
    $pow: [MathType<A>, MathType<A>];
};
type MathExpression<A> = Add<A> | Subtract<A> | Multiply<A> | Divide<A> | Abs<A> | Round<A> | Floor<A> | Ceil<A> | Pow<A>;

// Compare
type CmpType<A> = RefOrExpression<A> | string | number;
interface Gt<A> {
    $gt: [CmpType<A>, CmpType<A>];
};
interface Lt<A> {
    $lt: [CmpType<A>, CmpType<A>];
};
interface Eq<A> {
    $eq: [CmpType<A>, CmpType<A>];
};
interface Gte<A> {
    $gte: [CmpType<A>, CmpType<A>];
};
interface Lte<A> {
    $lte: [CmpType<A>, CmpType<A>];
};
interface Ne<A> {
    $ne: [CmpType<A>, CmpType<A>];
};
interface StartsWith<A> {
    $startsWith: [RefOrExpression<A> | string, RefOrExpression<A> | string];
};
interface EndsWith<A> {
    $endsWith: [RefOrExpression<A> | string, RefOrExpression<A> | string];
};
interface Includes<A> {
    $includes: [RefOrExpression<A> | string, RefOrExpression<A> | string];
};

type CompareExpression<A> = Lt<A> | Gt<A> | Lte<A> | Gte<A> | Eq<A> | Ne<A> | StartsWith<A> | EndsWith<A> | Includes<A>;

// Bool
interface BoolTrue<A> {
    $true: Expression<A>;
};
interface BoolFalse<A> {
    $false: Expression<A>;
};
type BoolExpression<A> = BoolTrue<A> | BoolFalse<A>;

// Logic
interface LogicAnd<A> {
    $and: Expression<A>[];
};
interface LogicOr<A> {
    $or: Expression<A>[];
};
interface LogicNot<A> {
    $not: Expression<A>;
};
type LogicExpression<A> = LogicAnd<A> | LogicOr<A> | LogicNot<A>;

// Date
interface DateYear<A> {
    $year: RefOrExpression<A> | Date | number;
};
interface DateMonth<A> {
    $month: RefOrExpression<A> | Date | number;
};
interface DateWeekday<A> {
    $weekday: RefOrExpression<A> | Date | number;
};
interface DateWeekOfYear<A> {
    $weekOfYear: RefOrExpression<A> | Date | number;
};
interface DateDay<A> {
    $day: RefOrExpression<A> | Date | number;
};
interface DateDayOfMonth<A> {
    $dayOfMonth: RefOrExpression<A> | Date | number;
};
interface DateDayOfWeek<A> {
    $dayOfWeek: RefOrExpression<A> | Date | number;
};
interface DateDayOfYear<A> {
    $dayOfYear: RefOrExpression<A> | Date | number;
}
interface DateDiff<A> {
    $dateDiff: [RefOrExpression<A> | Date | number, RefOrExpression<A> | Date | number, 'y' | 'M' | 'd' | 'h' | 'm' | 's'];
};
interface DateCeiling<A> {
    $dateCeil: [RefOrExpression<A> | Date | number, 'y' | 'M' | 'd' | 'h' | 'm' | 's'];
};
interface DateFloor<A> {
    $dateFloor: [RefOrExpression<A> | Date | number, 'y' | 'M' | 'd' | 'h' | 'm' | 's'];
}

type DateExpression<A> = DateYear<A> | DateMonth<A> | DateWeekday<A> | DateWeekOfYear<A> | DateDay<A> | DateDayOfYear<A>
    | DateDayOfMonth<A> | DateDayOfWeek<A> | DateDiff<A> | DateCeiling<A> | DateFloor<A>;

//// Geo
interface GeoContains<A> {
    $contains: [RefOrExpression<A> | Geo, RefOrExpression<A> | Geo];
};
interface GeoDistance<A> {
    $distance: [RefOrExpression<A> | Geo, RefOrExpression<A> | Geo];
}

type GeoExpression<A> = GeoContains<A> | GeoDistance<A>;

export type Expression<A> = GeoExpression<A> | DateExpression<A> | LogicExpression<A> | BoolExpression<A> | CompareExpression<A> | MathExpression<A>;

export type ExpressionConstant = Geo | number | Date | string | boolean;

export function isGeoExpression<A>(expression: any): expression is GeoExpression<A> {
    if (Object.keys(expression).length == 1) {
        const op = Object.keys(expression)[0];
        if (['$contains', '$distance'].includes(op)) {
            return true;
        }
    }
    return false;
}

export function isDateExpression<A>(expression: any): expression is DateExpression<A> {
    if (Object.keys(expression).length == 1) {
        const op = Object.keys(expression)[0];
        if (['$year', '$month', '$weekday', '$weekOfYear', '$day', '$dayOfMonth',
            '$dayOfWeek', '$dayOfYear', '$dateDiff', '$dateCeil', '$dateFloor'].includes(op)) {
            return true;
        }
    }
    return false;
}

export function isLogicExpression<A>(expression: any): expression is LogicExpression<A> {
    if (Object.keys(expression).length == 1) {
        const op = Object.keys(expression)[0];
        if (['$and', '$or', '$not'].includes(op)) {
            return true;
        }
    }
    return false;
}

export function isBoolExpression<A>(expression: any): expression is BoolExpression<A> {
    if (Object.keys(expression).length == 1) {
        const op = Object.keys(expression)[0];
        if (['$true', '$false'].includes(op)) {
            return true;
        }
    }
    return false;
}

export function isCompareExpression<A>(expression: any): expression is CompareExpression<A> {
    if (Object.keys(expression).length == 1) {
        const op = Object.keys(expression)[0];
        if (['$gt', '$lt', '$gte', '$lte', '$eq', '$ne',
            '$startsWith', '$endsWith', '$includes'].includes(op)) {
            return true;
        }
    }
    return false;
}

export function isMathExpression<A>(expression: any): expression is MathExpression<A> {
    if (Object.keys(expression).length == 1) {
        const op = Object.keys(expression)[0];
        if (['$add', '$subtract', '$multiply', '$divide', '$abs', '$pow',
            '$round', '$floor', '$ceil'].includes(op)) {
            return true;
        }
    }
    return false;
}

export function isExpression<A>(expression: any): expression is Expression<A> {
    return typeof expression === 'object' && Object.keys(expression).length === 1 && Object.keys(expression)[0].startsWith('$');
}

export function opMultipleParams(op: string) {
    return !['$year', '$month', '$weekday', '$weekOfYear', '$day', '$dayOfMonth',
        '$dayOfWeek', '$dayOfYear', '$not', '$true', '$false', '$abs', '$round', '$floor', '$ceil'].includes(op);
}

export function execOp(op: string, params: any, obscure?: boolean): ExpressionConstant {
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
                params.forEach(
                    (ele: number) => result += ele
                );
                return result;
            }
            else {
                let result = '';
                params.forEach(
                    (ele: string) => result += ele
                );
                return result;
            }
        }
        case '$subtract': {
            return params[0] - params[1];
        }
        case '$multiply': {
            let result = 1;
            params.forEach(
                (ele: number) => result = result * ele
            );
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
            const value = DayJs(params);
            return value.year();
        }
        case '$month': {
            const value = DayJs(params);
            return value.month();
        }
        case '$weekday': {
            const value = DayJs(params);
            return value.day();     // 0~6
        }
        case '$weekOfYear': {
            const value = DayJs(params);
            return value.week();
        }
        case '$day':
        case '$dayOfMonth': {
            const value = DayJs(params);
            return value.date();
        }
        case '$dayOfWeek': {
            const value = DayJs(params);
            return value.day();     // 0~6
        }
        case '$dayOfYear': {
            const value = DayJs(params);
            return value.dayOfYear();     // 0~6
        }
        case '$dateDiff': {
            const value1 = DayJs(params[0]);
            const value2 = DayJs(params[1]);

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
                    assert(false);
                }
            }
        }
        case '$dateCeil': {
            const value = DayJs(params[0]);
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
                    assert(false);
                }
            }
        }
        case '$dateFloor': {
            const value = DayJs(params[0]);
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
                    assert(false);
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

            return getDistanceBetweenPoints(coordinate1[1], coordinate1[0], coordinate2[1], coordinate2[0]);
        }
        case '$contains': {
            throw new Error('$contains类型未实现');
        }
        default: {
            assert(false, `不能识别的expression运算符：${op}`);
        }
    }
}

/**
 * 检查一个表达式，并分析其涉及到的属性
 * @param expression 
 * @returns {
 *      '#current': [当前结点涉及的属性]
 *      'node-1': [node-1结点上涉及的属性]
 * }
 */
export function getAttrRefInExpression(expression: Expression<any>) {
    const result: Record<string, string[]> = {
        ['#current']: [],
    };
    const check = (node: RefOrExpression<any>) => {
        if ((node as any)['#attr']) {
            result['#current'].push((node as any)['#attr']);
        }
        else if ((node as any)['#refAttr']) {
            if (result[(node as any)['#refId']]) {
                result[(node as any)['#refId']].push((node as any)['#refAttr']);
            }
            else {
                Object.assign(result, {
                    [(node as any)['#refId']]: [(node as any)['#refAttr']],
                });
            }
        }
        else if (node instanceof Array) {
            for (const subNode of node) {
                check(subNode);
            }
        }
        else if (typeof node === 'object') {
            for (const attr in node) {
                check((node as any)[attr]);
            }
        }
    };

    check(expression);
    return result;
}