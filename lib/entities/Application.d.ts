import { String, Text } from '../types/DataType';
import { Schema as System } from './System';
import { Schema as ExtraFile } from './ExtraFile';
import { EntityShape } from '../types/Entity';
export interface Schema extends EntityShape {
    name: String<32>;
    description: Text;
    type: 'web' | 'wechatPublic' | 'weChatMp';
    system: System;
    dd: Array<ExtraFile>;
}
