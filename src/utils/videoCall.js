import { Alert, Linking } from "react-native";

// The old app used public Jitsi rooms; a random name keeps each call private.
const ROOM_HOST = "https://meet.jit.si";

export function newRoomUrl() {
  const id = `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 12)}`;
  return `${ROOM_HOST}/homecare-${id}`;
}

/** Only open https links from a push message, never other schemes. */
export function isSafeRoomUrl(url) {
  return typeof url === "string" && /^https:\/\/[^\s]+$/i.test(url);
}

export function joinRoom(url) {
  if (!isSafeRoomUrl(url)) return;
  Linking.openURL(url).catch(() => Alert.alert("Cannot open call", "Install a browser or the Jitsi Meet app to join video calls."));
}
