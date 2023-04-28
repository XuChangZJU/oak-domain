import { RefOrExpression } from "./Expression";
import { OneOf } from "./Polyfill";
export declare const EXPRESSION_PREFIX = "$expr";
export declare type NodeId = `node-${number}`;
export declare type ExpressionKey = '$expr' | '$expr1' | '$expr2' | '$expr3' | '$expr4' | '$expr5' | '$expr6' | '$expr7' | '$expr8' | '$expr9' | '$expr10' | '$expr11' | '$expr12' | '$expr13' | '$expr14' | '$expr15' | '$expr16' | '$expr17' | '$expr18' | '$expr19' | '$expr20';
export declare type ExprOp<A> = {
    [K in ExpressionKey]: RefOrExpression<A>;
};
export declare type Q_NumberComparisonValue = number | OneOf<{
    $gt: number;
    $lt: number;
    $gte: number;
    $lte: number;
    $eq: number;
    $ne: number;
    $in: number[];
    $nin: number[];
    $between: [number, number];
}>;
export declare type Q_StringComparisonValue = string | OneOf<{
    $gt: string;
    $lt: string;
    $gte: string;
    $lte: string;
    $eq: string;
    $ne: string;
    $startsWith: string;
    $endsWith: string;
    $includes: string;
    $in: string[];
    $nin: string[];
}>;
export declare type Q_BooleanComparisonValue = boolean;
export declare type Q_DateComparisonValue = Q_NumberComparisonValue;
export declare type Q_EnumComparisonValue<E> = E | OneOf<{
    $in: E[];
    $nin: E[];
}>;
export declare type Q_ExistsValue = {
    $exists: boolean;
};
export declare type Q_NumberValue = Q_NumberComparisonValue | Q_ExistsValue;
export declare type Q_StringValue = Q_StringComparisonValue | Q_ExistsValue;
export declare type Q_BooleanValue = Q_BooleanComparisonValue | Q_ExistsValue;
export declare type Q_DateValue = Q_DateComparisonValue | Q_ExistsValue;
export declare type Q_EnumValue<E> = Q_EnumComparisonValue<E> | Q_ExistsValue;
export declare type Q_State<S> = S | {
    $in: S[];
} | {
    $nin: S[];
} | Q_ExistsValue;
export declare type Q_FullTextValue = {
    $search: string;
    $language?: 'zh_CN' | 'en_US';
};
export declare type Q_FullTextKey = '$text';
export declare type FulltextFilter = {
    [F in Q_FullTextKey]?: Q_FullTextValue;
};
declare type Q_LogicKey = '$and' | '$or';
declare type Q_LinearLogicKey = '$not';
export declare type MakeFilterWrapper<F extends Object> = {
    [Q in Q_LogicKey]?: Array<MakeFilterWrapper<F>>;
} & {
    [Q in Q_LinearLogicKey]?: MakeFilterWrapper<F>;
} & Partial<F>;
export declare type MakeFilter<F extends Object> = {
    '#id'?: NodeId;
} & MakeFilterWrapper<F>;
export declare type RefAttr<A> = {
    '#attr': A;
} | {
    '#refId': NodeId;
    '#refAttr': string;
};
export declare function isRefAttrNode<A>(node: any): node is RefAttr<A>;
export declare type JsonFilter<O extends any> = O extends Array<infer P> ? (JsonFilter<P> | undefined)[] | {
    $contains?: P | P[];
    $overlaps?: P | P[];
} : O extends number ? Q_NumberValue : O extends string ? Q_StringValue : O extends boolean ? Q_BooleanValue : O extends Record<string, any> ? {
    [A in keyof O]?: JsonFilter<O[A]>;
} : never;
export {};
