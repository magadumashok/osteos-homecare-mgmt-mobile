import { useRef } from "react";
import { Modal, Pressable, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import SignatureScreen from "react-native-signature-canvas";
import { colors } from "../theme";

// Hide the library's own buttons; ours sit in the header.
const WEB_STYLE = `.m-signature-pad--footer { display: none; } .m-signature-pad { box-shadow: none; border: none; }
body, html { height: 100%; }`;

/**
 * Full-screen drawing pad. `onSave(dataUrl)` gets a "data:image/png;base64,…"
 * string, which the API accepts for every signature field.
 */
export default function SignaturePad({ visible, title = "Signature", onSave, onClose }) {
  const ref = useRef(null);

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.header}>
          <Pressable onPress={onClose} hitSlop={8}>
            <Text style={styles.headerAction}>Cancel</Text>
          </Pressable>
          <Text style={styles.title}>{title}</Text>
          <Pressable onPress={() => ref.current?.readSignature()} hitSlop={8}>
            <Text style={[styles.headerAction, styles.save]}>Save</Text>
          </Pressable>
        </View>
        <Text style={styles.hint}>Sign inside the box</Text>
        <View style={styles.pad}>
          <SignatureScreen
            ref={ref}
            onOK={(dataUrl) => onSave(dataUrl)}
            onEmpty={() => {}}
            webStyle={WEB_STYLE}
            backgroundColor="#ffffff"
            penColor="#111827"
            imageType="image/png"
            autoClear={false}
          />
        </View>
        <Pressable onPress={() => ref.current?.clearSignature()} style={styles.clear}>
          <Text style={styles.clearText}>Clear</Text>
        </Pressable>
      </SafeAreaView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: colors.background },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingVertical: 14,
    backgroundColor: colors.primary,
  },
  title: { color: colors.onPrimary, fontSize: 17, fontWeight: "700" },
  headerAction: { color: colors.onPrimaryMuted, fontSize: 16 },
  save: { color: colors.onPrimary, fontWeight: "700" },
  hint: { textAlign: "center", color: colors.textMuted, marginTop: 14 },
  pad: {
    flex: 1,
    margin: 16,
    borderWidth: 1.5,
    borderColor: colors.border,
    borderStyle: "dashed",
    borderRadius: 16,
    overflow: "hidden",
    backgroundColor: "#ffffff",
  },
  clear: { alignSelf: "center", paddingHorizontal: 24, paddingVertical: 10, marginBottom: 16 },
  clearText: { color: colors.danger, fontSize: 15, fontWeight: "600" },
});
