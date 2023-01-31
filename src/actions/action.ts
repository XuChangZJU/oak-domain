import { ActionDef } from '../types/Action';
export type ReadOnlyAction =  'select' | 'count' | 'stat' | 'download' | 'aggregate';
export type AppendOnlyAction = ReadOnlyAction | 'create';
export type ExcludeUpdateAction = AppendOnlyAction | 'remove';
export type ExcludeRemoveAction = AppendOnlyAction | 'update';
export type GenericAction = 'update' | ExcludeUpdateAction;
export type RelationAction = 'grant' | 'revoke';

export const readOnlyActions = ['count', 'stat', 'download', 'select', 'aggregate'];
export const appendOnlyActions = readOnlyActions.concat('create');
export const excludeUpdateActions = appendOnlyActions.concat('remove');
export const exludeRemoveActions = appendOnlyActions.concat('update');
export const genericActions = excludeUpdateActions.concat('update');
export const relationActions = ['grant', 'revoke'];


export type AbleAction = 'enable' | 'disable';
export type AbleState = 'enabled' | 'disabled';
export const makeAbleActionDef: (initialState?: AbleState) => ActionDef<AbleAction, AbleState> = (initialState) => ({
    stm: {
        enable: ['disabled', 'enabled'],
        disable: ['enabled', 'disabled'],
    },
    is: initialState,
});