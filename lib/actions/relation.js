"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.convertHierarchyToAuth = void 0;
var tslib_1 = require("tslib");
function convertHierarchyToAuth(hierarchy) {
    var e_1, _a;
    var _b;
    var reverseHierarchy = {};
    for (var r in hierarchy) {
        try {
            for (var _c = (e_1 = void 0, tslib_1.__values(hierarchy[r])), _d = _c.next(); !_d.done; _d = _c.next()) {
                var r2 = _d.value;
                if (reverseHierarchy[r2]) {
                    (_b = reverseHierarchy[r2]) === null || _b === void 0 ? void 0 : _b.push(r);
                }
                else {
                    reverseHierarchy[r2] = [r];
                }
            }
        }
        catch (e_1_1) { e_1 = { error: e_1_1 }; }
        finally {
            try {
                if (_d && !_d.done && (_a = _c.return)) _a.call(_c);
            }
            finally { if (e_1) throw e_1.error; }
        }
    }
    var result = {};
    for (var r in reverseHierarchy) {
        result[r] = {
            cascadePath: '',
            relations: reverseHierarchy[r],
        };
    }
    return result;
}
exports.convertHierarchyToAuth = convertHierarchyToAuth;
