import { unset } from 'lodash';
import { buildSchema, analyzeEntities } from '../src/compiler/schemalBuilder';

process.env.NODE_ENV = 'development';
process.env.TARGET_IN_OAK_DOMAIN = 'yes';
process.env.COMPILING_BASE_DOMAIN = 'yes';
analyzeEntities('src/entities');
unset(process.env, 'COMPILING_BASE_DOMAIN');
buildSchema('src/base-domain/');
unset(process.env, 'TARGET_IN_OAK_DOMAIN');
