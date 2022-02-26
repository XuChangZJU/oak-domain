import { String, Int, Datetime, Image, Boolean, Text } from '../types/DataType';
import { Schema as System } from './System';
import { Schema as ExtraFile } from './ExtraFile';

export type Schema = {
    name: String<32>;
    description: Text;
    type: 'web' | 'wechatPublic' | 'weChatMp';
    system: System;
    dd: Array<ExtraFile>;
};
