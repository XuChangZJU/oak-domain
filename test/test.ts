/* import { generateNewId } from '../src/utils/uuid';

let iter = 20;

while (iter > 0) {
    console.log(generateNewId());
    iter --;
} */
import { join } from 'path';
import { buildRouter } from '../src/compiler/routerBuilder';

buildRouter(join(process.cwd(), '..', 'taicang'));