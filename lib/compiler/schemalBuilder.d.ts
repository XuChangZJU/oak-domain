export declare function registerIgnoredForeignKeyMap(map: Record<string, string[]>): void;
export declare function registerIgnoredRelationPathMap(map: Record<string, string[]>): void;
export declare function registerDeducedRelationMap(map: Record<string, string>): void;
export declare function analyzeEntities(inputDir: string, relativePath?: string): void;
export declare function buildSchema(outputDir: string): void;
