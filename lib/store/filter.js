"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.translateFilterToObjectPredicate = exports.checkFilterRepel = exports.checkFilterContains = exports.makeTreeDescendantFilter = exports.makeTreeAncestorFilter = exports.same = exports.getRelevantIds = exports.judgeValueRelation = exports.combineFilters = void 0;
const tslib_1 = require("tslib");
const assert_1 = tslib_1.__importDefault(require("assert"));
const types_1 = require("../types");
const lodash_1 = require("../utils/lodash");
const relation_1 = require("./relation");
/* function getFilterAttributes(filter: Record<string, any>) {
    const attributes = [] as string[];

    for (const attr in filter) {
        if (attr.startsWith('$') || attr.startsWith('#')) {
            if (['$and', '$or'].includes(attr)) {
                for (const f of filter[attr]) {
                    const a = getFilterAttributes(f);
                    attributes.push(...a);
                }
            }
            else if (attr === '$not') {
                const a = getFilterAttributes(filter[attr]);
                attributes.push(...a);
            }
        }
        else {
            attributes.push(attr);
        }
    }

    return uniq(attributes);
} */
/**
 * 尽量合并外键的连接，防止在数据库中join的对象过多
 * @param entity
 * @param schema
 * @param filters
 * @returns
 */
function addFilterSegment(entity, schema, ...filters) {
    let filter;
    const addIntoAnd = (f) => {
        (0, assert_1.default)(filter);
        if (filter.$and) {
            filter.$and.push(f);
        }
        else {
            filter.$and = [f];
        }
    };
    const addSingleAttr = (attr, value) => {
        (0, assert_1.default)(filter);
        if (!filter[attr]) {
            filter[attr] = value;
        }
        // 只优化一种情况，就是两个都等值且相等
        else if (filter[attr] === value) {
        }
        else {
            addIntoAnd({
                [attr]: value,
            });
        }
    };
    const manyToOneFilters = {};
    const addManyToOneFilter = (attr, entity2, filter) => {
        if (manyToOneFilters[attr]) {
            manyToOneFilters[attr].push([entity2, filter]);
        }
        else {
            manyToOneFilters[attr] = [[entity2, filter]];
        }
    };
    const oneToManyFilters = {};
    const addOneToManyFilter = (attr, entity2, filter) => {
        if (oneToManyFilters[attr]) {
            oneToManyFilters[attr].push([entity2, filter]);
        }
        else {
            oneToManyFilters[attr] = [[entity2, filter]];
        }
    };
    const addInner = (f) => {
        if (f) {
            if (!filter) {
                filter = {};
            }
            if (f.hasOwnProperty('$or')) {
                // 如果有or是无法优化的，直接作为一个整体加入$and
                addIntoAnd(f);
                return;
            }
            for (const attr in f) {
                if (attr === '$and') {
                    f[attr].forEach((f2) => addInner(f2));
                }
                else if (attr.startsWith('$')) {
                    addIntoAnd({
                        [attr]: f[attr],
                    });
                }
                else if (attr.startsWith('#')) {
                    (0, assert_1.default)(!filter[attr] || filter[attr] === f[attr]);
                    filter[attr] = f[attr];
                }
                else {
                    const rel = (0, relation_1.judgeRelation)(schema, entity, attr);
                    if (rel === 1) {
                        addSingleAttr(attr, f[attr]);
                    }
                    else if (rel === 2) {
                        addManyToOneFilter(attr, attr, f[attr]);
                    }
                    else if (typeof rel === 'string') {
                        addManyToOneFilter(attr, rel, f[attr]);
                    }
                    else {
                        (0, assert_1.default)(rel instanceof Array);
                        addOneToManyFilter(attr, rel[0], f[attr]);
                    }
                }
            }
        }
    };
    filters.forEach(ele => addInner(ele));
    for (const attr in manyToOneFilters) {
        const filters2 = manyToOneFilters[attr].map(ele => ele[1]);
        const combined = addFilterSegment(manyToOneFilters[attr][0][0], schema, ...filters2);
        addSingleAttr(attr, combined);
    }
    for (const attr in oneToManyFilters) {
        const filters2 = oneToManyFilters[attr].map(ele => ele[1]);
        const sqpOps = filters2.map(ele => ele['#sqp'] || 'in');
        // 只有全部是同一个子查询算子才能实施合并，这里有进一步优化的余地，但是貌似没必要
        if ((0, lodash_1.uniq)(sqpOps).length > 1) {
            filters2.forEach(ele => {
                addIntoAnd({
                    [attr]: ele,
                });
            });
        }
        else {
            const sqpOp = sqpOps[0];
            if (['not in', 'all'].includes(sqpOp)) {
                // not in/all 在此可以变成or查询
                const unioned = unionFilterSegment(oneToManyFilters[attr][0][0], schema, ...filters2);
                addSingleAttr(attr, Object.assign(unioned, {
                    ['#sqp']: sqpOp,
                }));
            }
            else {
                // in/not all是不能合并的，in condition1 and in condition2不等于in (condition1 and condition2)，也不等于in (condition1 or condition2)
                filters2.forEach(ele => {
                    addIntoAnd({
                        [attr]: ele,
                    });
                });
            }
        }
    }
    return filter;
}
/**
 * 尽量合并外键的连接，防止在数据库中join的对象过多
 * @param entity
 * @param schema
 * @param filters
 * @returns
 */
function unionFilterSegment(entity, schema, ...filters) {
    let filter;
    const possibleCombiningAttrs = (f1, f2) => {
        let pca1s = [], pca2s = [];
        const attributes1 = Object.keys(f1);
        const attributes2 = Object.keys(f2);
        for (const a of attributes1) {
            if (a.startsWith('#')) {
                if (f1[a] !== f2[a]) {
                    // metadata不相等，无法合并
                    return false;
                }
            }
            else {
                pca1s.push(a);
            }
        }
        for (const a of attributes2) {
            if (a.startsWith('#')) {
                if (f1[a] !== f2[a]) {
                    // metadata不相等，无法合并
                    return false;
                }
            }
            else {
                pca2s.push(a);
            }
        }
        if (pca1s.length > 1 || pca2s.length > 1) {
            return false;
        }
        (0, assert_1.default)(pca1s.length === 1 && pca2s.length === 1);
        if (pca1s[0] !== pca2s[0] && pca1s[0] !== '$or' && pca2s[0] !== '$or') {
            return false;
        }
        return [pca1s[0], pca2s[0]];
    };
    /**
     * 尝试合并同一个属性到f1上，这里只合并等值查询和$in
     * @param f1
     * @param f2
     * @param attr
     * @param justTry
     */
    const tryMergeAttributeValue = (f1, f2, attr, justTry) => {
        const op1 = typeof f1[attr] === 'object' && Object.keys(f1[attr])[0];
        const op2 = typeof f2[attr] === 'object' && Object.keys(f2[attr])[0];
        if (!op1 && op2 && ['$eq', '$in'].includes(op2)) {
            if (justTry) {
                return true;
            }
            Object.assign(f1, {
                [attr]: {
                    $in: f2[attr][op2] instanceof Array ? f2[attr][op2].concat(f1[attr]) : [f1[attr], f2[attr][op2]],
                },
            });
            return true;
        }
        else if (!op2 && op1 && ['$eq', '$in'].includes(op1)) {
            if (justTry) {
                return true;
            }
            Object.assign(f1, {
                [attr]: {
                    $in: f1[attr][op1] instanceof Array ? f1[attr][op1].concat(f2[attr]) : [f1[op1][attr], f2[attr]],
                },
            });
            return true;
        }
        else if (op1 && ['$eq', '$in'].includes(op1) && op2 && ['$eq', '$in'].includes(op2)) {
            if (justTry) {
                return true;
            }
            Object.assign(f1, {
                [attr]: {
                    $in: f1[attr][op1] instanceof Array ? f1[attr][op1].concat(f2[attr][op2]) : [f1[attr][op1]].concat(f2[attr][op2]),
                },
            });
            return true;
        }
        else if (!op1 && !op2) {
            if (justTry) {
                return true;
            }
            Object.assign(f1, {
                [attr]: {
                    $in: [f1[attr], f2[attr]],
                },
            });
            return true;
        }
        return false;
    };
    /**
     * 把f2尝试combine到f1中，保持or的语义
     * @param f1
     * @param f2
     * @returns
     */
    const tryMergeFilters = (f1, f2, justTry) => {
        const pcaResult = possibleCombiningAttrs(f1, f2);
        if (!pcaResult) {
            return false;
        }
        const [pca1, pca2] = pcaResult;
        if (pca1 === '$or' && pca2 === '$or') {
            // 如果双方都是or，有可能可以交叉合并，如：
            /**
             * {
                    $or: [
                        {
                            password: '1234',
                        },
                        {
                            ref: {
                                nickname: 'xc',
                            },
                        }
                    ]
                },
                {
                    $or: [
                        {
                            ref: {
                                name: 'xc2',
                            }
                        },
                        {
                            password: 'dddd',
                        }
                    ]
                }
             */
            for (const f21 of f2[pca2]) {
                let success = false;
                for (const f11 of f1[pca2]) {
                    if (tryMergeFilters(f11, f21, true)) {
                        success = true;
                        break;
                    }
                }
                if (!success) {
                    return false;
                }
            }
            if (justTry) {
                return true;
            }
            for (const f21 of f2[pca2]) {
                for (const f11 of f1[pca2]) {
                    if (tryMergeFilters(f11, f21)) {
                        break;
                    }
                }
            }
            return true;
        }
        else if (pca1 === '$or') {
            for (const f11 of f1[pca1]) {
                if (tryMergeFilters(f11, f2, justTry)) {
                    return true;
                }
            }
            return false;
        }
        else if (pca2 === '$or') {
            for (const f21 of f2[pca2]) {
                if (!tryMergeFilters(f1, f21, true)) {
                    return false;
                }
            }
            if (justTry) {
                return true;
            }
            for (const f12 of f2[pca2]) {
                tryMergeFilters(f1, f12);
            }
            return true;
        }
        else if (pca1 === pca2) {
            if (pca1 === '$and') {
                (0, assert_1.default)(false, '只一个属性的时候不应该用$and');
            }
            else if (pca1 === '$not') {
                // 先not后or 等于先and后not
                if (justTry) {
                    return true;
                }
                Object.assign(f1, {
                    [pca1]: addFilterSegment(entity, schema, f1[pca1], f2[pca2]),
                });
                return true;
            }
            else if (pca1.startsWith('$')) {
                return false;
            }
            else {
                // 原生属性
                const rel = (0, relation_1.judgeRelation)(schema, entity, pca1);
                if (rel === 1) {
                    return tryMergeAttributeValue(f1, f2, pca1, justTry);
                }
                else if (rel === 2) {
                    if (justTry) {
                        return true;
                    }
                    Object.assign(f1, {
                        [pca1]: unionFilterSegment(pca1, schema, f1[pca1], f2[pca2]),
                    });
                    return true;
                }
                else if (typeof rel === 'string') {
                    if (justTry) {
                        return true;
                    }
                    Object.assign(f1, {
                        [pca1]: unionFilterSegment(rel, schema, f1[pca1], f2[pca2]),
                    });
                    return true;
                }
                else {
                    (0, assert_1.default)(rel instanceof Array);
                    // 一对多的子查询，只有子查询的语义算子一样才实施合并
                    const sqpOp1 = f1[pca1]['#sqp'] || 'in';
                    const sqpOp2 = f2[pca1]['#sqp'] || 'in';
                    if (sqpOp1 !== sqpOp2) {
                        return false;
                    }
                    if (justTry) {
                        return true;
                    }
                    if (sqpOp1 === 'in') {
                        Object.assign(f1, {
                            [pca1]: Object.assign(unionFilterSegment(rel[0], schema, f1[pca1], f2[pca2]), {
                                ['#sqp']: sqpOp1,
                            })
                        });
                    }
                    else {
                        // not in情况子查询变成and
                        (0, assert_1.default)(sqpOp1 === 'not in'); // all和not all暂时不支持
                        Object.assign(f1, {
                            [pca1]: Object.assign(addFilterSegment(rel[0], schema, f1[pca1], f2[pca2]), {
                                ['#sqp']: sqpOp1,
                            })
                        });
                    }
                }
            }
        }
        return false;
    };
    const addIntoOr = (f) => {
        (0, assert_1.default)(filter);
        if (Object.keys(filter).length === 0) {
            Object.assign(filter, f);
        }
        else if (filter.$or) {
            filter.$or.push(f);
        }
        else {
            filter = {
                $or: [(0, lodash_1.cloneDeep)(filter), f],
            };
        }
    };
    const addInner = (f) => {
        if (f) {
            if (!filter) {
                filter = (0, lodash_1.cloneDeep)(f);
                return;
            }
            if (tryMergeFilters(filter, f)) {
                return;
            }
            addIntoOr(f);
        }
    };
    filters.forEach(f => addInner(f));
    return filter;
}
function combineFilters(entity, schema, filters, union) {
    if (union) {
        return unionFilterSegment(entity, schema, ...filters);
    }
    return addFilterSegment(entity, schema, ...filters);
}
exports.combineFilters = combineFilters;
/**
 * 在以下判断相容或相斥的过程中，相容/相斥的事实标准是：满足两个条件的查询集合是否被包容/互斥，但如果两个filter在逻辑上相容或者相斥，在事实上不一定相容或者相斥
 * 例如：{ a: 1 } 和 { a: { $ne: 1 } } 是明显不相容的查询，但如果数据为空集，则这两个查询并不能否定其相容
 * 我们在处理这类数据时，优先使用逻辑判定的结果（更符合查询本身的期望而非真实数据集），同时也可减少对真实数据集不必要的查询访问
 */
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
 * @return true代表肯定相容/相斥，false代表肯定不相容/不相斥，undefined代表不能确定
 * @attention: 1)这里的测试不够充分，有些算子之间的相容或相斥可能有遗漏, 2)有新的算子加入需要修改代码
 */
function judgeValueRelation(value1, value2, contained) {
    if (typeof value1 === 'object') {
        const attr = Object.keys(value1)[0];
        if (['$gt', '$lt', '$gte', '$lte', '$eq', '$ne', '$startsWith', '$endsWith', '$includes'].includes(attr)) {
            switch (attr) {
                case '$gt': {
                    const attr2 = (typeof value2 === 'object') && Object.keys(value2)[0];
                    const c = attr2 && ['$gt', '$gte'].includes(attr2) && value2[attr2] <= value1.$gt || (attr2 === '$exists' && value2[attr2] === true);
                    const r = (attr2 && (['$lt', '$lte', '$eq'].includes(attr2) && value2[attr2] <= value1.$gt ||
                        attr2 === '$in' && value2[attr2] instanceof Array && !((value2[attr2]).find((ele) => typeof ele !== typeof value1.$gt || ele > value1.$gt))) || (attr2 === '$exists' && value2[attr2] === false) || ['string', 'number'].includes(typeof value2) && value2 <= value1.$gt);
                    if (contained) {
                        if (c) {
                            return true;
                        }
                        else if (r) {
                            return false;
                        }
                        return;
                    }
                    else {
                        if (r) {
                            return true;
                        }
                        return false;
                    }
                }
                case '$gte': {
                    const attr2 = (typeof value2 === 'object') && Object.keys(value2)[0];
                    const c = attr2 && ((['$gte'].includes(attr2) && value2[attr2] <= value1.$gte
                        || ['$gt'].includes(attr2) && value2[attr2] < value1.$gte) || (attr2 === '$exists' && value2[attr2] === true));
                    const r = (attr2 && (['$lt'].includes(attr2) && value2[attr2] <= value1.$gte
                        || ['$eq', '$lte'].includes(attr2) && value2[attr2] < value1.gte
                        || attr2 === '$in' && value2[attr2] instanceof Array && !(value2[attr2]).find((ele) => typeof ele !== typeof value1.$gte || ele >= value1.$gte) || (attr2 === '$exists' && value2[attr2] === false))) || (['string', 'number'].includes(typeof value2) && value2 < value1.$gte);
                    if (contained) {
                        // 包容
                        if (c) {
                            return true;
                        }
                        else if (r) {
                            return false;
                        }
                        return;
                    }
                    if (r) {
                        return true;
                    }
                    return false;
                }
                case '$lt': {
                    const attr2 = (typeof value2 === 'object') && Object.keys(value2)[0];
                    const c = attr2 && (['$lt', '$lte'].includes(attr2) && value2[attr2] >= value1.$lt || attr2 === '$exists' && value2[attr2] === true);
                    const r = (attr2 && (['$gt', '$gte', '$eq'].includes(attr2) && value2[attr2] >= value1.$lt
                        || attr2 === '$in' && value2[attr2] instanceof Array && !(value2[attr2]).find((ele) => typeof ele !== typeof value1.$gt || ele < value1.$lt) || (attr2 === '$exists' && value2[attr2] === false))) || (['string', 'number'].includes(typeof value2) && value2 >= value1.$lt);
                    if (contained) {
                        if (c) {
                            return true;
                        }
                        else if (r) {
                            return false;
                        }
                        return;
                    }
                    // 互斥
                    if (r) {
                        return true;
                    }
                    return false;
                }
                case '$lte': {
                    const attr2 = (typeof value2 === 'object') && Object.keys(value2)[0];
                    const c = attr2 && (['$lte'].includes(attr2) && value2[attr2] >= value1.$lte
                        || ['$lt'].includes(attr2) && value2[attr2] > value1.$lte) || (attr2 === '$exists' && value2[attr2] === true);
                    const r = (attr2 && (['$gt'].includes(attr2) && value2[attr2] >= value1.$lte
                        || ['$eq', '$gte'].includes(attr2) && value2[attr2] > value1.lte
                        || attr2 === '$in' && value2[attr2] instanceof Array && !(value2[attr2]).find((ele) => typeof ele !== typeof value1.$lte || ele <= value1.$lte) || (attr2 === '$exists' && value2[attr2] === false))) || (['string', 'number'].includes(typeof value2) && value2 > value1.$lte);
                    if (contained) {
                        // 包容
                        if (c) {
                            return true;
                        }
                        else if (r) {
                            return false;
                        }
                        return;
                    }
                    // 互斥
                    if (r) {
                        return true;
                    }
                    return false;
                }
                case '$eq': {
                    const attr2 = (typeof value2 === 'object') && Object.keys(value2)[0];
                    const c = (attr2 && (attr2 === '$eq' && value2[attr2] === value1.$eq || attr2 === '$ne' && value2[attr2] !== value1.$eq
                        || attr2 === '$gt' && value2[attr2] < value1.$eq || attr2 === '$lt' && value2[attr2] > value1.$eq
                        || attr2 === '$gte' && value2[attr2] <= value1.$eq || attr2 === '$lte' && value2[attr2] >= value1.$eq
                        || attr2 === '$startsWith' && value1.$eq.startsWith(value2[attr2])
                        || attr2 === '$endsWith' && value1.$eq.endsWith(value2[attr2])
                        || attr2 === '$includes' && value1.$eq.includes(value2[attr2])
                        || attr2 === '$in' && value2[attr2] instanceof Array && value2[attr2].includes(value1.$eq)
                        || attr2 === '$nin' && value2[attr2] instanceof Array && !value2[attr2].includes(value1.$eq)
                        || attr2 === '$between' && value2[attr2][0] <= value1.$eq && value2[attr2][1] >= value1.$eq
                        || attr2 === '$exists' && value2[attr2] === true)) || (['string', 'number'].includes(typeof value2) && value2 === value1.$eq);
                    const r = (attr2 && (attr2 === '$eq' && value2[attr2] !== value1.$eq || attr2 === '$gt' && value2[attr2] >= value1.$eq
                        || attr2 === '$lt' && value2[attr2] <= value1.$eq
                        || attr2 === '$gte' && value2[attr2] > value1.$eq || attr2 === '$lte' && value2[attr2] < value1.$eq
                        || attr2 === '$startsWith' && !value1.$eq.startsWith(value2[attr2])
                        || attr2 === '$endsWith' && !value1.$eq.endsWith(value2[attr2])
                        || attr2 === '$includes' && !value1.$eq.includes(value2[attr2])
                        || attr2 === '$in' && value2[attr2] instanceof Array && !value2[attr2].includes(value1.$eq)
                        || attr2 === '$between' && (value2[attr2][0] > value1.$eq || value2[attr2][1] < value1.$eq)
                        || attr2 === '$exists' && value2[attr2] === false)) || value2 !== value1.$eq;
                    if (contained) {
                        // 相容
                        if (c) {
                            return true;
                        }
                        else if (r) {
                            return false;
                        }
                        return undefined;
                    }
                    // 互斥
                    if (r) {
                        return true;
                    }
                    return false;
                }
                case '$ne': {
                    const attr2 = (typeof value2 === 'object') && Object.keys(value2)[0];
                    const c = attr2 && attr2 === '$ne' && value2[attr2] === value1.$ne;
                    const r = (attr2 === '$eq' && value2[attr2] === value1.$ne) || value2 === value1.$ne;
                    if (contained) {
                        if (c) {
                            return true;
                        }
                        else if (r) {
                            return false;
                        }
                    }
                    // 互斥
                    if (r) {
                        return true;
                    }
                    return false;
                }
                case '$startsWith': {
                    const attr2 = (typeof value2 === 'object') && Object.keys(value2)[0];
                    const c = attr2 === '$startsWith' && typeof (value2[attr2]) === 'string'
                        && value1.$startsWith.startsWith(value2[attr2]);
                    const r = attr2 === '$startsWith' && typeof (value2[attr2]) === 'string'
                        && !value1.$startsWith.startsWith(value2[attr2]) && !value2[attr2].startsWith(value1.$startsWith)
                        || attr2 === '$eq' && !value2[attr2].startsWith(value1.$startsWith)
                        || typeof value2 === 'string' && !value2.startsWith(value1.$startsWith);
                    // 这里似乎还有更多情况，但实际中不可能跑到，不处理了
                    if (contained) {
                        if (c) {
                            return true;
                        }
                        else if (r) {
                            return false;
                        }
                        return;
                    }
                    // 互斥
                    if (r) {
                        return true;
                    }
                    return false;
                }
                case '$endsWith': {
                    const attr2 = (typeof value2 === 'object') && Object.keys(value2)[0];
                    const c = attr2 === '$endsWith' && typeof (value2[attr2]) === 'string'
                        && value1.$endsWith.endsWith(value2[attr2]);
                    const r = (attr2 === '$endsWith' && typeof (value2[attr2]) === 'string'
                        && !value1.$endsWith.endsWith(value2[attr2]) && !value2[attr2].endsWith(value1.$endsWith)
                        || attr2 === '$eq' && !value2[attr2].endsWith(value1.$endsWith)) || typeof value2 === 'string' && !value2.endsWith(value1.$endsWith);
                    if (contained) {
                        // 相容
                        if (c) {
                            return true;
                        }
                        else if (r) {
                            return false;
                        }
                        return;
                    }
                    if (r) {
                        return true;
                    }
                    return false;
                }
                case '$includes': {
                    const attr2 = (typeof value2 === 'object') && Object.keys(value2)[0];
                    const c = (attr2 && ['$includes', '$startsWith', '$endsWith'].includes(attr2)
                        && typeof (value2[attr2]) === 'string'
                        && (value2[attr2]).includes(value1.$includes)) || typeof value2 === 'string' && value2.includes(value1.$includes);
                    const r = (attr2 === '$eq' && !value2[attr2].includes(value1.$includes)
                        || attr2 === '$in' && value2[attr2] instanceof Array && !value2[attr2].find((ele) => ele.includes(value1.$includes))) || typeof value2 === 'string' && !value2.includes(value1.$includes);
                    if (contained) {
                        if (c) {
                            return true;
                        }
                        else if (r) {
                            return false;
                        }
                        return;
                    }
                    if (r) {
                        return true;
                    }
                    return false;
                }
                default: {
                    (0, assert_1.default)(false, `不能处理的算子「${attr}」`);
                }
            }
        }
        else if (['$exists'].includes(attr)) {
            const attr2 = (typeof value2 === 'object') && Object.keys(value2)[0];
            const c = attr2 === '$exists' && value2[attr2] === value1.$exists;
            const r = attr2 === '$exists' && value2[attr2] !== value1.$exists;
            if (contained) {
                if (c) {
                    return true;
                }
                else if (r) {
                    return false;
                }
                return;
            }
            if (r) {
                return true;
            }
            return false;
        }
        else if (['$in', '$nin', '$between'].includes(attr)) {
            switch (attr) {
                case '$in': {
                    (0, assert_1.default)(value1.$in instanceof Array);
                    const attr2 = (typeof value2 === 'object') && Object.keys(value2)[0];
                    let c = (attr2 === '$in' && value2[attr2] instanceof Array && (0, lodash_1.difference)(value1.$in, value2[attr2]).length === 0) || (attr2 === '$nin' && value2[attr2] instanceof Array && (0, lodash_1.intersection)(value1.$in, value2[attr2]).length === 0) || (attr2 === '$exists' && value2[attr2] === true);
                    if (!c && attr2 && ['$gt', '$gte', '$lt', '$lte', '$between'].includes(attr2)) {
                        let min33, max33;
                        value1.$in.forEach((ele) => {
                            if (!min33 || min33 > ele) {
                                min33 = ele;
                            }
                            if (!max33 || max33 < ele) {
                                max33 = ele;
                            }
                        });
                        c = attr2 === '$gt' && value2[attr2] < min33 || attr2 === '$gte' && value2[attr2] <= min33
                            || attr2 === '$lt' && value2[attr2] > max33 || attr2 === '$lte' && value2[attr2] >= max33
                            || attr2 === '$between' && value2[attr2][0] < min33 && value2[attr2][1] > max33;
                    }
                    let r = (attr2 === '$in' && (0, lodash_1.intersection)(value2[attr2], value1.$in).length === 0) || (attr2 === '$eq' && !value1.$in.includes(value2[attr2])) || (attr2 === '$exists' && value2[attr2] === false) || (!value1.$in.includes(value2));
                    if (!r && attr2 && ['$gt', '$gte', '$lt', '$lte', '$between'].includes(attr2)) {
                        let min44, max44;
                        value1.$in.forEach((ele) => {
                            if (!min44 || min44 > ele) {
                                min44 = ele;
                            }
                            if (!max44 || max44 < ele) {
                                max44 = ele;
                            }
                        });
                        r = attr2 === '$gt' && value2[attr2] >= max44 || attr2 === '$gte' && value2[attr2] > max44
                            || attr2 === '$lt' && value2[attr2] <= min44 || attr2 === '$lte' && value2[attr2] < min44
                            || attr2 === '$between' && (value2[attr2][0] > max44 || value2[attr2][1] < min44);
                    }
                    if (contained) {
                        // 相容
                        if (c) {
                            return true;
                        }
                        else if (r) {
                            return false;
                        }
                        return;
                    }
                    // 相斥
                    if (r) {
                        return true;
                    }
                    return false;
                }
                case '$nin': {
                    (0, assert_1.default)(value1.$nin instanceof Array);
                    const attr2 = (typeof value2 === 'object') && Object.keys(value2)[0];
                    const c = attr2 && (attr2 === '$nin' && value2[attr2] instanceof Array && (0, lodash_1.intersection)(value2[attr2], value1.$nin).length === 0
                        || attr2 === '$ne' && value1.$nin.includes(value2[attr2]));
                    const r = attr2 && (attr2 === '$in' && value2[attr2] instanceof Array && (0, lodash_1.intersection)(value2[attr2], value1.$nin).length > 0) || value1.$nin.includes(value2);
                    if (contained) {
                        // 相容
                        if (c) {
                            return true;
                        }
                        else if (r) {
                            return false;
                        }
                        return;
                    }
                    if (r) {
                        return true;
                    }
                    return false;
                }
                case '$between': {
                    (0, assert_1.default)(value1.$between instanceof Array);
                    const attr2 = (typeof value2 === 'object') && Object.keys(value2)[0];
                    const c = attr2 && (attr2 === '$between' && value2[attr2][0] <= value1.$between[0] && value2[attr2][1] >= value1.$between[1]
                        || attr2 === '$gt' && value2[attr2] < value1.$between[0] || attr2 === '$gte' && value2[attr2] <= value1.$between[0]
                        || attr2 === '$lt' && value2[attr2] > value1.$between[1] || attr2 === '$lte' && value2[attr2] >= value1.$between[1]
                        || attr2 === '$exists' && value2[attr2] === true);
                    const r = attr2 && (attr2 === '$between' && (value2[attr2][0] > value1.$between[1] || value2[attr2][1] < value1.$between[0])
                        || attr2 === '$gt' && value2[attr2] > value1.$between[1] || attr2 === '$gte' && value2[attr2] >= value1.$between[1]
                        || attr2 === '$lt' && value2[attr2] < value1.$between[0] || attr2 === '$lte' && value2[attr2] <= value1.$between[0]
                        || attr2 === '$eq' && (value2[attr2] > value1.$between[1] || value2[attr2] < value1.$between[0])
                        || attr2 === '$exists' && value2[attr2] === false
                        || attr2 === '$in' && value2[attr2] instanceof Array && !value2[attr2].find((ele) => ele >= value1.$between[0] && ele <= value1.$between[1])) || value2 > value1.$between[1] || value2 < value1.$between[0];
                    if (contained) {
                        if (c) {
                            return true;
                        }
                        else if (r) {
                            return false;
                        }
                        return;
                    }
                    // 相斥
                    if (r) {
                        return true;
                    }
                    return false;
                }
                default: {
                    (0, assert_1.default)(false, `暂不支持的算子${attr}`);
                }
            }
        }
        else {
            console.warn(`「judgeValueRelation」未知算子「${attr}」`);
            return false;
        }
    }
    else {
        // value1是一个等值查询
        const attr2 = (typeof value2 === 'object') && Object.keys(value2)[0];
        const c = attr2 === '$eq' && value2[attr2] === value1 || attr2 === '$ne' && value2[attr2] !== value1
            || attr2 === '$gt' && value2[attr2] < value1 || attr2 === '$lt' && value2[attr2] > value1
            || attr2 === '$gte' && value2[attr2] <= value1 || attr2 === '$lte' && value2[attr2] >= value1
            || attr2 === '$startsWith' && value1.startsWith(value2[attr2])
            || attr2 === '$endsWith' && value1.endsWith(value2[attr2])
            || attr2 === '$includes' && value1.includes(value2[attr2])
            || attr2 === '$in' && value2[attr2] instanceof Array && value2[attr2].includes(value1)
            || attr2 === '$nin' && value2[attr2] instanceof Array && !value2[attr2].includes(value1)
            || attr2 === '$between' && value2[attr2][0] <= value1 && value2[attr2][1] >= value1
            || attr2 === '$exists' && value2[attr2] === true
            || value2 === value1;
        const r = attr2 === '$eq' && value2[attr2] !== value1 || attr2 === '$gt' && value2[attr2] >= value1
            || attr2 === '$lt' && value2[attr2] <= value1
            || attr2 === '$gte' && value2[attr2] > value1 || attr2 === '$lte' && value2[attr2] < value1
            || attr2 === '$startsWith' && !value1.startsWith(value2[attr2])
            || attr2 === '$endsWith' && !value1.endsWith(value2[attr2])
            || attr2 === '$includes' && !value1.includes(value2[attr2])
            || attr2 === '$in' && value2[attr2] instanceof Array && !value2[attr2].includes(value1)
            || attr2 === '$between' && (value2[attr2][0] > value1 || value2[attr2][1] < value1)
            || attr2 === '$exists' && value2[attr2] === false
            || typeof value2 === typeof value1 && value2 !== value1;
        if (contained) {
            // 相容
            if (c) {
                return true;
            }
            else if (r) {
                return false;
            }
            return;
        }
        // 互斥
        if (r) {
            return true;
        }
        return false;
    }
}
exports.judgeValueRelation = judgeValueRelation;
/**
 * 判断filter条件对compared条件上的attr键值的条件是否相容或相斥
 * @param entity
 * @param schema
 * @param attr
 * @param filter
 * @param compared
 * @param contained
 * @returns 返回true说明肯定相容（相斥），返回false说明肯定不相容（相斥），返回undefined说明无法判定相容（相斥），返回DeducedFilterCombination说明需要进一步判断此推断的条件
 */
function judgeFilterSingleAttrRelation(entity, schema, attr, filter, compared, contained) {
    const comparedFilterAttrValue = compared[attr];
    const orDeducedFilters = [];
    if (attr === 'entityId') {
        // entityId不可能作为查询条件单独存在
        (0, assert_1.default)(compared.hasOwnProperty('entity'));
        return;
    }
    for (const attr2 in filter) {
        if (['$and', '$or', '$not'].includes(attr2)) {
            switch (attr2) {
                case '$and':
                case '$or': {
                    const andDeducedFilters = [];
                    const logicQueries = filter[attr2];
                    const results = logicQueries.map((logicQuery) => judgeFilterSingleAttrRelation(entity, schema, attr, logicQuery, compared, contained));
                    // 如果filter的多个算子是and关系，则只要有一个包含此条件就是包含，只要有一个与此条件相斥就是相斥
                    // 如果filter的多个算子是or关系，则必须所有的条件都包含此条件才是包含，必须所有的条件都与此条件相斥才是相斥                    
                    for (const r of results) {
                        if (r === true && attr2 === '$and') {
                            return true;
                        }
                        if (r === false && attr2 === '$or') {
                            return false;
                        }
                        if (r === undefined) {
                            if (attr2 === '$or') {
                                // or有一个不能确定就返回不确定
                                return;
                            }
                        }
                        if (typeof r === 'object') {
                            if (attr2 === '$and') {
                                orDeducedFilters.push(r);
                            }
                            else {
                                (0, assert_1.default)(attr2 === '$or');
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
                    * 若filter的not条件被comparedFilterAttrValue条件包容，则说明两者互斥
                    * filter包容comparedFilterAttrValue条件暂时无法由其not条件推论出来
                    */
                    if (!contained) {
                        const logicQuery = filter[attr2];
                        const r = judgeFilterRelation(entity, schema, { [attr]: comparedFilterAttrValue }, logicQuery, true);
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
                    (0, assert_1.default)(false);
                }
            }
        }
        else if (attr2.toLowerCase().startsWith(types_1.EXPRESSION_PREFIX)) {
            // 相当于缩小了filter的查询结果集，若其它条件能判断出来filter与compared[attr]相容或相斥，此条件无影响
        }
        else if (attr2.toLowerCase() === '$text') {
            // 相当于缩小了filter的查询结果集，若其它条件能判断出来filter与compared[attr]相容或相斥，此条件无影响
        }
        else {
            const rel = (0, relation_1.judgeRelation)(schema, entity, attr2);
            if (attr === attr2) {
                if (rel === 1) {
                    const r = judgeValueRelation(filter[attr2], comparedFilterAttrValue, contained);
                    if (typeof r === 'boolean') {
                        return r;
                    }
                }
                else if (rel === 2) {
                    const r = judgeFilterRelation(attr2, schema, filter[attr2], comparedFilterAttrValue, contained);
                    if (typeof r === 'boolean') {
                        return r;
                    }
                    else if (typeof r === 'object') {
                        orDeducedFilters.push(r);
                    }
                }
                else if (typeof rel === 'string') {
                    const r = judgeFilterRelation(rel, schema, filter[attr2], comparedFilterAttrValue, contained);
                    if (typeof r === 'boolean') {
                        return r;
                    }
                    else if (typeof r === 'object') {
                        orDeducedFilters.push(r);
                    }
                }
                else {
                    // todo 一对多如何判定？
                }
            }
            else if (rel === 2 && attr === 'entity' && comparedFilterAttrValue === attr2 && compared.hasOwnProperty('entityId')) {
                // compared指定了entity和entityId，而filter指定了该entity上的查询条件，此时转而比较此entity上的filter
                const r = judgeFilterRelation(attr2, schema, filter[attr2], {
                    id: compared.entityId
                }, contained);
                if (typeof r === 'boolean') {
                    return r;
                }
                else if (typeof r === 'object') {
                    orDeducedFilters.push(r);
                }
            }
            else if (typeof rel === 'string' && attr === `${attr2}Id`) {
                // compared指定了外键，而filter指定了该外键对象上的查询条件，此时转而比较此entity上的filter
                const r = judgeFilterRelation(rel, schema, filter[attr2], {
                    id: comparedFilterAttrValue
                }, contained);
                if (typeof r === 'boolean') {
                    return r;
                }
                else if (typeof r === 'object') {
                    orDeducedFilters.push(r);
                }
            }
            else {
                const rel2 = (0, relation_1.judgeRelation)(schema, entity, attr);
                if (rel2 === 2 && attr2 === 'entity' && filter[attr2] === attr && filter.hasOwnProperty('entityId')) {
                    // filter限制了外键范围，而compared指定了该外键对象上的查询条件， 此时转而比较此entity上的filter
                    const r = judgeFilterRelation(attr, schema, {
                        id: filter.entityId,
                    }, comparedFilterAttrValue, contained);
                    if (typeof r === 'boolean') {
                        return r;
                    }
                    else if (typeof r === 'object') {
                        orDeducedFilters.push(r);
                    }
                }
                else if (typeof rel2 === 'string' && attr2 === `${attr}Id`) {
                    // filter限制了外键范围，而compared指定了该外键对象上的查询条件， 此时转而比较此entity上的filter
                    const r = judgeFilterRelation(rel2, schema, {
                        id: filter[attr2],
                    }, comparedFilterAttrValue, contained);
                    if (typeof r === 'boolean') {
                        return r;
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
    // 到这里说明无法直接判断此attr上的相容或者相斥，也无法把判定推断到更深层的算子之上
    return;
}
/** 判断filter条件对compared条件是否相容或相斥
 * @param entity
 * @param schema
 * @param filter
 * @param compared
 * @param contained: true代表判定filter包容compared(filter的查询结果是compared查询结果的子集), false代表判定filter与compared相斥（filter的查询结果与compared没有交集）
 * @returns 返回true说明肯定相容（相斥），返回false说明无法判定相容（相斥），返回DeducedFilterCombination说明需要进一步判断此推断的条件
 */
function judgeFilterRelation(entity, schema, filter, compared, contained) {
    const totalAndDeducedFilters = [];
    const totalOrDeducedFilters = [];
    const uncertainAttributes = [];
    const sureAttributes = []; // 对包容查询，肯定此属性可包容；对相斥查询，肯定此属性不相斥
    for (let attr in compared) {
        let result = undefined;
        const deducedCombinations = [];
        if (['$and', '$or', '$not'].includes(attr)) {
            switch (attr) {
                case '$and': {
                    const logicQueries = compared[attr];
                    const results = logicQueries.map((logicQuery) => judgeFilterRelation(entity, schema, filter, logicQuery, contained));
                    const andDeducedFilters = [];
                    const orDeducedFilters = [];
                    for (const r of results) {
                        if (contained) {
                            // 如果是包容关系，需要全部被包容，有一个被证伪就已经失败了
                            if (r === false) {
                                result = false;
                                break;
                            }
                            else if (r === undefined) {
                                // 有一个无法判断就放弃
                                andDeducedFilters.splice(0, andDeducedFilters.length);
                                result = undefined;
                                break;
                            }
                            else if (typeof r === 'object') {
                                andDeducedFilters.push(r);
                            }
                        }
                        else {
                            (0, assert_1.default)(!contained);
                            // 如果是相斥关系，只要和一个相斥就可以，有一个被证实就成功了
                            if (r === true) {
                                orDeducedFilters.splice(0, orDeducedFilters.length);
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
                    const logicQueries = compared[attr];
                    const results = logicQueries.map((logicQuery) => judgeFilterRelation(entity, schema, filter, logicQuery, contained));
                    const andDeducedFilters = [];
                    const orDeducedFilters = [];
                    for (const r of results) {
                        if (contained) {
                            // 如果是包容关系，只要包容一个（是其查询子集）就可以
                            if (r === true) {
                                orDeducedFilters.splice(0, orDeducedFilters.length);
                                result = true;
                                break;
                            }
                            else if (typeof r === 'object') {
                                // 这里不能把or下降到所有的查询中去分别判定，有可能此条件需要多个compared中的情况来共同满足
                                // orDeducedFilters.push(r);
                            }
                        }
                        else {
                            (0, assert_1.default)(!contained);
                            // 如果是相斥关系，必须和每一个都相斥
                            if (r === false) {
                                result = false;
                                break;
                            }
                            else if (r === undefined) {
                                // 有一个无法判断就放弃
                                andDeducedFilters.splice(0, andDeducedFilters.length);
                                result = undefined;
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
                     * 若filter与compared not所定义的部分相斥，则filter与conditionalFilter相容
                     * 若filter将compared not所定义的部分包容，则filter与conditionalFilter相斥
                     */
                    const logicQuery = compared[attr];
                    if (contained) {
                        const r = judgeFilterRelation(entity, schema, filter, logicQuery, false);
                        if (r === true) {
                            result = true;
                        }
                        else if (typeof r === 'object') {
                            deducedCombinations.push(r);
                        }
                    }
                    else {
                        const r = judgeFilterRelation(entity, schema, filter, logicQuery, true);
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
        else if (attr.toLowerCase().startsWith(types_1.EXPRESSION_PREFIX)) {
            // 相当于缩小了compared查询结果，如果是判定相斥，对结果无影响，如果是判定相容，则认为无法判定，
            if (contained) {
                result = undefined;
            }
        }
        else if (attr.toLowerCase() === '$text') {
            // 相当于缩小了compared查询结果，如果是判定相斥，对结果无影响，如果是判定相容，则认为无法判定，
            if (contained) {
                result = undefined;
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
            // 相容必须compared中的每个属性都被相容
            if (result === true) {
                sureAttributes.push(attr);
            }
            else if (result === false) {
                return false;
            }
            else if (deducedCombinations.length > 0) {
                totalAndDeducedFilters.push(...deducedCombinations);
            }
            else {
                // 判定不了，也推断不了
                uncertainAttributes.push(attr);
            }
        }
        else {
            // 相斥只要有一个被肻定就可以返回true了
            if (result === true) {
                return true;
            }
            else if (result === false) {
                sureAttributes.push(attr);
            }
            else if (deducedCombinations.length > 0) {
                totalOrDeducedFilters.push(...deducedCombinations);
            }
            else {
                // 判定不了，也推断不了
                uncertainAttributes.push(attr);
            }
        }
    }
    if (contained) {
        if (sureAttributes.length === Object.keys(compared).length) {
            return true;
        }
        if (uncertainAttributes.length > 0) {
            // 有属性无法界定，此时只能拿本行去查询
            totalAndDeducedFilters.push({
                entity,
                filter: combineFilters(entity, schema, [filter, {
                        $not: (0, lodash_1.pick)(compared, uncertainAttributes),
                    }]),
            });
        }
        return {
            $and: totalAndDeducedFilters,
        };
    }
    else {
        if (sureAttributes.length === Object.keys(compared).length) {
            return false;
        }
        // uncertainAttributes中是无法判定的属性，和filter合并之后（同时满足）的查询结果如果不为空说明不互斥
        if (uncertainAttributes.length > 0) {
            totalOrDeducedFilters.push({
                entity,
                filter: combineFilters(entity, schema, [filter, (0, lodash_1.pick)(compared, uncertainAttributes)]),
            });
        }
        return {
            $or: totalOrDeducedFilters,
        };
    }
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
function contains(entity, schema, filter, contained) {
    (0, assert_1.default)(filter);
    (0, assert_1.default)(contained);
    return judgeFilterRelation(entity, schema, filter, contained, true);
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
function repel(entity, schema, filter1, filter2) {
    (0, assert_1.default)(filter1);
    (0, assert_1.default)(filter2);
    /**
     * 现在的算法检查相斥有一种情况，若filter1被filter2相容，可以判断出来是false，但如果filter2被filter1相容则检查不出来
     * filter1 = {
     *    id: 'user',
     * }
     * filter2 = {
        id: 'user',
        $$seq$$: 'xc',
     * }
     * 这种情况就检查不出来，所以再反向判断一次是否相容
     */
    const repelled = judgeFilterRelation(entity, schema, filter1, filter2, false);
    if (typeof repelled === 'boolean') {
        return repelled;
    }
    if (contains(entity, schema, filter2, filter1) === true) {
        return false;
    }
    return repelled;
}
/**
 * 从filter中判断是否有确定的id对象，如果有则返回这些id，没有返回空数组
 * @param filter
 * @returns
 */
function getRelevantIds(filter) {
    let ids;
    let idsAnd;
    let idsOr;
    if (!filter) {
        return [];
    }
    // 因为要准确判定id，如果有其它的过滤条件，可能会使实际处理的行数少于id指向的行数，只能返回空数组
    const attrs = Object.keys(filter);
    if ((0, lodash_1.intersection)(attrs, ['id', '$and', '$or']).length > 3) {
        return [];
    }
    if (filter?.$and) {
        const idss = filter.$and.map((ele) => getRelevantIds(ele));
        // and有一个不能判断就返回空集
        if (idss.find(ele => ele.length === 0)) {
            return [];
        }
        idsAnd = (0, lodash_1.intersection)(...idss);
    }
    if (filter?.$or) {
        const idss = filter.$or.map((ele) => getRelevantIds(ele));
        // or有一个不能判断就返回空集
        if (idss.find(ele => ele.length === 0)) {
            return [];
        }
        idsOr = (0, lodash_1.union)(...idss);
    }
    if (filter?.id) {
        if (typeof filter.id === 'string') {
            ids = [filter.id];
        }
        else if (filter.id?.$eq) {
            ids = [filter.id.$eq];
        }
        else if (filter.id?.$in && filter.id.$in instanceof Array) {
            ids = filter.id.$in;
        }
        else {
            return [];
        }
    }
    // 三者如果有基一，直接返回，如果大于一返回intersection
    if (!ids && !idsAnd && !idsOr) {
        return [];
    }
    let result = (ids || idsAnd || idsOr);
    if (ids) {
        result = (0, lodash_1.intersection)(result, ids);
    }
    if (idsAnd) {
        result = (0, lodash_1.intersection)(result, idsAnd);
    }
    if (idsOr) {
        result = (0, lodash_1.intersection)(result, idsOr);
    }
    return result;
}
exports.getRelevantIds = getRelevantIds;
/**
 * 判断两个过滤条件是否完全一致
 * @param entity
 * @param schema
 * @param filter1
 * @param filter2
 */
function same(entity, schema, filter1, filter2) {
    // 当前只需要判断是不是id相等就行了，在runningTree的operation合并的时间使用
    if (!filter1 || !filter1.id || Object.keys(filter1).length > 1 || !filter2 || !filter2.id || Object.keys(filter2).length > 1) {
        return false;
    }
    return filter1.id === filter2.id;
}
exports.same = same;
/**
 * 寻找在树形结构中满足条件的数据行的上层数据
 * 例如在area表中，如果“杭州市”满足这一条件，则希望查到更高层的“浙江省”和“中国”，即可构造出满足条件的filter
 * @param entity
 * @param parentKey parentId属性名
 * @param filter 查询当前行的条件
 * @param level
 */
function makeTreeAncestorFilter(entity, parentKey, filter, level = 1, includeAll, includeSelf) {
    (0, assert_1.default)(level >= 0);
    let idInFilters = [];
    if (includeSelf) {
        idInFilters.push(filter);
    }
    let currentLevelInFilter = filter;
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
    }
    ;
    if (includeAll) {
        return {
            $or: idInFilters,
        };
    }
    return currentLevelInFilter;
}
exports.makeTreeAncestorFilter = makeTreeAncestorFilter;
/**
 * 寻找在树形结构中满足条件的数据行的下层数据
 * 例如在area表中，如果“杭州市”满足这一条件，则希望查到更低层的“西湖区”，即可构造出满足条件的filter
 * @param entity
 * @param parentKey parentId属性名
 * @param filter 查询当前行的条件
 * @param level
 */
function makeTreeDescendantFilter(entity, parentKey, filter, level = 1, includeAll, includeSelf) {
    (0, assert_1.default)(level >= 0);
    (0, assert_1.default)(parentKey.endsWith('Id'));
    const parentKeyRef = parentKey.slice(0, parentKey.length - 2);
    let idInFilters = [];
    if (includeSelf) {
        idInFilters.push(filter);
    }
    let currentLevelInFilter = filter;
    while (level > 0) {
        currentLevelInFilter = {
            [parentKeyRef]: currentLevelInFilter,
        };
        if (includeAll) {
            idInFilters.push(currentLevelInFilter);
        }
        level--;
    }
    ;
    if (includeAll) {
        return {
            $or: idInFilters,
        };
    }
    return currentLevelInFilter;
}
exports.makeTreeDescendantFilter = makeTreeDescendantFilter;
function checkDeduceFilters(dfc, context) {
    const { $and, $or } = dfc;
    if ($and) {
        (0, assert_1.default)(!$or);
        const andResult = $and.map((ele) => {
            if (ele.hasOwnProperty('entity')) {
                const ele2 = ele;
                return context.count(ele2.entity, {
                    filter: ele2.filter
                }, { ignoreAttrMiss: true });
            }
            const ele2 = ele;
            return checkDeduceFilters(ele2, context);
        });
        // and 意味着只要有一个条件失败就返回false
        if (andResult.find(ele => ele instanceof Promise)) {
            return Promise.all(andResult).then((ar) => {
                for (const ele of ar) {
                    if (ele === false || typeof ele === 'number' && ele > 0) {
                        return false;
                    }
                }
                return true;
            });
        }
        for (const ele of andResult) {
            if (ele === false || typeof ele === 'number' && ele > 0) {
                return false;
            }
        }
        return true;
    }
    (0, assert_1.default)($or);
    const orResult = $or.map((ele) => {
        if (ele.hasOwnProperty('entity')) {
            const ele2 = ele;
            return context.count(ele2.entity, {
                filter: ele2.filter
            }, { ignoreAttrMiss: true });
        }
        const ele2 = ele;
        return checkDeduceFilters(ele2, context);
    });
    // or只要有一个条件通过就返回true
    if (orResult.find(ele => ele instanceof Promise)) {
        return Promise.all(orResult).then((or) => {
            for (const ele of or) {
                if (ele === true || ele === 0) {
                    return true;
                }
            }
            return false;
        });
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
function checkFilterContains(entity, context, contained, filter, dataCompare, warningOnDataCompare) {
    if (!filter) {
        throw new types_1.OakRowInconsistencyException();
    }
    const schema = context.getSchema();
    const result = contains(entity, schema, filter, contained);
    if (typeof result === 'boolean') {
        return result;
    }
    if (dataCompare) {
        if (warningOnDataCompare) {
            console.warn(`data compare on ${entity}, please optimize`);
        }
        return checkDeduceFilters(result, context);
    }
    return false;
}
exports.checkFilterContains = checkFilterContains;
function checkFilterRepel(entity, context, filter1, filter2, dataCompare, warningOnDataCompare) {
    if (!filter2) {
        throw new types_1.OakRowInconsistencyException();
    }
    const schema = context.getSchema();
    const result = repel(entity, schema, filter2, filter1);
    if (typeof result === 'boolean') {
        return result;
    }
    if (dataCompare) {
        if (warningOnDataCompare) {
            console.warn(`data compare on ${entity}, please optimize`);
        }
        return checkDeduceFilters(result, context);
    }
    return false;
}
exports.checkFilterRepel = checkFilterRepel;
/**
 * 有的场景下将filter当成非结构化属性存储，又想支持对其查询，此时必须将查询的filter进行转换，处理其中$开头的escape
 * 只要filter是查询数据的标准子集，查询应当能返回true
 * @param filter
 */
function translateFilterToObjectPredicate(filter) {
    const copyInner = (orig, dest) => {
        for (const key in orig) {
            const value = orig[key];
            const key2 = key.startsWith('$') ? `.${key}` : key;
            if (typeof value === 'object' && !(value instanceof Array)) {
                dest[key2] = {};
                copyInner(value, dest[key2]);
            }
            else {
                dest[key2] = value;
            }
        }
    };
    const translated = {};
    copyInner(filter, translated);
    return translated;
}
exports.translateFilterToObjectPredicate = translateFilterToObjectPredicate;
/* export function getCascadeEntityFilter<ED extends EntityDict & BaseEntityDict, T extends keyof ED>(
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
} */ 
