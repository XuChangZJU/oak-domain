"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.NUMERICAL_LITERL_DEFAULT_SCALE = exports.NUMERICAL_LITERL_DEFAULT_PRECISION = exports.STRING_LITERAL_MAX_LENGTH = exports.RESERVED_ENTITIES = exports.ACTION_CONSTANT_IN_OAK_DOMAIN = exports.TYPE_PATH_IN_OAK_DOMAIN = exports.ELEMENT_PATH_IN_OAK_DOMAIN = exports.ENTITY_PATH_IN_OAK_DOMAIN = exports.ROOT_PATH_IN_OAK_DOMAIN = exports.LIB_OAK_DOMAIN = void 0;
exports.LIB_OAK_DOMAIN = 'oak-domain';
const ROOT_PATH_IN_OAK_DOMAIN = () => 'lib';
exports.ROOT_PATH_IN_OAK_DOMAIN = ROOT_PATH_IN_OAK_DOMAIN;
const LEVEL_PREFIX = ['.', '..', '../..', '../../..', '../../../..'];
const ENTITY_PATH_IN_OAK_DOMAIN = () => {
    if (process.env.TARGET_IN_OAK_DOMAIN) {
        return './';
    }
    return `${exports.LIB_OAK_DOMAIN}/${(0, exports.ROOT_PATH_IN_OAK_DOMAIN)()}/entities/`;
};
exports.ENTITY_PATH_IN_OAK_DOMAIN = ENTITY_PATH_IN_OAK_DOMAIN;
const ELEMENT_PATH_IN_OAK_DOMAIN = (level) => {
    if (process.env.TARGET_IN_OAK_DOMAIN) {
        return `${LEVEL_PREFIX[level]}/elements/`;
    }
    return `${exports.LIB_OAK_DOMAIN}/${(0, exports.ROOT_PATH_IN_OAK_DOMAIN)()}/elements/`;
};
exports.ELEMENT_PATH_IN_OAK_DOMAIN = ELEMENT_PATH_IN_OAK_DOMAIN;
const TYPE_PATH_IN_OAK_DOMAIN = (level) => {
    if (process.env.TARGET_IN_OAK_DOMAIN) {
        return `${LEVEL_PREFIX[level]}/types/`;
    }
    return `${exports.LIB_OAK_DOMAIN}/${(0, exports.ROOT_PATH_IN_OAK_DOMAIN)()}/types/`;
};
exports.TYPE_PATH_IN_OAK_DOMAIN = TYPE_PATH_IN_OAK_DOMAIN;
const ACTION_CONSTANT_IN_OAK_DOMAIN = (level) => {
    if (process.env.TARGET_IN_OAK_DOMAIN) {
        return `${LEVEL_PREFIX[level]}/actions/action`;
    }
    return `${exports.LIB_OAK_DOMAIN}/${(0, exports.ROOT_PATH_IN_OAK_DOMAIN)()}/actions/action`;
};
exports.ACTION_CONSTANT_IN_OAK_DOMAIN = ACTION_CONSTANT_IN_OAK_DOMAIN;
// export const OUTPUT_PATH = 'app-domain/entities';
exports.RESERVED_ENTITIES = ['Schema', 'Filter', 'Query', 'SubQuery', 'Entity', 'Selection', 'Operation', 'File'];
exports.STRING_LITERAL_MAX_LENGTH = 16;
exports.NUMERICAL_LITERL_DEFAULT_PRECISION = 8;
exports.NUMERICAL_LITERL_DEFAULT_SCALE = 2;
