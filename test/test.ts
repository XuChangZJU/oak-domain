import merge from 'lodash/merge';

console.log(
    merge([{ a: 1 }, { a: 2 }], [null, { b: 2 }])
);