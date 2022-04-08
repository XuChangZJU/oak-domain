"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.combineFilters = exports.addFilterSegment = void 0;
const assert_1 = __importDefault(require("assert"));
const lodash_1 = require("lodash");
function addFilterSegment(segment, filter2) {
    const filter = filter2 ? (0, lodash_1.cloneDeep)(filter2) : {};
    (0, assert_1.default)(segment);
    if ((0, lodash_1.intersection)((0, lodash_1.keys)(filter), (0, lodash_1.keys)(segment)).length > 0) {
        if (filter.hasOwnProperty('$and')) {
            filter.$and.push(segment);
        }
        else {
            (0, lodash_1.assign)(filter, {
                $and: [segment],
            });
        }
    }
    else {
        (0, lodash_1.assign)(filter, segment);
    }
    return filter;
}
exports.addFilterSegment = addFilterSegment;
function combineFilters(filters) {
    return filters.reduce(addFilterSegment);
}
exports.combineFilters = combineFilters;
