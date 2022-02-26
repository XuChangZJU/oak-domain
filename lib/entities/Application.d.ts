import { String, Text } from '../types/DataType';
import { Schema as System } from './System';
import { Schema as ExtraFile } from './ExtraFile';
export declare type Schema = {
    name: String<32>;
    description: Text;
    type: 'web' | 'wechatPublic' | 'weChatMp';
    system: System;
    dd: Array<ExtraFile>;
};
