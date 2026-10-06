import { Pressable, StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { colors } from "../theme";

/** Pill tabs. options: [{ value, label, icon? }] */
export default function Segmented({ options, value, onChange, style }) {
  return (
    <View style={[styles.row, style]}>
      {options.map((option) => {
        const active = option.value === value;
        return (
          <Pressable
            key={option.value}
            onPress={() => !active && onChange(option.value)}
            style={[styles.tab, active && styles.tabActive]}
            accessibilityRole="tab"
            accessibilityState={{ selected: active }}
          >
            {!!option.icon && <Ionicons name={option.icon} size={16} color={active ? colors.onPrimary : colors.primary} />}
            <Text style={[styles.text, active && styles.textActive]} numberOfLines={1}>
              {option.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

/** Small toggle chips for filters. */
export function FilterChips({ options, value, onChange }) {
  return (
    <View style={styles.chips}>
      {options.map((option) => {
        const active = option.value === value;
        return (
          <Pressable key={option.value} onPress={() => onChange(option.value)} style={[styles.chip, active && styles.chipActive]}>
            <Text style={[styles.chipText, active && styles.chipTextActive]}>{option.label}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    borderRadius: 30,
    borderWidth: 1,
    borderColor: colors.primary,
    overflow: "hidden",
    backgroundColor: colors.surface,
  },
  tab: { flex: 1, height: 40, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6, paddingHorizontal: 6 },
  tabActive: { backgroundColor: colors.primary },
  text: { fontSize: 13, fontWeight: "600", color: colors.primary },
  textActive: { color: colors.onPrimary },
  chips: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  chip: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 6,
    backgroundColor: colors.surface,
  },
  chipActive: { borderColor: colors.primary, backgroundColor: colors.primarySoft },
  chipText: { fontSize: 13, color: colors.textBody },
  chipTextActive: { color: colors.primary, fontWeight: "700" },
});
