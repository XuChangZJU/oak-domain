import { RefAttr } from "./Demand";
import { Geo } from "./Geo";
export type RefOrExpression<A> = RefAttr<A> | Expression<A>;
type MathType<A> = RefOrExpression<A> | number;
type StringType<A> = RefOrExpression<A> | string;
interface Add<A> {
    $add: (MathType<A>)[];
}
interface Subtract<A> {
    $subtract: [MathType<A>, MathType<A>];
}
interface Multiply<A> {
    $multiply: (MathType<A>)[];
}
interface Divide<A> {
    $divide: [MathType<A>, MathType<A>];
}
interface Abs<A> {
    $abs: MathType<A>;
}
interface Round<A> {
    $round: [MathType<A>, MathType<A>];
}
interface Floor<A> {
    $floor: MathType<A>;
}
interface Ceil<A> {
    $ceil: MathType<A>;
}
interface Mod<A> {
    $mod: [MathType<A>, MathType<A>];
}
type MathExpression<A> = Add<A> | Subtract<A> | Multiply<A> | Divide<A> | Abs<A> | Round<A> | Floor<A> | Ceil<A> | Mod<A>;
type CmpType<A> = RefOrExpression<A> | string | number;
interface Gt<A> {
    $gt: [CmpType<A>, CmpType<A>];
}
interface Lt<A> {
    $lt: [CmpType<A>, CmpType<A>];
}
interface Eq<A> {
    $eq: [CmpType<A>, CmpType<A>];
}
interface Gte<A> {
    $gte: [CmpType<A>, CmpType<A>];
}
interface Lte<A> {
    $lte: [CmpType<A>, CmpType<A>];
}
interface Ne<A> {
    $ne: [CmpType<A>, CmpType<A>];
}
interface StartsWith<A> {
    $startsWith: [RefOrExpression<A> | string, RefOrExpression<A> | string];
}
interface EndsWith<A> {
    $endsWith: [RefOrExpression<A> | string, RefOrExpression<A> | string];
}
interface Includes<A> {
    $includes: [RefOrExpression<A> | string, RefOrExpression<A> | string];
}
type CompareExpression<A> = Lt<A> | Gt<A> | Lte<A> | Gte<A> | Eq<A> | Ne<A> | StartsWith<A> | EndsWith<A> | Includes<A>;
interface BoolTrue<A> {
    $true: Expression<A>;
}
interface BoolFalse<A> {
    $false: Expression<A>;
}
type BoolExpression<A> = BoolTrue<A> | BoolFalse<A>;
interface LogicAnd<A> {
    $and: Expression<A>[];
}
interface LogicOr<A> {
    $or: Expression<A>[];
}
interface LogicNot<A> {
    $not: Expression<A>;
}
type LogicExpression<A> = LogicAnd<A> | LogicOr<A> | LogicNot<A>;
interface DateYear<A> {
    $year: RefOrExpression<A> | Date | number;
}
interface DateMonth<A> {
    $month: RefOrExpression<A> | Date | number;
}
interface DateWeekday<A> {
    $weekday: RefOrExpression<A> | Date | number;
}
interface DateWeekOfYear<A> {
    $weekOfYear: RefOrExpression<A> | Date | number;
}
interface DateDay<A> {
    $day: RefOrExpression<A> | Date | number;
}
interface DateDayOfMonth<A> {
    $dayOfMonth: RefOrExpression<A> | Date | number;
}
interface DateDayOfWeek<A> {
    $dayOfWeek: RefOrExpression<A> | Date | number;
}
interface DateDayOfYear<A> {
    $dayOfYear: RefOrExpression<A> | Date | number;
}
interface DateDiff<A> {
    $dateDiff: [RefOrExpression<A> | Date | number, RefOrExpression<A> | Date | number, 'y' | 'M' | 'd' | 'h' | 'm' | 's'];
}
interface DateCeiling<A> {
    $dateCeil: [RefOrExpression<A> | Date | number, 'y' | 'M' | 'd' | 'h' | 'm' | 's'];
}
interface DateFloor<A> {
    $dateFloor: [RefOrExpression<A> | Date | number, 'y' | 'M' | 'd' | 'h' | 'm' | 's'];
}
type DateExpression<A> = DateYear<A> | DateMonth<A> | DateWeekday<A> | DateWeekOfYear<A> | DateDay<A> | DateDayOfYear<A> | DateDayOfMonth<A> | DateDayOfWeek<A> | DateDiff<A> | DateCeiling<A> | DateFloor<A>;
interface StringConcat<A> {
    $concat: StringType<A>[];
}
type StringExpression<A> = StringConcat<A>;
interface GeoContains<A> {
    $contains: [RefOrExpression<A> | Geo, RefOrExpression<A> | Geo];
}
interface GeoDistance<A> {
    $distance: [RefOrExpression<A> | Geo, RefOrExpression<A> | Geo];
}
type GeoExpression<A> = GeoContains<A> | GeoDistance<A>;
interface AggrCountExpression<A> {
    $$count: RefOrExpression<A>;
}
interface AggrSumExpression<A> {
    $$sum: RefOrExpression<A>;
}
interface AggrMaxExpression<A> {
    $$max: RefOrExpression<A>;
}
interface AggrMinExpression<A> {
    $$min: RefOrExpression<A>;
}
interface AggrAvgExpression<A> {
    $$avg: RefOrExpression<A>;
}
export type AggrExpression<A> = AggrAvgExpression<A> | AggrCountExpression<A> | AggrSumExpression<A> | AggrMaxExpression<A> | AggrMinExpression<A>;
export type Expression<A> = GeoExpression<A> | DateExpression<A> | LogicExpression<A> | BoolExpression<A> | CompareExpression<A> | MathExpression<A> | StringExpression<A>;
export type ExpressionConstant = Geo | number | Date | string | boolean;
export declare function isGeoExpression<A>(expression: any): expression is GeoExpression<A>;
export declare function isDateExpression<A>(expression: any): expression is DateExpression<A>;
export declare function isLogicExpression<A>(expression: any): expression is LogicExpression<A>;
export declare function isBoolExpression<A>(expression: any): expression is BoolExpression<A>;
export declare function isCompareExpression<A>(expression: any): expression is CompareExpression<A>;
export declare function isMathExpression<A>(expression: any): expression is MathExpression<A>;
export declare function isStringExpression<A>(expression: any): expression is StringExpression<A>;
export declare function isAggrExpression<A>(expression: any): expression is AggrExpression<A>;
export declare function isExpression<A>(expression: any): expression is Expression<A>;
export declare function opMultipleParams(op: string): boolean;
export declare function execOp(op: string, params: any, obscure?: boolean): ExpressionConstant;
/**
 * 检查一个表达式，并分析其涉及到的属性
 * @param expression
 * @returns {
 *      '#current': [当前结点涉及的属性]
 *      'node-1': [node-1结点上涉及的属性]
 * }
 */
export declare function getAttrRefInExpression(expression: Expression<any>): Record<string, string[]>;
export {};
