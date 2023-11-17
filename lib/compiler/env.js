"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.OAK_EXTERNAL_LIBS_FILEPATH = exports.SYSTEM_RESERVE_ENTITIES = exports.INT_LITERL_DEFAULT_WIDTH = exports.NUMERICAL_LITERL_DEFAULT_SCALE = exports.NUMERICAL_LITERL_DEFAULT_PRECISION = exports.STRING_LITERAL_MAX_LENGTH = exports.ENTITY_NAME_MAX_LENGTH = exports.RESERVED_ENTITY_NAMES = exports.ACTION_CONSTANT_IN_OAK_DOMAIN = exports.TYPE_PATH_IN_OAK_DOMAIN = exports.ENTITY_PATH_IN_OAK_DOMAIN = exports.ENTITY_PATH_IN_OAK_GENERAL_BUSINESS = exports.LIB_PATH = exports.LIB_OAK_DOMAIN = void 0;
const tslib_1 = require("tslib");
const path_1 = tslib_1.__importDefault(require("path"));
exports.LIB_OAK_DOMAIN = 'oak-domain';
const LIB_OAK_GENERAL_BUSINESS = 'oak-general-business';
const LIB_PATH = () => 'lib';
exports.LIB_PATH = LIB_PATH;
const LEVEL_PREFIX = ['.', '..', '../..', '../../..', '../../../..'];
const ENTITY_PATH_IN_OAK_GENERAL_BUSINESS = () => {
    return `${LIB_OAK_GENERAL_BUSINESS}/${(0, exports.LIB_PATH)()}/entities/`;
};
exports.ENTITY_PATH_IN_OAK_GENERAL_BUSINESS = ENTITY_PATH_IN_OAK_GENERAL_BUSINESS;
const ENTITY_PATH_IN_OAK_DOMAIN = () => {
    return `${exports.LIB_OAK_DOMAIN}/${(0, exports.LIB_PATH)()}/entities/`;
};
exports.ENTITY_PATH_IN_OAK_DOMAIN = ENTITY_PATH_IN_OAK_DOMAIN;
const TYPE_PATH_IN_OAK_DOMAIN = (level = 2) => {
    if (process.env.COMPLING_IN_DOMAIN) {
        return `${LEVEL_PREFIX[level]}/types/`;
    }
    return `${exports.LIB_OAK_DOMAIN}/${(0, exports.LIB_PATH)()}/types/`;
};
exports.TYPE_PATH_IN_OAK_DOMAIN = TYPE_PATH_IN_OAK_DOMAIN;
const ACTION_CONSTANT_IN_OAK_DOMAIN = (level = 2) => {
    if (process.env.COMPLING_IN_DOMAIN) {
        return `${LEVEL_PREFIX[level]}/actions/action`;
    }
    return `${exports.LIB_OAK_DOMAIN}/${(0, exports.LIB_PATH)()}/actions/action`;
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
    'userRelation', 'actionAuth', 'relationAuth', 'relation', 'userEntityGrant', 'i18n'];
// 项目依赖的第三方oak lib配置文件所在的固定路径
const OAK_EXTERNAL_LIBS_FILEPATH = (path) => {
    return path_1.default.join(path, 'config/oakExternalLib.json');
};
exports.OAK_EXTERNAL_LIBS_FILEPATH = OAK_EXTERNAL_LIBS_FILEPATH;
