export type WechatMpEnv = {
    type: 'wechatMp';
    brand: string;
    model: string;
    pixelRatio: number;
    screenWidth: number;
    screenHeight: number;
    windowWidth: number;
    windowHeight: number;
    statusBarHeight: number;
    language: string;
    version: string;
    system: string;
    platform: string;
    fontSizeSetting: number;
    SDKVersion: string;
    benchmarkLevel: number;
    albumAuthorized?: boolean;
    cameraAuthorized: boolean;
    locationAuthorized: boolean;
    microphoneAuthorized: boolean;
    notificationAuthorized: boolean;
    notificationAlertAuthorized?: boolean;
    notificationBadgeAuthorized?: boolean;
    notificationSoundAuthorized?: boolean;
    phoneCalendarAuthorized: boolean;
    bluetoothEnabled: boolean;
    locationEnabled: boolean;
    wifiEnabled: boolean;
    locationReducedAccuracy?: boolean;
    theme?: 'light' | 'dark';
    enableDebug: boolean;
    deviceOrientation: 'portrait' | 'landscape';
    host: {
        appId: string;
    };
    localStorageEnabled: true;
};
export type WebEnv = {
    type: 'web';
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
    type: 'server';
};
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
