export const LIB_OAK_DOMAIN = 'oak-domain';
export const ROOT_PATH_IN_OAK_DOMAIN = () => 'lib';

const LEVEL_PREFIX = ['.', '..', '../..', '../../..', '../../../..'];

export const ENTITY_PATH_IN_OAK_DOMAIN = () => {
    if (process.env.TARGET_IN_OAK_DOMAIN) {
        return './';
    }
    return `${LIB_OAK_DOMAIN}/${ROOT_PATH_IN_OAK_DOMAIN()}/entities/`;
}
export const ELEMENT_PATH_IN_OAK_DOMAIN = (level: number) => {
    if (process.env.TARGET_IN_OAK_DOMAIN) {
        return `${LEVEL_PREFIX[level]}/elements/`;
    }
    return `${LIB_OAK_DOMAIN}/${ROOT_PATH_IN_OAK_DOMAIN()}/elements/`;
}
export const TYPE_PATH_IN_OAK_DOMAIN = (level: number) => {
    if (process.env.TARGET_IN_OAK_DOMAIN) {
        return `${LEVEL_PREFIX[level]}/types/`;
    }
    return `${LIB_OAK_DOMAIN}/${ROOT_PATH_IN_OAK_DOMAIN()}/types/`;
}
export const ACTION_CONSTANT_IN_OAK_DOMAIN = (level: number) => {
    if (process.env.TARGET_IN_OAK_DOMAIN) {
        return `${LEVEL_PREFIX[level]}/actions/action`;
    }
    return `${LIB_OAK_DOMAIN}/${ROOT_PATH_IN_OAK_DOMAIN()}/actions/action`;
}

// export const OUTPUT_PATH = 'app-domain/entities';

export const RESERVED_ENTITIES = ['Schema', 'Filter', 'Query', 'SubQuery', 'Entity', 'Selection', 'Operation', 'File'];
export const STRING_LITERAL_MAX_LENGTH = 16;
export const NUMERICAL_LITERL_DEFAULT_PRECISION = 8;
export const NUMERICAL_LITERL_DEFAULT_SCALE = 2;