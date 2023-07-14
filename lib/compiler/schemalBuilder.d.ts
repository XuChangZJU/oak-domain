export declare function registerIgnoredForeignKeyMap(map: Record<string, string[]>): void;
export declare function registerSelectFreeEntities(entities: string[]): void;
export declare function registerIgnoredRelationPathMap(map: Record<string, string[]>): void;
/**
 * 很多路径虽然最后指向同一对象，但不能封掉，封了会导致查询的时候找不到对应的路径path
 * @param map
 */
export declare function registerFixedDestinationPathMap(map: Record<string, string[]>): void;
export declare function registerDeducedRelationMap(map: Record<string, string>): void;
export declare function analyzeEntities(inputDir: string, relativePath?: string): void;
export declare function buildSchema(outputDir: string): void;
