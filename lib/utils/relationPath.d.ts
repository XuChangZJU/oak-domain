import { StorageSchema } from '../types/Storage';
import { EntityDict as BaseEntityDict } from "../base-app-domain";
import { EntityDict } from "../types/Entity";
/**
 * 根据entity的相对path，以及定义的userRelationFilter，找到根结点对象上相应的userRelations
 * @param schema
 * @param entity
 * @param path
 * @param relationFilter
 * @param recursive
 */
export declare function destructRelationPath<ED extends EntityDict & BaseEntityDict, T extends keyof ED>(schema: StorageSchema<ED>, entity: T, path: string, relationFilter: ED['userRelation']['Selection']['filter'], recursive?: boolean): {
    projection: ED[T]['Selection']['data'];
    getData: (d: Partial<ED[T]['Schema']>) => ED['userRelation']['Schema'][] | undefined;
};
/**
 * 根据entity的相对path，找到对应的根结点对象上的直接userId
 * @param schema
 * @param entity
 * @param path
 * @param recursive
 * @returns
 */
export declare function destructDirectPath<ED extends EntityDict & BaseEntityDict, T extends keyof ED>(schema: StorageSchema<ED>, entity: T, path: string, recursive?: boolean): {
    projection: ED[T]['Selection']['data'];
    getData: (d: Partial<ED[T]['Schema']>) => {
        entity: keyof ED;
        entityId: string;
        userId: string;
    }[] | undefined;
};
