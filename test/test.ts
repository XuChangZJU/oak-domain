import { generateNewId } from '../src/utils/uuid';

let iter = 20;

while (iter > 0) {
    console.log(generateNewId());
    iter --;
}