declare const url: {
    new (url: string | URL, base?: string | URL | undefined): URL;
    prototype: URL;
    canParse(url: string | URL, base?: string | undefined): boolean;
    createObjectURL(obj: Blob | MediaSource): string;
    revokeObjectURL(url: string): void;
};
declare const urlSearchParams: {
    new (init?: string | Record<string, string> | string[][] | URLSearchParams | undefined): URLSearchParams;
    prototype: URLSearchParams;
};
export { url, urlSearchParams };
