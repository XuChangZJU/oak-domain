import assert from 'assert';
import { judgeValueRelation, contains, repel } from '../src/store/filter';
import { storageSchema } from '../src/base-app-domain';

/* 
assert(judgeValueRelation({ $gte: 2 }, { $gt: 2 }, false) === false);
assert(judgeValueRelation({ $gte: 'ddddd'}, { $lte: 'dddde'}, false) === false);
assert(judgeValueRelation({ $eq: 2}, {$lt: 1}, true) === false);
assert(judgeValueRelation({ $in: [1, 2, 3, 4]}, {$gt: 0}, true) === true);
assert(judgeValueRelation({ $in: [1, 2, 3, 4]}, {$gt: 4}, false) === true);
assert(judgeValueRelation(3, {$between: [1, 3]}, true) === true);
assert(judgeValueRelation({$in: [2, 3, 4]}, { $in: [2, 3]}, true) === false);
assert(judgeValueRelation({$in: [2, 3, 4]}, { $in: [ 2, 3, 4, 5]}, true) === true);
assert(judgeValueRelation({ $in: [2, 3, 4]}, {$exists: true}, true) === true);
assert(judgeValueRelation({ $in: [2, 3, 4]}, {$exists: false}, true) === false);
assert(judgeValueRelation({ $in: [2, 3, 4]}, {$exists: false}, false) === true);
assert(judgeValueRelation({ $nin: [2, 3, 4]}, {$exists: true}, true) === false);
assert(judgeValueRelation({ $nin: [2, 3, 4]}, {$exists: false}, true) === false);
assert(judgeValueRelation({ $nin: [2, 3, 4]}, {$exists: false}, false) === false);
assert(judgeValueRelation({ $startsWith: 'xuchang'}, {$startsWith: 'xuc'}, true) === true);
assert(judgeValueRelation({ $startsWith: 'xuchang'}, {$startsWith: 'xuchang2'}, true) === false);
assert(judgeValueRelation({ $startsWith: 'xuchang'}, {$startsWith: 'xu2c'}, false) === true);

assert(contains('operEntity', storageSchema, {
    entity: 'ddd',
    entityId: 'abc'
}, {
    entity: 'ddd',
}) === true);

assert(contains('modi', storageSchema, {
    entity: 'ddd',
    entityId: 'abc'
}, {
    entity: {
        $startsWith: 'dd',
    },
    entityId: 'abc',
}) === true);

assert(contains('modi', storageSchema, {
    entity: 'ddd',
    entityId: 'abc'
}, {
    entity: {
        $startsWith: 'dd',
    },
    entityId: 'abc',
    action: 'create',
}) === false);

assert(repel('modi', storageSchema, {
    entity: 'ddd',
    entityId: 'abc'
}, {
    entity: {
        $startsWith: 'dd',
    },
    entityId: 'abc',
    action: 'create',
}) === false);


assert(repel('modi', storageSchema, {
    entity: 'ddd',
    entityId: 'abc'
}, {
    entity: {
        $startsWith: 'zzz',
    },
    entityId: 'abc',
    action: 'create',
}) === true);

assert(repel('modi', storageSchema, {
    entity: 'ddd',
    entityId: 'abc'
}, {
    $not: {
        entity: 'ddd',
    }
}) === true);

assert(repel('modi', storageSchema, {
    $not: {
        entity: 'ddd',
        entityId: 'abc',
    },
}, {
    $not: {
        entity: 'ddd',
    }
}) === false);

assert(contains('modi', storageSchema, {
    $not: {
        entity: 'ddd',
        entityId: 'abc',
    },
}, {
    $not: {
        entity: 'ddd',
    }
}) === true);

assert(contains('modi', storageSchema, {
    $not: {
        entity: 'ddd',
        entityId: 'abc',
    },
}, {
    $not: {
        entity: 'ddd',
        entityId: 'ccc',
    }
}) === true);

assert(repel('modi', storageSchema, {
    $not: {
        entity: 'ddd',
        entityId: 'abc',
    },
}, {
    entity: 'ddd',
}) === true);


assert(repel('modi', storageSchema, {
    entityId: '888'
}, {
    entity: 'ddd',
}) === false);


assert(contains('modi', storageSchema, {
    entityId: '888'
}, {
    entity: 'ddd',
}) === false);
 */

// 有id的情况，应当构造出查询条件给上层（肉眼看下结果先）
let r = contains('modi', storageSchema, {
    id: 'bbccdd',
}, {
    entity: 'dddd',
});

// {"$and":[{"entity":"modi","filter":{"id":"bbccdd","$not":{"entity":"dddd"}}}]}
console.log(1, JSON.stringify(r));

r = repel('modiEntity', storageSchema, {
    modiId: 'cdcd',
}, {
    modi: {
        entity: 'dddd',
    }
});
// {"$or":[{"$or":[{"$or":[{"entity":"modi","filter":{"id":"cdcd","entity":"dddd"}}]}]}]}
console.log(2, JSON.stringify(r));

r = contains('modiEntity', storageSchema, {
    modi: {
        id: 'cdcde',
        entity: 'dddd',
        action: 'create',
    }
}, {
    modiId: 'cdcd',
});
// {"$and":[{"$or":[{"$and":[{"entity":"modi","filter":{"id":"cdcde","entity":"dddd","action":"create","$not":{"id":"cdcd"}}}]}]}]}
console.log(3, JSON.stringify(r));

r = contains('modiEntity', storageSchema, {
    modi: {
        id: 'cdcde',
        entity: 'dddd',
        action: 'create',
    },
    $$seq$$: 'xc',
}, {
    modiId: 'cdcd',
    $$seq$$: {
        $startsWith: 'xcc',
    },
});
// false。如果把$startsWith: 'xcc'改成$startsWith: 'x'，则和上面的返回结果一样
console.log(4, JSON.stringify(r));

r = contains('modiEntity', storageSchema, {
    entity: 'user',
    entityId: 'xc',
}, {
    user: {
        name: 'xcxc',
    }
});
// {"$and":[{"$or":[{"$and":[{"entity":"user","filter":{"id":"xc","$not":{"name":"xcxc"}}}]}]}]}
console.log(5, JSON.stringify(r));


r = contains('modiEntity', storageSchema, {
    entity: 'user',
    entityId: 'xc',
    modi: {
        id: 'cdcde',
        entity: 'dddd',
        action: 'create',
    },
}, {
    user: {
        name: 'xcxc',
    },
    modiId: 'cdcd',
});
// {"$and":[{"$or":[{"$and":[{"entity":"user","filter":{"id":"xc","$not":{"name":"xcxc"}}}]}]},{"$or":[{"$and":[{"entity":"modi","filter":{"id":"cdcde","entity":"dddd","action":"create","$not":{"id":"cdcd"}}}]}]}]}
console.log(6, JSON.stringify(r));

