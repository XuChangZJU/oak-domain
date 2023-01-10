import assert from 'assert';
import { EXPRESSION_PREFIX, OakRowInconsistencyException, StorageSchema } from '../types';
import { EntityDict } from "../types/Entity";
import { difference, intersection, union } from '../utils/lodash';
import { AsyncContext } from './AsyncRowStore';
import { judgeRelation } from './relation';
import { SyncContext } from './SyncRowStore';
export function addFilterSegment<ED extends EntityDict, T extends keyof ED>(...filters: ED[T]['Selection']['filter'][]) {
    const filter: ED[T]['Selection']['filter'] = {};
    filters.forEach(
        ele => {
            if (ele) {
                for (const k in ele) {
                    if (k === '$and') {
                        if (filter.$and) {
                            filter.$and.push(...(ele[k] as any));
                        }
                        else {
                            filter.$and = ele[k];
                        }
                    }
                    else if (k === '$or') {
                        if (filter.$or) {
                            filter.$or.push(...(ele[k] as any));
                        }
                        else {
                            filter.$or = ele[k];
                        }
                    }
                    else if (filter.hasOwnProperty(k)) {
                        if (filter.$and) {
                            filter.$and.push({
                                [k]: ele[k],
                            })
                        }
                        else {
                            filter.$and = [
                                {
                                    [k]: ele[k],
                                }
                            ]
                        }
                    }
                    else {
                        filter[k] = ele[k];
                    }
                }
            }
        }
    );

    return filter;
}

export function unionFilterSegment<ED extends EntityDict, T extends keyof ED>(...filters: ED[T]['Selection']['filter'][]) {
    let allOnlyOneOr = true;
    for (const f of filters) {
        if (Object.keys(f!).length > 1 || !f!.$or) {
            allOnlyOneOr = false;
            break;
        }
    }
    if (allOnlyOneOr) {
        // 优化特殊情况，全部都是$or，直接合并
        const ors = filters.map(
            ele => ele!.$or
        );
        return {
            $or: ors.reduce((prev, next) => prev!.concat(next!), [])
        } as ED[T]['Selection']['filter'];
    }

    return {
        $or: filters,
    } as ED[T]['Selection']['filter'];
}

export function combineFilters<ED extends EntityDict, T extends keyof ED>(filters: Array<ED[T]['Selection']['filter']>, union?: true) {
    if (union) {
        return unionFilterSegment(...filters);
    }
    return addFilterSegment(...filters);
}

/**
 * 判断value1表达的单个属性查询与同属性上value2表达的查询是包容还是相斥
 * 相容即value1所表达的查询结果一定被value2表达的查询结果所包含，例如：
 * value1: {
 *  $eq: 12
 * }
 * value2: {
 *  $gt: 8,
 * }
 * 此时value1相容value2
 * 
 * 相斥即value1所表达的查询结果与value2一定毫无联系，例如：
 * value1: {
 *  $gt: 8,
 * }
 * value2: {
 *  $lt: 2,
 * }
 * 
 * 
 * @param value1 
 * @param value2 
 * @attention: 1)这里的测试不够充分，有些算子之间的相容或相斥可能有遗漏, 2)有新的算子加入需要修改代码
 */
export function judgeValueRelation(value1: any, value2: any, contained: boolean): boolean {
    if (typeof value1 === 'object') {
        const attr = Object.keys(value1)[0];
        if (['$gt', '$lt', '$gte', '$lte', '$eq', '$ne', '$startsWith', '$endsWith', '$includes'].includes(attr)) {
            switch (attr) {
                case '$gt': {
                    if (contained) {
                        // 包容
                        if (typeof value2 === 'object') {
                            const attr2 = Object.keys(value2)[0];
                            return ['$gt', '$gte'].includes(attr2) && value2[attr2] <= value1.$gt;
                        }
                        return false;
                    }
                    // 互斥
                    if (typeof value2 === 'object') {
                        const attr2 = Object.keys(value2)[0];
                        return ['$lt', '$lte', '$eq'].includes(attr2) && value2[attr2] <= value1.$gt
                            || attr2 === '$in' && value2[attr2] instanceof Array && !((value2[attr2]).find(
                                (ele: any) => typeof ele !== typeof value1.$gt || ele > value1.$gt
                            ));
                    }
                    return value2 <= value1.$gt;
                }
                case '$gte': {
                    if (contained) {
                        // 包容
                        if (typeof value2 === 'object') {
                            const attr2 = Object.keys(value2)[0];
                            return ['$gte'].includes(attr2) && value2[attr2] <= value1.$gte
                                || ['$gt'].includes(attr2) && value2[attr2] < value1.$gte;
                        }
                        return false;
                    }
                    // 互斥
                    if (typeof value2 === 'object') {
                        const attr2 = Object.keys(value2)[0];
                        return ['$lt'].includes(attr2) && value2[attr2] <= value1.$gte
                            || ['$eq', '$lte'].includes(attr2) && value2[attr2] < value1.gte
                            || attr2 === '$in' && value2[attr2] instanceof Array && !((value2[attr2]).find(
                                (ele: any) => typeof ele !== typeof value1.$gte || ele >= value1.$gte
                            ));
                    }
                    return value2 < value1.$gte;
                }
                case '$lt': {
                    if (contained) {
                        // 相容
                        if (typeof value2 === 'object') {
                            const attr2 = Object.keys(value2)[0];
                            return ['$lt', '$lte'].includes(attr2) && value2[attr2] >= value1.$lt;
                        }
                        return false;
                    }
                    // 互斥
                    if (typeof value2 === 'object') {
                        const attr2 = Object.keys(value2)[0];
                        return ['$gt', '$gte', '$eq'].includes(attr2) && value2[attr2] >= value1.$lt
                            || attr2 === '$in' && value2[attr2] instanceof Array && !((value2[attr2]).find(
                                (ele: any) => typeof ele !== typeof value1.$gt || ele < value1.$lt
                            ));
                    }
                    return value2 >= value1.$gt;
                }
                case '$lte': {
                    if (contained) {
                        // 包容
                        if (typeof value2 === 'object') {
                            const attr2 = Object.keys(value2)[0];
                            return ['$lte'].includes(attr2) && value2[attr2] >= value1.$lte
                                || ['$lt'].includes(attr2) && value2[attr2] > value1.$lte;
                        }
                        return false;
                    }
                    // 互斥
                    if (typeof value2 === 'object') {
                        const attr2 = Object.keys(value2)[0];
                        return ['$gt'].includes(attr2) && value2[attr2] >= value1.$lte
                            || ['$eq', '$gte'].includes(attr2) && value2[attr2] > value1.lte
                            || attr2 === '$in' && value2[attr2] instanceof Array && !((value2[attr2]).find(
                                (ele: any) => typeof ele !== typeof value1.$lte || ele <= value1.$lte
                            ));
                    }
                    return value2 > value1.$gte;
                }
                case '$eq': {
                    if (contained) {
                        // 相容
                        if (typeof value2 === 'object') {
                            const attr2 = Object.keys(value2)[0];
                            return attr2 === '$eq' && value2[attr2] === value1.$eq || attr2 === '$ne' && value2[attr2] !== value1.$eq
                                || attr2 === '$gt' && value2[attr2] < value1.$eq || attr2 === '$lt' && value2[attr2] > value1.$eq
                                || attr2 === '$gte' && value2[attr2] <= value1.$eq || attr2 === '$lte' && value2[attr2] >= value1.$eq
                                || attr2 === '$startsWith' && value1.$eq.startsWith(value2[attr2])
                                || attr2 === '$endsWith' && value1.$eq.endsWith(value2[attr2])
                                || attr2 === '$includes' && value1.$eq.includes(value2[attr2])
                                || attr2 === '$in' && value2[attr2] instanceof Array && value2[attr2].includes(value1.$eq)
                                || attr2 === '$nin' && value2[attr2] instanceof Array && !value2[attr2].includes(value1.$eq)
                                || attr2 === '$between' && value2[attr2][0] <= value1.$eq && value2[attr2][1] >= value1.$eq
                                || attr2 === '$exists' && value2[attr2] === true;

                        }
                        return value2 === value1.$eq;
                    }
                    // 互斥
                    if (typeof value2 === 'object') {
                        const attr2 = Object.keys(value2)[0];
                        return attr2 === '$eq' && value2[attr2] !== value1.$eq || attr2 === '$gt' && value2[attr2] >= value1.$eq
                            || attr2 === '$lt' && value2[attr2] <= value1.$eq
                            || attr2 === '$gte' && value2[attr2] > value1.$eq || attr2 === '$lte' && value2[attr2] < value1.$eq
                            || attr2 === '$startsWith' && !value1.$eq.startsWith(value2[attr2])
                            || attr2 === '$endsWith' && !value1.$eq.endsWith(value2[attr2])
                            || attr2 === '$includes' && !value1.$eq.includes(value2[attr2])
                            || attr2 === '$in' && value2[attr2] instanceof Array && !value2[attr2].includes(value1.$eq)
                            || attr2 === '$between' && (value2[attr2][0] > value1.$eq || value2[attr2][1] < value1.$eq)
                            || attr2 === '$exists' && value2[attr2] === false;
                    }
                    return value2 !== value1.$eq;
                }
                case '$ne': {
                    if (contained) {
                        // 相容
                        if (typeof value2 === 'object') {
                            const attr2 = Object.keys(value2)[0];
                            return attr2 === '$ne' && value2[attr2] === value1.$ne;
                        }
                        return false;
                    }
                    // 互斥
                    if (typeof value2 === 'object') {
                        const attr2 = Object.keys(value2)[0];
                        return attr2 === '$eq' && value2[attr2] === value1.$ne;
                    }
                    return value2 === value1.$ne;
                }
                case '$startsWith': {
                    if (contained) {
                        // 相容
                        if (typeof value2 === 'object') {
                            const attr2 = Object.keys(value2)[0];
                            return attr2 === '$startsWith' && typeof (value2[attr2]) === 'string'
                                && value1.$startsWith.startsWith(value2[attr2]);
                        }
                        return typeof value2 === 'string' && value1.$startsWith.startsWith(value2);
                    }
                    // 互斥
                    if (typeof value2 === 'object') {
                        const attr2 = Object.keys(value2)[0];
                        return attr2 === '$startsWith' && typeof (value2[attr2]) === 'string'
                            && !value1.$startsWith.startsWith(value2[attr2]) && !value2[attr2].startsWith(value1.$startsWith)
                            || attr2 === '$eq' && !value2[attr2].startsWith(value1.$startsWith);
                    }
                    return !value2.startsWith(value1.$startsWith);
                }
                case '$endsWith': {
                    if (contained) {
                        // 相容
                        if (typeof value2 === 'object') {
                            const attr2 = Object.keys(value2)[0];
                            return attr2 === '$endsWith' && typeof (value2[attr2]) === 'string'
                                && value1.$startsWith.endsWith(value2[attr2]);
                        }
                        return typeof value2 === 'string' && value1.$startsWith.endsWith(value2);
                    }
                    // 互斥
                    if (typeof value2 === 'object') {
                        const attr2 = Object.keys(value2)[0];
                        return attr2 === '$startsWith' && typeof (value2[attr2]) === 'string'
                            && !value1.$startsWith.endsWith(value2[attr2]) && !value2[attr2].endsWith(value1.$startsWith)
                            || attr2 === '$eq' && !value2[attr2].endsWith(value1.$startsWith);
                    }
                    return !value2.endsWith(value1.$startsWith);
                }
                case '$includes': {
                    if (contained) {
                        // 相容
                        if (typeof value2 === 'object') {
                            const attr2 = Object.keys(value2)[0];
                            return ['$includes', '$startsWith', '$endsWith'].includes(attr2)
                                && typeof (value2[attr2]) === 'string'
                                && (value2[attr2]).includes(value1.$includes);
                        }
                        return typeof value2 === 'string' && value2.includes(value1.$includes as string);
                    }
                    // 互斥
                    if (typeof value2 === 'object') {
                        const attr2 = Object.keys(value2)[0];
                        return attr2 === '$eq' && !value2[attr2].includes(value1.$includes)
                            || attr2 === '$in' && value2[attr2] instanceof Array && !value2[attr2].find(
                                (ele: string) => ele.includes(value1.$includes)
                            );
                    }
                    return typeof value2 === 'string' && !value2.includes(value1.$includes);

                }
                default: {
                    assert(false, `不能处理的算子「${attr}」`);
                }
            }
        }
        else if (['$exists'].includes(attr)) {
            assert(attr === '$exists');
            if (contained) {
                if (typeof value2 === 'object') {
                    const attr2 = Object.keys(value2)[0];
                    return attr2 === '$exists' && value2[attr2] === value1.$exists;
                }
                return false;
            }
            return typeof value2 === 'object' && value2.$exists === !(value1.$exists);
        }
        else if (['$in', '$nin', '$between'].includes(attr)) {
            switch (attr) {
                case '$in': {
                    if (contained) {
                        // 相容
                        if (value1.$in instanceof Array) {
                            if (typeof value2 === 'object') {
                                const attr2 = Object.keys(value2)[0];
                                if (attr2 === '$in') {
                                    return value2[attr2] instanceof Array && difference(value1.$in, value2[attr2]).length === 0;
                                }
                                else if (attr2 === '$nin') {
                                    return value2[attr2] instanceof Array && intersection(value1.$in, value2[attr2]).length === 0;
                                }
                                else if (attr2 === '$exists') {
                                    return value2[attr2] === true;
                                }
                                else if (['$gt', '$gte', '$lt', '$lte', '$between'].includes(attr2)) {
                                    let min33: number, max33: number;
                                    value1.$in.forEach(
                                        (ele: number) => {
                                            if (!min33 || min33 > ele) {
                                                min33 = ele;
                                            }
                                            if (!max33 || max33 < ele) {
                                                max33 = ele;
                                            }
                                        }
                                    );
                                    return attr2 === '$gt' && value2[attr2] < min33! || attr2 === '$gte' && value2[attr2] <= min33!
                                        || attr2 === '$lt' && value2[attr2] > max33! || attr2 === '$lte' && value2[attr2] >= max33!
                                        || attr2 === '$between' && value2[attr2][0] < min33! && value2[attr2][1] > max33!;
                                }
                            }
                        }
                        return false;
                    }
                    // 相斥
                    if (value1.$in instanceof Array) {
                        if (typeof value2 === 'object') {
                            const attr2 = Object.keys(value2)[0];
                            if (attr2 === '$in') {
                                return intersection(value2[attr2], value1.$in).length === 0;
                            }
                            else if (attr2 === '$eq') {
                                return !value1.$in.includes(value2[attr2]);
                            }
                            else if (attr2 === '$exists') {
                                return value2[attr2] === false;
                            }
                            else if (['$gt', '$gte', '$lt', '$lte', '$between'].includes(attr2)) {
                                let min44: number, max44: number;
                                value1.$in.forEach(
                                    (ele: number) => {
                                        if (!min44 || min44 > ele) {
                                            min44 = ele;
                                        }
                                        if (!max44 || max44 < ele) {
                                            max44 = ele;
                                        }
                                    }
                                );

                                return attr2 === '$gt' && value2[attr2] >= max44! || attr2 === '$gte' && value2[attr2] > max44!
                                    || attr2 === '$lt' && value2[attr2] <= min44! || attr2 === '$lte' && value2[attr2] < min44!
                                    || attr2 === '$between' && (value2[attr2][0] > max44! || value2[attr2][1] < min44!);
                            }
                        }
                        return !value1.$in.includes(value2);
                    }
                    return false;
                }
                case '$nin': {
                    if (contained) {
                        // 相容
                        if (value1.$nin instanceof Array) {
                            if (typeof value2 === 'object') {
                                const attr2 = Object.keys(value2)[0];
                                if (attr2 === '$nin') {
                                    return value2[attr2] instanceof Array && intersection(value2[attr2], value1.$nin).length === 0;
                                }
                            }
                        }
                        return false;
                    }
                    // 相斥
                    if (value1.$nin instanceof Array) {
                        if (typeof value2 === 'object') {
                            const attr2 = Object.keys(value2)[0];
                            if (attr2 === '$in') {
                                return value2[attr2] instanceof Array && difference(value2[attr2], value1.$nin).length === 0;
                            }
                        }
                    }
                    return false;
                }
                case '$between': {
                    assert(value1.$between instanceof Array);
                    if (contained) {
                        // 相容
                        if (typeof value2 === 'object') {
                            const attr2 = Object.keys(value2)[0];
                            if (['$gt', '$gte', '$lt', '$lte', '$between', '$eq'].includes(attr2)) {
                                return attr2 === '$between' && value2[attr2][0] <= value1.$between[0] && value2[attr2][1] >= value1.$between[1]
                                    || attr2 === '$gt' && value2[attr2] < value1.$between[0] || attr2 === '$gte' && value2[attr2] <= value1.$between[0]
                                    || attr2 === '$lt' && value2[attr2] > value1.$between[1] || attr2 === '$lte' && value2[attr2] >= value1.$between[1];
                            }
                            else if (attr2 === '$exists') {
                                return value2[attr2] === true;
                            }
                        }
                        return false;
                    }
                    // 相斥
                    if (typeof value2 === 'object') {
                        const attr2 = Object.keys(value2)[0];
                        if (['$gt', '$gte', '$lt', '$lte', '$between', '$eq'].includes(attr2)) {
                            return attr2 === '$between' && (value2[attr2][0] > value1.$between[1] || value2[attr2][1] < value1.$between[0])
                                || attr2 === '$gt' && value2[attr2] > value1.$between[1] || attr2 === '$gte' && value2[attr2] >= value1.$between[1]
                                || attr2 === '$lt' && value2[attr2] < value1.$between[0] || attr2 === '$lte' && value2[attr2] <= value1.$between[0]
                                || attr2 === '$eq' && (value2[attr2] > value1.$between[1] || value2[attr2] < value1.$between[0]);
                        }
                        else if (attr2 === '$exists') {
                            return value2[attr2] === false;
                        }
                        else if (attr2 === '$in' && value2[attr2] instanceof Array) {
                            return !value2[attr2].find(
                                (ele: number) => ele >= value1.$between[0] && ele <= value1.$between[1]
                            );
                        }
                        return false;
                    }

                }
                default: {
                    assert(false, `暂不支持的算子${attr}`);
                }
            }
        }
        else {
            return false;
        }
    }
    else {
        // value1是一个等值查询
        if (contained) {
            // 相容
            if (typeof value2 === 'object') {
                const attr2 = Object.keys(value2)[0];
                return attr2 === '$eq' && value2[attr2] === value1 || attr2 === '$ne' && value2[attr2] !== value1
                    || attr2 === '$gt' && value2[attr2] < value1 || attr2 === '$lt' && value2[attr2] > value1
                    || attr2 === '$gte' && value2[attr2] <= value1 || attr2 === '$lte' && value2[attr2] >= value1
                    || attr2 === '$startsWith' && value1.startsWith(value2[attr2])
                    || attr2 === '$endsWith' && value1.endsWith(value2[attr2])
                    || attr2 === '$includes' && value1.includes(value2[attr2])
                    || attr2 === '$in' && value2[attr2] instanceof Array && value2[attr2].includes(value1)
                    || attr2 === '$nin' && value2[attr2] instanceof Array && !value2[attr2].includes(value1)
                    || attr2 === '$between' && value2[attr2][0] <= value1 && value2[attr2][1] >= value1
                    || attr2 === '$exists' && value2[attr2] === true;

            }
            return value2 === value1;
        }
        // 互斥
        if (typeof value2 === 'object') {
            const attr2 = Object.keys(value2)[0];
            return attr2 === '$eq' && value2[attr2] !== value1 || attr2 === '$gt' && value2[attr2] >= value1
                || attr2 === '$lt' && value2[attr2] <= value1
                || attr2 === '$gte' && value2[attr2] > value1 || attr2 === '$lte' && value2[attr2] < value1
                || attr2 === '$startsWith' && !value1.startsWith(value2[attr2])
                || attr2 === '$endsWith' && !value1.endsWith(value2[attr2])
                || attr2 === '$includes' && !value1.includes(value2[attr2])
                || attr2 === '$in' && value2[attr2] instanceof Array && !value2[attr2].includes(value1)
                || attr2 === '$between' && (value2[attr2][0] > value1 || value2[attr2][1] < value1)
                || attr2 === '$exists' && value2[attr2] === false;
        }
        return value2 !== value1;
    }
}

function judgeFilter2ValueRelation<ED extends EntityDict, T extends keyof ED>(
    entity: T,
    schema: StorageSchema<ED>,
    attr: keyof ED[T]['Schema'],
    filter: ED[T]['Selection']['filter'],
    conditionalFilterAttrValue: object,
    contained: boolean): boolean {
    for (const attr2 in filter) {
        if (['$and', '$or', '$not'].includes(attr2)) {
            switch (attr2) {
                case '$and':
                case '$or':
                case '$xor': {
                    const logicQueries = filter[attr2] as Array<ED[T]['Selection']['filter']>;
                    const results = logicQueries.map(
                        (logicQuery) => judgeFilter2ValueRelation(entity, schema, attr, logicQuery, conditionalFilterAttrValue, contained)
                    );
                    // 如果filter的多个算子是and关系，则只要有一个包含此条件就是包含，只要有一个与此条件相斥就是相斥
                    // 如果filter的多个算子是or关系，则必须所有的条件都包含此条件才是包含，必须所有的条件都与此条件相斥才是相斥
                    if (attr2 === '$and') {
                        if (results.includes(true)) {
                            return true;
                        }
                    }
                    else if (attr2 === '$or') {
                        if (!results.includes(false)) {
                            return true;
                        }
                    }
                    else {
                        assert(false);
                    }
                    break;
                }
                case '$not': {
                    /* 
                    * 若filter的not条件被conditionalFilterAttrValue包容，则说明两者互斥
                    * 若filter的not条件被conditionalFilterAttrValue的not条件所包容，则说明此条件包容conditionalFilterAttrValue
                    *   但两条规则都没法应用，会无限递归
                    */

                    const logicQuery = filter[attr2] as ED[T]['Selection']['filter'];
                    /* if (contained && judgeFilterRelation(entity, schema, {
                        [attr2]: {
                            $not: conditionalFilterAttrValue
                        }
                    }, logicQuery, contained)) {
                        return true;
                    } */                    
                    if (!contained && judgeFilterRelation(entity, schema, { [attr2]: conditionalFilterAttrValue }, logicQuery, contained)) {
                        return true;
                    }
                    break;
                }
                default: {
                    break;
                }
            }
        }
        else if (attr2.toLowerCase().startsWith(EXPRESSION_PREFIX)) {
            return false;
        }
        else if (attr2.toLowerCase() === '$text') {
            return false;
        }
        else {
            if (attr === attr2) {
                const rel = judgeRelation(schema, entity, attr2);
                if (rel === 1) {
                    return judgeValueRelation(filter[attr2], conditionalFilterAttrValue, contained);
                }
                else if (rel === 2) {
                    return judgeFilterRelation(attr2, schema, filter[attr2], conditionalFilterAttrValue, contained);
                }
                else if (typeof rel === 'string') {
                    return judgeFilterRelation(rel, schema, filter[attr2], conditionalFilterAttrValue, contained);
                }
                else {
                    assert(false);
                }
            }
        }
    }

    return false;
}
/**
 * @param entity 
 * @param schema 
 * @param filter 
 * @param conditionalFilter
 * @param contained: true代表filter包容conditionalFilter, false代表filter与conditionalFilter相斥
 */
function judgeFilterRelation<ED extends EntityDict, T extends keyof ED>(
    entity: T,
    schema: StorageSchema<ED>,
    filter: ED[T]['Selection']['filter'],
    conditionalFilter: ED[T]['Selection']['filter'],
    contained: boolean): boolean {
    for (let attr in conditionalFilter) {
        if (['$and', '$or', '$not'].includes(attr)) {
            switch (attr) {
                case '$and':
                case '$or': {
                    const logicQueries = conditionalFilter[attr] as Array<ED[T]['Selection']['filter']>;
                    const results = logicQueries.map(
                        (logicQuery) => judgeFilterRelation(entity, schema, filter, logicQuery, contained)
                    );
                    if (contained) {
                        // 如果是包容关系，则无论and还是or，conditionalFilter中的任何一个查询条件都应当被filter所包容
                        if (results.includes(false)) {
                            return false;
                        }
                    }
                    else if (!contained) {
                        // 如果是相斥关系，则无论and还是or，conditionalFilter中的任何一个查询条件都应当与filter所相斥
                        if (!results.includes(true)) {
                            return false;
                        }
                    }
                    else {
                        assert(false);
                    }
                    break;
                }
                case '$not': {
                    /**
                     * 若filter与not所定义的filter相斥，则filter与conditionalFilter相容
                     * 若filter与not所定义的filter相容，则filter与conditionalFilter相斥
                     */
                    const logicQuery = conditionalFilter[attr] as ED[T]['Selection']['filter'];
                    if (judgeFilterRelation(entity, schema, filter, logicQuery, !contained)) {
                        return true;
                    }
                    break;
                }
                default: {
                    throw new Error(`暂不支持的逻辑算子${attr}`);
                }
            }
        }
        else if (attr.toLowerCase().startsWith(EXPRESSION_PREFIX)) {
            return false;
        }
        else if (attr.toLowerCase() === '$text') {
            return false;
        }
        else {
            if (contained && !judgeFilter2ValueRelation(entity, schema, attr, filter, conditionalFilter[attr], contained)) {
                // 相容关系只要有一个不相容就不相容
                return false;
            }
            if (!contained && judgeFilter2ValueRelation(entity, schema, attr, filter, conditionalFilter[attr], contained)) {
                // 相斥关系只要有一个相斥就相斥
                return true;
            }
        }
    }
    // 到这里说明不能否定其相容（所以要返回相容），也不能肯定其相斥（所以要返回不相斥）
    return contained;
}

/**
 * 
 * 判断filter是否包含conditionalFilter中的查询条件，即filter查询的结果一定满足conditionalFilter的约束
 * filter = {
 *      a: 1
 *      b: 2,
 *      c: 3,
 * },
 * conditionalFilter = {
 *      a: 1
 * }
 * 则包含
 * @param entity 
 * @param schema 
 * @param filter 
 * @param conditionalFilter 
 * @returns 
 */
export function contains<ED extends EntityDict, T extends keyof ED>(
    entity: T,
    schema: StorageSchema<ED>,
    filter: ED[T]['Selection']['filter'],
    conditionalFilter: ED[T]['Selection']['filter']) {
    // return judgeFilterRelation(entity, schema, filter, conditionalFilter, true);
    return false;
}

/**
 * 判断filter1和filter2是否相斥，即filter1和filter2查询的结果一定没有交集
 * filter1 = {
 *      a: 2
 * },
 * filter2 = {
 *      a: 1
 * }
 * 则包含
 * @param entity 
 * @param schema 
 * @param filter 
 * @param conditionalFilter 
 */
export function repel<ED extends EntityDict, T extends keyof ED>(
    entity: T,
    schema: StorageSchema<ED>,
    filter1: ED[T]['Selection']['filter'],
    filter2: ED[T]['Selection']['filter']) {
    // todo
    // return judgeFilterRelation(entity, schema, filter1, filter2, false);
    return false;
}

/**
 * 从filter中判断是否有确定的id对象，如果有则返回这些id，没有返回空数组
 * @param filter 
 * @returns 
 */
export function getRelevantIds<ED extends EntityDict, T extends keyof ED>(filter: ED[T]['Selection']['filter']): string[] {
    let ids: string[] | undefined;
    let idsAnd: string[] | undefined;
    let idsOr: string[] | undefined;

    if (!filter) {
        return [];
    }

    // 因为要准确判定id，如果有其它的过滤条件，可能会使实际处理的行数少于id指向的行数，只能返回空数组
    const attrs = Object.keys(filter);
    if (intersection(attrs, ['id', '$and', '$or']).length > 3) {
        return [];
    }

    if (filter?.$and) {
        const idss = filter.$and.map(
            ele => getRelevantIds(ele)
        );
        idsAnd = intersection(...idss);
    }

    if (filter?.$or) {
        const idss = filter.$or.map(
            ele => getRelevantIds(ele)
        );
        idsOr = union(...idss);
    }

    if (filter?.id) {
        if (typeof filter.id === 'string') {
            ids = [filter.id];
        }
        if (filter.id?.$eq) {
            ids = [filter.id.$eq as string];
        }
        if (filter.id?.$in && filter.id.$in instanceof Array) {
            ids = filter.id.$in;
        }
    }

    // 三者如果有基一，直接返回，如果大于一返回intersection
    if (!ids && !idsAnd && !idsOr) {
        return [];
    }
    let result = (ids || idsAnd || idsOr) as string[];
    if (ids) {
        result = intersection(result, ids);
    }
    if (idsAnd) {
        result = intersection(result, idsAnd);
    }
    if (idsOr) {
        result = intersection(result, idsOr);
    }

    return result;
}

/**
 * 判断两个过滤条件是否完全一致
 * @param entity 
 * @param schema 
 * @param filter1 
 * @param filter2 
 */
export function same<ED extends EntityDict, T extends keyof ED>(
    entity: T,
    schema: StorageSchema<ED>,
    filter1: ED[T]['Selection']['filter'],
    filter2: ED[T]['Selection']['filter']) {
    // 当前只需要判断是不是id相等就行了，在runningTree的operation合并的时间使用
    if (!filter1 || !filter1.id || Object.keys(filter1).length > 1 || !filter2 || !filter2.id || Object.keys(filter2).length > 1) {
        return false;
    }
    return filter1.id === filter2.id;
}

/**
 * 寻找在树形结构中满足条件的数据行的上层数据
 * 例如在area表中，如果“杭州市”满足这一条件，则希望查到更高层的“浙江省”和“中国”，即可构造出满足条件的filter
 * @param entity 
 * @param parentKey parentId属性名
 * @param filter 查询当前行的条件
 * @param level 
 */
export function makeTreeAncestorFilter<ED extends EntityDict, T extends keyof ED>(
    entity: T,
    parentKey: string,
    filter: ED[T]['Selection']['filter'],
    level: number = 1,
    includeAll?: boolean,
    includeSelf?: boolean): ED[T]['Selection']['filter'] {
    assert(level >= 0);
    let idInFilters: ED[T]['Selection']['filter'][] = [];
    if (includeSelf) {
        idInFilters.push(filter);
    }
    let currentLevelInFilter: ED[T]['Selection']['filter'] = filter;
    while (level > 0) {
        currentLevelInFilter = {
            id: {
                $in: {
                    entity,
                    data: {
                        [parentKey]: 1,
                    },
                    filter: currentLevelInFilter,
                }
            },
        };
        if (includeAll) {
            idInFilters.push(currentLevelInFilter);
        }
        level--;
    };
    if (includeAll) {
        return {
            $or: idInFilters,
        } as ED[T]['Selection']['filter'];
    }
    return currentLevelInFilter;
}

/**
 * 寻找在树形结构中满足条件的数据行的下层数据
 * 例如在area表中，如果“杭州市”满足这一条件，则希望查到更低层的“西湖区”，即可构造出满足条件的filter
 * @param entity 
 * @param parentKey parentId属性名
 * @param filter 查询当前行的条件
 * @param level 
 */
export function makeTreeDescendantFilter<ED extends EntityDict, T extends keyof ED>(
    entity: T,
    parentKey: string,
    filter: ED[T]['Selection']['filter'],
    level: number = 1,
    includeAll?: boolean,
    includeSelf?: boolean): ED[T]['Selection']['filter'] {
    assert(level >= 0);
    assert(parentKey.endsWith('Id'));
    const parentKeyRef = parentKey.slice(0, parentKey.length - 2);
    let idInFilters: ED[T]['Selection']['filter'][] = [];
    if (includeSelf) {
        idInFilters.push(filter);
    }
    let currentLevelInFilter: ED[T]['Selection']['filter'] = filter;
    while (level > 0) {
        currentLevelInFilter = {
            [parentKeyRef]: currentLevelInFilter,
        };
        if (includeAll) {
            idInFilters.push(currentLevelInFilter);
        }
        level--;
    };
    if (includeAll) {
        return {
            $or: idInFilters,
        } as ED[T]['Selection']['filter'];
    }
    return currentLevelInFilter;
}

export function checkFilterContains<ED extends EntityDict, T extends keyof ED, Cxt extends SyncContext<ED> | AsyncContext<ED>>(
    entity: T,
    context: Cxt,
    contained: ED[T]['Selection']['filter'],
    filter?: ED[T]['Selection']['filter']): boolean | Promise<boolean> {
    if (!filter) {
        throw new OakRowInconsistencyException();
    }
    const schema = context.getSchema();
    // 优先判断两个条件是否相容
    if (contains(entity, schema, filter, contained)) {
        return true;
    }
    // 再判断加上了conditionalFilter后取得的行数是否缩减
    const filter2 = combineFilters([filter, {
        $not: contained,
    }]);
    const count = context.count(entity, {
        filter: filter2,
    }, {
        dontCollect: true,
        blockTrigger: true,
    });
    if (count instanceof Promise) {
        return count.then(
            (count2) => count2 === 0
        );
    }
    return count === 0;
}

export function checkFilterRepel<ED extends EntityDict, T extends keyof ED, Cxt extends SyncContext<ED> | AsyncContext<ED>>(
    entity: T,
    context: Cxt,
    filter1: ED[T]['Selection']['filter'],
    filter2: ED[T]['Selection']['filter']): boolean | Promise<boolean> {
    if (!filter2) {
        throw new OakRowInconsistencyException();
    }
    const schema = context.getSchema();
    // 优先判断两个条件是否相容
    if (repel(entity, schema, filter2, filter1)) {
        return true;
    }
    // 再判断两者同时成立时取得的行数是否为0
    const filter3 = combineFilters([filter2, filter1]);
    const count = context.count(entity, {
        filter: filter3,
    }, {
        dontCollect: true,
        blockTrigger: true,
    });
    if (count instanceof Promise) {
        return count.then(
            (count2) => count2 !== 0
        );
    }
    return count !== 0;
}