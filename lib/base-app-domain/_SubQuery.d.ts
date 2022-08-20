import * as Modi from "./Modi/Schema";
import * as ModiEntity from "./ModiEntity/Schema";
import * as Oper from "./Oper/Schema";
import * as OperEntity from "./OperEntity/Schema";
export declare type ModiIdSubQuery = {
    [K in "$in" | "$nin"]?: (ModiEntity.ModiIdSubQuery & {
        entity: "modiEntity";
    }) | (Modi.ModiIdSubQuery & {
        entity: "modi";
    }) | any;
};
export declare type ModiEntityIdSubQuery = {
    [K in "$in" | "$nin"]?: (ModiEntity.ModiEntityIdSubQuery & {
        entity: "modiEntity";
    }) | any;
};
export declare type OperIdSubQuery = {
    [K in "$in" | "$nin"]?: (OperEntity.OperIdSubQuery & {
        entity: "operEntity";
    }) | (Oper.OperIdSubQuery & {
        entity: "oper";
    }) | any;
};
export declare type OperEntityIdSubQuery = {
    [K in "$in" | "$nin"]?: (OperEntity.OperEntityIdSubQuery & {
        entity: "operEntity";
    }) | any;
};
