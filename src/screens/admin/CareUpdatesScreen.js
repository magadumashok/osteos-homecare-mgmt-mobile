import { useCallback, useState } from "react";
import { FlatList, Pressable, RefreshControl, StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect } from "@react-navigation/native";
import AppScreen from "../../components/AppScreen";
import DateStrip from "../../components/DateStrip";
import { EmptyState, ErrorState, LoadingView } from "../../components/States";
import { careDay } from "../../services/dutyService";
import { shortDate, time12, toIsoDate } from "../../utils/dates";
import { colors, shadow } from "../../theme";

/** Where a caretaker's day stands, for the chip on each card. */
function dayStatus(log, date) {
  if (log?.status === "skipped") {
    return log.cover_duty_id
      ? { label: "Skipped · covered", color: "#1565c0", bg: "#e3f2fd" }
      : { label: "Skipped · needs cover", color: "#b91c1c", bg: "#fef2f2" };
  }
  if (log?.status === "logged") return { label: `Updated ${time12(log.updated_time)}`, color: "#2e7d32", bg: "#e8f5e9" };
  return { label: date > toIsoDate() ? "Upcoming" : "No update yet", color: "#6b7280", bg: "#f3f4f6" };
}

/** Admin view of every caretaker on 24-hour duty on a day and their update; tap for the full log. */
export default function CareUpdatesScreen({ navigation }) {
  const [date, setDate] = useState(toIsoDate());
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);

  const load = useCallback(
    async (mode = "load") => {
      mode === "refresh" ? setRefreshing(true) : setLoading(true);
      setError(null);
      try {
        setRows((await careDay(date)) || []);
      } catch (e) {
        setError(e.message);
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [date],
  );

  // Reload when coming back from a care log (a cover may have been assigned).
  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  const needCover = rows.filter((r) => r.log?.status === "skipped" && !r.log.cover_duty_id).length;

  return (
    <AppScreen title="Caretaker Updates" headerExtra={<DateStrip date={date} onChange={setDate} />}>
      {loading ? (
        <LoadingView label="Loading updates…" />
      ) : error ? (
        <ErrorState message={error} onRetry={() => load()} />
      ) : (
        <FlatList
          data={rows}
          keyExtractor={(item) => item._id}
          contentContainerStyle={styles.list}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => load("refresh")} colors={[colors.primary]} />}
          ListHeaderComponent={
            rows.length ? (
              <Text style={styles.count}>
                {rows.length} on duty · {rows.filter((r) => r.log?.status === "logged").length} updated
                {needCover ? ` · ${needCover} need cover` : ""}
              </Text>
            ) : null
          }
          ListEmptyComponent={<EmptyState icon="heart-outline" title="No caretakers on duty" subtitle="No 24-hour duties run on this day." />}
          renderItem={({ item }) => {
            const status = dayStatus(item.log, date);
            const tasks = Array.isArray(item.log?.tasks) ? item.log.tasks : [];
            return (
              <Pressable
                onPress={() => navigation.navigate("CareLog", { duty: item, date })}
                style={({ pressed }) => [styles.card, pressed && styles.pressed]}
              >
                <View style={styles.header}>
                  <Text style={styles.patient} numberOfLines={1}>
                    {item.patient_name || item.patient_id}
                  </Text>
                  <Ionicons name="chevron-forward" size={20} color="#c0c8d0" />
                </View>
                <View style={styles.metaRow}>
                  <Ionicons name="person-outline" size={13} color={colors.textMuted} />
                  <Text style={styles.meta}>
                    {item.staff_name || item.staff_id}
                    {item.covers_duty_id ? " (cover)" : ""} · until {shortDate(item.end_date)}
                  </Text>
                </View>
                <View style={[styles.chip, { backgroundColor: status.bg }]}>
                  <Text style={[styles.chipText, { color: status.color }]}>{status.label}</Text>
                </View>
                {item.log?.status === "logged" && (
                  <Text style={styles.meta}>
                    {tasks.filter((t) => t.done).length} of {tasks.length} tasks done
                  </Text>
                )}
                {item.log?.status === "skipped" && <Text style={styles.meta}>Reason: {item.log.skip_reason}</Text>}
                {!!item.log?.symptoms && (
                  <Text style={styles.symptoms} numberOfLines={3}>
                    Symptoms: {item.log.symptoms}
                  </Text>
                )}
              </Pressable>
            );
          }}
        />
      )}
    </AppScreen>
  );
}

const styles = StyleSheet.create({
  list: { padding: 16, paddingBottom: 40, gap: 12 },
  count: { color: colors.textMuted, fontSize: 13, fontWeight: "600" },
  card: { backgroundColor: colors.surface, borderRadius: 16, padding: 14, gap: 6, ...shadow },
  pressed: { opacity: 0.85 },
  header: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", gap: 8 },
  patient: { flex: 1, fontSize: 16, fontWeight: "700", color: colors.text },
  metaRow: { flexDirection: "row", alignItems: "center", gap: 6 },
  meta: { fontSize: 13, color: colors.textMuted, flexShrink: 1 },
  chip: { alignSelf: "flex-start", borderRadius: 20, paddingHorizontal: 10, paddingVertical: 3 },
  chipText: { fontSize: 11, fontWeight: "700" },
  symptoms: { fontSize: 13, color: "#b91c1c" },
});
