"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.destructDirectPath = exports.destructRelationPath = void 0;
const tslib_1 = require("tslib");
const assert_1 = tslib_1.__importDefault(require("assert"));
const relation_1 = require("../store/relation");
/**
 * 根据entity的相对path，以及定义的userRelationFilter，找到根结点对象上相应的userRelations
 * @param schema
 * @param entity
 * @param path
 * @param relationFilter
 * @param recursive
 */
function destructRelationPath(schema, entity, path, relationFilter, recursive) {
    (0, assert_1.default)(!recursive, 'recursive的情况还没处理，等跑出来再说， by Xc');
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
            },
            getData: (d) => {
                return d.userRelation$entity;
            },
        };
    }
    const paths = path.split('.');
    const makeIter = (e, idx) => {
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
        const rel = (0, relation_1.judgeRelation)(schema, e, attr);
        if (rel === 2) {
            const { projection, getData } = makeIter(attr, idx + 1);
            return {
                projection: {
                    id: 1,
                    [attr]: projection,
                },
                getData: (d) => d[attr] && getData(d[attr]),
            };
        }
        else if (typeof rel === 'string') {
            const { projection, getData } = makeIter(rel, idx + 1);
            return {
                projection: {
                    id: 1,
                    [attr]: projection,
                },
                getData: (d) => d[attr] && getData(d[attr]),
            };
        }
        else {
            (0, assert_1.default)(rel instanceof Array);
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
                getData: (d) => d[attr] && d[attr].map(ele => getData(ele)).flat().filter(ele => !!ele),
            };
        }
    };
    return makeIter(entity, 0);
}
exports.destructRelationPath = destructRelationPath;
/**
 * 根据entity的相对path，找到对应的根结点对象上的直接userId
 * @param schema
 * @param entity
 * @param path
 * @param recursive
 * @returns
 */
function destructDirectPath(schema, entity, path, recursive) {
    (0, assert_1.default)(!recursive, '直接对象上不可能有recursive');
    (0, assert_1.default)(path, '直接对象的路径最终要指向user对象，不可能为空');
    const paths = path.split('.');
    const makeIter = (e, idx) => {
        const attr = paths[idx];
        const rel = (0, relation_1.judgeRelation)(schema, e, attr);
        if (idx === paths.length - 1) {
            if (rel === 2) {
                (0, assert_1.default)(attr === 'user');
                return {
                    projection: {
                        id: 1,
                        entity: 1,
                        entityId: 1,
                    },
                    getData: (d) => {
                        if (d) {
                            return [{
                                    entity: e,
                                    entityId: d.id,
                                    userId: d.entityId,
                                }];
                        }
                    },
                };
            }
            else {
                (0, assert_1.default)(rel === 'user');
                return {
                    projection: {
                        id: 1,
                        [`${attr}Id`]: 1,
                    },
                    getData: (d) => {
                        if (d) {
                            return [{
                                    entity: e,
                                    entityId: d.id,
                                    userId: d[`${attr}Id`],
                                }];
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
                getData: (d) => d[attr] && getData(d[attr]),
            };
        }
        else if (typeof rel === 'string') {
            const { projection, getData } = makeIter(rel, idx + 1);
            return {
                projection: {
                    id: 1,
                    [attr]: projection,
                },
                getData: (d) => d[attr] && getData(d[attr]),
            };
        }
        else {
            (0, assert_1.default)(rel instanceof Array);
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
                getData: (d) => d[attr] && d[attr].map(ele => getData(ele)).flat().filter(ele => !!ele),
            };
        }
    };
    return makeIter(entity, 0);
}
exports.destructDirectPath = destructDirectPath;
