import { randomBytes } from 'node:crypto';

export async function getRandomValues(length: number): Promise<Uint8Array> {
    if (length > 65536) {
        throw new Error('Can only request a maximum of 65536 bytes');
    }
    return new Promise(
        (resolve, reject) => {
            randomBytes(length, (err, buf) => {
                if (err) {
                    reject(err);
                    return;
                }
                resolve(new Uint8Array(buf));
            })
        }
    );
}