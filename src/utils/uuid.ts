export function shrinkUuidTo32Bytes(uuid: string) {
    return uuid.replaceAll('-', '');
}

export function expandUuidTo36Bytes(uuidShrinked: string) {
    return `${uuidShrinked.slice(0, 8)}-${uuidShrinked.slice(8, 12)}-${uuidShrinked.slice(12, 16)}-${uuidShrinked.slice(16, 20)}-${uuidShrinked.slice(20)}`;
}
