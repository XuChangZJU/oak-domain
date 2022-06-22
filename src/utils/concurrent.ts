import assert from 'assert';
import { isConstructorDeclaration } from "typescript";

type Mode = 'S' | 'X';

/**
 * 模拟一个读写锁，用于同步。
 * 注意，千万不要发生自己等自己
 */
export class RWLock {
    private readNumber: number;
    private writeNumber: number;
    private readWaiter: Array<(value: unknown) => void>;
    private writeWaiter: Array<(value: unknown) => void>;

    constructor() {
        this.readNumber = 0;
        this.writeNumber = 0;
        this.readWaiter = [];
        this.writeWaiter = [];
    }

    async acquire(mode: Mode) {
        if (mode === 'S') {
            while (this.writeNumber > 0) {
                const p = new Promise(
                    (resolve) => this.readWaiter.push(resolve)
                );
                await p;
            }
            this.readNumber ++;
        }
        else {
            while (this.writeNumber || this.readNumber) {
                const p = new Promise(
                    (resolve) => this.writeWaiter.push(resolve)
                );
                await p;
            }
            this.writeNumber ++;
        }
    }

    release() {
        if(this.writeNumber) {
            assert (this.writeNumber === 1);
            this.writeNumber = 0;
            if (this.readWaiter.length > 0) {
                for (const f of this.readWaiter) {
                    f(undefined);
                }
                this.readWaiter = [];
            }
            else if (this.writeWaiter.length > 0) {
                const f = this.writeWaiter.pop();
                f!(undefined);
            }
        }
        else {
            assert (this.readNumber > 0);
            assert (this.readWaiter.length === 0);
            this.readNumber --;
            if (this.readNumber === 0) {
                const f = this.writeWaiter.pop();
                f && f(undefined);
            }
        }
    }
}