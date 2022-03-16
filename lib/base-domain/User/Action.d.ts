import { GenericAction } from "../../actions/action";
declare type IdAction = 'verify' | 'accept' | 'reject';
export declare type IdState = 'unverified' | 'verified' | 'verifying';
declare type UserAction = 'activate' | 'disable' | 'enable' | 'mergeTo' | 'mergeFrom';
export declare type UserState = 'shadow' | 'normal' | 'disabled' | 'merged';
export declare type ParticularAction = UserAction | IdAction;
export declare type Action = GenericAction | ParticularAction;
export {};
