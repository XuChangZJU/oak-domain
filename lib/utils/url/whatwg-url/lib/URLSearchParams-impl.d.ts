declare const _default: {
    implementation: {
        new (globalObject: any, constructorArgs: any, { doNotStripQMark }: {
            doNotStripQMark?: boolean | undefined;
        }): {
            _updateSteps(): void;
            append(name: any, value: any): void;
            delete(name: any): void;
            get(name: any): any;
            getAll(name: any): any[];
            has(name: any): boolean;
            set(name: any, value: any): void;
            sort(): void;
            toString(): string;
            [Symbol.iterator](): any;
        };
    };
};
export default _default;
