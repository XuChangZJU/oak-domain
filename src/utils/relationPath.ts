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
    getData: (d: Partial<ED[T]['Schema']>) => ED['userRelation']['Schema'][];
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
                } as ED['userRelation']['Selection'],
            } as ED[keyof ED]['Selection']['data'],
            getData: (d: Partial<ED[keyof ED]['Schema']>) => {
                return d.userRelation$entity!;
            },
        };
    }
    const paths = path.split('.');

    const makeIter = (e: keyof ED, idx: number): {
        projection: ED[keyof ED]['Selection']['data'];
        getData: (d: Partial<ED[keyof ED]['Schema']>) => any;
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
                    } as ED['userRelation']['Selection']
                } as ED[keyof ED]['Selection']['data'],
                getData: (d: Partial<ED[keyof ED]['Schema']>) => {
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
                getData: (d) => d[attr] && d[attr]!.map((ele: any) => getData(ele)),
            }
        }
    };

    return makeIter(entity, 0);
}

/**
 * 根据entity的相对path，找到对应的根结点对象上的直接userId
 * @param schema 
 * @param entity 
 * @param path 
 * @param recursive 
 * @returns 
 */
export function destructDirectPath<ED extends EntityDict & BaseEntityDict, T extends keyof ED>(
    schema: StorageSchema<ED>,
    entity: T,
    path: string,
    recursive?: boolean
): {
    projection: ED[T]['Selection']['data'];
    getData: (d: Partial<ED[T]['Schema']>) => {
        entity: keyof ED,
        entityId: string,
        userId: string,
    }[];
} {
    assert(!recursive, '直接对象上不可能有recursive');
    assert(path, '直接对象的路径最终要指向user对象，不可能为空');

    const paths = path.split('.');

    const makeIter = (e: keyof ED, idx: number): {
        projection: ED[keyof ED]['Selection']['data'];
        getData: (d: Partial<ED[keyof ED]['Schema']>) => any;
    } => {
        const attr = paths[idx];
        const rel = judgeRelation(schema, e, attr);
        if (idx === paths.length - 1) {
            if (rel === 2) {
                assert(attr === 'user');
                return {
                    projection: {
                        id: 1,
                        entity: 1,
                        entityId: 1,
                    },
                    getData: (d) => {
                        if (d) {
                            return {
                                entity: e,
                                entityId: d.id,
                                userId: d.entityId,
                            };
                        }
                    },
                };
            }
            else {
                assert(rel === 'user');
                return {
                    projection: {
                        id: 1,
                        [`${attr}Id`]: 1,
                    },
                    getData: (d) => {
                        if (d) {
                            return {
                                entity: e,
                                entityId: d.id,
                                userId: d[`${attr}Id`]
                            }
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
                getData: (d) => d[attr] && d[attr]!.map((ele: any) => getData(ele)),
            }
        }
    };

    return makeIter(entity, 0);
}