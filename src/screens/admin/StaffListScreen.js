import { useMemo, useState } from "react";
import { Alert, FlatList, Linking, Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import AppScreen from "../../components/AppScreen";
import ListCard from "../../components/ListCard";
import SearchBar from "../../components/SearchBar";
import { FilterChips } from "../../components/Segmented";
import { EmptyState, ErrorState, LoadingView } from "../../components/States";
import { useSelector } from "react-redux";
import useApi from "../../hooks/useApi";
import { listStaff } from "../../services/staffService";
import { displayName, roleLabel } from "../../utils/format";
import { can } from "../../utils/permissions";
import { colors } from "../../theme";

const ROLE_FILTERS = [
  { value: "all", label: "All" },
  { value: "nurse", label: "Nurses" },
  { value: "physiotherapist", label: "Physios" },
  { value: "doctor", label: "Doctors" },
  { value: "transport", label: "Drivers" },
  { value: "other", label: "Other" },
];
const MAIN_ROLES = ["nurse", "physiotherapist", "doctor", "transport"];

/** Old "View staff list": everyone in the homecare, with call and attendance. */
export default function StaffListScreen({ navigation }) {
  const { data, loading, refreshing, error, reload, refresh } = useApi(() => listStaff());
  const canSeeAttendance = can(useSelector((s) => s.auth.permissions), "attendance.view");
  const [query, setQuery] = useState("");
  const [role, setRole] = useState("all");

  const shown = useMemo(() => {
    const q = query.trim().toLowerCase();
    return (data || [])
      .filter((m) => {
        const roles = m.roles || [];
        if (role === "all") return true;
        if (role === "other") return !roles.some((r) => MAIN_ROLES.includes(r));
        return roles.includes(role);
      })
      .filter((m) => `${displayName(m)} ${m.username} ${m.mobile || ""}`.toLowerCase().includes(q));
  }, [data, query, role]);

  const call = (member) => {
    const number = member.mobile ? String(member.mobile) : null;
    if (!number) {
      Alert.alert("No number", `${displayName(member)} has no mobile number on file.`);
      return;
    }
    Linking.openURL(`tel:${number}`).catch(() => {});
  };

  return (
    <AppScreen title="Staff" headerExtra={<SearchBar value={query} onChangeText={setQuery} placeholder="Search staff..." />}>
      <View>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filters}>
          <FilterChips options={ROLE_FILTERS} value={role} onChange={setRole} />
        </ScrollView>
      </View>
      {loading ? (
        <LoadingView label="Loading staff…" />
      ) : error ? (
        <ErrorState message={error} onRetry={reload} />
      ) : (
        <FlatList
          data={shown}
          keyExtractor={(item) => item._id || item.username}
          contentContainerStyle={styles.list}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} colors={[colors.primary]} />}
          ListHeaderComponent={<Text style={styles.count}>{shown.length} staff</Text>}
          ListEmptyComponent={<EmptyState icon="people-outline" title="No staff found" />}
          renderItem={({ item }) => (
            <ListCard
              title={displayName(item)}
              meta={[roleLabel(item), item.mobile ? String(item.mobile) : null]}
              imageUri={item.profile_image}
              onPress={canSeeAttendance ? () => navigation.navigate("Attendance", { member: item }) : undefined}
              trailing={
                <Pressable onPress={() => call(item)} style={styles.call} accessibilityLabel={`Call ${displayName(item)}`}>
                  <Ionicons name="call" size={18} color={colors.onPrimary} />
                </Pressable>
              }
            />
          )}
        />
      )}
    </AppScreen>
  );
}

const styles = StyleSheet.create({
  filters: { paddingHorizontal: 16, paddingTop: 14, paddingBottom: 2 },
  list: { padding: 16, paddingBottom: 40, gap: 12 },
  count: { color: colors.textMuted, fontSize: 13, fontWeight: "600" },
  call: { width: 40, height: 40, borderRadius: 20, backgroundColor: colors.primary, alignItems: "center", justifyContent: "center" },
});
