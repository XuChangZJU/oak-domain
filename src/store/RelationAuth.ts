import assert from "assert";
import { EntityDict } from "../base-app-domain";
import { CreateTrigger, OakNoRelationDefException, OakUnloggedInException, OakUserUnpermittedException, RemoveTrigger, StorageSchema, Trigger, UpdateTrigger } from "../types";
import { AuthCascadePath, EntityDict as BaseEntityDict } from "../types/Entity";
import { AsyncContext } from "./AsyncRowStore";
import { checkFilterContains } from "./filter";
import { judgeRelation } from "./relation";
import { SyncContext } from "./SyncRowStore";

export class RelationAuth<ED extends EntityDict & BaseEntityDict>{
    private actionCascadePathGraph: AuthCascadePath<ED>[];
    private relationCascadePathGraph: AuthCascadePath<ED>[];
    private schema: StorageSchema<ED>;
    private relationalFilterMaker: {
        [T in keyof ED]?: (action: ED[T]['Action'] | 'select', userId: string, directActionAuthMap: Record<string, string[]>) => ED[T]['Selection']['filter'];
    };
    private relationalCreateChecker: {
        [T in keyof ED]?: (
            userId: string,
            directActionAuthMap: Record<string, string[]>,
            data?: ED[T]['CreateSingle']['data'],
            filter?: ED[T]['Selection']['filter']
        ) => <Cxt extends AsyncContext<ED> | SyncContext<ED>>(context: Cxt) => void | Promise<void>
    };
    private directActionAuthMap: Record<string, string[]> = {};
    private freeActionAuthMap: Record<string, string[]> | undefined;

    private constructFilterMaker() {
        const pathGroup: {
            [T in keyof ED]?: AuthCascadePath<ED>[];
        } = {};
        this.actionCascadePathGraph.forEach(
            (path) => {
                const entity = path[0];
                if (pathGroup[entity]) {
                    pathGroup[entity]?.push(path);
                }
                else {
                    pathGroup[entity] = [path];
                }
            }
        );

        const makeUserRelationSelection = <T extends keyof ED>(entity: T, path: string, root: keyof ED, action: ED[T]['Action'], userId: string): ED['userRelation']['Selection'] => ({
            data: {
                entityId: 1,
            },
            filter: {
                userId,
                entity: root as string,
                relationId: {
                    $in: {
                        entity: 'actionAuth',
                        data: {
                            relationId: 1,
                        },
                        filter: {
                            path,
                            destEntity: entity as string,
                            destActions: {
                                $contains: action,
                            },
                        },
                    },
                },
            },
        });

        const makeIter = (
            paths: string[],
            ir: boolean,
            daKey: string,
            e: keyof ED,
            p: string,
            r: keyof ED,
            e2: keyof ED,
            idx: number
        ): (action: ED[keyof ED]['Action'], userId: string, directActionAuthMap: Record<string, string[]>) => ED[keyof ED]['Selection']['filter'] => {
            const rel = judgeRelation(this.schema, e2, paths[idx]);
            if (idx === paths.length - 1) {
                if (rel === 2) {
                    // 基于entity/entityId的外键
                    if (ir) {
                        return (action: ED[keyof ED]['Action'], userId: string) => ({
                            entity: paths[idx],
                            entityId: {
                                $in: {
                                    entity: 'userRelation',
                                    ...makeUserRelationSelection(e, p, r, action, userId),
                                },
                            },
                        });
                    }
                    else {
                        return (action: ED[keyof ED]['Action'], userId: string, directActionAuthMap: Record<string, string[]>) => {
                            if (directActionAuthMap[daKey].includes(action)) {
                                return {
                                    entity: 'user',
                                    entityId: userId,
                                };
                            }
                        };
                    }
                }
                else {
                    assert(typeof rel === 'string');
                    if (ir) {
                        return (action: ED[keyof ED]['Action'], userId: string) => ({
                            [`${rel}Id`]: {
                                $in: {
                                    entity: 'userRelation',
                                    ...makeUserRelationSelection(e, p, r, action, userId),
                                },
                            },
                        });
                    }
                    else {
                        return (action: ED[keyof ED]['Action'], userId: string, directActionAuthMap: Record<string, string[]>) => {
                            if (directActionAuthMap[daKey].includes(action)) {
                                return {
                                    [`${rel}Id`]: userId,
                                };
                            }
                        };
                    }
                }
            }

            assert(rel === 2 || typeof rel === 'string');
            const maker = makeIter(paths, ir, daKey, e, p, r, rel === 2 ? paths[idx] : rel, idx + 1);
            return <T extends keyof ED>(action: ED[T]['Action'], userId: string, directActionAuthMap: Record<string, string[]>) => ({
                [paths[idx]]: maker(action, userId, directActionAuthMap),
            });
        };

        for (const entity in pathGroup) {
            const filterMakers = pathGroup[entity]!.map(
                (ele) => {
                    const [e, p, r, ir] = ele;      // entity, path, root, isRelation
                    const daKey = `${e as string}-${p}-${r as string}`;

                    const paths = p.split('.');
                    if (!p) {
                        assert(ir);
                        return <T extends keyof ED>(action: ED[T]['Action'], userId: string) => ({
                            id: {
                                $in: {
                                    entity: 'userRelation',
                                    ...makeUserRelationSelection(e, p, r, action, userId),
                                },
                            },
                        } as ED[keyof ED]['Selection']['filter']);
                    }


                    return makeIter(paths, ir, daKey, e, p, r, e, 0);
                }
            );
            this.relationalFilterMaker[entity] = (action: ED[keyof ED]['Action'], userId: string, directActionAuthMap: Record<string, string[]>) => {
                const filters = filterMakers.map(
                    ele => ele(action, userId, directActionAuthMap)
                ).filter(
                    ele => !!ele
                );
                if (filters.length > 1) {
                    return {
                        $or: filters,
                    };
                }
                else if (filters.length === 1) {
                    return filters[0];
                }

                // 说明找不到对应的定义，此操作没有可能的相应权限
                throw new OakNoRelationDefException(entity, action);
            };

            const createCheckers: (<T extends keyof ED>(
                userId: string,
                directActionAuth: Record<string, string[]>,
                data?: ED[T]['CreateSingle']['data'],
                filter?: ED[T]['Selection']['filter']
            ) => <Cxt extends AsyncContext<ED> | SyncContext<ED>>(context: Cxt) => boolean | Promise<boolean>)[] = pathGroup[entity]!.map(
                (ele) => {
                    const [e, p, r, ir] = ele;      // entity, path, root, isRelation
                    const daKey = `${e as string}-${p}-${r as string}`;

                    const paths = p.split('.');
                    if (!p) {
                        assert(ir);
                        // 直接关联在本对象上，所以应该是create时直接创建出对应的relation
                        return <T extends keyof ED>(
                            userId: string,
                            directActionAuth: Record<string, string[]>,
                            data?: ED[T]['CreateSingle']['data'],
                            filter?: ED[T]['Selection']['filter']
                        ) => {
                            if (data) {
                                const { id } = data;
                                return async (context: AsyncContext<ED> | SyncContext<ED>) => {
                                    const actionAuths = context.select('actionAuth', {
                                        data: {
                                            id: 1,
                                            relationId: 1,
                                            destEntity: 1,
                                            relation: {
                                                id: 1,
                                                name: 1,
                                            },
                                        },
                                        filter: {
                                            path: '',
                                            deActions: {
                                                $contains: 'create',
                                            },
                                            relation: {
                                                entity: e as string,
                                            },
                                        },
                                    }, {});

                                    const assignPossibleRelation = (aas: ED['actionAuth']['Schema'][]) => {
                                        if (aas.length > 0) {
                                            assert(aas.length === 1, `在${e as string}上的自身关系上定义了超过一种create的权限，「${aas.map(ele => ele.relation!.name).join(',')}」`);
                                            const { relationId } = aas[0];
                                            Object.assign(data, {
                                                userRelation$entity: {
                                                    action: 'create',
                                                    data: {
                                                        entity: e as string,
                                                        entityId: id,
                                                        relationId,
                                                        userId,
                                                    }
                                                }
                                            });
                                            return true;
                                        }
                                        return false;
                                    };

                                    if (actionAuths instanceof Promise) {
                                        return actionAuths.then(
                                            (aas) => assignPossibleRelation(aas as ED['actionAuth']['Schema'][])
                                        );
                                    }
                                    return assignPossibleRelation(actionAuths as ED['actionAuth']['Schema'][]);
                                };
                            }

                            return () => true;
                        };
                    }
                    if (paths.length === 1 && !ir) {
                        // 同样是直接关联在本对象上，在create的时候直接赋予userId
                        const rel = judgeRelation(this.schema, e, paths[0]);
                        return <T extends keyof ED>(
                            userId: string,
                            directActionAuth: Record<string, string[]>,
                            data?: ED[T]['CreateSingle']['data'],
                            filter?: ED[T]['Selection']['filter']
                        ) => {
                            if (data) {
                                if (rel === 2) {
                                    Object.assign(data, {
                                        entity: 'user',
                                        entityId: userId,
                                    });
                                }
                                else {
                                    assert(typeof rel === 'string');
                                    Object.assign(data, {
                                        [`${paths[0]}Id`]: userId,
                                    })
                                }
                            }
                            return () => true;
                        };
                    }

                    const translateFilterToSelect = (
                        e2: keyof ED,
                        filter: NonNullable<ED[keyof ED]['Selection']['filter']>,
                        idx: number,
                        userId: string,
                        directActionAuthMap: Record<string, string[]>
                    ): {
                        entity: keyof ED;
                        filter: ED[keyof ED]['Selection']['filter'];
                        relationalFilter: ED[keyof ED]['Selection']['filter'];
                    } | undefined => {
                        if (idx === paths.length - 1) {
                            /**
                             * 如果path是a.b.c，而filter是
                             * { a: { b: { c: {...} }}}
                             * 则最多只能解构成对b上的查询(makeIter只能到b)
                             */
                            const relationalFilter = makeIter(paths, ir, daKey, e, p, r, e2, idx)('create', userId, directActionAuthMap);
                            return {
                                entity: e2,
                                filter,
                                relationalFilter,
                            };
                        }
                        const attr = paths[idx];
                        const rel = judgeRelation(this.schema, e2, attr);
                        assert(rel === 2 || typeof rel === 'string');
                        if (filter[attr]) {
                            assert(typeof filter[attr] === 'object');
                            return translateFilterToSelect(rel === 2 ? attr : rel, filter[attr]!, idx + 1, userId, directActionAuthMap);
                        }
                        else if (rel === 2) {
                            if (filter.entity === attr && filter.entityId) {
                                return {
                                    entity: attr,
                                    filter: {
                                        id: filter.entityId,
                                    },
                                    relationalFilter: makeIter(paths, ir, daKey, e, p, r, attr, idx + 1)('create', userId, directActionAuthMap),
                                };
                            }
                        }
                        else {
                            if (filter[`${attr}Id`]) {
                                return {
                                    entity: rel,
                                    filter: {
                                        id: filter[`${attr}Id`],
                                    },
                                    relationalFilter: makeIter(paths, ir, daKey, e, p, r, rel, idx + 1)('create', userId, directActionAuthMap),
                                };
                            }
                        }
                        return;     // 说明不可能从filter来界定了
                    };

                    // 其它情况都是检查其data或者filter中的外键指向是否满足relation约束关系
                    return <T extends keyof ED>(
                        userId: string,
                        directActionAuthMap: Record<string, string[]>,
                        data?: ED[T]['CreateSingle']['data'],
                        filter?: ED[T]['Selection']['filter']
                    ) => {
                        if (!filter && !data) {
                            return () => false;
                        }
                        const result = translateFilterToSelect(e, (filter || data)!, 0, userId, directActionAuthMap);
                        if (!result) {
                            return () => false;
                        }
                        return (context) => {
                            const { entity, filter, relationalFilter } = result;
                            return checkFilterContains(entity, context, relationalFilter, filter);
                        };
                    };
                }
            );

            this.relationalCreateChecker[entity] = <T extends keyof ED>(
                userId: string,
                directActionAuthMap: Record<string, string[]>,
                data?: ED[T]['CreateSingle']['data'],
                filter?: ED[T]['Selection']['filter']
            ) => {
                const callbacks = createCheckers.map(
                    ele => ele(userId, directActionAuthMap, data, filter)
                );
                return (context) => {
                    const result = callbacks.map(
                        ele => ele(context)
                    );

                    // 回调中只要有一个通过就算过
                    if (context instanceof AsyncContext) {
                        return Promise.all(result).then(
                            (r) => {
                                if (r.includes(true)) {
                                    return;
                                }
                                throw new OakUserUnpermittedException();
                            }
                        );
                    }
                    if (result.includes(true)) {
                        return;
                    }
                    throw new OakUserUnpermittedException();
                };
            }
        }
    }

    constructor(actionCascadePathGraph: AuthCascadePath<ED>[], relationCascadePathGraph: AuthCascadePath<ED>[], schema: StorageSchema<ED>) {
        this.actionCascadePathGraph = actionCascadePathGraph;
        this.relationCascadePathGraph = relationCascadePathGraph;
        this.schema = schema;
        this.relationalFilterMaker = {};
        this.relationalCreateChecker = {};
        this.constructFilterMaker();
    }

    private makeDirectionActionAuthMap(directActionAuths: ED['directActionAuth']['OpSchema'][]) {
        const directActionAuthMap: Record<string, string[]> = {};
        for (const auth of directActionAuths) {
            const { deActions, destEntity, rootEntity, path } = auth;
            const k = `$${destEntity}-${path}-${rootEntity}`;
            directActionAuthMap[k] = deActions;
        }
        return directActionAuthMap;
    }

    setDirectionActionAuths(directActionAuths: ED['directActionAuth']['OpSchema'][]) {
        this.directActionAuthMap = this.makeDirectionActionAuthMap(directActionAuths);
    }

    setFreeActionAuths(freeActionAuths: ED['freeActionAuth']['OpSchema'][]) {
        const freeActionAuthMap: Record<string, string[]> = {};
        for (const auth of freeActionAuths) {
            const { deActions, destEntity } = auth;
            freeActionAuthMap[destEntity] = deActions;
        }
        this.freeActionAuthMap = freeActionAuthMap;
    }

    private upsertFreeActionAuth(entity: string, actions: string[]) {
        this.freeActionAuthMap![entity] = actions;
    }

    private upsertDirectActionAuth(directActionAuth: ED['directActionAuth']['OpSchema']) {
        const { deActions, destEntity, rootEntity, path } = directActionAuth;
        const k = `$${destEntity}-${path}-${rootEntity}`;
        this.directActionAuthMap[k] = deActions;
    }
    
    private removeDirectActionAuth(directActionAuth: ED['directActionAuth']['OpSchema']) {
        const { deActions, destEntity, rootEntity, path } = directActionAuth;
        const k = `$${destEntity}-${path}-${rootEntity}`;
        delete this.directActionAuthMap[k];
    }

    // 前台检查filter是否满足relation约束
    checkRelationSync<T extends keyof ED, Cxt extends SyncContext<ED>>(entity: T, operation: ED[T]['Operation'] | ED[T]['Selection'], context: Cxt) {
        if (context.isRoot()) {
            return;
        }
        const action = (operation as ED[T]['Operation']).action || 'select';

        // 前台在cache中查看有无freeActionAuth
        const [freeActionAuth] = context.select('freeActionAuth', {
            data: {
                id: 1,
            },
            filter: {
                destEntity: entity as string,
                deActions: {
                    $contains: action,
                },
            }
        }, {});
        if (freeActionAuth) {
            return;
        }

        // 前台在cache中取这个对象可能存在的directActionAuth，并构造ddaMap
        const directActionAuths = context.select('directActionAuth', {
            data: {
                id: 1,
                deActions: 1,
                destEntity: 1,
                path: 1,
            },
            filter: {
                destEntity: entity as string,
            }
        }, {});
        const ddaMap = this.makeDirectionActionAuthMap(directActionAuths as ED['directActionAuth']['OpSchema'][]);

        const userId = context.getCurrentUserId();
        if (!userId) {
            throw new OakNoRelationDefException<ED, T>(entity, action);
        }

        if (action === 'create' && this.relationalCreateChecker[entity]) {
            const { data, filter } = operation as ED[T]['Create'];
            if (filter) {
                // 如果create传了filter, 前台保证create一定满足此约束，优先判断
                const callback = this.relationalCreateChecker[entity]!(userId, ddaMap, undefined, filter);
                callback(context);

            }
            else if (data instanceof Array) {
                data.forEach(
                    (ele) => {
                        const callback = this.relationalCreateChecker[entity]!(userId, ddaMap, ele);
                        callback(context);
                    }
                );
            }
            else {
                assert(data);
                const callback = this.relationalCreateChecker[entity]!(userId, ddaMap, data);
                callback(context);
            }
        }
        else if (action !== 'create' && this.relationalFilterMaker[entity]) {
            const filter = this.relationalFilterMaker[entity]!(action, userId, ddaMap);
            const { filter: operationFilter } = operation;
            assert(filter, `在检查${entity as string}上执行${action}操作时没有传入filter`);
            if (checkFilterContains(entity, context, filter, operationFilter, true)) {
                return;
            }
            throw new OakUserUnpermittedException(`当前用户不允许在${entity as string}上执行${action}操作`);
        }
        throw new OakUnloggedInException();
    }

    // 后台检查filter是否满足relation约束
    async checkRelationAsync<T extends keyof ED, Cxt extends AsyncContext<ED>>(entity: T, operation: ED[T]['Operation'] | ED[T]['Selection'], context: Cxt) {
        if (context.isRoot()) {
            return;
        }
        const action = (operation as ED[T]['Operation']).action || 'select';

        // 后台用缓存的faa来判定，减少对数据库的查询（freeActionAuth表很少更新）
        if (!this.freeActionAuthMap || this.freeActionAuthMap[entity as string]?.includes(action)) {
            return;
        }

        const userId = context.getCurrentUserId();
        if (!userId) {
            throw new OakNoRelationDefException<ED, T>(entity, action);
        }

        // 后台用缓存的daa来判定，减少对数据库的查询（freeActionAuth表很少更新）
        if (action === 'create' && this.relationalCreateChecker[entity]) {
            const { data, filter } = operation as ED[T]['Create'];
            if (filter) {
                // 如果create传了filter, 前台保证create一定满足此约束，优先判断
                const callback = this.relationalCreateChecker[entity]!(userId, this.directActionAuthMap, undefined, filter);
                await callback(context);
            }
            else if (data instanceof Array) {
                await Promise.all(
                    data.map(
                        (ele) => {
                            const callback = this.relationalCreateChecker[entity]!(userId, this.directActionAuthMap, ele);
                            return callback(context);
                        }
                    )
                );
            }
            else {
                assert(data);
                const callback = this.relationalCreateChecker[entity]!(userId, this.directActionAuthMap, data);
                await callback(context);
            }
        }
        else if (action !== 'create' && this.relationalFilterMaker[entity]) {
            const filter = this.relationalFilterMaker[entity]!(action, userId, this.directActionAuthMap);
            const { filter: operationFilter } = operation;
            assert(filter, `在检查${entity as string}上执行${action}操作时没有传入filter`);
            if (await checkFilterContains(entity, context, filter, operationFilter, true)) {
                return;
            }
            throw new OakUserUnpermittedException(`当前用户不允许在${entity as string}上执行${action}操作`);
        }
        throw new OakUnloggedInException();
    }

    /**
     * 后台需要注册数据变化的监听器，以保证缓存的维度数据准确
     * 在集群上要支持跨结点的监听器(todo)
     */
    getAuthDataTriggers<Cxt extends AsyncContext<ED>>(): Trigger<ED, keyof ED, Cxt>[] {
        return [
            {
                entity: 'freeActionAuth',
                name: 'freeActionAuth新增时，更新relationAuth中的缓存数据',
                action: 'create',
                when: 'commit',
                fn: async ({ operation }) => {
                    const { data } = operation;
                    if (data instanceof Array) {
                        data.forEach(
                            ele => this.upsertFreeActionAuth(ele.destEntity!, ele.deActions!)
                        );
                        return data.length;
                    }
                    else {
                        this.upsertFreeActionAuth(data.destEntity!, data.deActions!);
                        return 1;
                    }
                }
            } as CreateTrigger<ED, 'freeActionAuth', Cxt>,
            {
                entity: 'freeActionAuth',
                action: 'update',
                when: 'commit',
                name: 'freeActionAuth更新时，刷新relationAuth中的缓存数据',
                fn: async({ operation }, context) => {
                    const { data, filter } = operation;
                    assert(typeof filter!.id === 'string');     //  freeAuthDict不应当有其它更新的情况
                    assert(!data.destEntity);
                    if (data.deActions) {
                        const faas = await context.select('freeActionAuth', {
                            data: {
                                id: 1,
                                deActions: 1,
                                destEntity: 1,
                            },
                            filter,
                        }, { dontCollect: true });
                        assert(faas.length === 1);
                        const { deActions, destEntity } = faas[0];
                        this.upsertFreeActionAuth(destEntity!, deActions!);
                        return 1;
                    }
                    return 0;
                }
            } as UpdateTrigger<ED, 'freeActionAuth', Cxt>,
            {
                entity: 'freeActionAuth',
                action: 'remove',
                when: 'commit',
                name: 'freeActionAuth删除时，刷新relationAuth中的缓存数据',
                fn: async({ operation }, context) => {
                    const { data, filter } = operation;
                    assert(typeof filter!.id === 'string');     //  freeActionAuth不应当有其它更新的情况
                    const faas = await context.select('freeActionAuth', {
                        data: {
                            id: 1,
                            deActions: 1,
                            destEntity: 1,
                        },
                        filter,
                    }, { dontCollect: true, includedDeleted: true });
                    assert(faas.length === 1);
                    const { destEntity } = faas[0];
                    if (this.freeActionAuthMap) {
                        delete this.freeActionAuthMap[destEntity!];
                    }

                    return 1;
                }
            } as RemoveTrigger<ED, 'freeActionAuth', Cxt>,
            {
                entity: 'directActionAuth',
                name: 'directActionAuth新增时，更新relationAuth中的缓存数据',
                action: 'create',
                when: 'commit',
                fn: async ({ operation }) => {
                    const { data } = operation;
                    if (data instanceof Array) {
                        data.forEach(
                            ele => this.upsertDirectActionAuth(ele as ED['directActionAuth']['OpSchema'])
                        );
                        return data.length;
                    }
                    else {
                        this.upsertDirectActionAuth(data as ED['directActionAuth']['OpSchema']);
                        return 1;
                    }
                }
            } as CreateTrigger<ED, 'directActionAuth', Cxt>,
            {
                entity: 'directActionAuth',
                action: 'update',
                when: 'commit',
                name: 'directActionAuth更新时，刷新relationAuth中的缓存数据',
                fn: async({ operation }, context) => {
                    const { data, filter } = operation;
                    assert(typeof filter!.id === 'string');     //  freeAuthDict不应当有其它更新的情况
                    assert(!data.destEntity && !data.rootEntity && !data.path);
                    if (data.deActions) {
                        const daas = await context.select('directActionAuth', {
                            data: {
                                id: 1,
                                deActions: 1,
                                destEntity: 1,
                                path: 1,
                                rootEntity: 1,
                            },
                            filter,
                        }, { dontCollect: true });
                        assert(daas.length === 1);
                        this.upsertDirectActionAuth(daas[0] as ED['directActionAuth']['OpSchema']);
                        return 1;
                    }
                    return 0;
                }
            } as UpdateTrigger<ED, 'directActionAuth', Cxt>,
            {
                entity: 'directActionAuth',
                action: 'remove',
                when: 'commit',
                name: 'directActionAuth删除时，刷新relationAuth中的缓存数据',
                fn: async({ operation }, context) => {
                    const { data, filter } = operation;
                    assert(typeof filter!.id === 'string');     //  directActionAuth不应当有其它更新的情况
                    const daas = await context.select('directActionAuth', {
                        data: {
                            id: 1,
                            deActions: 1,
                            destEntity: 1,
                            path: 1,
                            rootEntity: 1,
                        },
                        filter,
                    }, { dontCollect: true, includedDeleted: true });
                    assert(daas.length === 1);
                    this.removeDirectActionAuth(daas[0] as ED['directActionAuth']['OpSchema']);

                    return 1;
                }
            } as RemoveTrigger<ED, 'directActionAuth', Cxt>,
        ] as Trigger<ED, keyof ED, Cxt>[];
    }
}