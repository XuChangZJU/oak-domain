import { ActionDef } from '../types/Action';
export declare type GenericAction = 'create' | 'update' | 'remove' | 'select' | 'count' | 'stat' | 'download';
export declare const genericActions: string[];
export declare type AbleAction = 'enable' | 'disable';
export declare type AbleState = 'enabled' | 'disabled';
export declare const makeAbleActionDef: (initialState?: AbleState) => ActionDef<AbleAction, AbleState>;
