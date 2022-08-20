import { unset } from 'lodash';
import { buildSchema, analyzeEntities } from '../src/compiler/schemalBuilder';

process.env.NODE_ENV = 'development';
process.env.COMPLING_AS_LIB = 'yes';
process.env.COMPLING_IN_DOMAIN = 'yes';
analyzeEntities('src/entities');
buildSchema('src/base-app-domain/');
unset(process.env, 'COMPLING_AS_LIB');
unset(process.env, 'COMPLING_IN_DOMAIN');
