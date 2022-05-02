declare type Mode = 'S' | 'X';
/**
 * 模拟一个读写锁，用于同步。
 * 注意，千万不要发生自己等自己
 */
export declare class RWLock {
    private readNumber;
    private writeNumber;
    private readWaiter;
    private writeWaiter;
    constructor();
    acquire(mode: Mode): Promise<void>;
    release(): Promise<void>;
}
export {};
