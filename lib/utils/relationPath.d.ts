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
 * 根据entity的相对path，找到其根结点以及相应的user对象
 * @param schema
 * @param entity
 * @param path path的最后一项一定指向user。'aa.bb.cc.dd.user'
 * @returns
 */
export declare function destructDirectUserPath<ED extends EntityDict & BaseEntityDict, T extends keyof ED>(schema: StorageSchema<ED>, entity: T, path: string): {
    projection: ED[T]['Selection']['data'];
    getData: (d: Partial<ED[T]['Schema']>) => {
        entity: keyof ED;
        entityId: string;
        userId: string;
    }[] | undefined;
};
/**
 * 根据entity的相对path，找到对应的根结点对象数据行
 * @param schema
 * @param entity
 * @param path
 * @returns
 */
export declare function destructDirectPath<ED extends EntityDict & BaseEntityDict, T extends keyof ED>(schema: StorageSchema<ED>, entity: T, path: string): {
    projection: ED[T]['Selection']['data'];
    getData: (d: Partial<ED[keyof ED]['Schema']>, path2?: string) => {
        entity: keyof ED;
        data: Partial<ED[keyof ED]['Schema']>;
    }[] | undefined;
};
