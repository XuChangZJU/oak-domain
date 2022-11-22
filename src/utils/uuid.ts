import assert from 'assert';
import { v4, v1 } from 'uuid';
import { getRandomValues} from './random/random';

export function shrinkUuidTo32Bytes(uuid: string) {
    return uuid.replaceAll('-', '');
}

export function expandUuidTo36Bytes(uuidShrinked: string) {
    return `${uuidShrinked.slice(0, 8)}-${uuidShrinked.slice(8, 12)}-${uuidShrinked.slice(12, 16)}-${uuidShrinked.slice(16, 20)}-${uuidShrinked.slice(20)}`;
}

export type GenerateIdOption = {
    shuffle?: boolean;
};

// 直接生成uuid的接口，为了适配各种环境，写成异步
export async function generateNewIdAsync(option?: GenerateIdOption) {
    const option2 = option || ID_OPTION;
    if (option2?.shuffle && process.env.NODE_ENV === 'development') {
        return v4({ random: await getRandomValues(16) });
    }
    return v1({ random: await getRandomValues(16) });
}

// 实现同步的id缓存接口，以便于前台使用
const ID_BUFFER: string[] = [];
let ID_OPTION: GenerateIdOption = {

};

async function produceIds() {
    let iter = 0;
    for (;iter < 50; iter ++) {
        ID_BUFFER.push(await generateNewIdAsync());
    }
}

produceIds();

export function setGenerateIdOption(option: GenerateIdOption) {
    ID_OPTION = option;
    ID_BUFFER.splice(0, ID_BUFFER.length);
    return produceIds();
}

export function generateNewId() {
    assert(ID_BUFFER.length > 0, 'id已经用完');
    const id = ID_BUFFER.pop()!;
    if (ID_BUFFER.length < 30) {
        produceIds();
    }
    return id;
}
