export async function getRandomValues(length: number) {
    if (length > 65536) {
        throw new Error('Can only request a maximum of 65536 bytes');
    }
    const randomValues = window.crypto.getRandomValues(
        new Uint8Array(length)
    );


    return new Uint8Array(randomValues);
}