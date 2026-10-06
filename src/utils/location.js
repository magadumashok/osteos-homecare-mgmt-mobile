import * as Location from "expo-location";

/**
 * Current position for attendance, as the old app recorded at sign-in and
 * sign-out. Resolves null when permission is refused or no fix arrives in
 * time, so signing in never gets stuck on GPS.
 */
export async function currentPosition(timeoutMs = 10000) {
  try {
    const { status } = await Location.requestForegroundPermissionsAsync();
    if (status !== "granted") return null;

    const fix = Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
    const timeout = new Promise((resolve) => setTimeout(() => resolve(null), timeoutMs));
    const position = (await Promise.race([fix, timeout])) || (await Location.getLastKnownPositionAsync());

    return position ? { latitude: position.coords.latitude, longitude: position.coords.longitude } : null;
  } catch {
    return null;
  }
}
