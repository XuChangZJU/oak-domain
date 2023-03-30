"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.vaccumOper = void 0;
var tslib_1 = require("tslib");
var vaccum_1 = require("./vaccum");
var filter_1 = require("../store/filter");
/**
 * 将一定日期之前的oper对象清空
 * @param option
 * @param context
 * @returns
 */
function vaccumOper(option, context) {
    return tslib_1.__awaiter(this, void 0, void 0, function () {
        var aliveLine, excludeOpers, rest, operFilter, notFilters, key;
        return tslib_1.__generator(this, function (_a) {
            aliveLine = option.aliveLine, excludeOpers = option.excludeOpers, rest = tslib_1.__rest(option, ["aliveLine", "excludeOpers"]);
            operFilter = {};
            if (excludeOpers) {
                notFilters = [];
                for (key in excludeOpers) {
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
            return [2 /*return*/, (0, vaccum_1.vaccumEntities)(tslib_1.__assign({ entities: [{
                            entity: 'operEntity',
                            aliveLine: aliveLine + 10000,
                            filter: {
                                oper: (0, filter_1.combineFilters)([operFilter, {
                                        $$createAt$$: {
                                            $lt: aliveLine,
                                        }
                                    }]),
                            },
                        }, {
                            entity: 'oper',
                            aliveLine: aliveLine,
                            filter: operFilter,
                        }] }, rest), context)];
        });
    });
}
exports.vaccumOper = vaccumOper;
