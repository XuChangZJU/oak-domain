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
/**
 * 在一些特殊场景下根据数据生成指定的uuid，长度不能超过36byte
 * @param: input: 输入的数据数组，应保证唯一性
 */
export declare function formUuid(...input: string[]): string;
