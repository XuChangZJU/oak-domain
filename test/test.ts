import { v1 } from 'uuid';

let iter = 20;

while (iter > 0) {
    console.log(v1());
    iter --;
}