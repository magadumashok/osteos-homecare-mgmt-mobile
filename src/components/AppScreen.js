import { Pressable, StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { SafeAreaView } from "react-native-safe-area-context";
import { useNavigation } from "@react-navigation/native";
import { colors } from "../theme";

/**
 * Inner-screen frame: teal header with back button, title and optional
 * right-hand action, over the light body. `headerExtra` renders under the
 * title row (e.g. a search bar).
 */
export default function AppScreen({ title, subtitle, right, headerExtra, children, onBack, showBack = true }) {
  const navigation = useNavigation();

  return (
    <SafeAreaView style={styles.safeArea} edges={["top", "left", "right"]}>
      <View style={styles.header}>
        <View style={styles.headerRow}>
          {showBack && (
            <Pressable
              onPress={onBack || (() => navigation.goBack())}
              hitSlop={8}
              style={({ pressed }) => [styles.iconButton, pressed && styles.pressed]}
              accessibilityLabel="Back"
            >
              <Ionicons name="arrow-back" size={22} color={colors.onPrimary} />
            </Pressable>
          )}
          <View style={styles.titleWrap}>
            <Text style={styles.title} numberOfLines={1}>
              {title}
            </Text>
            {!!subtitle && (
              <Text style={styles.subtitle} numberOfLines={1}>
                {subtitle}
              </Text>
            )}
          </View>
          {right}
        </View>
        {headerExtra}
      </View>
      <View style={styles.body}>{children}</View>
    </SafeAreaView>
  );
}

export function HeaderIconButton({ icon, onPress, label }) {
  return (
    <Pressable
      onPress={onPress}
      hitSlop={8}
      accessibilityLabel={label}
      style={({ pressed }) => [styles.iconButton, pressed && styles.pressed]}
    >
      <Ionicons name={icon} size={22} color={colors.onPrimary} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: colors.primary },
  header: {
    backgroundColor: colors.primary,
    paddingHorizontal: 20,
    paddingTop: 10,
    paddingBottom: 18,
    gap: 14,
  },
  headerRow: { flexDirection: "row", alignItems: "center", gap: 14 },
  iconButton: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: colors.onPrimaryGlass,
    alignItems: "center",
    justifyContent: "center",
  },
  pressed: { opacity: 0.7 },
  titleWrap: { flex: 1 },
  title: { color: colors.onPrimary, fontSize: 20, fontWeight: "700" },
  subtitle: { color: colors.onPrimaryMuted, fontSize: 13, marginTop: 2 },
  body: { flex: 1, backgroundColor: colors.background },
});
