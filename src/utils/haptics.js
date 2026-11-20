// Feedback tátil discreto (estilo iOS/WhatsApp) nos toques importantes.
// Nunca derruba nada: em aparelho/emulador sem motor de vibração, ignora.
import * as Haptics from "expo-haptics";

export function tapLight() {
  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
}

export function tapMedium() {
  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
}

export function selectionTick() {
  Haptics.selectionAsync().catch(() => {});
}

export function notifySuccess() {
  Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
}
