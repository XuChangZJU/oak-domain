import assert from 'assert';
import { checkFilterContains, combineFilters, translateCreateDataToFilter } from "../store/filter";
import { OakAttrNotNullException, OakInputIllegalException, OakRowInconsistencyException, OakUserUnpermittedException } from '../types/Exception';
import {
    Checker, CreateTriggerInTxn, EntityDict, OperateOption, SelectOption, StorageSchema, Trigger, 
    UpdateTriggerInTxn, SelectOpResult, CHECKER_MAX_PRIORITY } from "../types";
import { EntityDict as BaseEntityDict } from '../base-app-domain';
import { AsyncContext } from "./AsyncRowStore";
import { SyncContext } from './SyncRowStore';
import { union, difference } from '../utils/lodash';
import { excludeUpdateActions } from '../actions/action';

function getFullProjection<ED extends EntityDict & BaseEntityDict, T extends keyof ED>(entity: T, schema: StorageSchema<ED>) {
    const { attributes } = schema[entity];
    const projection: ED[T]['Selection']['data'] = {
        id: 1,
        $$createAt$$: 1,
        $$updateAt$$: 1,
        $$deleteAt$$: 1,
    };
    Object.keys(attributes).forEach(
        (k) => Object.assign(projection, {
            [k]: 1,
        })
    );

    return projection;
}
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
>(checker: Checker<ED, T, Cxt>, schema: StorageSchema<ED>): {
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
                await checkerFn(data as Readonly<ED[T]['Create']['data']>, context);
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
                const { filter: operationFilter, data, action } = operation;
                const filter2 = typeof filter === 'function' ? await filter(operation, context, option) : filter;
                if (['select', 'count', 'stat'].includes(action)) {
                    operation.filter = combineFilters(entity, context.getSchema(), [operationFilter, filter2]);
                    return 0;
                }
                else {
                    const checkSingle = async (f: ED[T]['Update']['filter']) => {
                        if (await checkFilterContains<ED, keyof ED, Cxt>(entity, context, filter2, f, true)) {
                            return;
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
                    };
                    let operationFilter2 = operationFilter;
                    if (action === 'create') {
                        // 后台进行创建检查时，以传入的data为准
                        assert(data);
                        if (data instanceof Array) {
                            for (const d of <ED[T]['CreateMulti']['data']>data) {
                                await checkSingle(translateCreateDataToFilter(schema, entity, d))
                            }
                        }
                        else {
                            await checkSingle(translateCreateDataToFilter(schema, entity, <ED[T]['CreateSingle']['data']><unknown>data))
                        }
                        return;
                    }
                    assert(operationFilter2, 'row类型的checker遇到了操作的filter未定义');
                    await checkSingle(operationFilter2);
                    return 0;
                }
            }) as UpdateTriggerInTxn<ED, T, Cxt>['fn'];
            return {
                fn,
                when,
            };
        }
        case 'logical':
        case 'logicalData': {
            const { checker: checkerFn } = checker;
            const fn = (async ({ operation }, context, option) => {
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
>(checker: Checker<ED, T, Cxt>, schema: StorageSchema<ED>): {
    fn: (operation: ED[T]['Operation'], context: Cxt, option: OperateOption | SelectOption) => void;
    when: 'before' | 'after';
} {
    const { entity, type } = checker;
    const when = 'before';      // 现在create的relation改成提前的expression检查了，原先是先插入再后检查，性能不行，而且select也需要实现前检查
    switch (type) {
        case 'data': {
            const { checker: checkerFn } = checker;
            const fn = (operation: ED[T]['Operation'], context: Cxt) => checkerFn(operation.data as Readonly<ED[T]['Create']['data']>, context);
            return {
                fn,
                when,
            }
        }
        case 'row': {
            const { filter, errMsg, entity } = checker;
            const fn = (operation: ED[T]['Operation'], context: Cxt, option: OperateOption | SelectOption) => {
                const { filter: operationFilter, data, action } = operation;
                const filter2 = typeof filter === 'function' ? filter(operation, context, option) : filter;
                let operationFilter2 = operationFilter;
                if (action === 'create') {
                    if (data) {
                        // 前端的策略是，有data用data，无data用filter
                        // 目前前端应该不可能制造出来createMultiple
                        assert(!(data instanceof Array));
                        operationFilter2 = translateCreateDataToFilter(schema, entity, data as ED[T]['CreateSingle']['data']);                        
                    }
                }                
                assert(!(filter2 instanceof Promise));
                assert(operationFilter2, '定义了row类型的checker但却进行了无filter操作')
                if (checkFilterContains<ED, T, Cxt>(entity, context, filter2, operationFilter2, true)) {
                    return;
                }
                const e = new OakRowInconsistencyException(undefined, errMsg || 'row checker condition illegal');
                throw e;
            };
            return {
                fn,
                when,
            };
        }
        case 'logical':
        case 'logicalData': {
            const { checker: checkerFn } = checker;
            const fn = (operation: ED[T]['Operation'], context: Cxt, option: OperateOption | SelectOption) => {               
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
                        }, { dontCollect: true, ignoreAttrMiss: true });
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
                        }, { dontCollect: true, ignoreAttrMiss: true });
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
                        throw new OakInputIllegalException(entity, [attr], 'not in enumeration');
                    }
                    break;
                }
            }
        }
        else {
            // 这里似乎还有一种update中带cascade remove的case，等遇到再说（貌似cascadeUpdate没有处理完整这种情况） by Xc
            if (typeof data[attr] === 'object' && data[attr]?.action === 'remove') {
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
                    const illegalNullAttrs = difference(notNullAttrs, Object.keys(data2).filter(ele => data2[ele] !== null));
                    if (illegalNullAttrs.length > 0) {
                        const emtpyAttrs: string[] = [];
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
                                const attr2 = attr.slice(0, attr.length - 2);
                                if (data2[attr2] && data2[attr2].action === 'create') {
                                    continue;
                                }
                            }
                            // 到这里说明确实是有not null的属性没有赋值
                            emtpyAttrs.push(attr);
                        }
                        if (emtpyAttrs.length > 0) {
                            throw new OakAttrNotNullException(entity, emtpyAttrs);
                        }
                    }
                    checkAttributeLegal(schema, entity, data2);
                };
                if (data instanceof Array) {
                    (data as Readonly<ED[keyof ED]['CreateMulti']['data']>).forEach(
                        ele => checkData(ele)
                    );
                }
                else {
                    checkData(data as Readonly<ED[keyof ED]['CreateSingle']['data']>);
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