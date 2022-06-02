import { Context, EntityDict, StorageSchema, Watcher } from "../types";

export function makeIntrinsicWatchers<ED extends EntityDict, Cxt extends Context<ED>>(schema: StorageSchema<ED>) {
    const watchers: Watcher<ED, keyof ED, Cxt>[] = [];
    for (const entity in schema) {
        const { attributes } = schema[entity];

        const { expiresAt, expired } = attributes;
        if (expiresAt && expiresAt.type === 'datetime' && expired && expired.type === 'boolean') {
            // 如果有定义expiresAt和expired，则自动生成一个检查的watcher
            watchers.push({
                entity,
                name: `对象${entity}上的过期自动watcher`,
                filter: async () => {
                    const now = Date.now();
                    return {
                        expired: false,
                        expiresAt: {
                            $lte: now,
                        },
                    };
                },
                action: 'update',
                actionData: {
                    expired: true,
                } as ED[keyof ED]['Update']['data'],
            })
        }
    }

    return watchers;
}