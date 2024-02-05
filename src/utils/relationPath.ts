import { StorageSchema } from "..";
import { EntityDict as BaseEntityDict } from "../base-app-domain";
import { EntityDict } from "../types/Entity";

export function destructRelationPath<ED extends EntityDict & BaseEntityDict, T extends keyof ED>(
    schema: StorageSchema<ED>,
    entity: T, 
    path: string, 
    relationFilter?: ED['userRelation']['Selection']['filter'], 
    recursive?: boolean
    ): {
        projection: ED[T]['Selection']['data'];
        getData: (d: Partial<ED[T]['Schema']>) => ED['userRelation']['Schema'][];
    } {
        throw new Error('method not implemented');
}