/**
 * 此函数不再使用
 * @param map
 */
export declare function registerIgnoredForeignKeyMap(map: Record<string, string[]>): void;
/**
 * 此函数不再使用
 * @param map
 */
export declare function registerFreeEntities(selectFreeEntities?: string[], createFreeEntities?: string[], updateFreeEntities?: string[]): void;
/**
 * 此函数不再使用
 * @param map
 */
export declare function registerIgnoredRelationPathMap(map: Record<string, string[]>): void;
/**
 * 很多路径虽然最后指向同一对象，但不能封掉，封了会导致查询的时候找不到对应的路径path
 * @param map
 */
export declare function registerFixedDestinationPathMap(map: Record<string, string[]>): void;
/**
 * 此函数不再使用
 * @param map
 */
export declare function registerDeducedRelationMap(map: Record<string, string>): void;
export declare function analyzeEntities(inputDir: string, relativePath?: string): void;
export declare function buildSchema(outputDir: string): void;
