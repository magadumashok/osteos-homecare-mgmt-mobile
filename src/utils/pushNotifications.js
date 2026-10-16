import Constants from "expo-constants";
import { PermissionsAndroid, Platform } from "react-native";
import { updateFirebaseToken } from "../services/authService";

/**
 * Firebase Cloud Messaging. Enabled only in builds that include
 * google-services.json / GoogleService-Info.plist (see app.config.js), and
 * never in Expo Go, so the module is loaded lazily.
 */
const enabled = Boolean(Constants.expoConfig?.extra?.pushEnabled);

function firebase() {
  if (!enabled) return null;
  try {
    return require("@react-native-firebase/messaging");
  } catch {
    return null;
  }
}

export function registerBackgroundHandler() {
  const fb = firebase();
  if (!fb) return;
  fb.setBackgroundMessageHandler(fb.getMessaging(), async () => {});
}

async function requestPermission(fb) {
  if (Platform.OS === "android") {
    if (Platform.Version < 33) return true;
    const status = await PermissionsAndroid.request(PermissionsAndroid.PERMISSIONS.POST_NOTIFICATIONS);
    return status === PermissionsAndroid.RESULTS.GRANTED;
  }
  const status = await fb.requestPermission(fb.getMessaging());
  return status === fb.AuthorizationStatus.AUTHORIZED || status === fb.AuthorizationStatus.PROVISIONAL;
}

/** Ask for permission and save this device's FCM token on the user's account. */
export async function registerForPushNotifications() {
  const fb = firebase();
  if (!fb) return null;
  try {
    if (!(await requestPermission(fb))) return null;
    const token = await fb.getToken(fb.getMessaging());
    if (token) await updateFirebaseToken(token);
    return token;
  } catch (error) {
    console.warn("Push registration failed:", error?.message || error);
    return null;
  }
}

/** Firebase can rotate a device's token; save the new one. Returns an unsubscribe function. */
export function listenForTokenRefresh() {
  const fb = firebase();
  if (!fb) return () => {};
  return fb.onTokenRefresh(fb.getMessaging(), (token) => {
    updateFirebaseToken(token).catch((error) => console.warn("Push token update failed:", error?.message || error));
  });
}

/** Foreground messages and notification taps. Returns an unsubscribe function. */
export function listenForNotifications({ onForeground, onOpened }) {
  const fb = firebase();
  if (!fb) return () => {};
  const messaging = fb.getMessaging();
  const offMessage = fb.onMessage(messaging, (message) => onForeground?.(message));
  const offOpened = fb.onNotificationOpenedApp(messaging, (message) => onOpened?.(message?.data || {}));
  fb.getInitialNotification(messaging)
    .then((message) => message && onOpened?.(message.data || {}))
    .catch(() => {});
  return () => {
    offMessage();
    offOpened();
  };
}
