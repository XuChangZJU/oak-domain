export const LIB_OAK_DOMAIN = 'oak-domain';
const LIB_OAK_GENERAL_BUSINESS = 'oak-general-business';
export const ROOT_PATH_IN_OAK_DOMAIN = () => 'lib';

const LEVEL_PREFIX = ['.', '..', '../..', '../../..', '../../../..'];

export const ENTITY_PATH_IN_OAK_GENERAL_BUSINESS = () => {
    return `${LIB_OAK_GENERAL_BUSINESS}/${ROOT_PATH_IN_OAK_DOMAIN()}/entities/`;
}

export const TYPE_PATH_IN_OAK_DOMAIN = () => {
    return `${LIB_OAK_DOMAIN}/${ROOT_PATH_IN_OAK_DOMAIN()}/types/`;
}
export const ACTION_CONSTANT_IN_OAK_DOMAIN = () => {
    return `${LIB_OAK_DOMAIN}/${ROOT_PATH_IN_OAK_DOMAIN()}/actions/action`;
}

// export const OUTPUT_PATH = 'app-domain/entities';

export const RESERVED_ENTITIES = ['Schema', 'Filter', 'Query', 'SubQuery', 'Entity', 'Selection', 'Operation', 'File', 'Common', 'Locale', 'Projection', 'Data'];
export const STRING_LITERAL_MAX_LENGTH = 16;
export const NUMERICAL_LITERL_DEFAULT_PRECISION = 8;
export const NUMERICAL_LITERL_DEFAULT_SCALE = 2;
export const INT_LITERL_DEFAULT_WIDTH = 4;