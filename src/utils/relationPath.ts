import assert from 'assert';
import { StorageSchema } from '../types/Storage';
import { EntityDict as BaseEntityDict } from "../base-app-domain";
import { EntityDict } from "../types/Entity";
import { judgeRelation } from '../store/relation';

/**
 * 根据entity的相对path，以及定义的userRelationFilter，找到根结点对象上相应的userRelations
 * @param schema 
 * @param entity 
 * @param path 
 * @param relationFilter 
 * @param recursive 
 */
export function destructRelationPath<ED extends EntityDict & BaseEntityDict, T extends keyof ED>(
    schema: StorageSchema<ED>,
    entity: T,
    path: string,
    relationFilter: ED['userRelation']['Selection']['filter'],
    recursive?: boolean
): {
    projection: ED[T]['Selection']['data'];
    getData: (d: Partial<ED[T]['Schema']>) => ED['userRelation']['Schema'][] | undefined;
} {
    assert(!recursive, 'recursive的情况还没处理，等跑出来再说， by Xc');
    if (path === '') {
        return {
            projection: {
                id: 1,
                userRelation$entity: {
                    $entity: 'userRelation',
                    data: {
                        id: 1,
                        relationId: 1,
                        relation: {
                            id: 1,
                            name: 1,
                        },
                        entity: 1,
                        entityId: 1,
                        userId: 1,
                    },
                    filter: relationFilter,
                },
            } as ED[keyof ED]['Selection']['data'],
            getData: (d) => {
                return d.userRelation$entity!;
            },
        };
    }
    const paths = path.split('.');

    const makeIter = (e: keyof ED, idx: number): {
        projection: ED[keyof ED]['Selection']['data'];
        getData: (d: Partial<ED[keyof ED]['Schema']>) => ED['userRelation']['Schema'][] | undefined;
    } => {
        if (idx === paths.length) {
            return {
                projection: {
                    id: 1,
                    userRelation$entity: {
                        $entity: 'userRelation',
                        data: {
                            id: 1,
                            relationId: 1,
                            relation: {
                                id: 1,
                                name: 1,
                            },
                            entity: 1,
                            entityId: 1,
                            userId: 1,
                        },
                        filter: relationFilter,
                    } // as ED['userRelation']['Selection']
                }, // as ED[keyof ED]['Selection']['data'],
                getData: (d) => {
                    return d.userRelation$entity;
                },
            };
        }
        const attr = paths[idx];
        const rel = judgeRelation(schema, e, attr);
        if (rel === 2) {
            const { projection, getData } = makeIter(attr, idx + 1);
            return {
                projection: {
                    id: 1,
                    [attr]: projection,
                },
                getData: (d) => d[attr] && getData(d[attr]!),
            };
        }
        else if (typeof rel === 'string') {
            const { projection, getData } = makeIter(rel, idx + 1);
            return {
                projection: {
                    id: 1,
                    [attr]: projection,
                },
                getData: (d) => d[attr] && getData(d[attr]!),
            };
        }
        else {
            assert(rel instanceof Array);
            const [e2] = rel;
            const { projection, getData } = makeIter(e2, idx + 1);
            return {
                projection: {
                    id: 1,
                    [attr]: {
                        $entity: e2,
                        data: projection,
                    },
                },
                getData: (d) => d[attr] && (d[attr]! as Partial<ED[keyof ED]['Schema']>[]).map(ele => getData(ele)).flat().filter(ele => !!ele) as ED['userRelation']['Schema'][] ,
            }
        }
    };

    return makeIter(entity, 0);
}

/**
 * 根据entity的相对path，找到其根结点以及相应的user对象
 * @param schema 
 * @param entity 
 * @param path path的最后一项一定指向user。'aa.bb.cc.dd.user'
 * @returns 
 */
export function destructDirectUserPath<ED extends EntityDict & BaseEntityDict, T extends keyof ED>(
    schema: StorageSchema<ED>,
    entity: T,
    path: string): {
        projection: ED[T]['Selection']['data'];
        getData: (d: Partial<ED[T]['Schema']>) => {
            entity: keyof ED,
            entityId: string,
            userId: string,
        }[] | undefined;
    } {
    const paths = path.split('.');
    const last = paths.pop();
    const path2 = paths.join('.');
    const { projection, getData } = destructDirectPath<ED, T>(schema, entity, path);
    return {
        projection,
        getData: (d) => {
            const userInfo = getData(d, path2);
            return userInfo?.map(
                ({ entity, data }) => ({
                    entity,
                    entityId: data.id!,
                    userId: (data[`${last}Id`] || data.entityId) as string
                })
            );
        }
    }
}
/**
 * 根据entity的相对path，找到对应的根结点对象数据行
 * @param schema 
 * @param entity 
 * @param path 
 * @returns 
 */
export function destructDirectPath<ED extends EntityDict & BaseEntityDict, T extends keyof ED>(
    schema: StorageSchema<ED>,
    entity: T,
    path: string
): {
    projection: ED[T]['Selection']['data'];
    getData: (d: Partial<ED[keyof ED]['Schema']>, path2?: string) => {
        entity: keyof ED;
        data: Partial<ED[keyof ED]['Schema']>;
    }[] | undefined;
} {
    assert(path, '直接对象的路径最终要指向user对象，不可能为空');

    const paths = path.split('.');

    const makeIter = (e: keyof ED, idx: number): {
        projection: ED[keyof ED]['Selection']['data'];
        getData: (d: Partial<ED[keyof ED]['Schema']>, path2?: string) => {
            entity: keyof ED;
            data: Partial<ED[keyof ED]['Schema']>;
        }[] | undefined;
    } => {
        const attr = paths[idx];
        const rel = judgeRelation(schema, e, attr);
        if (idx === paths.length - 1) {
            if (rel === 2) {
                return {
                    projection: {
                        id: 1,
                        entity: 1,
                        entityId: 1,
                    },
                    getData: (d, p) => {
                        if (d) {
                            if (!p) {
                                return [{
                                    entity: e,
                                    data: d,
                                }];
                            }
                            assert(p === attr);
                            return [{
                                entity: attr,
                                data: {
                                    id: d.entityId as string,
                                } as Partial<ED[keyof ED]['Schema']>,
                            }];
                        }
                    },
                };
            }
            else {
                return {
                    projection: {
                        id: 1,
                        [`${attr}Id`]: 1,
                    },
                    getData: (d, p) => {
                        if (d) {
                            if (!p) {
                                return [{
                                    entity: e,
                                    data: d,
                                }];
                            }
                            assert(p === attr);
                            return [{
                                entity: rel as keyof ED,
                                data: {
                                    id: d[`${attr}Id`] as string,
                                } as Partial<ED[keyof ED]['Schema']>,
                            }]
                        }
                    },
                };
            }
        }
        if (rel === 2) {
            const { projection, getData } = makeIter(attr, idx + 1);
            return {
                projection: {
                    id: 1,
                    [attr]: projection,
                },
                getData: (d, p) => {
                    if (d) {
                        if (!p) {
                            return [{
                                entity: e,
                                data: d,
                            }];
                        }
                        const ps = p.split('.');
                        assert(ps[0] === attr);
                        return d[attr] && getData(d[attr]!, ps.slice(1).join('.'));
                    }
                },
            };
        }
        else if (typeof rel === 'string') {
            const { projection, getData } = makeIter(rel, idx + 1);
            return {
                projection: {
                    id: 1,
                    [attr]: projection,
                },
                getData: (d, p) => {
                    if (d) {
                        if (!p) {
                            return [{
                                entity: e,
                                data: d,
                            }];
                        }
                        const ps = p.split('.');
                        assert(ps[0] === attr);
                        return d[attr] && getData(d[attr]!, ps.slice(1).join('.'));
                    }
                },
            };
        }
        else {
            assert(rel instanceof Array);
            const [e2, fk] = rel;
            const { projection, getData } = makeIter(e2, idx + 1);
            return {
                projection: {
                    id: 1,
                    [attr]: {
                        $entity: e2,
                        data: projection,
                    },
                },
                getData: (d, p) => {
                    if (!p) {
                        return [{
                            entity: e,
                            data: d,
                        }];
                    }
                    const ps = p.split('.');
                    assert(ps[0] === attr);
                    return d[attr] && (d[attr]! as Partial<ED[keyof ED]['Schema']>[]).map(ele => getData(ele, ps.slice(1).join('.'))).flat().filter(ele => !!ele) as {
                        entity: keyof ED;
                        data: Partial<ED[keyof ED]['Schema']>;
                    }[];
                }
            }
        }
    };

    return makeIter(entity, 0);
}