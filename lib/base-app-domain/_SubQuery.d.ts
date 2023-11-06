import * as ActionAuth from "./ActionAuth/Schema";
import * as I18n from "./I18n/Schema";
import * as Modi from "./Modi/Schema";
import * as ModiEntity from "./ModiEntity/Schema";
import * as Oper from "./Oper/Schema";
import * as OperEntity from "./OperEntity/Schema";
import * as Path from "./Path/Schema";
import * as Relation from "./Relation/Schema";
import * as RelationAuth from "./RelationAuth/Schema";
import * as User from "./User/Schema";
import * as UserEntityClaim from "./UserEntityClaim/Schema";
import * as UserEntityGrant from "./UserEntityGrant/Schema";
import * as UserRelation from "./UserRelation/Schema";
export type ActionAuthIdSubQuery = {
    [K in "$in" | "$nin"]?: (ModiEntity.ActionAuthIdSubQuery & {
        entity: "modiEntity";
    }) | (OperEntity.ActionAuthIdSubQuery & {
        entity: "operEntity";
    }) | (ActionAuth.ActionAuthIdSubQuery & {
        entity: "actionAuth";
    }) | any;
};
export type I18nIdSubQuery = {
    [K in "$in" | "$nin"]?: (ModiEntity.I18nIdSubQuery & {
        entity: "modiEntity";
    }) | (OperEntity.I18nIdSubQuery & {
        entity: "operEntity";
    }) | (I18n.I18nIdSubQuery & {
        entity: "i18n";
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
export type PathIdSubQuery = {
    [K in "$in" | "$nin"]?: (ActionAuth.PathIdSubQuery & {
        entity: "actionAuth";
    }) | (RelationAuth.PathIdSubQuery & {
        entity: "relationAuth";
    }) | (ModiEntity.PathIdSubQuery & {
        entity: "modiEntity";
    }) | (OperEntity.PathIdSubQuery & {
        entity: "operEntity";
    }) | (Path.PathIdSubQuery & {
        entity: "path";
    }) | any;
};
export type RelationIdSubQuery = {
    [K in "$in" | "$nin"]?: (ActionAuth.RelationIdSubQuery & {
        entity: "actionAuth";
    }) | (RelationAuth.RelationIdSubQuery & {
        entity: "relationAuth";
    }) | (UserEntityClaim.RelationIdSubQuery & {
        entity: "userEntityClaim";
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
export type RelationAuthIdSubQuery = {
    [K in "$in" | "$nin"]?: (ModiEntity.RelationAuthIdSubQuery & {
        entity: "modiEntity";
    }) | (OperEntity.RelationAuthIdSubQuery & {
        entity: "operEntity";
    }) | (RelationAuth.RelationAuthIdSubQuery & {
        entity: "relationAuth";
    }) | any;
};
export type UserIdSubQuery = {
    [K in "$in" | "$nin"]?: (Oper.UserIdSubQuery & {
        entity: "oper";
    }) | (User.UserIdSubQuery & {
        entity: "user";
    }) | (UserEntityClaim.UserIdSubQuery & {
        entity: "userEntityClaim";
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
export type UserEntityClaimIdSubQuery = {
    [K in "$in" | "$nin"]?: (ModiEntity.UserEntityClaimIdSubQuery & {
        entity: "modiEntity";
    }) | (OperEntity.UserEntityClaimIdSubQuery & {
        entity: "operEntity";
    }) | (UserEntityClaim.UserEntityClaimIdSubQuery & {
        entity: "userEntityClaim";
    }) | any;
};
export type UserEntityGrantIdSubQuery = {
    [K in "$in" | "$nin"]?: (UserEntityClaim.UserEntityGrantIdSubQuery & {
        entity: "userEntityClaim";
    }) | (ModiEntity.UserEntityGrantIdSubQuery & {
        entity: "modiEntity";
    }) | (OperEntity.UserEntityGrantIdSubQuery & {
        entity: "operEntity";
    }) | (UserEntityGrant.UserEntityGrantIdSubQuery & {
        entity: "userEntityGrant";
    }) | any;
};
export type UserRelationIdSubQuery = {
    [K in "$in" | "$nin"]?: (UserEntityClaim.UserRelationIdSubQuery & {
        entity: "userEntityClaim";
    }) | (ModiEntity.UserRelationIdSubQuery & {
        entity: "modiEntity";
    }) | (OperEntity.UserRelationIdSubQuery & {
        entity: "operEntity";
    }) | (UserRelation.UserRelationIdSubQuery & {
        entity: "userRelation";
    }) | any;
};
