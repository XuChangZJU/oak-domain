"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.vaccumOper = void 0;
const vaccum_1 = require("./vaccum");
const filter_1 = require("../store/filter");
/**
 * 将一定日期之前的oper对象清空
 * @param option
 * @param context
 * @returns
 */
async function vaccumOper(option, context) {
    const { aliveLine, excludeOpers, ...rest } = option;
    const operFilter = {};
    if (excludeOpers) {
        const notFilters = [];
        for (const key in excludeOpers) {
            if (excludeOpers[key].length > 0) {
                notFilters.push({
                    targetEntity: key,
                    action: {
                        $in: excludeOpers[key],
                    }
                });
            }
            else {
                notFilters.push({
                    targetEntity: key,
                });
            }
        }
        if (notFilters.length > 0) {
            operFilter.$not = {
                $or: notFilters,
            };
        }
    }
    return (0, vaccum_1.vaccumEntities)({
        entities: [{
                entity: 'operEntity',
                aliveLine: aliveLine + 10000,
                filter: {
                    oper: (0, filter_1.combineFilters)('operEntity', context.getSchema(), [operFilter, {
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
exports.vaccumOper = vaccumOper;
