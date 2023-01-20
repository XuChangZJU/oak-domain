import { CascadeRelationItem, RelationHierarchy } from "../types/Entity";
export declare type GenericRelation = 'owner';
export declare function convertHierarchyToAuth<R extends string>(hierarchy: RelationHierarchy<R>): {
    [K in R]?: CascadeRelationItem;
};
