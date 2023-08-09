import assert from 'assert';
import { judgeValueRelation, contains, repel } from '../src/store/filter';
import { storageSchema } from '../src/base-app-domain';


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
assert(judgeValueRelation({ $nin: [2, 3, 4]}, {$exists: true}, true) === undefined);
assert(judgeValueRelation({ $nin: [2, 3, 4]}, {$exists: false}, true) === undefined);
assert(judgeValueRelation({ $nin: [2, 3, 4]}, {$exists: false}, false) === false);
assert(judgeValueRelation({ $startsWith: 'xuchang'}, {$startsWith: 'xuc'}, true) === true);
assert(judgeValueRelation({ $startsWith: 'xuchang'}, {$startsWith: 'xuchang2'}, true) === undefined);
assert(judgeValueRelation({ $startsWith: 'xuchang'}, {$startsWith: 'xu2c'}, false) === true);

assert(contains('operEntity', storageSchema, {
    id: 'ddd',
    $$seq$$: 'abc'
}, {
    id: 'ddd',
}) === true);

assert(contains('modi', storageSchema, {
    id: 'ddd',
    $$seq$$: 'abc'
}, {
    id: {
        $startsWith: 'dd',
    },
    $$seq$$: 'abc',
}) === true);

assert(typeof contains('modi', storageSchema, {
    id: 'ddd',
    $$seq$$: 'abc'
}, {
    id: {
        $startsWith: 'dd',
    },
    $$seq$$: 'abc',
    action: 'create',
}) === 'object');

assert(typeof repel('modi', storageSchema, {
    id: 'ddd',
    $$seq$$: 'abc'
}, {
    id: {
        $startsWith: 'dd',
    },
    $$seq$$: 'abc',
    action: 'create',
}) === 'object');


assert(repel('modi', storageSchema, {
    id: 'ddd',
    $$seq$$: 'abc'
}, {
    id: {
        $startsWith: 'zzz',
    },
    $$seq$$: 'abc',
    action: 'create',
}) === true);

assert(repel('modi', storageSchema, {
    id: 'ddd',
    $$seq$$: 'abc'
}, {
    $not: {
        id: 'ddd',
    }
}) === true);

let rrr = repel('modi', storageSchema, {
    $not: {
        id: 'ddd',
        $$seq$$: 'abc',
    },
}, {
    $not: {
        id: 'ddd',
    }
});
assert(typeof rrr === 'object');

rrr = contains('modi', storageSchema, {
    $not: {
        id: 'ddd',
        $$seq$$: 'abc',
    },
}, {
    $not: {
        id: 'ddd',
    }
});
assert(typeof rrr === 'object');

rrr = contains('modi', storageSchema, {
    $not: {
        id: 'ddd',
        $$seq$$: 'abc',
    },
}, {
    $not: {
        id: 'ddd',
        $$seq$$: 'ccc',
    }
});
assert(typeof rrr === 'object');


rrr = contains('modi', storageSchema, {
    $not: {
        id: 'ddd',
    },
}, {
    $not: {
        id: 'ddd',
        $$seq$$: 'abc',
    }
});
assert(rrr === true);

rrr = repel('modi', storageSchema, {
    $not: {
        id: 'ddd',
        $$seq$$: 'abc',
    },
}, {
    id: 'ddd',
});
assert(typeof rrr === 'object');

rrr = repel('modi', storageSchema, {
    $$seq$$: '888'
}, {
    id: 'ddd',
});
assert(typeof rrr === 'object');

rrr =contains('modi', storageSchema, {
    $$seq$$: '888'
}, {
    id: 'ddd',
});
assert(typeof rrr === 'object');


// 有id的情况，应当构造出查询条件给上层（肉眼看下结果先）
let r = contains('modi', storageSchema, {
    id: 'bbccdd',
}, {
    id: 'dddd',
});

assert(r === false);

r = repel('modiEntity', storageSchema, {
    modiId: 'cdcd',
}, {
    modi: {
        id: 'dddd',
    }
});
assert(r === true);

r = contains('modiEntity', storageSchema, {
    modi: {
        id: 'cdcde',
        $$seq$$: 'dddd',
        action: 'create',
    }
}, {
    modiId: 'cdcd',
});
assert(r === false);

r = contains('modiEntity', storageSchema, {
    modi: {
        id: 'cdcde',
        $$seq$$: 'dddd',
        action: 'create',
    },
    $$seq$$: 'xc',
}, {
    modiId: 'cdcde',
    $$seq$$: {
        $startsWith: 'xcc',
    },
});
assert(r === false);

r = contains('modiEntity', storageSchema, {
    id: 'user',
    $$seq$$: 'xc',
}, {
    user: {
        name: 'xcxc',
    }
});
// {"$and":[{"$or":[{"$and":[{"id":"user","filter":{"id":"xc","$not":{"name":"xcxc"}}}]}]}]}
console.log(5, JSON.stringify(r));


r = contains('modiEntity', storageSchema, {
    id: 'user',
    $$seq$$: 'xc',
    modi: {
        id: 'cdcde',
        $$seq$$: 'dddd',
        action: 'create',
    },
}, {
    user: {
        name: 'xcxc',
    },
    modiId: 'cdcd',
});
assert(r === false);


r = contains('modiEntity', storageSchema, {
    id: 'user',
    $$seq$$: 'xc',
    modi: {
        id: 'cdcd',
        $$seq$$: 'dddd',
        action: 'create',
    },
}, {
    user: {
        name: 'xcxc',
    },
    modiId: 'cdcd',
});
// 这个查询应当可以过滤掉modiId: 'cdcd'的条件
console.log(8, r);

