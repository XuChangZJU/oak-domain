import { OpSchema as Modi } from '../base-app-domain/Modi/Schema';
import { Operation } from '../types';
export function createOperationsFromModies(modies: Modi[]): Array<{
    operation: Operation <string, Object, Object>,
    entity: string,
}>{
    return modies.map(
        (modi) => {
            return {
                entity: modi.targetEntity,
                operation: {
                    id: modi.id,
                    action: modi.action,
                    data: modi.data,
                    filter: modi.filter as any,
                }
            }
        }
    );
}