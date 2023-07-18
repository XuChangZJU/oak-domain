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
export type ActionAuthIdSubQuery = {
    [K in "$in" | "$nin"]?: (ActionAuth.ActionAuthIdSubQuery & {
        entity: "actionAuth";
    }) | any;
};
export type ModiIdSubQuery = {
    [K in "$in" | "$nin"]?: (ModiEntity.ModiIdSubQuery & {
        entity: "modiEntity";
    }) | (Modi.ModiIdSubQuery & {
        entity: "modi";
    }) | any;
};
export type ModiEntityIdSubQuery = {
    [K in "$in" | "$nin"]?: (ModiEntity.ModiEntityIdSubQuery & {
        entity: "modiEntity";
    }) | any;
};
export type OperIdSubQuery = {
    [K in "$in" | "$nin"]?: (OperEntity.OperIdSubQuery & {
        entity: "operEntity";
    }) | (Oper.OperIdSubQuery & {
        entity: "oper";
    }) | any;
};
export type OperEntityIdSubQuery = {
    [K in "$in" | "$nin"]?: (OperEntity.OperEntityIdSubQuery & {
        entity: "operEntity";
    }) | any;
};
export type RelationIdSubQuery = {
    [K in "$in" | "$nin"]?: (ActionAuth.RelationIdSubQuery & {
        entity: "actionAuth";
    }) | (RelationAuth.RelationIdSubQuery & {
        entity: "relationAuth";
    }) | (UserRelation.RelationIdSubQuery & {
        entity: "userRelation";
    }) | (Relation.RelationIdSubQuery & {
        entity: "relation";
    }) | any;
};
export type RelationAuthIdSubQuery = {
    [K in "$in" | "$nin"]?: (RelationAuth.RelationAuthIdSubQuery & {
        entity: "relationAuth";
    }) | any;
};
export type UserIdSubQuery = {
    [K in "$in" | "$nin"]?: (Oper.UserIdSubQuery & {
        entity: "oper";
    }) | (User.UserIdSubQuery & {
        entity: "user";
    }) | (UserRelation.UserIdSubQuery & {
        entity: "userRelation";
    }) | (User.UserIdSubQuery & {
        entity: "user";
    }) | any;
};
export type UserEntityGrantIdSubQuery = {
    [K in "$in" | "$nin"]?: (UserEntityGrant.UserEntityGrantIdSubQuery & {
        entity: "userEntityGrant";
    }) | any;
};
export type UserRelationIdSubQuery = {
    [K in "$in" | "$nin"]?: (UserRelation.UserRelationIdSubQuery & {
        entity: "userRelation";
    }) | any;
};
