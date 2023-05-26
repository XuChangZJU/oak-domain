import * as ActionAuth from "./ActionAuth/Schema";
import * as Modi from "./Modi/Schema";
import * as ModiEntity from "./ModiEntity/Schema";
import * as Oper from "./Oper/Schema";
import * as OperEntity from "./OperEntity/Schema";
import * as Relation from "./Relation/Schema";
import * as RelationAuth from "./RelationAuth/Schema";
import * as User from "./User/Schema";
import * as UserEntityGrant from "./UserEntityGrant/Schema";
import * as UserRelation from "./UserRelation/Schema";
export declare type ActionAuthIdSubQuery = {
    [K in "$in" | "$nin"]?: (ModiEntity.ActionAuthIdSubQuery & {
        entity: "modiEntity";
    }) | (OperEntity.ActionAuthIdSubQuery & {
        entity: "operEntity";
    }) | (ActionAuth.ActionAuthIdSubQuery & {
        entity: "actionAuth";
    }) | any;
};
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
export declare type RelationIdSubQuery = {
    [K in "$in" | "$nin"]?: (ActionAuth.RelationIdSubQuery & {
        entity: "actionAuth";
    }) | (RelationAuth.RelationIdSubQuery & {
        entity: "relationAuth";
    }) | (UserEntityGrant.RelationIdSubQuery & {
        entity: "userEntityGrant";
    }) | (UserRelation.RelationIdSubQuery & {
        entity: "userRelation";
    }) | (ModiEntity.RelationIdSubQuery & {
        entity: "modiEntity";
    }) | (OperEntity.RelationIdSubQuery & {
        entity: "operEntity";
    }) | (Relation.RelationIdSubQuery & {
        entity: "relation";
    }) | any;
};
export declare type RelationAuthIdSubQuery = {
    [K in "$in" | "$nin"]?: (ModiEntity.RelationAuthIdSubQuery & {
        entity: "modiEntity";
    }) | (OperEntity.RelationAuthIdSubQuery & {
        entity: "operEntity";
    }) | (RelationAuth.RelationAuthIdSubQuery & {
        entity: "relationAuth";
    }) | any;
};
export declare type UserIdSubQuery = {
    [K in "$in" | "$nin"]?: (Oper.UserIdSubQuery & {
        entity: "oper";
    }) | (User.UserIdSubQuery & {
        entity: "user";
    }) | (UserRelation.UserIdSubQuery & {
        entity: "userRelation";
    }) | (ModiEntity.UserIdSubQuery & {
        entity: "modiEntity";
    }) | (OperEntity.UserIdSubQuery & {
        entity: "operEntity";
    }) | (User.UserIdSubQuery & {
        entity: "user";
    }) | any;
};
export declare type UserEntityGrantIdSubQuery = {
    [K in "$in" | "$nin"]?: (ModiEntity.UserEntityGrantIdSubQuery & {
        entity: "modiEntity";
    }) | (OperEntity.UserEntityGrantIdSubQuery & {
        entity: "operEntity";
    }) | (UserEntityGrant.UserEntityGrantIdSubQuery & {
        entity: "userEntityGrant";
    }) | any;
};
export declare type UserRelationIdSubQuery = {
    [K in "$in" | "$nin"]?: (ModiEntity.UserRelationIdSubQuery & {
        entity: "modiEntity";
    }) | (OperEntity.UserRelationIdSubQuery & {
        entity: "operEntity";
    }) | (UserRelation.UserRelationIdSubQuery & {
        entity: "userRelation";
    }) | any;
};
