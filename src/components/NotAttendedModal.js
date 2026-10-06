import { useState } from "react";
import { KeyboardAvoidingView, Modal, Platform, Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { colors } from "../theme";
import { ErrorBanner, PrimaryButton } from "./Form";

const QUICK_REASONS = ["Patient not available", "Patient unwell / hospitalised", "Personal emergency", "Transport issue"];

/** Ask why a duty will not be attended (the old app's "duty not attending" form). */
export default function NotAttendedModal({ visible, onClose, onSubmit }) {
  const [reason, setReason] = useState("");
  const [error, setError] = useState(null);

  const submit = () => {
    if (!reason.trim()) {
      setError("Please give a reason.");
      return;
    }
    onSubmit(reason.trim());
    setReason("");
    setError(null);
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === "ios" ? "padding" : undefined}>
        <Pressable style={styles.backdrop} onPress={onClose} />
        <View style={styles.sheet}>
          <Text style={styles.title}>Can't attend this duty</Text>
          <Text style={styles.subtitle}>Your coordinator will see this reason.</Text>
          <View style={styles.chips}>
            {QUICK_REASONS.map((r) => (
              <Pressable key={r} onPress={() => setReason(r)} style={[styles.chip, reason === r && styles.chipActive]}>
                <Text style={[styles.chipText, reason === r && styles.chipTextActive]}>{r}</Text>
              </Pressable>
            ))}
          </View>
          <TextInput
            value={reason}
            onChangeText={setReason}
            placeholder="Reason"
            placeholderTextColor={colors.textFaint}
            multiline
            maxLength={1000}
            style={styles.input}
          />
          <ErrorBanner message={error} />
          <View style={styles.buttons}>
            <PrimaryButton title="Cancel" variant="outline" onPress={onClose} style={styles.flex} />
            <PrimaryButton title="Submit" onPress={submit} style={styles.flex} />
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  backdrop: { flex: 1, backgroundColor: "rgba(0,0,0,0.35)" },
  sheet: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 20,
    paddingBottom: 34,
    gap: 14,
  },
  title: { fontSize: 18, fontWeight: "700", color: colors.text },
  subtitle: { fontSize: 13, color: colors.textMuted, marginTop: -8 },
  chips: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  chip: { borderWidth: 1, borderColor: colors.border, borderRadius: 20, paddingHorizontal: 12, paddingVertical: 6 },
  chipActive: { borderColor: colors.primary, backgroundColor: colors.primarySoft },
  chipText: { fontSize: 13, color: colors.textBody },
  chipTextActive: { color: colors.primary, fontWeight: "600" },
  input: {
    minHeight: 90,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    padding: 12,
    fontSize: 15,
    color: colors.text,
    textAlignVertical: "top",
  },
  buttons: { flexDirection: "row", gap: 12 },
});
