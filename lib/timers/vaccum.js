"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.vaccumEntities = void 0;
var tslib_1 = require("tslib");
var dayjs_1 = tslib_1.__importDefault(require("dayjs"));
var fs_1 = require("fs");
var filter_1 = require("../store/filter");
var node_zlib_1 = require("node:zlib");
var stream_1 = require("stream");
var uuid_1 = require("../utils/uuid");
/**
 * 删除数据库中的部分数据，减少体积
 * 一般只删除日志类数据
 * @param option
 */
function vaccumEntities(option, context) {
    return tslib_1.__awaiter(this, void 0, void 0, function () {
        var entities, backupDir, _loop_1, entities_1, entities_1_1, ele, e_1_1;
        var e_1, _a;
        var _this = this;
        return tslib_1.__generator(this, function (_b) {
            switch (_b.label) {
                case 0:
                    entities = option.entities, backupDir = option.backupDir;
                    _loop_1 = function (ele) {
                        var entity, filter, aliveLine, filter2, zip, now, backFile, fd_1, attributes_1, projection_1, attr, count_1, appendData_1, gzip_1, source_1, destination_1, _c, _d, _e;
                        var _f, _g;
                        return tslib_1.__generator(this, function (_h) {
                            switch (_h.label) {
                                case 0:
                                    entity = ele.entity, filter = ele.filter, aliveLine = ele.aliveLine;
                                    filter2 = {
                                        $$createAt$$: {
                                            $lt: aliveLine,
                                        },
                                    };
                                    if (filter) {
                                        filter2 = (0, filter_1.combineFilters)([filter2, filter]);
                                    }
                                    if (!backupDir) return [3 /*break*/, 4];
                                    zip = option.zip;
                                    now = (0, dayjs_1.default)();
                                    backFile = "".concat(backupDir, "/").concat(entity, "-").concat(now.format('YYYY-MM-DD HH:mm:ss'), ".csv");
                                    if ((0, fs_1.existsSync)(backFile)) {
                                        (0, fs_1.rmSync)(backFile);
                                    }
                                    fd_1 = (0, fs_1.openSync)(backFile, 'a');
                                    attributes_1 = ['id', '$$createAt$$', '$$updateAt$$', '$$deleteAt$$'];
                                    projection_1 = {
                                        id: 1,
                                        $$createAt$$: 1,
                                        $$updateAt$$: 1,
                                        $$deleteAt$$: 1,
                                    };
                                    for (attr in context.getSchema()[entity].attributes) {
                                        Object.assign(projection_1, (_f = {},
                                            _f[attr] = 1,
                                            _f));
                                        attributes_1.push(attr);
                                    }
                                    (0, fs_1.appendFileSync)(fd_1, attributes_1.join(','));
                                    (0, fs_1.appendFileSync)(fd_1, '\n');
                                    count_1 = 0;
                                    appendData_1 = function (minCreateAt) { return tslib_1.__awaiter(_this, void 0, void 0, function () {
                                        var filter3, rows, csvTxt, maxCreateAt;
                                        return tslib_1.__generator(this, function (_a) {
                                            switch (_a.label) {
                                                case 0:
                                                    filter3 = (0, filter_1.combineFilters)([filter2, {
                                                            $$createAt$$: {
                                                                $gt: minCreateAt,
                                                            },
                                                        }]);
                                                    return [4 /*yield*/, context.select(entity, {
                                                            data: projection_1,
                                                            filter: filter3,
                                                            sorter: [{
                                                                    $attr: {
                                                                        $$createAt$$: 1,
                                                                    },
                                                                    $direction: 'asc'
                                                                }],
                                                            indexFrom: 0,
                                                            count: 1000,
                                                        }, { includedDeleted: true })];
                                                case 1:
                                                    rows = _a.sent();
                                                    csvTxt = rows.map(function (row) { return attributes_1.map(function (attr) { return JSON.stringify(row[attr]); }).join(','); }).join('\n');
                                                    (0, fs_1.appendFileSync)(fd_1, csvTxt);
                                                    (0, fs_1.appendFileSync)(fd_1, '\n');
                                                    count_1 += rows.length;
                                                    if (rows.length === 1000) {
                                                        maxCreateAt = rows[999].$$createAt$$;
                                                        return [2 /*return*/, appendData_1(maxCreateAt)];
                                                    }
                                                    return [2 /*return*/];
                                            }
                                        });
                                    }); };
                                    return [4 /*yield*/, appendData_1(0)];
                                case 1:
                                    _h.sent();
                                    (0, fs_1.closeSync)(fd_1);
                                    console.log("\u5907\u4EFD".concat(entity, "\u5BF9\u8C61\u5B8C\u6BD5\uFF0C\u5171\u5907\u4EFD\u4E86").concat(count_1, "\u884C\u6570\u636E"));
                                    if (!(count_1 === 0)) return [3 /*break*/, 2];
                                    (0, fs_1.rmSync)(backFile);
                                    return [3 /*break*/, 4];
                                case 2:
                                    if (!zip) return [3 /*break*/, 4];
                                    gzip_1 = (0, node_zlib_1.createGzip)();
                                    source_1 = (0, fs_1.createReadStream)(backFile);
                                    destination_1 = (0, fs_1.createWriteStream)("".concat(backFile, ".zip"));
                                    return [4 /*yield*/, new Promise(function (resolve, reject) {
                                            (0, stream_1.pipeline)(source_1, gzip_1, destination_1, function (err) {
                                                if (err) {
                                                    reject(err);
                                                }
                                                else {
                                                    resolve(undefined);
                                                }
                                            });
                                        })];
                                case 3:
                                    _h.sent();
                                    _h.label = 4;
                                case 4:
                                    _d = (_c = context).operate;
                                    _e = [entity];
                                    _g = {};
                                    return [4 /*yield*/, (0, uuid_1.generateNewIdAsync)()];
                                case 5: 
                                // 将对应的数据删除
                                return [4 /*yield*/, _d.apply(_c, _e.concat([(_g.id = _h.sent(),
                                            _g.action = 'remove',
                                            _g.data = {},
                                            _g.filter = filter2,
                                            _g), { deletePhysically: true }]))];
                                case 6:
                                    // 将对应的数据删除
                                    _h.sent();
                                    return [2 /*return*/];
                            }
                        });
                    };
                    _b.label = 1;
                case 1:
                    _b.trys.push([1, 6, 7, 8]);
                    entities_1 = tslib_1.__values(entities), entities_1_1 = entities_1.next();
                    _b.label = 2;
                case 2:
                    if (!!entities_1_1.done) return [3 /*break*/, 5];
                    ele = entities_1_1.value;
                    return [5 /*yield**/, _loop_1(ele)];
                case 3:
                    _b.sent();
                    _b.label = 4;
                case 4:
                    entities_1_1 = entities_1.next();
                    return [3 /*break*/, 2];
                case 5: return [3 /*break*/, 8];
                case 6:
                    e_1_1 = _b.sent();
                    e_1 = { error: e_1_1 };
                    return [3 /*break*/, 8];
                case 7:
                    try {
                        if (entities_1_1 && !entities_1_1.done && (_a = entities_1.return)) _a.call(entities_1);
                    }
                    finally { if (e_1) throw e_1.error; }
                    return [7 /*endfinally*/];
                case 8: return [2 /*return*/];
            }
        });
    });
}
exports.vaccumEntities = vaccumEntities;
