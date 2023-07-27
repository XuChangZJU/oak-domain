import assert from 'assert';
import { addFilterSegment, checkFilterContains, combineFilters } from "../store/filter";
import { OakAttrNotNullException, OakInputIllegalException, OakRowInconsistencyException, OakUserUnpermittedException } from '../types/Exception';
import {
    AuthDefDict, CascadeRelationItem, Checker, CreateTriggerInTxn,
    EntityDict, OperateOption, SelectOption, StorageSchema, Trigger, UpdateTriggerInTxn, RelationHierarchy, SelectOpResult, SyncOrAsync, CascadeRemoveDefDict, CHECKER_MAX_PRIORITY
} from "../types";
import { EntityDict as BaseEntityDict } from '../base-app-domain';
import { AsyncContext } from "./AsyncRowStore";
import { getFullProjection } from './actionDef';
import { SyncContext } from './SyncRowStore';
import { firstLetterUpperCase } from '../utils/string';
import { union, uniq, difference } from '../utils/lodash';
import { judgeRelation } from './relation';
import { generateNewId } from '../utils/uuid';
import { excludeUpdateActions } from '../actions/action';

/**
 * 
 * @param checker 要翻译的checker
 * @param silent 如果silent，则row和relation类型的checker只会把限制条件加到查询上，而不报错（除掉create动作）
 * @returns 
 */
export function translateCheckerInAsyncContext<
    ED extends EntityDict & BaseEntityDict,
    T extends keyof ED,
    Cxt extends AsyncContext<ED>
>(checker: Checker<ED, T, Cxt>): {
    fn: Trigger<ED, T, Cxt>['fn'];
    when: 'before' | 'after';
} {
    const { entity, type } = checker;
    const when = 'before';      // 现在create的relation改成提前的expression检查了，原先是先插入再后检查，性能不行，而且select也需要实现前检查
    switch (type) {
        case 'data': {
            const { checker: checkerFn } = checker;
            const fn = (async ({ operation }, context) => {
                const { data } = operation;
                await checkerFn(data, context);
                return 0;
            }) as CreateTriggerInTxn<ED, keyof ED, Cxt>['fn'];
            return {
                fn,
                when,
            };
        }
        case 'row': {
            const { filter, errMsg, inconsistentRows } = checker;
            const fn = (async ({ operation }, context, option) => {
                const { filter: operationFilter, action } = operation;
                const filter2 = typeof filter === 'function' ? await (filter as Function)(operation, context, option) : filter;
                if (['select', 'count', 'stat'].includes(action)) {
                    operation.filter = addFilterSegment(operationFilter || {}, filter2);
                    return 0;
                }
                else {
                    if (await checkFilterContains<ED, keyof ED, Cxt>(entity, context, filter2, operationFilter || {}, true)) {
                        return 0;
                    }
                    if (inconsistentRows) {
                        const { entity: entity2, selection: selection2 } = inconsistentRows;
                        const rows2 = await context.select(entity2, selection2(operationFilter), {
                            dontCollect: true,
                            blockTrigger: true,
                        });

                        const e = new OakRowInconsistencyException<ED>(undefined, errMsg);
                        e.addData(entity2, rows2);
                        throw e;
                    }
                    else {
                        const rows2 = await context.select(entity, {
                            data: getFullProjection(entity, context.getSchema()),
                            filter: Object.assign({}, operationFilter, {
                                $not: filter2,
                            })
                        }, {
                            dontCollect: true,
                            blockTrigger: true,
                        });

                        const e = new OakRowInconsistencyException<ED>(undefined, errMsg);
                        e.addData(entity, rows2);
                        throw e;
                    }
                }
            }) as UpdateTriggerInTxn<ED, T, Cxt>['fn'];
            return {
                fn,
                when,
            };
        }
        case 'relation': {
            const { relationFilter, errMsg } = checker;
            const fn = (async ({ operation }, context, option) => {
                if (context.isRoot()) {
                    return 0;
                }
                // assert(operation.action !== 'create', `${entity as string}上的create动作定义了relation类型的checker,请使用expressionRelation替代`);
                // 对后台而言，将生成的relationFilter加到filter之上(select可以在此加以权限的过滤)

                const result = typeof relationFilter === 'function' ? await relationFilter(operation, context, option) : relationFilter;

                if (result) {
                    const { filter, action } = operation;
                    if (action === 'create') {
                        console.warn(`${entity as string}对象的create类型的checker中，存在无法转换为表达式形式的情况，请尽量使用authDef格式定义这类checker`);
                        return 0;
                    }
                    if (['select', 'count', 'stat'].includes(action)) {
                        operation.filter = addFilterSegment(filter || {}, result);
                        return 0;
                    }
                    assert(filter);
                    if (await checkFilterContains<ED, T, Cxt>(entity, context, result, filter, true)) {
                        return;
                    }
                    const errMsg2 = typeof errMsg === 'function' ? errMsg(operation, context, option) : errMsg;
                    throw new OakUserUnpermittedException(errMsg2);
                }
                return 0;
            }) as UpdateTriggerInTxn<ED, T, Cxt>['fn'];
            return {
                fn,
                when,
            };
        }
        case 'logical':
        case 'logicalRelation': {
            const { checker: checkerFn } = checker;
            const fn = (async ({ operation }, context, option) => {
                if (context.isRoot() && type === 'logicalRelation') {
                    return 0;
                }
                await checkerFn(operation, context, option);
                return 0;
            }) as UpdateTriggerInTxn<ED, T, Cxt>['fn'];
            return {
                fn,
                when,
            };
        }
        default: {
            assert(false);
        }
    }
}

export function translateCheckerInSyncContext<
    ED extends EntityDict & BaseEntityDict,
    T extends keyof ED,
    Cxt extends SyncContext<ED>
>(checker: Checker<ED, T, Cxt>): {
    fn: (operation: ED[T]['Operation'], context: Cxt, option: OperateOption | SelectOption) => void;
    when: 'before' | 'after';
} {
    const { entity, type } = checker;
    const when = 'before';      // 现在create的relation改成提前的expression检查了，原先是先插入再后检查，性能不行，而且select也需要实现前检查
    switch (type) {
        case 'data': {
            const { checker: checkerFn } = checker;
            const fn = (operation: ED[T]['Operation'], context: Cxt) => checkerFn(operation.data, context);
            return {
                fn,
                when,
            }
        }
        case 'row': {
            const { filter, errMsg } = checker;
            const fn = (operation: ED[T]['Operation'], context: Cxt, option: OperateOption | SelectOption) => {
                const { filter: operationFilter, action } = operation;
                const filter2 = typeof filter === 'function' ? (filter as Function)(operation, context, option) : filter;
                assert(operationFilter);
                assert(!(filter2 instanceof Promise));
                if (checkFilterContains<ED, T, Cxt>(entity, context, filter2, operationFilter, true)) {
                    return;
                }
                const e = new OakRowInconsistencyException(undefined, errMsg);
                throw e;
            };
            return {
                fn,
                when,
            };
        }
        case 'relation': {
            const { relationFilter, errMsg } = checker;
            const fn = (operation: ED[T]['Operation'], context: Cxt, option: OperateOption | SelectOption) => {
                if (context.isRoot()) {
                    return;
                }
                const result = typeof relationFilter === 'function' ? relationFilter(operation, context, option) : relationFilter;

                assert(!(result instanceof Promise));
                if (result) {
                    const { filter, action } = operation;
                    if (action === 'create') {
                        console.warn(`${entity as string}对象的create类型的checker中，存在无法转换为表达式形式的情况，请尽量使用authDef格式定义这类checker`);
                        return;
                    }
                    assert(filter);
                    if (checkFilterContains<ED, T, Cxt>(entity, context, result as ED[T]['Selection']['filter'], filter, true)) {
                        return;
                    }
                    const errMsg2 = typeof errMsg === 'function' ? errMsg(operation, context, option) : errMsg;
                    throw new OakUserUnpermittedException(errMsg2);
                }
            };
            return {
                fn,
                when,
            };
        }
        case 'logical':
        case 'logicalRelation': {
            const { checker: checkerFn } = checker;
            const fn = (operation: ED[T]['Operation'], context: Cxt, option: OperateOption | SelectOption) => {
                if (context.isRoot() && type === 'logicalRelation') {
                    return;
                }
                checkerFn(operation, context, option);
            };
            return {
                fn,
                when,
            };
        }
        default: {
            assert(false);
        }
    }
}

/**
 * 对对象的删除，检查其是否会产生其他行上的空指针，不允许这种情况的出现
 * @param schema 
 * @returns 
 * 如果有的对象允许删除，需要使用trigger来处理其相关联的外键对象，这些trigger写作before，则会在checker之前执行，仍然可以删除成功
 */
export function createRemoveCheckers<ED extends EntityDict & BaseEntityDict, Cxt extends AsyncContext<ED> | SyncContext<ED>>(schema: StorageSchema<ED>) {
    const checkers: Checker<ED, keyof ED, Cxt>[] = [];

    // 先建立所有的一对多的关系
    const OneToManyMatrix: Partial<Record<keyof ED, Array<[keyof ED, string]>>> = {};
    const OneToManyOnEntityMatrix: Partial<Record<keyof ED, Array<keyof ED>>> = {};

    const addToMto = (e: keyof ED, f: keyof ED, attr: string) => {
        if (OneToManyMatrix[f]) {
            OneToManyMatrix[f]?.push([e, attr]);
        }
        else {
            OneToManyMatrix[f] = [[e, attr]];
        }
    };

    const addToMtoEntity = (e: keyof ED, fs: Array<keyof ED>) => {
        for (const f of fs) {
            if (!OneToManyOnEntityMatrix[f]) {
                OneToManyOnEntityMatrix[f] = [e];
            }
            else {
                OneToManyOnEntityMatrix[f]?.push(e);
            }
        }
    };

    for (const entity in schema) {
        if (['operEntity', 'modiEntity', 'userEntityGrant'].includes(entity)) {
            continue;       // 系统功能性数据，不用处理
        }
        const { attributes } = schema[entity];
        for (const attr in attributes) {
            if (attributes[attr].type === 'ref') {
                addToMto(entity, attributes[attr].ref as keyof ED, attr);
            }
            else if (attr === 'entity') {
                if (attributes[attr].ref) {
                    addToMtoEntity(entity, attributes[attr].ref as Array<keyof ED>);
                }
                else if (process.env.NODE_ENV === 'development') {
                    console.warn(`${entity}的entity反指指针找不到有效的对象`);
                }
            }
        }
    }

    // 当删除一时，要确认多上面没有指向一的数据
    const entities = union(Object.keys(OneToManyMatrix), Object.keys(OneToManyOnEntityMatrix));
    for (const entity of entities) {
        checkers.push({
            entity: entity as keyof ED,
            action: 'remove',
            type: 'logical',
            priority: CHECKER_MAX_PRIORITY,
            checker: (operation, context, option) => {
                const promises: Promise<void>[] = [];
                if (OneToManyMatrix[entity]) {
                    for (const otm of OneToManyMatrix[entity]!) {
                        const [e, attr] = otm;
                        const proj = {
                            id: 1,
                            [attr]: 1,
                        };
                        const filter = operation.filter && {
                            [attr.slice(0, attr.length - 2)]: operation.filter
                        }
                        const result = context.select(e, {
                            data: proj,
                            filter,
                            indexFrom: 0,
                            count: 1
                        }, { dontCollect: true });
                        if (result instanceof Promise) {
                            promises.push(
                                result.then(
                                    ([row]) => {
                                        if (row) {
                                            const err = new OakRowInconsistencyException<ED>(undefined, `您无法删除存在有效数据「${e as string}」关联的行`);
                                            err.addData(e, [row]);
                                            throw err;
                                        }
                                    }
                                )
                            );
                        }
                        else {
                            const [row] = result;
                            if (row) {
                                const err = new OakRowInconsistencyException<ED>(undefined, `您无法删除存在有效数据「${e as string}」关联的行`);
                                err.addData(e, [row]);
                                throw err;
                            }
                        }
                    }
                }
                if (OneToManyOnEntityMatrix[entity]) {
                    for (const otm of OneToManyOnEntityMatrix[entity]!) {
                        const proj = {
                            id: 1,
                            entity: 1,
                            entityId: 1,
                        };
                        const filter = operation.filter && {
                            [entity]: operation.filter
                        }
                        const result = context.select(otm, {
                            data: proj,
                            filter,
                            indexFrom: 0,
                            count: 1
                        }, { dontCollect: true });
                        if (result instanceof Promise) {
                            promises.push(
                                result.then(
                                    ([row]) => {
                                        if (row) {
                                            const e = new OakRowInconsistencyException<ED>(undefined, `您无法删除存在有效数据「${otm as string}」关联的行`);
                                            e.addData(otm, [row]);
                                            throw e;
                                        }
                                    }
                                )
                            );
                        }
                        else {
                            const [row] = result;
                            if (row) {
                                const record = {
                                    a: 's',
                                    d: {
                                        [otm]: {
                                            [row.id!]: row,
                                        }
                                    }
                                } as SelectOpResult<ED>;
                                const e = new OakRowInconsistencyException<ED>(undefined, `您无法删除存在有效数据「${otm as string}」关联的行`);
                                e.addData(otm, [row]);
                                throw e;
                            }
                        }
                    }
                }
                if (promises.length > 0) {
                    return Promise.all(promises).then(
                        () => undefined
                    );
                }
            }
        })
    }

    return checkers;
}

function checkAttributeLegal<ED extends EntityDict & BaseEntityDict>(
    schema: StorageSchema<ED>,
    entity: keyof ED,
    data: ED[keyof ED]['Update']['data'] | ED[keyof ED]['CreateSingle']['data']) {
    const { attributes } = schema[entity];
    for (const attr in data) {
        if (attributes[attr as string]) {
            const { type, params, default: defaultValue, enumeration, notNull } = attributes[attr as string];
            if (data[attr] === null || data[attr] === undefined) {
                if (notNull && defaultValue === undefined) {
                    throw new OakAttrNotNullException(entity, [attr]);
                }
                if (defaultValue !== undefined) {
                    Object.assign(data, {
                        [attr]: defaultValue,
                    });
                }
                continue;
            }
            switch (type) {
                case 'char':
                case 'varchar': {
                    if (typeof (data as ED[keyof ED]['CreateSingle']['data'])[attr] !== 'string') {
                        throw new OakInputIllegalException(entity, [attr], 'not a string');
                    }
                    const { length } = params!;
                    if (length && (data as ED[keyof ED]['CreateSingle']['data'])[attr]!.length > length) {
                        throw new OakInputIllegalException(entity, [attr], 'too long');
                    }
                    break;
                }
                case 'int':
                case 'smallint':
                case 'tinyint':
                case 'bigint':
                case 'decimal':
                case 'money': {
                    if (typeof (data as ED[keyof ED]['CreateSingle']['data'])[attr] !== 'number') {
                        throw new OakInputIllegalException(entity, [attr], 'not a number');
                    }
                    const { min, max } = params || {};
                    if (typeof min === 'number' && (data as ED[keyof ED]['CreateSingle']['data'])[attr] < min) {
                        throw new OakInputIllegalException(entity, [attr], 'too small');
                    }
                    if (typeof max === 'number' && (data as ED[keyof ED]['CreateSingle']['data'])[attr] > max) {
                        throw new OakInputIllegalException(entity, [attr], 'too big');
                    }
                    break;
                }
                case 'enum': {
                    assert(enumeration);
                    if (!enumeration.includes((data as ED[keyof ED]['CreateSingle']['data'])[attr])) {
                        throw new OakInputIllegalException(entity, [attr], 'not in enumberation');
                    }
                    break;
                }
            }
        }
        else {
            // 这里似乎还有一种update中带cascade remove的case，等遇到再说（貌似cascadeUpdate没有处理完整这种情况） by Xc
            if (typeof data[attr] === 'object' && data[attr].action === 'remove') {
                console.warn('cascade remove可能是未处理的边界，请注意');
            }
        }
    }
}

export function createCreateCheckers<ED extends EntityDict & BaseEntityDict, Cxt extends AsyncContext<ED> | SyncContext<ED>>(schema: StorageSchema<ED>) {
    const checkers: Checker<ED, keyof ED, Cxt>[] = [];

    for (const entity in schema) {
        const { attributes, actions } = schema[entity];
        const notNullAttrs = Object.keys(attributes).filter(
            ele => attributes[ele].notNull
        );

        const updateActions = difference(actions, excludeUpdateActions);

        checkers.push({
            entity,
            type: 'data',
            action: 'create' as ED[keyof ED]['Action'],
            checker: (data) => {
                const checkData = (data2: ED[keyof ED]['CreateSingle']['data']) => {
                    const illegalNullAttrs = difference(notNullAttrs, Object.keys(data2));
                    if (illegalNullAttrs.length > 0) {
                        // 要处理多对一的cascade create
                        for (const attr of illegalNullAttrs) {
                            if (attr === 'entityId') {
                                if (illegalNullAttrs.includes('entity')) {
                                    continue;
                                }
                            }
                            else if (attr === 'entity' && attributes[attr].ref) {
                                let hasCascadeCreate = false;
                                for (const ref of attributes[attr].ref as string[]) {
                                    if (data2[ref] && data2[ref].action === 'create') {
                                        hasCascadeCreate = true;
                                        break;
                                    }
                                }
                                if (hasCascadeCreate) {
                                    continue;
                                }
                            }
                            else if (attributes[attr].type === 'ref') {
                                const ref = attributes[attr].ref as string;
                                if (data2[ref] && data2[ref].action === 'create') {
                                    continue;
                                }
                            }
                            // 到这里说明确实是有not null的属性没有赋值
                            throw new OakAttrNotNullException(entity, illegalNullAttrs);
                        }
                    }
                    checkAttributeLegal(schema, entity, data2);
                };
                if (data instanceof Array) {
                    data.forEach(
                        ele => checkData(ele)
                    );
                }
                else {
                    checkData(data as ED[keyof ED]['CreateSingle']['data']);
                }
            }
        }, {
            entity,
            type: 'data',
            action: updateActions as ED[keyof ED]['Action'][],
            checker: (data) => {
                checkAttributeLegal(schema, entity, data);
            }
        })
    }

    return checkers;
}