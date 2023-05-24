import { ActionDef } from '../types/Action';
export declare type ReadOnlyAction = 'select' | 'count' | 'stat' | 'download' | 'aggregate';
export declare type AppendOnlyAction = ReadOnlyAction | 'create';
export declare type ExcludeUpdateAction = AppendOnlyAction | 'remove';
export declare type ExcludeRemoveAction = AppendOnlyAction | 'update';
export declare type GenericAction = 'update' | ExcludeUpdateAction;
export declare type RelationAction = 'grant' | 'revoke';
export declare const readOnlyActions: string[];
export declare const appendOnlyActions: string[];
export declare const excludeUpdateActions: string[];
export declare const excludeRemoveActions: string[];
export declare const genericActions: string[];
export declare const relationActions: string[];
export declare type AbleAction = 'enable' | 'disable';
export declare type AbleState = 'enabled' | 'disabled';
export declare const makeAbleActionDef: (initialState?: AbleState) => ActionDef<AbleAction, AbleState>;
