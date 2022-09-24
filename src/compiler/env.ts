export const LIB_OAK_DOMAIN = 'oak-domain';
const LIB_OAK_GENERAL_BUSINESS = 'oak-general-business';
export const LIB_PATH = () => 'lib';

const LEVEL_PREFIX = ['.', '..', '../..', '../../..', '../../../..'];

export const ENTITY_PATH_IN_OAK_GENERAL_BUSINESS = () => {
    return `${LIB_OAK_GENERAL_BUSINESS}/${LIB_PATH()}/entities/`;
}

export const ENTITY_PATH_IN_OAK_DOMAIN = () => {
    return `${LIB_OAK_DOMAIN}/${LIB_PATH()}/entities/`;
}

export const TYPE_PATH_IN_OAK_DOMAIN = (level = 2) => {
    if (process.env.COMPLING_IN_DOMAIN) {
        return `${LEVEL_PREFIX[level]}/types/`;
    }
    return `${LIB_OAK_DOMAIN}/${LIB_PATH()}/types/`;
}
export const ACTION_CONSTANT_IN_OAK_DOMAIN = (level = 2) => {
    if (process.env.COMPLING_IN_DOMAIN) {
        return `${LEVEL_PREFIX[level]}/actions/action`;
    }
    return `${LIB_OAK_DOMAIN}/${LIB_PATH()}/actions/action`;
}

// export const OUTPUT_PATH = 'app-domain/entities';

export const RESERVED_ENTITIES = ['Schema', 'Filter', 'Query', 'SubQuery', 'Entity', 'Selection', 'Operation', 'File', 'Common', 
'Locale', 'Projection', 'Data'];
export const STRING_LITERAL_MAX_LENGTH = 24;
export const NUMERICAL_LITERL_DEFAULT_PRECISION = 8;
export const NUMERICAL_LITERL_DEFAULT_SCALE = 2;
export const INT_LITERL_DEFAULT_WIDTH = 4;