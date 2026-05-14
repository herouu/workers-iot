import { CapacitorConfig } from '@capacitor/cli'

const config: CapacitorConfig = {
  appId: 'com.cloudiot.mobile',
  appName: 'CloudIoT',
  webDir: 'dist',
  server: {
    // 开发时连接本地服务器
    // androidScheme: 'https',
    // url: 'http://192.168.1.100:5173'
  },
  android: {
    backgroundColor: '#ffffff',
    allowMixedContent: true,
    captureInput: true,
    webContentsDebuggingEnabled: false,
  },
  ios: {
    contentUrl: 'https://localhost',
    allowsLinkPreview: false,
  },
  plugins: {
    SplashScreen: {
      launchShowDuration: 2000,
      backgroundColor: '#1890ff',
      androidSplashResourceName: 'splash',
      androidScaleType: 'CENTER_CROP',
      showSpinner: false,
      splashFullScreen: true,
      splashImmersive: true,
    },
    StatusBar: {
      style: 'LIGHT',
      backgroundColor: '#1890ff',
    },
    PushNotifications: {
      presentationOptions: ['badge', 'sound', 'alert'],
      ios: {
        foreground: true,
      },
    },
  },
}

export default config
