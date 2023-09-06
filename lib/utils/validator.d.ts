import { EntityDict } from "../types";
declare type ValidatorFunction = (text: string, size?: number) => string | boolean;
declare type ValidatorMoneyFunction = (text: string, zero?: boolean) => string | boolean;
export declare const isMobile: ValidatorFunction;
export declare const isPassword: ValidatorFunction;
export declare const isCaptcha: ValidatorFunction;
export declare const isIdCardNumber: ValidatorFunction;
export declare const isPassportNumber: ValidatorFunction;
export declare const isHkCardNumber: ValidatorFunction;
export declare const isAmCardNumber: ValidatorFunction;
export declare const isTwCardNumber: ValidatorFunction;
export declare const isBirthNumber: ValidatorFunction;
export declare const isSoldierNumber: ValidatorFunction;
export declare const isUrl: ValidatorFunction;
export declare const isNickname: ValidatorFunction;
export declare const isSizedCaptcha: ValidatorFunction;
export declare const isDigital: ValidatorFunction;
export declare const isPhone: ValidatorFunction;
export declare const isTel: ValidatorFunction;
export declare const isNumber: ValidatorFunction;
export declare const isMoney: ValidatorMoneyFunction;
export declare const isVehicleNumber: ValidatorFunction;
export declare function checkAttributesNotNull<ED extends EntityDict, T extends keyof EntityDict>(entity: T, data: Partial<ED[T]['CreateSingle']['data']>, attributes: Array<keyof ED[T]['CreateSingle']['data']>, allowEmpty?: true): void;
export declare function checkAttributesScope<ED extends EntityDict, T extends keyof EntityDict>(entity: T, data: Partial<ED[T]['CreateSingle']['data']>, attributes: Array<keyof ED[T]['CreateSingle']['data']>): void;
export {};
