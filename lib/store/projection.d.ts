import { StorageSchema } from '../types';
import { EntityDict } from '../types/Entity';
/**
 * 对selection进行一些完善，避免编程人员的疏漏
 * @param selection
 */
export declare function reinforceSelection<ED extends EntityDict>(schema: StorageSchema<ED>, entity: keyof ED, selection: ED[keyof ED]['Selection']): void;
