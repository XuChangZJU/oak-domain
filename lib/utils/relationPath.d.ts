import { StorageSchema } from '../types/Storage';
import { EntityDict as BaseEntityDict } from "../base-app-domain";
import { EntityDict } from "../types/Entity";
export declare function destructRelationPath<ED extends EntityDict & BaseEntityDict, T extends keyof ED>(schema: StorageSchema<ED>, entity: T, path: string, relationFilter: ED['userRelation']['Selection']['filter'], recursive?: boolean): {
    projection: ED[T]['Selection']['data'];
    getData: (d: Partial<ED[T]['Schema']>) => ED['userRelation']['Schema'][];
};
export declare function destructDirectPath<ED extends EntityDict & BaseEntityDict, T extends keyof ED>(schema: StorageSchema<ED>, entity: T, path: string, recursive?: boolean): {
    projection: ED[T]['Selection']['data'];
    getData: (d: Partial<ED[T]['Schema']>) => {
        entity: keyof ED;
        entityId: string;
        userId: string;
    }[];
};
