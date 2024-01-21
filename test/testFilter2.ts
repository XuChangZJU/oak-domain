import assert from 'assert';
import { combineFilters } from '../src/store/filter';
import { storageSchema, EntityDict } from '../src/base-app-domain';

let r = combineFilters<EntityDict, 'user'>('user', storageSchema, [
    {
        ref: {
            nickname: 'xc',
        },
    },
    {
        ref: {
            name: 'xc2',
        }
    }
]);
console.log(JSON.stringify(r));

r = combineFilters<EntityDict, 'user'>('user', storageSchema, [
    {
        ref: {
            nickname: 'xc',
        },
    },
    {
        ref: {
            name: 'xc2',
        }
    }
], true);
console.log(JSON.stringify(r));

r = combineFilters<EntityDict, 'user'>('user', storageSchema, [
    {
        $or: [
            {
                password: '1234',
            },
            {
                ref: {
                    nickname: 'xc',
                },
            }
        ]
    },
    {
        ref: {
            name: 'xc2',
        }
    }
], true);
console.log(JSON.stringify(r));

r = combineFilters<EntityDict, 'user'>('user', storageSchema, [
    {
        $or: [
            {
                password: '1234',
            },
            {
                ref: {
                    nickname: 'xc',
                },
            }
        ]
    },
    {
        $or: [
            {
                ref: {
                    name: 'xc2',
                }
            },
            {
                password: 'dddd',
            }
        ]
    }
], true);

console.log(JSON.stringify(r));

r = combineFilters<EntityDict, 'user'>('user', storageSchema, [
    {
        user$ref: {
            id: 'bbb',
        },
    },
    {
        user$ref: {
            id: 'ccc',
        },
    }
]);

console.log(JSON.stringify(r));