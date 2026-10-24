import { useMemo, useState } from "react";
import { FlatList, Modal, Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { SafeAreaView } from "react-native-safe-area-context";
import { colors, radius } from "../theme";

/**
 * Dropdown for long lists (countries, staff, nationalities). Opens a
 * searchable full-screen list. options: [{ value, label, sub? }]
 */
export default function SelectField({ label, value, options, onChange, placeholder = "Select", allowClear = false, disabled = false }) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");

  const selected = options.find((o) => o.value === value);
  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return q ? options.filter((o) => `${o.label} ${o.sub || ""}`.toLowerCase().includes(q)) : options;
  }, [options, query]);

  const choose = (option) => {
    onChange(option ? option.value : "");
    setOpen(false);
    setQuery("");
  };

  return (
    <View style={styles.group}>
      {!!label && <Text style={styles.label}>{label}</Text>}
      <Pressable
        onPress={() => setOpen(true)}
        disabled={disabled}
        style={[styles.field, disabled && styles.fieldDisabled]}
        accessibilityRole="button"
        accessibilityLabel={label}
        accessibilityState={{ disabled }}
      >
        <Text style={[styles.value, !selected && !value && styles.placeholder]} numberOfLines={1}>
          {selected?.label || value || placeholder}
        </Text>
        <Ionicons name="chevron-down" size={18} color={colors.textMuted} />
      </Pressable>

      <Modal visible={open} animationType="slide" onRequestClose={() => setOpen(false)}>
        <SafeAreaView style={styles.sheet}>
          <View style={styles.header}>
            <Text style={styles.headerTitle}>{label || "Select"}</Text>
            <Pressable onPress={() => setOpen(false)} hitSlop={10} accessibilityLabel="Close">
              <Ionicons name="close" size={26} color={colors.onPrimary} />
            </Pressable>
          </View>
          {options.length > 8 && (
            <View style={styles.search}>
              <Ionicons name="search-outline" size={18} color={colors.primary} />
              <TextInput
                value={query}
                onChangeText={setQuery}
                placeholder="Search…"
                placeholderTextColor={colors.textFaint}
                style={styles.searchInput}
                autoFocus
              />
            </View>
          )}
          <FlatList
            data={filtered}
            keyExtractor={(item, index) => `${item.value}-${index}`}
            keyboardShouldPersistTaps="handled"
            ListHeaderComponent={
              allowClear && value ? (
                <Pressable onPress={() => choose(null)} style={styles.option}>
                  <Text style={[styles.optionText, styles.clearText]}>Clear selection</Text>
                </Pressable>
              ) : null
            }
            ListEmptyComponent={<Text style={styles.empty}>No matches</Text>}
            renderItem={({ item }) => {
              const active = item.value === value;
              return (
                <Pressable onPress={() => choose(item)} style={[styles.option, active && styles.optionActive]}>
                  <View style={styles.flex}>
                    <Text style={[styles.optionText, active && styles.optionTextActive]}>{item.label}</Text>
                    {!!item.sub && <Text style={styles.optionSub}>{item.sub}</Text>}
                  </View>
                  {active && <Ionicons name="checkmark" size={20} color={colors.primary} />}
                </Pressable>
              );
            }}
          />
        </SafeAreaView>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  group: { gap: 8, flex: 1 },
  label: { color: colors.textBody, fontSize: 14, fontWeight: "600" },
  field: {
    minHeight: 52,
    paddingHorizontal: 14,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 8,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    backgroundColor: colors.surface,
  },
  fieldDisabled: { backgroundColor: colors.background, opacity: 0.6 },
  value: { fontSize: 16, color: colors.text, flex: 1 },
  placeholder: { color: colors.textFaint },
  sheet: { flex: 1, backgroundColor: colors.background },
  header: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", padding: 18, backgroundColor: colors.primary },
  headerTitle: { color: colors.onPrimary, fontSize: 18, fontWeight: "700" },
  search: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    margin: 16,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 14,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  searchInput: { flex: 1, fontSize: 15, color: colors.text, paddingVertical: 2 },
  option: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderSoft,
    backgroundColor: colors.surface,
  },
  optionActive: { backgroundColor: colors.primarySoft },
  optionText: { fontSize: 16, color: colors.text },
  optionTextActive: { color: colors.primary, fontWeight: "700" },
  optionSub: { fontSize: 12, color: colors.textMuted, marginTop: 2 },
  clearText: { color: colors.danger },
  empty: { textAlign: "center", color: colors.textFaint, padding: 30 },
});
