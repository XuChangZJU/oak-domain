"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.isRefAttrNode = exports.EXPRESSION_PREFIX = void 0;
exports.EXPRESSION_PREFIX = '$expr';
function isRefAttrNode(node) {
    return node.hasOwnProperty('#attr') || (node.hasOwnProperty('#refId') && node.hasOwnProperty('#refAttr'));
}
exports.isRefAttrNode = isRefAttrNode;
;
