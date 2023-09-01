import { groupBy } from '../src/utils/lodash';

const data = [
    {
        id: '113',
        name: 'xc',
        gender: 'male',
    },
    {
        id: '123',
        name: 'zz',
        gender: 'female',
    },
    {
        id: '1234',
        name: 'xzw',
        gender: 'female',
    },
    {
        id: '3321',
        name: null,
        gender: null
    }
];

console.log(JSON.stringify(groupBy(data, 'gender')));