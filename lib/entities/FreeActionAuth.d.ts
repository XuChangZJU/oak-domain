import { String } from '../types/DataType';
import { EntityShape } from '../types/Entity';
declare type Actions = string[];
export interface Schema extends EntityShape {
    destEntity: String<32>;
    deActions: Actions;
}
export {};
