export declare function shrinkUuidTo32Bytes(uuid: string): string;
export declare function expandUuidTo36Bytes(uuidShrinked: string): string;
export declare type GenerateIdOption = {
    shuffle?: boolean;
};
export declare function generateNewIdAsync(option?: GenerateIdOption): Promise<string>;
export declare function setGenerateIdOption(option: GenerateIdOption): Promise<void>;
export declare function generateNewId(): string;
