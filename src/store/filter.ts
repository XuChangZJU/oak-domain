import assert from 'assert';
import { EntityDict as BaseEntityDict, EXPRESSION_PREFIX, OakRowInconsistencyException, StorageSchema } from '../types';
import { EntityDict } from "../base-app-domain";
import { pick, difference, intersection, union, omit } from '../utils/lodash';
import { AsyncContext } from './AsyncRowStore';
import { judgeRelation } from './relation';
import { SyncContext } from './SyncRowStore';

export function addFilterSegment<ED extends EntityDict & BaseEntityDict, T extends keyof ED>(...filters: ED[T]['Selection']['filter'][]) {
    let filter: ED[T]['Selection']['filter'] | undefined;
    filters.forEach(
        ele => {
            if (ele) {
                if (!filter) {
                    filter = {};
                }
                for (const k in ele) {
                    if (k === '$and') {
                        if (filter.$and) {
                            filter.$and.push(...(ele[k] as any));
                        }
                        else {
                            filter.$and = ele[k];
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

export function unionFilterSegment<ED extends EntityDict & BaseEntityDict, T extends keyof ED>(...filters: ED[T]['Selection']['filter'][]) {
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

export function combineFilters<ED extends EntityDict & BaseEntityDict, T extends keyof ED>(filters: Array<ED[T]['Selection']['filter']>, union?: true) {
    if (union) {
        return unionFilterSegment(...filters);
    }
    return addFilterSegment(...filters);
}

type DeducedFilter<ED extends EntityDict & BaseEntityDict, T extends keyof ED> = {
    entity: T;
    filter: ED[T]['Selection']['filter'];
};

type DeducedFilterCombination<ED extends EntityDict & BaseEntityDict> = {
    $or?: (DeducedFilterCombination<ED> | DeducedFilter<ED, keyof ED>)[];
    $and?: (DeducedFilterCombination<ED> | DeducedFilter<ED, keyof ED>)[];
};
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

/**
 * 判断filter条件对compared条件上的attr键值的条件是否相容或相斥
 * @param entity 
 * @param schema 
 * @param attr 
 * @param filter 
 * @param compared 
 * @param contained 
 * @returns 返回true说明肯定相容（相斥），返回false说明无法判定相容（相斥），返回DeducedFilterCombination说明需要进一步判断此推断的条件
 */
function judgeFilterSingleAttrRelation<ED extends EntityDict & BaseEntityDict, T extends keyof ED>(
    entity: T,
    schema: StorageSchema<ED>,
    attr: keyof ED[T]['Schema'],
    filter: NonNullable<ED[T]['Selection']['filter']>,
    compared: NonNullable<ED[T]['Selection']['filter']>,
    contained: boolean): boolean | DeducedFilterCombination<ED> {
    const comparedFilterAttrValue = compared![attr as any];
    const orDeducedFilters: DeducedFilterCombination<ED>[] = [];

    if (attr === 'entityId') {
        // entityId不可能作为查询条件单独存在
        assert(compared.hasOwnProperty('entity'));
        return false;
    }
    for (const attr2 in filter) {
        if (['$and', '$or', '$not'].includes(attr2)) {
            switch (attr2) {
                case '$and':
                case '$or': {
                    const andDeducedFilters: DeducedFilterCombination<ED>[] = [];
                    const logicQueries = filter[attr2] as Array<ED[T]['Selection']['filter']>;
                    const results = logicQueries.map(
                        (logicQuery) => judgeFilterSingleAttrRelation(entity, schema, attr, logicQuery!, compared, contained)
                    );
                    // 如果filter的多个算子是and关系，则只要有一个包含此条件就是包含，只要有一个与此条件相斥就是相斥
                    // 如果filter的多个算子是or关系，则必须所有的条件都包含此条件才是包含，必须所有的条件都与此条件相斥才是相斥                    
                    for (const r of results) {
                        if (r === true && attr2 === '$and') {
                            return true;
                        }
                        if (r === false && attr2 === '$or') {
                            return false;
                        }
                        if (typeof r === 'object') {
                            if (attr2 === '$and') {
                                orDeducedFilters.push(r);
                            }
                            else {
                                assert(attr2 === '$or');
                                andDeducedFilters.push(r);
                            }
                        }
                    }
                    if (andDeducedFilters.length > 0) {
                        orDeducedFilters.push({
                            $and: andDeducedFilters,
                        });
                    }
                    break;
                }
                case '$not': {
                    /* 
                    * 若filter的not条件被conditionalFilterAttrValue条件包容，则说明两者互斥
                    * filter包容conditionalFilterAttrValue条件暂时无法由其not条件推论出来
                    */

                    if (!contained) {
                        const logicQuery = filter[attr2] as ED[T]['Selection']['filter'];
                        const r = judgeFilterRelation(entity, schema, logicQuery!, { [attr]: comparedFilterAttrValue } as NonNullable<ED[T]['Selection']['filter']>, true);
                        if (r === true) {
                            return true;
                        }
                        else if (typeof r === 'object') {
                            orDeducedFilters.push(r);
                        }
                    }
                    break;
                }
                default: {
                    assert(false);
                }
            }
        }
        else if (attr2.toLowerCase().startsWith(EXPRESSION_PREFIX)) {
            // 相当于缩小了filter的查询结果集，若其它条件能判断出来filter与compared[attr]相容或相斥，此条件无影响
        }
        else if (attr2.toLowerCase() === '$text') {
            // 相当于缩小了filter的查询结果集，若其它条件能判断出来filter与compared[attr]相容或相斥，此条件无影响
        }
        else {
            const rel = judgeRelation<ED>(schema, entity, attr2);
            if (attr === attr2) {
                if (rel === 1) {
                    return judgeValueRelation(filter[attr2], comparedFilterAttrValue, contained);
                }
                else if (rel === 2) {
                    const r = judgeFilterRelation(attr2, schema, filter[attr2], comparedFilterAttrValue, contained);
                    if (r === true) {
                        return true;
                    }
                    else if (typeof r === 'object') {
                        orDeducedFilters.push(r);
                    }
                }
                else if (typeof rel === 'string') {
                    const r = judgeFilterRelation(rel, schema, filter[attr2], comparedFilterAttrValue, contained);
                    if (r === true) {
                        return true;
                    }
                    else if (typeof r === 'object') {
                        orDeducedFilters.push(r);
                    }
                }
            }
            else if (rel === 2 && attr === 'entity' && comparedFilterAttrValue === attr2 && compared!.hasOwnProperty('entityId')) {
                // compared指定了entity和entityId，而filter指定了该entity上的查询条件，此时转而比较此entity上的filter
                const r = judgeFilterRelation(attr2, schema, filter[attr2], {
                    id: compared.entityId
                } as any, contained);
                if (r === true) {
                    return true;
                }
                else if (typeof r === 'object') {
                    orDeducedFilters.push(r);
                }
            }
            else if (typeof rel === 'string' && attr === `${attr2}Id`) {
                // compared指定了外键，而filter指定了该外键对象上的查询条件，此时转而比较此entity上的filter
                const r = judgeFilterRelation(rel, schema, filter[attr2], {
                    id: comparedFilterAttrValue
                } as any, contained);
                if (r === true) {
                    return true;
                }
                else if (typeof r === 'object') {
                    orDeducedFilters.push(r);
                }
            }
            else {
                const rel2 = judgeRelation<ED>(schema, entity, attr as string);

                if (rel2 === 2 && attr2 === 'entity' && filter[attr2] === attr && filter.hasOwnProperty('entityId')) {
                    // filter限制了外键范围，而compared指定了该外键对象上的查询条件， 此时转而比较此entity上的filter
                    const r = judgeFilterRelation(attr as keyof ED, schema, {
                        id: filter.entityId,
                    } as any, comparedFilterAttrValue, contained);
                    if (r === true) {
                        return true;
                    }
                    else if (typeof r === 'object') {
                        orDeducedFilters.push(r);
                    }
                }
                else if (typeof rel2 === 'string' && attr2 === `${attr as string}Id`) {
                    // filter限制了外键范围，而compared指定了该外键对象上的查询条件， 此时转而比较此entity上的filter
                    const r = judgeFilterRelation(rel2, schema, {
                        id: filter[attr2],
                    } as any, comparedFilterAttrValue, contained);
                    if (r === true) {
                        return true;
                    }
                    else if (typeof r === 'object') {
                        orDeducedFilters.push(r);
                    }
                }
            }
        }
    }

    if (orDeducedFilters.length > 0) {
        return {
            $or: orDeducedFilters,
        };
    }

    // 到这里说明无法直接判断此attr上的相容或者相斥，返回false
    return false;
}

/** 判断filter条件对compared条件是否相容或相斥
 * @param entity 
 * @param schema 
 * @param filter 
 * @param compared
 * @param contained: true代表判定filter包容compared(filter的查询结果是compared查询结果的子集), false代表判定filter与compared相斥（filter的查询结果与compared没有交集）
 * @returns 返回true说明肯定相容（相斥），返回false说明无法判定相容（相斥），返回DeducedFilterCombination说明需要进一步判断此推断的条件
 */
function judgeFilterRelation<ED extends EntityDict & BaseEntityDict, T extends keyof ED>(
    entity: T,
    schema: StorageSchema<ED>,
    filter: NonNullable<ED[T]['Selection']['filter']>,
    compared: NonNullable<ED[T]['Selection']['filter']>,
    contained: boolean): boolean | DeducedFilterCombination<ED> {

    const totalAndDeducedFilters: (DeducedFilterCombination<ED> | DeducedFilter<ED, T>)[] = [];
    const totalOrDeducedFilters: (DeducedFilterCombination<ED> | DeducedFilter<ED, T>)[] = [];
    const falseAttributes: string[] = [];
    for (let attr in compared) {
        let result: boolean | undefined = undefined;
        const deducedCombinations: DeducedFilterCombination<ED>[] = [];
        if (['$and', '$or', '$not'].includes(attr)) {
            switch (attr) {
                case '$and': {
                    const logicQueries = compared[attr] as Array<ED[T]['Selection']['filter']>;
                    const results = logicQueries.map(
                        (logicQuery) => judgeFilterRelation(entity, schema, filter, logicQuery!, contained)
                    );
                    const andDeducedFilters: DeducedFilterCombination<ED>[] = [];
                    const orDeducedFilters: DeducedFilterCombination<ED>[] = [];
                    for (const r of results) {
                        if (contained) {
                            // 如果是包容关系，需要全部被包容
                            if (r === false) {
                                result = false;
                                break;
                            }
                            else if (typeof r === 'object') {
                                andDeducedFilters.push(r);
                            }
                        }
                        else {
                            assert(!contained);
                            // 如果是相斥关系，只要和一个相斥就可以了
                            if (r === true) {
                                result = true;
                                break;
                            }
                            else if (typeof r === 'object') {
                                orDeducedFilters.push(r);
                            }
                        }
                    }
                    if (andDeducedFilters.length > 0) {
                        deducedCombinations.push({
                            $and: andDeducedFilters,
                        });
                    }
                    if (orDeducedFilters.length > 0) {
                        deducedCombinations.push({
                            $or: orDeducedFilters,
                        });
                    }
                    break;
                }
                case '$or': {
                    const logicQueries = compared[attr] as Array<ED[T]['Selection']['filter']>;
                    const results = logicQueries.map(
                        (logicQuery) => judgeFilterRelation(entity, schema, filter, logicQuery!, contained)
                    );
                    const andDeducedFilters: DeducedFilterCombination<ED>[] = [];
                    const orDeducedFilters: DeducedFilterCombination<ED>[] = [];
                    for (const r of results) {
                        if (contained) {
                            // 如果是包容关系，只要包容一个（是其查询子集）就可以
                            if (r === true) {
                                result = true;
                                break;
                            }
                            else if (typeof r === 'object') {
                                orDeducedFilters.push(r);
                            }
                        }
                        else {
                            assert(!contained);
                            // 如果是相斥关系，必须和每一个都相斥
                            if (r === false) {
                                result = false;
                                break;
                            }
                            else if (typeof r === 'object') {
                                andDeducedFilters.push(r);
                            }
                        }
                    }
                    if (andDeducedFilters.length > 0) {
                        deducedCombinations.push({
                            $and: andDeducedFilters,
                        });
                    }
                    if (orDeducedFilters.length > 0) {
                        deducedCombinations.push({
                            $or: orDeducedFilters,
                        });
                    }
                    break;
                }
                case '$not': {
                    /**
                     * 若filter与conditionalFilter not所定义的部分相斥，则filter与conditionalFilter相容
                     * 若filter将conditionalFilter not所定义的部分包容，则filter与conditionalFilter相斥
                     */
                    const logicQuery = compared[attr] as ED[T]['Selection']['filter'];
                    if (contained) {
                        const r = judgeFilterRelation(entity, schema, filter, logicQuery!, false);
                        if (r === true) {
                            result = true;
                        }
                        else if (typeof r === 'object') {
                            deducedCombinations.push(r);
                        }
                    }
                    else {
                        const r = judgeFilterRelation(entity, schema, filter, logicQuery!, true);
                        if (r === true) {
                            result = true;
                        }
                        else if (typeof r === 'object') {
                            deducedCombinations.push(r);
                        }
                    }
                    break;
                }
                default: {
                    throw new Error(`暂不支持的逻辑算子${attr}`);
                }
            }
        }
        else if (attr.toLowerCase().startsWith(EXPRESSION_PREFIX)) {
            // 相当于缩小了compared查询结果，如果是判定相斥，对结果无影响，如果是判定相容，则认为无法判定，
            if (contained) {
                result = false;
            }
        }
        else if (attr.toLowerCase() === '$text') {
            // 相当于缩小了compared查询结果，如果是判定相斥，对结果无影响，如果是判定相容，则认为无法判定，
            if (contained) {
                result = false;
            }
        }
        else {
            const r = judgeFilterSingleAttrRelation(entity, schema, attr, filter, compared, contained);
            if (typeof r === 'object') {
                deducedCombinations.push(r);
            }
            else {
                result = r;
            }
        }

        if (contained) {
            // 相容必须每个都相容，有一个被否定就可以返回false了
            if (result === false) {
                falseAttributes.push(attr);
            }
            else if (deducedCombinations.length > 0) {
                totalAndDeducedFilters.push(...deducedCombinations);
            }
        }
        else {
            // 相斥只要有一个被肻定就可以返回true了
            if (result === true) {
                return true;
            }

            if (deducedCombinations.length > 0) {
                totalOrDeducedFilters.push(...deducedCombinations);
                falseAttributes.push(attr);
            }
        }
    }

    if (contained) {
        if (falseAttributes.length > 0) {
            // 有属性无法界定，此时只能拿本行去查询
            totalAndDeducedFilters.push({
                entity,
                filter: {
                    ...filter,
                    $not: pick(compared, falseAttributes),
                },
            });
        }
    }
    else {
        // falseAttributes中是已经推导了更深层次上filter的属性，剩下的如果还有可以增加一个相斥的判断
        if (Object.keys(contained).length > falseAttributes.length) {
            totalOrDeducedFilters.push({
                entity,
                filter: combineFilters([filter, omit(compared, falseAttributes)]),
            });
        }
    }

    if (totalAndDeducedFilters.length > 0) {
        return {
            $and: totalAndDeducedFilters,
        };
    }
    if (totalOrDeducedFilters.length > 0) {
        return {
            $or: totalOrDeducedFilters,
        };
    }

    // 到这里说明没有一个属性能马上否定相容（不然因为falseAttributes已经返回false了），或是没有一个属性能肯定相斥（否则已经返回true了）
    return contained;
}

/**
 * 
 * 判断filter是否包含contained中的查询条件，即filter查询的结果一定是contained查询结果的子集
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
 * @param contained 
 * @returns 
 */
export function contains<ED extends EntityDict & BaseEntityDict, T extends keyof ED>(
    entity: T,
    schema: StorageSchema<ED>,
    filter: ED[T]['Selection']['filter'],
    contained: ED[T]['Selection']['filter']) {
    assert(filter);
    assert(contained);
    return judgeFilterRelation(entity, schema, filter!, contained!, true);
    // return false;
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
export function repel<ED extends EntityDict & BaseEntityDict, T extends keyof ED>(
    entity: T,
    schema: StorageSchema<ED>,
    filter1: ED[T]['Selection']['filter'],
    filter2: ED[T]['Selection']['filter']) {
    assert(filter1);
    assert(filter2);
    return judgeFilterRelation(entity, schema, filter1!, filter2!, false);
    // return false;
}

/**
 * 从filter中判断是否有确定的id对象，如果有则返回这些id，没有返回空数组
 * @param filter 
 * @returns 
 */
export function getRelevantIds<ED extends EntityDict & BaseEntityDict, T extends keyof ED>(filter: ED[T]['Selection']['filter']): string[] {
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
            (ele: ED[T]['Selection']['filter']) => getRelevantIds(ele)
        );
        idsAnd = intersection(...idss);
    }

    if (filter?.$or) {
        const idss = filter.$or.map(
            (ele: ED[T]['Selection']['filter']) => getRelevantIds(ele)
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
export function same<ED extends EntityDict & BaseEntityDict, T extends keyof ED>(
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
export function makeTreeAncestorFilter<ED extends EntityDict & BaseEntityDict, T extends keyof ED>(
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
export function makeTreeDescendantFilter<ED extends EntityDict & BaseEntityDict, T extends keyof ED>(
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

export function checkDeduceFilters<ED extends EntityDict & BaseEntityDict, Cxt extends SyncContext<ED> | AsyncContext<ED>>(
    dfc: DeducedFilterCombination<ED>, context: Cxt
): boolean | Promise<boolean> {
    const { $and, $or } = dfc;

    if ($and) {
        assert(!$or);
        const andResult = $and.map(
            (ele) => {
                if (ele.hasOwnProperty('entity')) {
                    const ele2 = ele as DeducedFilter<ED, keyof ED>;
                    return context.count(ele2.entity, {
                        filter: ele2.filter
                    }, {});
                }
                const ele2 = ele as DeducedFilterCombination<ED>;
                return checkDeduceFilters(ele2, context);
            }
        );

        // and 意味着只要有一个条件失败就返回false
        if (andResult.find(ele => ele instanceof Promise)) {
            return Promise.all(andResult).then(
                (ar) => {
                    for (const ele of ar) {
                        if (ele === false || typeof ele === 'number' && ele > 0) {
                            return false;
                        }
                    }
                    return true;
                }
            );
        }
        
        for (const ele of andResult) {
            if (ele === false || typeof ele === 'number' && ele > 0) {
                return false;
            }
        }
        return true;
    }
    assert($or);
    const orResult = $or.map(
        (ele) => {
            if (ele.hasOwnProperty('entity')) {
                const ele2 = ele as DeducedFilter<ED, keyof ED>;
                return context.count(ele2.entity, {
                    filter: ele2.filter
                }, {});
            }
            const ele2 = ele as DeducedFilterCombination<ED>;
            return checkDeduceFilters(ele2, context);
        }
    );

    // or只要有一个条件通过就返回true
    if (orResult.find(ele => ele instanceof Promise)) {
        return Promise.all(orResult).then(
            (or) => {
                for (const ele of or) {
                    if (ele === true || ele === 0) {
                        return true;
                    }
                }
                return false;
            }
        );
    }
    for (const ele of orResult) {
        if (ele === true || ele === 0) {
            return true;
        }
    }
    return false;
}

/**
 * 检查filter是否包含contained（filter查询的数据是contained查询数据的子集）
 * @param entity 
 * @param context 
 * @param contained 
 * @param filter 
 * @param dataCompare 
 * @returns 
 */
export function checkFilterContains<ED extends EntityDict & BaseEntityDict, T extends keyof ED, Cxt extends SyncContext<ED> | AsyncContext<ED>>(
    entity: T,
    context: Cxt,
    contained: ED[T]['Selection']['filter'],
    filter?: ED[T]['Selection']['filter'],
    dataCompare?: true): boolean | Promise<boolean> {
    if (!filter) {
        throw new OakRowInconsistencyException();
    }
    const schema = context.getSchema();
    
    const result = contains(entity, schema, filter, contained);
    if (typeof result === 'boolean') {
        return result;
    }
    if (dataCompare) {
        return checkDeduceFilters(result, context);
    }
    return false;
}

export function checkFilterRepel<ED extends EntityDict & BaseEntityDict, T extends keyof ED, Cxt extends SyncContext<ED> | AsyncContext<ED>>(
    entity: T,
    context: Cxt,
    filter1: ED[T]['Selection']['filter'],
    filter2: ED[T]['Selection']['filter'],
    dataCompare?: true
): boolean | Promise<boolean> {
    if (!filter2) {
        throw new OakRowInconsistencyException();
    }
    const schema = context.getSchema();
    
    const result = repel(entity, schema, filter2, filter1);
    if (typeof result === 'boolean') {
        return result;
    }
    if (dataCompare) {
        return checkDeduceFilters(result, context);
    }
    return false;
}

export function getCascadeEntityFilter<ED extends EntityDict & BaseEntityDict, T extends keyof ED>(
    filter: NonNullable<ED[T]['Selection']['filter']>,
    attr: keyof NonNullable<ED[T]['Selection']['filter']>
): ED[keyof ED]['Selection']['filter'] {
    const filters: ED[keyof ED]['Selection']['filter'][] = [];
    if (filter![attr]) {
        assert(typeof filter![attr] === 'object');
        filters.push(filter![attr]);
    }
    if (filter.$and) {
        filter.$and.forEach(
            (ele: NonNullable<ED[T]['Selection']['filter']>) => {
                const f2 = getCascadeEntityFilter(ele, attr);
                if (f2) {
                    filters.push(f2)
                }
            }
        );
    }
    if (filters.length > 0) {
        return combineFilters(filters);
    }
}