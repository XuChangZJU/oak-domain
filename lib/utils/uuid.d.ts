export declare function sequentialUuid({ random }: {
    random: Uint8Array;
}): string;
export declare function shrinkUuidTo32Bytes(uuid: string): string;
export declare function expandUuidTo36Bytes(uuidShrinked: string): string;
export type GenerateIdOption = {
    shuffle?: boolean;
};
export declare function generateNewIdAsync(option?: GenerateIdOption): Promise<string>;
export declare function produceIds(): Promise<void>;
export declare function setGenerateIdOption(option: GenerateIdOption): Promise<void>;
export declare function generateNewId(): string;
