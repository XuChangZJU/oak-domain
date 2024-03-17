import { ActionDictOfEntityDict, BBWatcher, Checker, EntityDict, StorageSchema, Trigger, Watcher, AttrUpdateMatrix } from "../types";
import { SyncContext } from "./SyncRowStore";
import { AsyncContext } from "./AsyncRowStore";
import { EntityDict as BaseEntityDict } from '../base-app-domain/EntityDict';
import { triggers as ActionAuthTriggers } from './actionAuth';
import { createModiRelatedTriggers } from "./modi";
import { makeIntrinsicCheckers } from "./IntrinsicCheckers";

function createExpiredWatchers<ED extends EntityDict & BaseEntityDict>(schema: StorageSchema<ED>) {
    const watchers: BBWatcher<ED, keyof ED>[] = [];
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
                } as ED[keyof ED]['Update']['data'],
            })
        }
    }

    return watchers;
}

export function makeIntrinsicCTWs<ED extends EntityDict & BaseEntityDict, Cxt extends AsyncContext<ED>, FrontCxt extends SyncContext<ED>>(
    schema: StorageSchema<ED>,
    actionDefDict: ActionDictOfEntityDict<ED>,
    attrUpdateMatrix?: AttrUpdateMatrix<ED>,
) {
    const checkers: Checker<ED, keyof ED, Cxt | FrontCxt>[] = makeIntrinsicCheckers<ED, Cxt, FrontCxt>(schema, actionDefDict, attrUpdateMatrix);

    const triggers: Array<Trigger<ED, keyof ED, Cxt>> = createModiRelatedTriggers<ED, Cxt>(schema);
    triggers.push(...(ActionAuthTriggers as Array<Trigger<ED, keyof ED, Cxt>>));
    
    const watchers: Array<Watcher<ED, keyof ED, Cxt>> = createExpiredWatchers<ED>(schema);
    
    return {
        triggers,
        checkers,
        watchers,
    };
}