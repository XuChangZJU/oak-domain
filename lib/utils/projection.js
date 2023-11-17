"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.makeProjection = void 0;
const Entity_1 = require("../types/Entity");
function makeProjection(entity, schema) {
    const { attributes } = schema[entity];
    const attrs = Object.keys(attributes);
    attrs.push(Entity_1.PrimaryKeyAttribute, Entity_1.CreateAtAttribute, Entity_1.UpdateAtAttribute, Entity_1.DeleteAtAttribute);
    const projection = {};
    attrs.forEach((attr) => Object.assign(projection, {
        [attr]: 1,
    }));
    return projection;
}
exports.makeProjection = makeProjection;
