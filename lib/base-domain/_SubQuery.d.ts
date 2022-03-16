import * as Address from "./Address/Schema";
import * as Application from "./Application/Schema";
import * as Area from "./Area/Schema";
import * as ExtraFile from "./ExtraFile/Schema";
import * as Mobile from "./Mobile/Schema";
import * as UserSystem from "./UserSystem/Schema";
import * as System from "./System/Schema";
import * as Token from "./Token/Schema";
import * as User from "./User/Schema";
import * as WechatUser from "./WechatUser/Schema";
export declare type AddressIdSubQuery = {
    [K in "$in" | "$nin"]?: (Address.AddressIdSubQuery & {
        entity: "address";
    });
};
export declare type ApplicationIdSubQuery = {
    [K in "$in" | "$nin"]?: (Token.ApplicationIdSubQuery & {
        entity: "token";
    }) | (WechatUser.ApplicationIdSubQuery & {
        entity: "wechatUser";
    }) | (Application.ApplicationIdSubQuery & {
        entity: "application";
    });
};
export declare type AreaIdSubQuery = {
    [K in "$in" | "$nin"]?: (Address.AreaIdSubQuery & {
        entity: "address";
    }) | (Area.AreaIdSubQuery & {
        entity: "area";
    }) | (Area.AreaIdSubQuery & {
        entity: "area";
    });
};
export declare type ExtraFileIdSubQuery = {
    [K in "$in" | "$nin"]?: (ExtraFile.ExtraFileIdSubQuery & {
        entity: "extraFile";
    });
};
export declare type MobileIdSubQuery = {
    [K in "$in" | "$nin"]?: (Mobile.MobileIdSubQuery & {
        entity: "mobile";
    });
};
export declare type UserSystemIdSubQuery = {
    [K in "$in" | "$nin"]?: (UserSystem.UserSystemIdSubQuery & {
        entity: "userSystem";
    });
};
export declare type SystemIdSubQuery = {
    [K in "$in" | "$nin"]?: (Application.SystemIdSubQuery & {
        entity: "application";
    }) | (UserSystem.SystemIdSubQuery & {
        entity: "userSystem";
    }) | (System.SystemIdSubQuery & {
        entity: "system";
    });
};
export declare type TokenIdSubQuery = {
    [K in "$in" | "$nin"]?: (Token.TokenIdSubQuery & {
        entity: "token";
    });
};
export declare type UserIdSubQuery = {
    [K in "$in" | "$nin"]?: (Mobile.UserIdSubQuery & {
        entity: "mobile";
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
    });
};
export declare type WechatUserIdSubQuery = {
    [K in "$in" | "$nin"]?: (WechatUser.WechatUserIdSubQuery & {
        entity: "wechatUser";
    });
};
