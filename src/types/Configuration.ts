// 将项目的所有配置规范化到一起（未完成）by Xc 20240207

/**
 *  后台环境配置
 */
export type ServerConfiguration = {
    database: {
        type: 'mysql',
        host: string;
        database: string;
        port: number;
        user: string;
        password?: string;
        connectionLimit: number;
        charset: "utf8mb4_general_ci",
    },
    http: {
        // 监听端口号
        port: number;
    }
};

/**
 * 前后台共用的配置
 */
export type ProjectConfiguration = {
    // 各种接口的路由前缀（一般不建议配置）
    routerPrefixes?: {
        // 默认aspect
        aspect?: string;

        // 默认endpoint
        endpoint?: string;

        // 默认subscribe
        subscribe?: string;

        // 默认getSubscribePoint
        getSubscribePoint?: string;

        // 默认bridge
        bridge?: string;
    }
}


/**
 * 编译环境配置
 */
export type CompilerConfiguration = {
    webpack?: {
        resolve?: {
            alias?: Record<string, string>;
            fallback?: Record<string, string | false>;
        },
        extraOakModules?: (string | RegExp)[];      // 被标记的module也会和项目一起被oak编译plugin进行处理（注入getRender，处理i18n等）
    },
};