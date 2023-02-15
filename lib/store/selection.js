"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.reinforceOperation = exports.reinforceSelection = exports.registerOperationRewriter = exports.registerSelectionRewriter = void 0;
var tslib_1 = require("tslib");
var assert_1 = tslib_1.__importDefault(require("assert"));
var types_1 = require("../types");
var Demand_1 = require("../types/Demand");
var filter_1 = require("./filter");
var relation_1 = require("./relation");
var SelectionRewriters = [];
function registerSelectionRewriter(rewriter) {
    SelectionRewriters.push(rewriter);
}
exports.registerSelectionRewriter = registerSelectionRewriter;
function getSelectionRewriters() {
    return SelectionRewriters;
}
var OperationRewriters = [];
function registerOperationRewriter(rewriter) {
    OperationRewriters.push(rewriter);
}
exports.registerOperationRewriter = registerOperationRewriter;
function getOperationRewriters() {
    return OperationRewriters;
}
/**
 * 对selection进行一些完善，避免编程人员的疏漏
 * @param selection
 */
function reinforceSelection(schema, entity, selection) {
    var filter = selection.filter, data = selection.data, sorter = selection.sorter;
    var checkNode = function (projectionNode, attrs) {
        attrs.forEach(function (attr) {
            var _a;
            if (!projectionNode.hasOwnProperty(attr)) {
                Object.assign(projectionNode, (_a = {},
                    _a[attr] = 1,
                    _a));
            }
        });
    };
    var relevantIds = [];
    if (filter) {
        var toBeAssignNode_1 = {}; // 用来记录在表达式中涉及到的结点
        // filter当中所关联到的属性必须在projection中
        var filterNodeDict_1 = {};
        var checkFilterNode_1 = function (entity2, filterNode, projectionNode) {
            var _a, e_1, _b, _c, _d, _e, _f;
            var necessaryAttrs = ['id'];
            for (var attr in filterNode) {
                if (attr === '#id') {
                    (0, assert_1.default)(!filterNodeDict_1[filterNode[attr]], "projection\u4E2D\u7ED3\u70B9\u7684id\u6709\u91CD\u590D, ".concat(filterNode[attr]));
                    Object.assign(filterNodeDict_1, (_a = {},
                        _a[filterNode[attr]] = projectionNode,
                        _a));
                    if (toBeAssignNode_1[filterNode[attr]]) {
                        checkNode(projectionNode, toBeAssignNode_1[filterNode[attr]]);
                    }
                }
                else if (['$and', '$or'].includes(attr)) {
                    try {
                        for (var _g = (e_1 = void 0, tslib_1.__values(filterNode[attr])), _h = _g.next(); !_h.done; _h = _g.next()) {
                            var node = _h.value;
                            checkFilterNode_1(entity2, node, projectionNode);
                        }
                    }
                    catch (e_1_1) { e_1 = { error: e_1_1 }; }
                    finally {
                        try {
                            if (_h && !_h.done && (_b = _g.return)) _b.call(_g);
                        }
                        finally { if (e_1) throw e_1.error; }
                    }
                }
                else if (attr === '$not') {
                    checkFilterNode_1(entity2, filterNode[attr], projectionNode);
                }
                else if (attr === '$text') {
                    // 全文检索首先要有fulltext索引，其次要把fulltext的相关属性加到projection里
                    var indexes = schema[entity2].indexes;
                    var fulltextIndex = indexes.find(function (ele) { return ele.config && ele.config.type === 'fulltext'; });
                    var attributes = fulltextIndex.attributes;
                    necessaryAttrs.push.apply(necessaryAttrs, tslib_1.__spreadArray([], tslib_1.__read((attributes.map(function (ele) { return ele.name; }))), false));
                }
                else {
                    if (attr.toLowerCase().startsWith(Demand_1.EXPRESSION_PREFIX)) {
                        var exprResult = (0, types_1.getAttrRefInExpression)(filterNode[attr]);
                        for (var nodeName in exprResult) {
                            if (nodeName === '#current') {
                                checkNode(projectionNode, exprResult[nodeName]);
                            }
                            else if (filterNodeDict_1[nodeName]) {
                                checkNode(filterNodeDict_1[nodeName], exprResult[nodeName]);
                            }
                            else {
                                if (toBeAssignNode_1[nodeName]) {
                                    (_c = toBeAssignNode_1[nodeName]).push.apply(_c, tslib_1.__spreadArray([], tslib_1.__read(exprResult[nodeName]), false));
                                }
                                else {
                                    Object.assign(toBeAssignNode_1, (_d = {},
                                        _d[nodeName] = exprResult[nodeName],
                                        _d));
                                }
                            }
                        }
                    }
                    else {
                        var rel = (0, relation_1.judgeRelation)(schema, entity2, attr);
                        if (rel === 1) {
                            necessaryAttrs.push(attr);
                        }
                        else if (rel === 2) {
                            // entity/entityId反指
                            necessaryAttrs.push('entity', 'entityId');
                            if (!projectionNode[attr]) {
                                Object.assign(projectionNode, (_e = {},
                                    _e[attr] = {
                                        id: 1,
                                    },
                                    _e));
                            }
                            checkFilterNode_1(attr, filterNode[attr], projectionNode[attr]);
                        }
                        else if (typeof rel === 'string') {
                            necessaryAttrs.push("".concat(attr, "Id"));
                            if (!projectionNode[attr]) {
                                Object.assign(projectionNode, (_f = {},
                                    _f[attr] = {
                                        id: 1,
                                    },
                                    _f));
                            }
                            checkFilterNode_1(rel, filterNode[attr], projectionNode[attr]);
                        }
                        else if (rel instanceof Array) {
                            // 现在filter中还不支持一对多的语义，先放着吧
                        }
                    }
                }
                checkNode(projectionNode, necessaryAttrs);
            }
        };
        checkFilterNode_1(entity, filter, data);
        relevantIds = (0, filter_1.getRelevantIds)(filter);
    }
    // sorter感觉现在取不取影响不大，前端的list直接获取返回的ids了，先不管之
    if (sorter) {
    }
    var toBeAssignNode2 = {}; // 用来记录在表达式中涉及到的结点
    var projectionNodeDict = {};
    var checkProjectionNode = function (entity2, projectionNode) {
        var _a, _b, _c;
        var necessaryAttrs = ['id', '$$createAt$$']; // 有的页面依赖于其它页面取数据，有时两个页面的filter的差异会导致有一个加createAt，有一个不加，此时可能产生前台取数据不完整的异常。先统一加上
        for (var attr in projectionNode) {
            if (attr === '#id') {
                (0, assert_1.default)(!projectionNodeDict[projectionNode[attr]], "projection\u4E2D\u7ED3\u70B9\u7684id\u6709\u91CD\u590D, ".concat(projectionNode[attr]));
                Object.assign(projectionNodeDict, (_a = {},
                    _a[projectionNode[attr]] = projectionNode,
                    _a));
                if (toBeAssignNode2[projectionNode[attr]]) {
                    checkNode(projectionNode, toBeAssignNode2[projectionNode[attr]]);
                }
            }
            else {
                if (attr.toLowerCase().startsWith(Demand_1.EXPRESSION_PREFIX)) {
                    var exprResult = (0, types_1.getAttrRefInExpression)(projectionNode[attr]);
                    for (var nodeName in exprResult) {
                        if (nodeName === '#current') {
                            checkNode(projectionNode, exprResult[nodeName]);
                        }
                        else if (projectionNodeDict[nodeName]) {
                            checkNode(projectionNodeDict[nodeName], exprResult[nodeName]);
                        }
                        else {
                            if (toBeAssignNode2[nodeName]) {
                                (_b = toBeAssignNode2[nodeName]).push.apply(_b, tslib_1.__spreadArray([], tslib_1.__read(exprResult[nodeName]), false));
                            }
                            else {
                                Object.assign(toBeAssignNode2, (_c = {},
                                    _c[nodeName] = exprResult[nodeName],
                                    _c));
                            }
                        }
                    }
                }
                else {
                    var rel = (0, relation_1.judgeRelation)(schema, entity2, attr);
                    if (rel === 1) {
                        necessaryAttrs.push(attr);
                    }
                    else if (rel === 2) {
                        // entity/entityId反指
                        necessaryAttrs.push('entity', 'entityId');
                        checkProjectionNode(attr, projectionNode[attr]);
                    }
                    else if (typeof rel === 'string') {
                        necessaryAttrs.push("".concat(attr, "Id"));
                        checkProjectionNode(rel, projectionNode[attr]);
                    }
                    else if (rel instanceof Array && !attr.endsWith('$$aggr')) {
                        var data_1 = projectionNode[attr].data;
                        if (rel[1]) {
                            checkNode(data_1, [rel[1]]);
                        }
                        else {
                            checkNode(data_1, ['entity', 'entityId']);
                        }
                        reinforceSelection(schema, rel[0], projectionNode[attr]);
                    }
                }
            }
            checkNode(projectionNode, necessaryAttrs);
        }
        // 如果对象中指向一对多的Modi，此时加上指向Modi的projection
        if (schema[entity2].toModi) {
            Object.assign(projectionNode, {
                modi$entity: {
                    $entity: 'modi',
                    data: {
                        id: 1,
                        targetEntity: 1,
                        entity: 1,
                        entityId: 1,
                        action: 1,
                        iState: 1,
                        data: 1,
                        filter: 1,
                    },
                    filter: {
                        iState: 'active',
                    },
                }
            });
        }
    };
    checkProjectionNode(entity, data);
    if (!sorter && relevantIds.length === 0) {
        // 如果没有sorter，就给予一个按createAt逆序的sorter
        Object.assign(selection, {
            sorter: [
                {
                    $attr: {
                        $$createAt$$: 1,
                    },
                    $direction: 'desc',
                }
            ]
        });
        Object.assign(data, {
            $$createAt$$: 1,
        });
    }
    SelectionRewriters.forEach(function (ele) { return ele(schema, entity, selection); });
}
exports.reinforceSelection = reinforceSelection;
/**
 * 对operation进行一些完善，作为operation算子的注入点
 * @param schema
 * @param entity
 * @param selection
 */
function reinforceOperation(schema, entity, operation) {
    OperationRewriters.forEach(function (ele) { return ele(schema, entity, operation); });
}
exports.reinforceOperation = reinforceOperation;
