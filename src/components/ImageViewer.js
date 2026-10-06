import { Image, Modal, Pressable, StyleSheet, Text } from "react-native";
import { Ionicons } from "@expo/vector-icons";

/** Full-screen photo; tap anywhere to close. */
export default function ImageViewer({ uri, caption, onClose }) {
  return (
    <Modal visible={!!uri} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose} accessibilityLabel="Close photo">
        {!!uri && <Image source={{ uri }} style={styles.image} resizeMode="contain" />}
        {!!caption && <Text style={styles.caption}>{caption}</Text>}
        <Ionicons name="close" size={30} color="#fff" style={styles.close} />
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: "rgba(0,0,0,0.92)", alignItems: "center", justifyContent: "center" },
  image: { width: "100%", height: "78%" },
  caption: { color: "#fff", fontSize: 14, marginTop: 12, paddingHorizontal: 20, textAlign: "center" },
  close: { position: "absolute", top: 50, right: 20 },
});
