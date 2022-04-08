"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.NUMERICAL_LITERL_DEFAULT_SCALE = exports.NUMERICAL_LITERL_DEFAULT_PRECISION = exports.STRING_LITERAL_MAX_LENGTH = exports.RESERVED_ENTITIES = exports.ACTION_CONSTANT_IN_OAK_DOMAIN = exports.TYPE_PATH_IN_OAK_DOMAIN = exports.ENTITY_PATH_IN_OAK_GENERAL_BUSINESS = exports.ROOT_PATH_IN_OAK_DOMAIN = exports.LIB_OAK_DOMAIN = void 0;
exports.LIB_OAK_DOMAIN = 'oak-domain';
const LIB_OAK_GENERAL_BUSINESS = 'oak-general-business';
const ROOT_PATH_IN_OAK_DOMAIN = () => 'lib';
exports.ROOT_PATH_IN_OAK_DOMAIN = ROOT_PATH_IN_OAK_DOMAIN;
const LEVEL_PREFIX = ['.', '..', '../..', '../../..', '../../../..'];
const ENTITY_PATH_IN_OAK_GENERAL_BUSINESS = () => {
    return `${LIB_OAK_GENERAL_BUSINESS}/${(0, exports.ROOT_PATH_IN_OAK_DOMAIN)()}/entities/`;
};
exports.ENTITY_PATH_IN_OAK_GENERAL_BUSINESS = ENTITY_PATH_IN_OAK_GENERAL_BUSINESS;
const TYPE_PATH_IN_OAK_DOMAIN = () => {
    return `${exports.LIB_OAK_DOMAIN}/${(0, exports.ROOT_PATH_IN_OAK_DOMAIN)()}/types/`;
};
exports.TYPE_PATH_IN_OAK_DOMAIN = TYPE_PATH_IN_OAK_DOMAIN;
const ACTION_CONSTANT_IN_OAK_DOMAIN = () => {
    return `${exports.LIB_OAK_DOMAIN}/${(0, exports.ROOT_PATH_IN_OAK_DOMAIN)()}/actions/action`;
};
exports.ACTION_CONSTANT_IN_OAK_DOMAIN = ACTION_CONSTANT_IN_OAK_DOMAIN;
// export const OUTPUT_PATH = 'app-domain/entities';
exports.RESERVED_ENTITIES = ['Schema', 'Filter', 'Query', 'SubQuery', 'Entity', 'Selection', 'Operation', 'File'];
exports.STRING_LITERAL_MAX_LENGTH = 16;
exports.NUMERICAL_LITERL_DEFAULT_PRECISION = 8;
exports.NUMERICAL_LITERL_DEFAULT_SCALE = 2;
