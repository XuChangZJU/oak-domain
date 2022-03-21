import { String, Text, Image, Datetime } from '../types/DataType';
import { Schema as ExtraFile } from './ExtraFile';
import { EntityShape } from '../types/Entity';
export interface Schema extends EntityShape {
    name: String<16>;
    nickname?: String<64>;
    password?: Text;
    birth?: Datetime;
    gender?: 'male' | 'female';
    avatar?: Image;
    idCardType?: 'ID-Card' | 'passport' | 'Mainland-passport';
    idNumber?: String<32>;
    ref?: Schema;
    files: Array<ExtraFile>;
}
