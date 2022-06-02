"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.makeIntrinsicWatchers = void 0;
function makeIntrinsicWatchers(schema) {
    const watchers = [];
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
                },
            });
        }
    }
    return watchers;
}
exports.makeIntrinsicWatchers = makeIntrinsicWatchers;
