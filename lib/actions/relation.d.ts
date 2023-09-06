import { CascadeRelationItem, RelationHierarchy, EntityDict } from "../types/Entity";
export declare type GenericRelation = 'owner';
export declare function convertHierarchyToAuth<ED extends EntityDict, T extends keyof ED>(entity: T, hierarchy: RelationHierarchy<NonNullable<ED[T]['Relation']>>): {
    [K in NonNullable<ED[T]['Relation']>]?: CascadeRelationItem;
};
