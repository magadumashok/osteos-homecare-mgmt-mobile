import { Platform, Pressable, StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { DateTimePickerAndroid } from "@react-native-community/datetimepicker";
import { colors } from "../theme";
import { addDays, dayLabel, fromIsoDate, toIsoDate } from "../utils/dates";

/** ‹ Today › with a tap-to-pick date in the middle (Android) and a Today shortcut. */
export default function DateStrip({ date, onChange }) {
  const today = toIsoDate();

  const pick = () => {
    if (Platform.OS !== "android") return;
    DateTimePickerAndroid.open({
      value: fromIsoDate(date),
      mode: "date",
      onChange: (event, value) => event.type === "set" && value && onChange(toIsoDate(value)),
    });
  };

  return (
    <View style={styles.strip}>
      <Pressable onPress={() => onChange(addDays(date, -1))} style={styles.arrow} accessibilityLabel="Previous day">
        <Ionicons name="chevron-back" size={22} color={colors.onPrimary} />
      </Pressable>
      <Pressable onPress={pick} style={styles.center} accessibilityLabel="Choose date">
        <Ionicons name="calendar-outline" size={16} color={colors.onPrimary} />
        <Text style={styles.label}>{dayLabel(date)}</Text>
      </Pressable>
      {date !== today ? (
        <Pressable onPress={() => onChange(today)} style={styles.today}>
          <Text style={styles.todayText}>Today</Text>
        </Pressable>
      ) : null}
      <Pressable onPress={() => onChange(addDays(date, 1))} style={styles.arrow} accessibilityLabel="Next day">
        <Ionicons name="chevron-forward" size={22} color={colors.onPrimary} />
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  strip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: colors.onPrimaryGlass,
    borderRadius: 14,
    padding: 6,
  },
  arrow: { width: 38, height: 38, alignItems: "center", justifyContent: "center" },
  center: { flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8 },
  label: { color: colors.onPrimary, fontSize: 16, fontWeight: "700" },
  today: { backgroundColor: colors.surface, borderRadius: 10, paddingHorizontal: 10, paddingVertical: 6 },
  todayText: { color: colors.primary, fontSize: 12, fontWeight: "700" },
});
