import { CascadeRelationItem, RelationHierarchy } from "../types/Entity";

export type GenericRelation = 'owner';

export function convertHierarchyToAuth<R extends string>(hierarchy: RelationHierarchy<R>): {
    [K in R]?: CascadeRelationItem;
} {
    const reverseHierarchy: RelationHierarchy<R> = {};
    for (const r in hierarchy) {
        for (const r2 of hierarchy[r]!) {
            if (reverseHierarchy[r2]) {
                reverseHierarchy[r2]?.push(r);
            }
            else {
                reverseHierarchy[r2] = [r];
            }
        }
    }
    const result: {
        [K in R]?: CascadeRelationItem;
    } = {};
    for (const r in reverseHierarchy) {
        result[r] = {
            cascadePath: '',
            relations: reverseHierarchy[r],
        };
    }
    
    return result;
}