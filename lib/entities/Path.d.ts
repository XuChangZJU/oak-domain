import { String, Boolean } from '../types/DataType';
import { EntityShape } from '../types/Entity';
export interface Schema extends EntityShape {
    destEntity: String<32>;
    value: String<256>;
    recursive: Boolean;
    sourceEntity: String<32>;
}
