import { StorageSchema } from '../types';
import { EntityDict } from '../types/Entity';
declare type SelectionRewriter<ED extends EntityDict> = (schema: StorageSchema<ED>, entity: keyof ED, selection: ED[keyof ED]['Selection']) => void;
export declare function registerSelectionRewriter<ED extends EntityDict>(rewriter: SelectionRewriter<ED>): void;
declare type OperationRewriter<ED extends EntityDict> = (schema: StorageSchema<ED>, entity: keyof ED, operate: ED[keyof ED]['Operation']) => void;
export declare function registerOperationRewriter<ED extends EntityDict>(rewriter: OperationRewriter<ED>): void;
/**
 * 对selection进行一些完善，避免编程人员的疏漏
 * @param selection
 */
export declare function reinforceSelection<ED extends EntityDict>(schema: StorageSchema<ED>, entity: keyof ED, selection: ED[keyof ED]['Selection']): void;
/**
 * 对operation进行一些完善，作为operation算子的注入点
 * @param schema
 * @param entity
 * @param selection
 */
export declare function reinforceOperation<ED extends EntityDict>(schema: StorageSchema<ED>, entity: keyof ED, operation: ED[keyof ED]['Operation']): void;
export {};
