import { useMemo, useState } from "react";
import { Alert, Image, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { SafeAreaView } from "react-native-safe-area-context";
import { useDispatch, useSelector } from "react-redux";
import ActionGrid from "../../components/ActionGrid";
import { EmptyState } from "../../components/States";
import { visibleModules } from "../../navigation/modules";
import { thunkLogout } from "../../store/thunks/authThunks";
import { displayName, initials, roleLabel } from "../../utils/format";
import { colors } from "../../theme";

export default function DashboardScreen({ navigation }) {
  const dispatch = useDispatch();
  const { user, homecare, permissions } = useSelector((s) => s.auth);
  const [query, setQuery] = useState("");

  const name = displayName(user);
  const modules = useMemo(() => visibleModules(user, permissions), [user, permissions]);
  const filtered = modules.filter((m) =>
    `${m.title} ${m.subtitle}`.toLowerCase().includes(query.trim().toLowerCase()),
  );

  const onLogout = () => {
    Alert.alert("Logout", "Are you sure you want to logout?", [
      { text: "Cancel", style: "cancel" },
      { text: "Logout", style: "destructive", onPress: () => dispatch(thunkLogout()) },
    ]);
  };

  const open = (module) => navigation.navigate(module.screen);

  return (
    <SafeAreaView style={styles.safeArea} edges={["top", "left", "right"]}>
      <View style={styles.header}>
        <View style={styles.headerRow}>
          <Pressable onPress={() => navigation.navigate("Profile")} style={styles.avatar} accessibilityLabel="My profile">
            {user?.profile_image ? (
              <Image source={{ uri: user.profile_image }} style={styles.avatarImage} />
            ) : (
              <Text style={styles.avatarText}>{initials(name)}</Text>
            )}
          </Pressable>
          <View style={styles.headerText}>
            <Text style={styles.hello} numberOfLines={1}>
              Hello, {name}
            </Text>
            <Text style={styles.sub} numberOfLines={1}>
              {[roleLabel(user), homecare?.name].filter(Boolean).join(" · ") || "Welcome back"}
            </Text>
          </View>
          <Pressable
            onPress={onLogout}
            style={({ pressed }) => [styles.logout, pressed && { opacity: 0.7 }]}
            accessibilityLabel="Logout"
          >
            <Ionicons name="log-out-outline" size={22} color={colors.onPrimary} />
          </Pressable>
        </View>

        <View style={styles.searchBar}>
          <Ionicons name="search-outline" size={20} color={colors.textFaint} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search features..."
            placeholderTextColor={colors.textFaint}
            value={query}
            onChangeText={setQuery}
            returnKeyType="search"
          />
          {query.length > 0 && (
            <Pressable onPress={() => setQuery("")} hitSlop={8}>
              <Ionicons name="close-circle" size={18} color={colors.textFaint} />
            </Pressable>
          )}
        </View>
      </View>

      <ScrollView style={styles.body} contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        {filtered.length === 0 ? (
          <EmptyState icon="search-outline" title={`No results for "${query}"`} />
        ) : (
          <>
            <Text style={styles.sectionTitle}>{query ? "Search Results" : "Quick Actions"}</Text>
            <ActionGrid items={filtered.map((m) => ({ ...m, onPress: () => open(m) }))} />
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: colors.primary },
  header: { backgroundColor: colors.primary, paddingHorizontal: 20, paddingTop: 16, paddingBottom: 24, gap: 16 },
  headerRow: { flexDirection: "row", alignItems: "center", gap: 14 },
  avatar: {
    width: 54,
    height: 54,
    borderRadius: 27,
    backgroundColor: "rgba(255,255,255,0.2)",
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
  avatarImage: { width: 54, height: 54 },
  avatarText: { color: colors.onPrimary, fontSize: 20, fontWeight: "700" },
  headerText: { flex: 1 },
  hello: { color: colors.onPrimary, fontSize: 20, fontWeight: "700" },
  sub: { color: colors.onPrimaryMuted, fontSize: 14, marginTop: 2 },
  logout: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: colors.onPrimaryGlass,
    alignItems: "center",
    justifyContent: "center",
  },
  searchBar: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.surface,
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 10,
    gap: 10,
  },
  searchInput: { flex: 1, fontSize: 14, color: colors.text, paddingVertical: 2 },
  body: { flex: 1, backgroundColor: colors.background },
  content: { paddingHorizontal: 20, paddingTop: 24, paddingBottom: 30, gap: 16 },
  sectionTitle: { fontSize: 20, fontWeight: "700", color: colors.text },
});
