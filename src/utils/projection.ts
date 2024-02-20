import { EntityDict, PrimaryKeyAttribute, CreateAtAttribute, UpdateAtAttribute, DeleteAtAttribute } from '../types/Entity';
import { EntityDict as BaseEntityDict } from '../base-app-domain';
import { StorageSchema } from '../types/Storage';

export function makeProjection<ED extends BaseEntityDict & EntityDict, T extends keyof ED>(entity: T, schema: StorageSchema<ED>) {
    const { attributes } = schema[entity];

    const attrs = Object.keys(attributes);
    attrs.push(PrimaryKeyAttribute, CreateAtAttribute, UpdateAtAttribute, DeleteAtAttribute);
    const projection: ED[T]['Selection']['data'] = {};
    attrs.forEach(
        (attr) => Object.assign(
            projection, {
                [attr]: 1,
            }
        )
    );

    return projection;
}