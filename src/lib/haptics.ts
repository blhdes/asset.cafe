import { Capacitor } from '@capacitor/core'
import { Haptics, ImpactStyle, NotificationType } from '@capacitor/haptics'

export const haptic = {
  light: () => Capacitor.isNativePlatform() && Haptics.impact({ style: ImpactStyle.Light }),
  medium: () => Capacitor.isNativePlatform() && Haptics.impact({ style: ImpactStyle.Medium }),
  success: () => Capacitor.isNativePlatform() && Haptics.notification({ type: NotificationType.Success }),
  error: () => Capacitor.isNativePlatform() && Haptics.notification({ type: NotificationType.Error }),
}
