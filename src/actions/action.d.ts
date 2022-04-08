import { ActionDef } from '../types/Action';
export declare type GenericAction = 'create' | 'update' | 'remove' | 'select';
export declare const genericActions: string[];
export declare type AbleAction = 'enable' | 'disable';
export declare type AbleState = 'enabled' | 'disabled';
export declare const AbleActionDef: ActionDef<AbleAction, AbleState>;
