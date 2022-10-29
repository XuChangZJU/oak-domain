import assert from 'assert';
import { getAttrRefInExpression, StorageSchema } from '../types';
import { EXPRESSION_PREFIX } from '../types/Demand';
import { DeduceFilter, EntityDict } from '../types/Entity';
import { getRelevantIds } from './filter';
import { judgeRelation } from './relation';

/**
 * 对selection进行一些完善，避免编程人员的疏漏
 * @param selection 
 */
export function reinforceSelection<ED extends EntityDict>(schema: StorageSchema<ED>, entity: keyof ED, selection: ED[keyof ED]['Selection']) {
    const { filter, data, sorter } = selection;

    const checkNode = (projectionNode: ED[keyof ED]['Selection']['data'], attrs: string[]) => {
        attrs.forEach(
            (attr) => {
                if (!projectionNode.hasOwnProperty(attr)) {
                    Object.assign(projectionNode, {
                        [attr]: 1,
                    });
                }
            }
        );
    };

    let relevantIds: string[] = [];
    if (filter) {
        const toBeAssignNode: Record<string, string[]> = {};        // 用来记录在表达式中涉及到的结点
        // filter当中所关联到的属性必须在projection中
        const filterNodeDict: Record<string, ED[keyof ED]['Selection']['data']> = {};
        const checkFilterNode = (entity2: keyof ED, filterNode: DeduceFilter<ED[keyof ED]['Schema']>, projectionNode: ED[keyof ED]['Selection']['data']) => {
            const necessaryAttrs: string[] = ['id'];
            for (const attr in filterNode) {
                if (attr === '#id') {
                    assert(!filterNodeDict[filterNode[attr]!], `projection中结点的id有重复, ${filterNode[attr]}`);
                    Object.assign(filterNodeDict, {
                        [filterNode[attr]!]: projectionNode,
                    });
                    if (toBeAssignNode[filterNode[attr]!]) {
                        checkNode(projectionNode, toBeAssignNode[filterNode[attr]!]);
                    }
                }
                else if (['$and', '$or'].includes(attr)) {
                    for (const node of filterNode[attr]!) {
                        checkFilterNode(entity2, node, projectionNode);
                    }
                }
                else if (attr === '$not') {
                    checkFilterNode(entity2, filterNode[attr]!, projectionNode);
                }
                else {
                    if (attr.toLowerCase().startsWith(EXPRESSION_PREFIX)) {
                        const exprResult = getAttrRefInExpression(filterNode[attr]!);
                        for (const nodeName in exprResult) {
                            if (nodeName === '#current') {
                                checkNode(projectionNode, exprResult[nodeName]);
                            }
                            else if (filterNodeDict[nodeName]) {
                                checkNode(filterNodeDict[nodeName], exprResult[nodeName]);
                            }
                            else {
                                if (toBeAssignNode[nodeName]) {
                                    toBeAssignNode[nodeName].push(...exprResult[nodeName]);
                                }
                                else {
                                    Object.assign(toBeAssignNode, {
                                        [nodeName]: exprResult[nodeName],
                                    });
                                }
                            }
                        }
                    }
                    else {
                        const rel = judgeRelation(schema, entity2, attr);
                        if (rel === 1) {
                            necessaryAttrs.push(attr);
                        }
                        else if (rel === 2) {
                            // entity/entityId反指
                            necessaryAttrs.push('entity', 'entityId');
                            if (!projectionNode[attr]) {
                                Object.assign(projectionNode, {
                                    [attr]: {
                                        id: 1,
                                    }
                                });
                            }
                            checkFilterNode(attr, filterNode[attr]!, projectionNode[attr]);
                        }
                        else if (typeof rel === 'string') {
                            necessaryAttrs.push(`${attr}Id`);
                            if (!projectionNode[attr]) {
                                Object.assign(projectionNode, {
                                    [attr]: {
                                        id: 1,
                                    }
                                });
                            }
                            checkFilterNode(rel, filterNode[attr]!, projectionNode[attr]);
                        }
                        else if (rel instanceof Array) {
                            // 现在filter中还不支持一对多的语义，先放着吧
                        }
                    }
                }
                checkNode(projectionNode, necessaryAttrs);
            }
        };

        checkFilterNode(entity, filter, data);
        relevantIds = getRelevantIds(filter);
    }

    // sorter感觉现在取不取影响不大，前端的list直接获取返回的ids了，先不管之
    if (sorter) {
    }

    const toBeAssignNode2: Record<string, string[]> = {};        // 用来记录在表达式中涉及到的结点
    const projectionNodeDict: Record<string, ED[keyof ED]['Selection']['data']> = {};
    const checkProjectionNode = (entity2: keyof ED, projectionNode: ED[keyof ED]['Selection']['data']) => {
        const necessaryAttrs: string[] = ['id'];
        for (const attr in projectionNode) {
            if (attr === '#id') {
                assert(!projectionNodeDict[projectionNode[attr]!], `projection中结点的id有重复, ${projectionNode[attr]}`);
                Object.assign(projectionNodeDict, {
                    [projectionNode[attr]!]: projectionNode,
                });
                if (toBeAssignNode2[projectionNode[attr]!]) {
                    checkNode(projectionNode, toBeAssignNode2[projectionNode[attr]!]);
                }
            }
            else {
                if (attr.toLowerCase().startsWith(EXPRESSION_PREFIX)) {
                    const exprResult = getAttrRefInExpression(projectionNode[attr]!);
                    for (const nodeName in exprResult) {
                        if (nodeName === '#current') {
                            checkNode(projectionNode, exprResult[nodeName]);
                        }
                        else if (projectionNodeDict[nodeName]) {
                            checkNode(projectionNodeDict[nodeName], exprResult[nodeName]);
                        }
                        else {
                            if (toBeAssignNode2[nodeName]) {
                                toBeAssignNode2[nodeName].push(...exprResult[nodeName]);
                            }
                            else {
                                Object.assign(toBeAssignNode2, {
                                    [nodeName]: exprResult[nodeName],
                                });
                            }
                        }
                    }
                }
                else {
                    const rel = judgeRelation(schema, entity2, attr);
                    if (rel === 1) {
                        necessaryAttrs.push(attr);
                    }
                    else if (rel === 2) {
                        // entity/entityId反指
                        necessaryAttrs.push('entity', 'entityId');
                        checkProjectionNode(attr, projectionNode[attr]);
                    }
                    else if (typeof rel === 'string') {
                        necessaryAttrs.push(`${attr}Id`);
                        checkProjectionNode(rel, projectionNode[attr]);
                    }
                    else if (rel instanceof Array) {
                        const { data } = projectionNode[attr];
                        if (rel[1]) {
                            checkNode(data, [rel[1]]);
                        }
                        else {
                            checkNode(data, ['entity', 'entityId']);
                        }
                        checkProjectionNode(rel[0], data);
                    }
                }
            }
            checkNode(projectionNode, necessaryAttrs);
        }

        // 如果对象中指向一对多的Modi，此时加上指向Modi的projection
        if (schema[entity2].toModi) {
            Object.assign(projectionNode, {
                modi$entity: {
                    $entity: 'modi',
                    data: {
                        id: 1,
                        targetEntity: 1,
                        entity: 1,
                        entityId: 1,
                        action: 1,
                        iState: 1,
                        data: 1,
                        filter: 1,
                    },
                    filter: {
                        iState: 'active',
                    },
                }
            });
        }
    };
    checkProjectionNode(entity, data);

    if (!sorter && relevantIds.length === 0) {
        // 如果没有sorter，就给予一个按createAt逆序的sorter
        Object.assign(selection, {
            sorter: [
                {
                    $attr: {
                        $$createAt$$: 1,
                    },
                    $direction: 'desc',
                }
            ]
        });
    }
}