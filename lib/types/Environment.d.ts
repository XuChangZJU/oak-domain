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
export type Environment = WechatMpEnv | WebEnv | ServerEnv;
