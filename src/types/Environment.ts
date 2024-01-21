
// https://developers.weixin.qq.com/miniprogram/dev/api/base/system/wx.getSystemInfoSync.html
export type WechatMpEnv = {
    type: 'wechatMp',
    brand: string;                      // 设备品牌
    model: string;                      // 设备型号
    pixelRatio: number;                 // 设备像素比
    screenWidth: number;                // 屏幕宽度
    screenHeight: number;               // 屏幕高度
    windowWidth: number;                // 窗口宽度
    windowHeight: number;               // 窗口高度
    statusBarHeight: number;            // 状态栏高度
    language: string;                   // 语言
    version: string;                    // 微信版本号
    system: string;                     // 操作系统及版本
    platform: string;                   // 平台
    fontSizeSetting: number;            // 字体大小
    SDKVersion: string;                 // 基础库版本
    benchmarkLevel: number;             // 性能等级
    albumAuthorized?: boolean;          // 相册开关（仅IOS）
    cameraAuthorized: boolean;          // 摄像头开关
    locationAuthorized: boolean;        // 定位开关
    microphoneAuthorized: boolean;      // 麦克风开关
    notificationAuthorized: boolean;    // 通知开关
    notificationAlertAuthorized?: boolean;      // 提醒通知开关（仅IOS）
    notificationBadgeAuthorized?: boolean;      // 标记通知开关（仅IOS）
    notificationSoundAuthorized?: boolean;      // 声音通知开关（仅IOS）
    phoneCalendarAuthorized: boolean;           // 日历开关
    bluetoothEnabled: boolean;          // 蓝牙开关
    locationEnabled: boolean;           // 位置开关
    wifiEnabled: boolean;               // WIFI开关
    locationReducedAccuracy?: boolean;  // 模糊定位（仅IOS）
    theme?: 'light' | 'dark';           // 主题
    enableDebug: boolean;               // 是否打开调试
    deviceOrientation: 'portrait' | 'landscape';        // 横屏还是竖屏
    localStorageEnabled: true;
};


export type WebEnv = {
    type: 'web',
    visitorId: string;
    platform: {
        value: string;
    };
    timezone: {
        value: string;
    };
    vendor: {
        value: string;
    };
    vendorFlavors: {
        value: string[];
    };
    language: string;
    localStorageEnabled: boolean;
};

export type ServerEnv = {
    type: 'server',
}

// https://reactnative.dev/docs/platform
// 利用react-native-locale获得languange，和web/mp保持同构
export type NativeEnv = {
    constants: {
        isTesting: boolean;
        reactNativeVersion: object;
        Version?: number;
        Release?: string;
        Serial?: string;
        Fingerprint?: string;
        Model?: string;
        Brand?: string;
        Manufacture?: string;
        ServerHost?: string;
        uiMode?: 'car' | 'desk' | 'normal' | 'tv' | 'watch' | 'unknown';
        forceTouchAvailable?: boolean;
        interfaceIdiom?: string;
        osVersion?: string;
        systemName?: string;
    };
    isPad: boolean;
    isTesting: boolean;
    OS: 'android' | 'ios';
    Version: number | string;
    language: string;
    visitorId: string;
    type: 'native';
};

export type Environment = WechatMpEnv | WebEnv | ServerEnv | NativeEnv;

export type BriefEnv = {
    system: string;
    brand?: string;
    model?: string;
    wechat?: string;
    explorer?: string;
};