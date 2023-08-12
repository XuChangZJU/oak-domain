"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SYSTEM_RESERVE_ENTITIES = exports.INT_LITERL_DEFAULT_WIDTH = exports.NUMERICAL_LITERL_DEFAULT_SCALE = exports.NUMERICAL_LITERL_DEFAULT_PRECISION = exports.STRING_LITERAL_MAX_LENGTH = exports.ENTITY_NAME_MAX_LENGTH = exports.RESERVED_ENTITY_NAMES = exports.ACTION_CONSTANT_IN_OAK_DOMAIN = exports.TYPE_PATH_IN_OAK_DOMAIN = exports.ENTITY_PATH_IN_OAK_DOMAIN = exports.ENTITY_PATH_IN_OAK_GENERAL_BUSINESS = exports.LIB_PATH = exports.LIB_OAK_DOMAIN = void 0;
exports.LIB_OAK_DOMAIN = 'oak-domain';
var LIB_OAK_GENERAL_BUSINESS = 'oak-general-business';
var LIB_PATH = function () { return 'lib'; };
exports.LIB_PATH = LIB_PATH;
var LEVEL_PREFIX = ['.', '..', '../..', '../../..', '../../../..'];
var ENTITY_PATH_IN_OAK_GENERAL_BUSINESS = function () {
    return "".concat(LIB_OAK_GENERAL_BUSINESS, "/").concat((0, exports.LIB_PATH)(), "/entities/");
};
exports.ENTITY_PATH_IN_OAK_GENERAL_BUSINESS = ENTITY_PATH_IN_OAK_GENERAL_BUSINESS;
var ENTITY_PATH_IN_OAK_DOMAIN = function () {
    return "".concat(exports.LIB_OAK_DOMAIN, "/").concat((0, exports.LIB_PATH)(), "/entities/");
};
exports.ENTITY_PATH_IN_OAK_DOMAIN = ENTITY_PATH_IN_OAK_DOMAIN;
var TYPE_PATH_IN_OAK_DOMAIN = function (level) {
    if (level === void 0) { level = 2; }
    if (process.env.COMPLING_IN_DOMAIN) {
        return "".concat(LEVEL_PREFIX[level], "/types/");
    }
    return "".concat(exports.LIB_OAK_DOMAIN, "/").concat((0, exports.LIB_PATH)(), "/types/");
};
exports.TYPE_PATH_IN_OAK_DOMAIN = TYPE_PATH_IN_OAK_DOMAIN;
var ACTION_CONSTANT_IN_OAK_DOMAIN = function (level) {
    if (level === void 0) { level = 2; }
    if (process.env.COMPLING_IN_DOMAIN) {
        return "".concat(LEVEL_PREFIX[level], "/actions/action");
    }
    return "".concat(exports.LIB_OAK_DOMAIN, "/").concat((0, exports.LIB_PATH)(), "/actions/action");
};
exports.ACTION_CONSTANT_IN_OAK_DOMAIN = ACTION_CONSTANT_IN_OAK_DOMAIN;
// export const OUTPUT_PATH = 'app-domain/entities';
exports.RESERVED_ENTITY_NAMES = ['Schema', 'Filter', 'Query', 'SubQuery', 'Entity', 'Selection', 'Operation', 'File', 'Common', 'Config', 'Configuration',
    'Locale', 'Projection', 'Data'];
exports.ENTITY_NAME_MAX_LENGTH = 32;
exports.STRING_LITERAL_MAX_LENGTH = 24;
exports.NUMERICAL_LITERL_DEFAULT_PRECISION = 8;
exports.NUMERICAL_LITERL_DEFAULT_SCALE = 2;
exports.INT_LITERL_DEFAULT_WIDTH = 4;
// 暂放在这儿
exports.SYSTEM_RESERVE_ENTITIES = ['user', 'relation', 'oper', 'operEntity', 'modi', 'modiEntity',
    'userRelation', 'actionAuth', 'relationAuth', 'relation', 'userEntityGrant'];
