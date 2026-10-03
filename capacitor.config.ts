import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.viktorolsson.perimeter',
  appName: 'Perimeter',
  webDir: 'dist',
  backgroundColor: '#05060d',
  ios: {
    contentInset: 'never',
    scrollEnabled: false,
  },
};

export default config;
