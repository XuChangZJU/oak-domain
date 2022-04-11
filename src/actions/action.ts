import { ActionDef } from '../types/Action';
export type GenericAction = 'create' | 'update' | 'remove' | 'select' | 'count' | 'stat' | 'download';
export const genericActions = ['create', 'update', 'remove', 'count', 'stat', 'download', 'select'];

export type AbleAction = 'enable' | 'disable';
export type AbleState = 'enabled' | 'disabled';
export const AbleActionDef: ActionDef<AbleAction, AbleState> = {
    stm: {
        enable: ['disabled', 'enabled'],
        disable: ['enabled', 'disabled'],
    },
}