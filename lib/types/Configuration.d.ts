/**
 *  后台环境配置
 */
export type ServerConfiguration = {
    database: {
        type: 'mysql';
        host: string;
        database: string;
        port: number;
        user: string;
        password?: string;
        connectionLimit: number;
        charset: "utf8mb4_general_ci";
    };
    http: {
        port: number;
    };
};
/**
 * 前后台共用的配置
 */
export type ProjectConfiguration = {
    routerPrefixes?: {
        aspect?: string;
        endpoint?: string;
        subscribe?: string;
        getSubscribePoint?: string;
        bridge?: string;
    };
};
/**
 * 编译环境配置
 */
export type CompilerConfiguration = {
    webpack?: {
        resolve?: {
            alias?: Record<string, string>;
            fallback?: Record<string, string | false>;
        };
        extraOakModules?: (string | RegExp)[];
    };
};
