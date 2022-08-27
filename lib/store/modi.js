"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createOperationsFromModies = void 0;
function createOperationsFromModies(modies) {
    return modies.map(function (modi) {
        return {
            entity: modi.targetEntity,
            operation: {
                id: modi.id,
                action: modi.action,
                data: modi.data,
                filter: modi.filter,
            }
        };
    });
}
exports.createOperationsFromModies = createOperationsFromModies;
