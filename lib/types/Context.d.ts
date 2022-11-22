export interface Context {
    getCurrentTxnId(): string | undefined;
    getCurrentUserId(allowUnloggedIn?: boolean): string | undefined;
    isRoot(): boolean;
    toString(): string;
}
