import { useCallback, useState } from "react";
import { FlatList, Linking, Pressable, RefreshControl, StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect } from "@react-navigation/native";
import AppScreen, { HeaderIconButton } from "../../components/AppScreen";
import DateStrip from "../../components/DateStrip";
import { EmptyState, ErrorState, LoadingView } from "../../components/States";
import { dutyStatus } from "../../hooks/useDutyActions";
import { listDuties } from "../../services/dutyService";
import { capitalize } from "../../utils/format";
import { dateRange, time12, timeRange, toIsoDate } from "../../utils/dates";
import { colors, shadow } from "../../theme";

const hasPoint = (lat, lng) => lat != null && lat !== "" && lng != null && lng !== "";

/** "Signed in 9:02 am · Map" — opens where the staff member was in Maps. */
function AttendancePoint({ label, done, time, lat, lng }) {
  if (!done) return null;
  const located = hasPoint(lat, lng);
  return (
    <Pressable
      disabled={!located}
      onPress={() => Linking.openURL(`https://www.google.com/maps/search/?api=1&query=${lat},${lng}`)}
      style={styles.metaRow}
      hitSlop={6}
      accessibilityLabel={`${label} location`}
    >
      <Ionicons name={located ? "location" : "location-outline"} size={13} color={located ? colors.primary : colors.textMuted} />
      <Text style={styles.meta}>
        {label} {time12(time)}
        {located ? <Text style={styles.link}> · View on map</Text> : " · no location"}
      </Text>
    </Pressable>
  );
}

/** Old "List of all duty schedules": every duty starting on a day; tap to reschedule. */
export default function DutySchedulesScreen({ navigation }) {
  const [date, setDate] = useState(toIsoDate());
  const [duties, setDuties] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);

  const load = useCallback(
    async (mode = "load") => {
      mode === "refresh" ? setRefreshing(true) : setLoading(true);
      setError(null);
      try {
        setDuties((await listDuties({ date })) || []);
      } catch (e) {
        setError(e.message);
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [date],
  );

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  return (
    <AppScreen
      title="Duty Schedules"
      right={<HeaderIconButton icon="add" label="Schedule duty" onPress={() => navigation.navigate("DutyForm", { date })} />}
      headerExtra={<DateStrip date={date} onChange={setDate} />}
    >
      {loading ? (
        <LoadingView label="Loading duties…" />
      ) : error ? (
        <ErrorState message={error} onRetry={() => load()} />
      ) : (
        <FlatList
          data={duties}
          keyExtractor={(item) => item._id}
          contentContainerStyle={styles.list}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => load("refresh")} colors={[colors.primary]} />}
          ListHeaderComponent={duties.length ? <Text style={styles.count}>{duties.length} duties</Text> : null}
          ListEmptyComponent={<EmptyState icon="calendar-outline" title="No duties on this day" subtitle="Tap + to schedule one." />}
          renderItem={({ item }) => {
            const status = dutyStatus(item);
            return (
              <Pressable onPress={() => navigation.navigate("DutyForm", { duty: item })} style={({ pressed }) => [styles.card, pressed && styles.pressed]}>
                <View style={styles.header}>
                  <Text style={styles.time}>
                    {item.live_in ? "24-hour care" : timeRange(item.start_time, item.end_time)}
                  </Text>
                  <View style={[styles.chip, { backgroundColor: status.bg }]}>
                    <Text style={[styles.chipText, { color: status.color }]}>{status.label}</Text>
                  </View>
                </View>
                <Text style={styles.patient}>{item.patient_name || item.patient_id}</Text>
                <View style={styles.metaRow}>
                  <Ionicons name="calendar-outline" size={13} color={colors.textMuted} />
                  <Text style={styles.meta}>{dateRange(item.date, item.end_date)}</Text>
                </View>
                <View style={styles.metaRow}>
                  <Ionicons name="person-outline" size={13} color={colors.textMuted} />
                  <Text style={styles.meta}>{[item.staff_name || item.staff_id, capitalize(item.role)].filter(Boolean).join(" · ")}</Text>
                </View>
                {!!item.driver && (
                  <View style={styles.metaRow}>
                    <Ionicons name="car-outline" size={13} color={colors.textMuted} />
                    <Text style={styles.meta}>{item.driver}</Text>
                  </View>
                )}
                <AttendancePoint label="Signed in" done={item.sign_in} time={item.signin_time} lat={item.signin_latitude} lng={item.signin_longitude} />
                <AttendancePoint label="Signed out" done={item.sign_out} time={item.signout_time} lat={item.signout_latitude} lng={item.signout_longitude} />
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
  card: { backgroundColor: colors.surface, borderRadius: 16, padding: 14, gap: 5, ...shadow },
  pressed: { opacity: 0.85 },
  header: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  time: { fontSize: 14, fontWeight: "700", color: colors.primary },
  chip: { borderRadius: 20, paddingHorizontal: 10, paddingVertical: 3 },
  chipText: { fontSize: 11, fontWeight: "700" },
  patient: { fontSize: 16, fontWeight: "700", color: colors.text },
  metaRow: { flexDirection: "row", alignItems: "center", gap: 6 },
  meta: { fontSize: 13, color: colors.textMuted },
  link: { color: colors.primary, fontWeight: "600" },
});
