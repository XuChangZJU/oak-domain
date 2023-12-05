import { EntityDict } from '../types/Entity';
import { EntityDict as BaseEntityDict } from '../base-app-domain';
import { AsyncContext } from '../store/AsyncRowStore';
import { vaccumEntities } from './vaccum';
import { combineFilters } from '../store/filter';

export type VaccumOperOption<ED extends EntityDict & BaseEntityDict> = {
    aliveLine: number;
    excludeOpers?: {
        [T in keyof ED]?: ED[T]['Action'][];
    };
    backupDir?: string;
    zip?: boolean;
};

/**
 * 将一定日期之前的oper对象清空
 * @param option 
 * @param context 
 * @returns 
 */
export async function vaccumOper<ED extends EntityDict & BaseEntityDict, Cxt extends AsyncContext<ED>>(option: VaccumOperOption<ED>, context: Cxt) {
    const { aliveLine, excludeOpers, ...rest } = option;

    const operFilter: ED['oper']['Selection']['filter'] = {};
    if (excludeOpers) {
        const notFilters: ED['oper']['Selection']['filter'][] = [];
        for (const key in excludeOpers) {
            if (excludeOpers[key]!.length > 0) {
                notFilters.push({
                    targetEntity: key,
                    action: {
                        $in: excludeOpers[key],
                    }
                } as ED['oper']['Selection']['filter']);
            }
            else {
                notFilters.push({
                    targetEntity: key,
                });
            }
        }
        if (notFilters.length > 0) {
            operFilter.$not = {
                $or: notFilters as NonNullable<ED['oper']['Selection']['filter']>[],
            };
        }
    }
    return vaccumEntities({
        entities: [{
            entity: 'operEntity',
            aliveLine: aliveLine + 10000,
            filter: {
                oper: combineFilters('operEntity', context.getSchema(), [operFilter, {
                    $$createAt$$: {
                        $lt: aliveLine,
                    }
                }]),
            },
        }, {
            entity: 'oper',
            aliveLine,
            filter: operFilter,
        }],
        ...rest,
    }, context);
}