import { AuthCascadePath, AuthDeduceRelationMap, SelectFreeEntities } from "../types/Entity";
import { EntityDict } from "./EntityDict";
import { CreateOperationData as Relation } from "./Relation/Schema";
export declare const ActionCascadePathGraph: AuthCascadePath<EntityDict>[];
export declare const RelationCascadePathGraph: AuthCascadePath<EntityDict>[];
export declare const relations: Relation[];
export declare const deducedRelationMap: AuthDeduceRelationMap<EntityDict>;
export declare const selectFreeEntities: SelectFreeEntities<EntityDict>;
