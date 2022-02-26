"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.addFilterSegment = void 0;
const lodash_1 = require("lodash");
function addFilterSegment(filter, segment) {
    if ((0, lodash_1.intersection)((0, lodash_1.keys)(filter), (0, lodash_1.keys)(segment)).length > 0) {
        if (filter.$and) {
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
}
exports.addFilterSegment = addFilterSegment;
