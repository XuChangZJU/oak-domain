"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.convertHierarchyToAuth = void 0;
function convertHierarchyToAuth(entity, hierarchy) {
    const reverseHierarchy = {};
    for (const r in hierarchy) {
        for (const r2 of hierarchy[r]) {
            if (reverseHierarchy[r2]) {
                reverseHierarchy[r2]?.push(r);
            }
            else {
                reverseHierarchy[r2] = [r];
            }
        }
    }
    const result = {};
    for (const r in reverseHierarchy) {
        result[r] = {
            cascadePath: '',
            relations: reverseHierarchy[r],
        };
    }
    return result;
}
exports.convertHierarchyToAuth = convertHierarchyToAuth;
