import { OpSchema as Modi } from '../base-app-domain/Modi/Schema';
import { Operation } from '../types';
export declare function createOperationsFromModies(modies: Modi[]): Array<{
    operation: Operation<string, Object, Object>;
    entity: string;
}>;
