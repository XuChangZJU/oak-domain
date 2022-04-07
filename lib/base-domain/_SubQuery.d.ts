import * as Address from "./Address/Schema";
import * as Application from "./Application/Schema";
import * as Area from "./Area/Schema";
import * as ExtraFile from "./ExtraFile/Schema";
import * as Mobile from "./Mobile/Schema";
import * as UserRole from "./UserRole/Schema";
import * as Role from "./Role/Schema";
import * as UserSystem from "./UserSystem/Schema";
import * as System from "./System/Schema";
import * as Token from "./Token/Schema";
import * as User from "./User/Schema";
import * as WechatUser from "./WechatUser/Schema";
export declare type AddressIdSubQuery = {
    [K in "$in" | "$nin"]?: (Address.AddressIdSubQuery & {
        entity: "address";
    }) | any;
};
export declare type ApplicationIdSubQuery = {
    [K in "$in" | "$nin"]?: (Token.ApplicationIdSubQuery & {
        entity: "token";
    }) | (WechatUser.ApplicationIdSubQuery & {
        entity: "wechatUser";
    }) | (Application.ApplicationIdSubQuery & {
        entity: "application";
    }) | any;
};
export declare type AreaIdSubQuery = {
    [K in "$in" | "$nin"]?: (Address.AreaIdSubQuery & {
        entity: "address";
    }) | (Area.AreaIdSubQuery & {
        entity: "area";
    }) | (Area.AreaIdSubQuery & {
        entity: "area";
    }) | any;
};
export declare type ExtraFileIdSubQuery = {
    [K in "$in" | "$nin"]?: (ExtraFile.ExtraFileIdSubQuery & {
        entity: "extraFile";
    }) | any;
};
export declare type MobileIdSubQuery = {
    [K in "$in" | "$nin"]?: (Mobile.MobileIdSubQuery & {
        entity: "mobile";
    }) | any;
};
export declare type UserRoleIdSubQuery = {
    [K in "$in" | "$nin"]?: (UserRole.UserRoleIdSubQuery & {
        entity: "userRole";
    }) | any;
};
export declare type RoleIdSubQuery = {
    [K in "$in" | "$nin"]?: (UserRole.RoleIdSubQuery & {
        entity: "userRole";
    }) | (Role.RoleIdSubQuery & {
        entity: "role";
    }) | any;
};
export declare type UserSystemIdSubQuery = {
    [K in "$in" | "$nin"]?: (UserSystem.UserSystemIdSubQuery & {
        entity: "userSystem";
    }) | any;
};
export declare type SystemIdSubQuery = {
    [K in "$in" | "$nin"]?: (Application.SystemIdSubQuery & {
        entity: "application";
    }) | (UserSystem.SystemIdSubQuery & {
        entity: "userSystem";
    }) | (System.SystemIdSubQuery & {
        entity: "system";
    }) | any;
};
export declare type TokenIdSubQuery = {
    [K in "$in" | "$nin"]?: (Token.TokenIdSubQuery & {
        entity: "token";
    }) | any;
};
export declare type UserIdSubQuery = {
    [K in "$in" | "$nin"]?: (Mobile.UserIdSubQuery & {
        entity: "mobile";
    }) | (UserRole.UserIdSubQuery & {
        entity: "userRole";
    }) | (UserSystem.UserIdSubQuery & {
        entity: "userSystem";
    }) | (Token.UserIdSubQuery & {
        entity: "token";
    }) | (User.UserIdSubQuery & {
        entity: "user";
    }) | (WechatUser.UserIdSubQuery & {
        entity: "wechatUser";
    }) | (User.UserIdSubQuery & {
        entity: "user";
    }) | any;
};
export declare type WechatUserIdSubQuery = {
    [K in "$in" | "$nin"]?: (WechatUser.WechatUserIdSubQuery & {
        entity: "wechatUser";
    }) | any;
};
