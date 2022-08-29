import { ActionDef } from '../types/Action';
export type ReadOnlyAction =  'select' | 'count' | 'stat' | 'download';
export type AppendOnlyAction = ReadOnlyAction | 'create';
export type ExcludeUpdateAction = AppendOnlyAction | 'remove';
export type GenericAction = 'update' | ExcludeUpdateAction;

export const readOnlyActions = ['count', 'stat', 'download', 'select'];
export const appendOnlyActions = readOnlyActions.concat('create');
export const excludeUpdateActions = appendOnlyActions.concat('remove');
export const genericActions = excludeUpdateActions.concat('update');

export type AbleAction = 'enable' | 'disable';
export type AbleState = 'enabled' | 'disabled';
export const makeAbleActionDef: (initialState?: AbleState) => ActionDef<AbleAction, AbleState> = (initialState) => ({
    stm: {
        enable: ['disabled', 'enabled'],
        disable: ['enabled', 'disabled'],
    },
    is: initialState,
});