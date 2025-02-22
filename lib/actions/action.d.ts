import { ActionDef } from '../types/Action';
export type ReadOnlyAction = 'select' | 'count' | 'stat' | 'download' | 'aggregate';
export type AppendOnlyAction = ReadOnlyAction | 'create';
export type ExcludeUpdateAction = AppendOnlyAction | 'remove';
export type ExcludeRemoveAction = AppendOnlyAction | 'update';
export type GenericAction = 'update' | ExcludeUpdateAction;
export type RelationAction = 'grant' | 'revoke';
export declare const readOnlyActions: string[];
export declare const appendOnlyActions: string[];
export declare const excludeUpdateActions: string[];
export declare const excludeRemoveActions: string[];
export declare const genericActions: string[];
export declare const relationActions: string[];
export type AbleAction = 'enable' | 'disable';
export type AbleState = 'enabled' | 'disabled';
export declare const makeAbleActionDef: (initialState?: AbleState) => ActionDef<AbleAction, AbleState>;
