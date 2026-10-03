import { Haptics as CapHaptics, ImpactStyle, NotificationType } from '@capacitor/haptics';

export type HapticEvent = 'tap' | 'place' | 'leak' | 'boss' | 'runEnd';

export interface Haptics {
  play(event: HapticEvent): void;
}

export class CapacitorHaptics implements Haptics {
  play(event: HapticEvent): void {
    switch (event) {
      case 'tap':
        void CapHaptics.impact({ style: ImpactStyle.Light });
        break;
      case 'place':
        void CapHaptics.impact({ style: ImpactStyle.Medium });
        break;
      case 'leak':
        void CapHaptics.notification({ type: NotificationType.Warning });
        break;
      case 'boss':
        void CapHaptics.impact({ style: ImpactStyle.Heavy });
        break;
      case 'runEnd':
        void CapHaptics.notification({ type: NotificationType.Error });
        break;
    }
  }
}

export class NoopHaptics implements Haptics {
  play(): void {}
}
