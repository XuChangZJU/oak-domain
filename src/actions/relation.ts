import { CascadeRelationItem, RelationHierarchy, EntityDict } from "../types/Entity";

export type GenericRelation = 'owner';

export function convertHierarchyToAuth<ED extends EntityDict, T extends keyof ED>(entity: T, hierarchy: RelationHierarchy<NonNullable<ED[T]['Relation']>>): {
    [K in NonNullable<ED[T]['Relation']>]?: CascadeRelationItem;
} {
    const reverseHierarchy: RelationHierarchy<NonNullable<ED[T]['Relation']>> = {};
    for (const r in hierarchy) {
        for (const r2 of hierarchy[r as NonNullable<ED[T]['Relation']>]!) {
            if (reverseHierarchy[r2]) {
                reverseHierarchy[r2]?.push(r as NonNullable<ED[T]['Relation']>);
            }
            else {
                reverseHierarchy[r2] = [r as NonNullable<ED[T]['Relation']>];
            }
        }
    }
    const result: {
        [K in NonNullable<ED[T]['Relation']>]?: CascadeRelationItem;
    } = {};
    for (const r in reverseHierarchy) {
        result[r as NonNullable<ED[T]['Relation']>] = {
            cascadePath: '',
            relations: reverseHierarchy[r as NonNullable<ED[T]['Relation']>],
        };
    }
    
    return result;
}