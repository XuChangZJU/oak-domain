/// <reference types="node" />
import { Hash } from 'crypto';
/**
 * 这个类的作用是把项目和所有相关的模块下的locales编译成为src/data/i18n中的数据
 */
export default class LocaleBuilder {
    asLib: boolean;
    dependencies: string[];
    pwd: string;
    locales: Record<string, [string, string, string, object]>;
    hash: Hash;
    constructor(asLib?: boolean);
    /**
     * 将locales输出成为data/i18n.ts中的数据
     * 如果有Dependency需要引出来
     */
    private outputDataFile;
    /**
     * 这里不能直接用require, webpack貌似有缓存
     * @param filepath
     */
    private readLocaleFileContent;
    private parseFile;
    private traverse;
    private buildProject;
    build(watch?: boolean): void;
}
