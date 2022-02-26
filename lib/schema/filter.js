"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.addFilterSegment = void 0;
const console_1 = require("console");
const lodash_1 = require("lodash");
function addFilterSegment(segment, filter2) {
    const filter = filter2 ? (0, lodash_1.cloneDeep)(filter2) : {};
    (0, console_1.assert)(segment);
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
