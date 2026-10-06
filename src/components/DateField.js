import { useState } from "react";
import { Modal, Platform, Pressable, StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import DateTimePicker, { DateTimePickerAndroid } from "@react-native-community/datetimepicker";
import { colors, radius } from "../theme";
import { fromIsoDate, fromTimeString, shortDate, time12, toIsoDate, toTimeString } from "../utils/dates";

/**
 * A date ("YYYY-MM-DD") or time ("HH:MM") field. Android opens the system
 * dialog; iOS shows a spinner in a sheet.
 */
export default function DateField({ label, value, onChange, mode = "date", placeholder, minimumDate, maximumDate }) {
  const [iosOpen, setIosOpen] = useState(false);
  const [draft, setDraft] = useState(null);

  const current = mode === "date" ? fromIsoDate(value) : fromTimeString(value);
  const format = (date) => (mode === "date" ? toIsoDate(date) : toTimeString(date));
  const shown = value ? (mode === "date" ? shortDate(value) : time12(value)) : "";

  const open = () => {
    if (Platform.OS === "android") {
      DateTimePickerAndroid.open({
        value: current,
        mode,
        is24Hour: false,
        minimumDate,
        maximumDate,
        onChange: (event, date) => {
          if (event.type === "set" && date) onChange(format(date));
        },
      });
    } else {
      setDraft(current);
      setIosOpen(true);
    }
  };

  return (
    <View style={styles.group}>
      {!!label && <Text style={styles.label}>{label}</Text>}
      <Pressable onPress={open} style={styles.field} accessibilityRole="button" accessibilityLabel={label}>
        <Text style={[styles.value, !shown && styles.placeholder]}>{shown || placeholder || "Select"}</Text>
        <Ionicons name={mode === "date" ? "calendar-outline" : "time-outline"} size={20} color={colors.primary} />
      </Pressable>

      {Platform.OS === "ios" && (
        <Modal visible={iosOpen} transparent animationType="slide" onRequestClose={() => setIosOpen(false)}>
          <Pressable style={styles.backdrop} onPress={() => setIosOpen(false)} />
          <View style={styles.sheet}>
            <View style={styles.sheetBar}>
              <Pressable onPress={() => setIosOpen(false)}>
                <Text style={styles.sheetCancel}>Cancel</Text>
              </Pressable>
              <Pressable
                onPress={() => {
                  if (draft) onChange(format(draft));
                  setIosOpen(false);
                }}
              >
                <Text style={styles.sheetDone}>Done</Text>
              </Pressable>
            </View>
            {!!draft && (
              <DateTimePicker
                value={draft}
                mode={mode}
                display="spinner"
                minimumDate={minimumDate}
                maximumDate={maximumDate}
                onChange={(_, date) => date && setDraft(date)}
              />
            )}
          </View>
        </Modal>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  group: { gap: 8, flex: 1 },
  label: { color: colors.textBody, fontSize: 14, fontWeight: "600" },
  field: {
    minHeight: 52,
    paddingHorizontal: 14,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    backgroundColor: colors.surface,
  },
  value: { fontSize: 16, color: colors.text },
  placeholder: { color: colors.textFaint },
  backdrop: { flex: 1, backgroundColor: "rgba(0,0,0,0.3)" },
  sheet: { backgroundColor: colors.surface, paddingBottom: 30 },
  sheetBar: {
    flexDirection: "row",
    justifyContent: "space-between",
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderSoft,
  },
  sheetCancel: { fontSize: 16, color: colors.textMuted },
  sheetDone: { fontSize: 16, color: colors.primary, fontWeight: "700" },
});
