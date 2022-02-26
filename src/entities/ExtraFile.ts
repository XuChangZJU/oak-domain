import { String, Int, Text, Image } from '../types/DataType';

export type Schema = {
    origin: 'qiniu';
    type: 'image' | 'pdf' | 'video' | 'audio' | 'file';
    bucket: String<16>;
    objectId: String<64>;
    tag1: String<16>;
    tag2: String<16>;
    filename: String<64>;
    md5: Text;
    entity: String<32>;
    entityId: String<64>;
};
