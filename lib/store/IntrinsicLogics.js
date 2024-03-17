"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.makeIntrinsicCTWs = void 0;
const actionAuth_1 = require("./actionAuth");
const modi_1 = require("./modi");
const IntrinsicCheckers_1 = require("./IntrinsicCheckers");
function createExpiredWatchers(schema) {
    const watchers = [];
    for (const entity in schema) {
        const { attributes } = schema[entity];
        const { expiresAt, expired } = attributes;
        if (expiresAt && expiresAt.type === 'datetime' && expired && expired.type === 'boolean') {
            // 如果有定义expiresAt和expired，则自动生成一个检查的watcher
            watchers.push({
                entity,
                name: `对象${entity}上的过期自动watcher`,
                filter: () => {
                    return {
                        expired: false,
                        expiresAt: {
                            $lte: Date.now(),
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
function makeIntrinsicCTWs(schema, actionDefDict, attrUpdateMatrix) {
    const checkers = (0, IntrinsicCheckers_1.makeIntrinsicCheckers)(schema, actionDefDict, attrUpdateMatrix);
    const triggers = (0, modi_1.createModiRelatedTriggers)(schema);
    triggers.push(...actionAuth_1.triggers);
    const watchers = createExpiredWatchers(schema);
    return {
        triggers,
        checkers,
        watchers,
    };
}
exports.makeIntrinsicCTWs = makeIntrinsicCTWs;
