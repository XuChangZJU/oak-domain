"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.RWLock = void 0;
const tslib_1 = require("tslib");
const assert_1 = tslib_1.__importDefault(require("assert"));
/**
 * 模拟一个读写锁，用于同步。
 * 注意，千万不要发生自己等自己
 */
class RWLock {
    readNumber;
    writeNumber;
    readWaiter;
    writeWaiter;
    constructor() {
        this.readNumber = 0;
        this.writeNumber = 0;
        this.readWaiter = [];
        this.writeWaiter = [];
    }
    async acquire(mode) {
        if (mode === 'S') {
            while (this.writeNumber > 0) {
                const p = new Promise((resolve) => this.readWaiter.push(resolve));
                await p;
            }
            this.readNumber++;
        }
        else {
            while (this.writeNumber || this.readNumber) {
                const p = new Promise((resolve) => this.writeWaiter.push(resolve));
                await p;
            }
            this.writeNumber++;
        }
    }
    release() {
        if (this.writeNumber) {
            (0, assert_1.default)(this.writeNumber === 1);
            this.writeNumber = 0;
            if (this.readWaiter.length > 0) {
                for (const f of this.readWaiter) {
                    f(undefined);
                }
                this.readWaiter = [];
            }
            else if (this.writeWaiter.length > 0) {
                const f = this.writeWaiter.pop();
                f(undefined);
            }
        }
        else {
            (0, assert_1.default)(this.readNumber > 0);
            (0, assert_1.default)(this.readWaiter.length === 0);
            this.readNumber--;
            if (this.readNumber === 0) {
                const f = this.writeWaiter.pop();
                f && f(undefined);
            }
        }
    }
}
exports.RWLock = RWLock;
