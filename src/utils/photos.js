import { Alert } from "react-native";
import * as ImagePicker from "expo-image-picker";
import { ImageManipulator, SaveFormat } from "expo-image-manipulator";
import * as DocumentPicker from "expo-document-picker";

const MAX_WIDTH = 1600;

/**
 * Take or choose a photo and shrink it to a JPEG the server accepts.
 * Returns { uri, name, mimeType } or null if cancelled / not allowed.
 */
export async function pickPhoto(source) {
  const fromCamera = source === "camera";
  const permission = fromCamera
    ? await ImagePicker.requestCameraPermissionsAsync()
    : await ImagePicker.requestMediaLibraryPermissionsAsync();

  if (!permission.granted) {
    Alert.alert(
      "Permission needed",
      fromCamera ? "Allow camera access in Settings to take photos." : "Allow photo access in Settings to choose photos.",
    );
    return null;
  }

  const options = { mediaTypes: ["images"], quality: 1 };
  const result = fromCamera
    ? await ImagePicker.launchCameraAsync(options)
    : await ImagePicker.launchImageLibraryAsync(options);

  if (result.canceled || !result.assets?.[0]) return null;
  const asset = result.assets[0];

  const context = ImageManipulator.manipulate(asset.uri);
  if (asset.width > MAX_WIDTH) context.resize({ width: MAX_WIDTH });
  const image = await context.renderAsync();
  const saved = await image.saveAsync({ compress: 0.8, format: SaveFormat.JPEG });

  return { uri: saved.uri, name: `photo_${Date.now()}.jpg`, mimeType: "image/jpeg" };
}

/** Ask "Camera or Gallery?" and resolve with the picked photo (or null). */
export function choosePhoto(title = "Add photo") {
  return new Promise((resolve) => {
    Alert.alert(title, undefined, [
      { text: "Camera", onPress: () => pickPhoto("camera").then(resolve, () => resolve(null)) },
      { text: "Gallery", onPress: () => pickPhoto("library").then(resolve, () => resolve(null)) },
      { text: "Cancel", style: "cancel", onPress: () => resolve(null) },
    ]);
  });
}

/** Pick PDFs or other files. Returns [{ uri, name, mimeType }] (empty if cancelled). */
export async function pickFiles({ multiple = true } = {}) {
  const result = await DocumentPicker.getDocumentAsync({ multiple, copyToCacheDirectory: true });
  if (result.canceled) return [];
  return result.assets.map((asset) => ({
    uri: asset.uri,
    name: asset.name || `file_${Date.now()}`,
    mimeType: asset.mimeType || "application/octet-stream",
  }));
}
