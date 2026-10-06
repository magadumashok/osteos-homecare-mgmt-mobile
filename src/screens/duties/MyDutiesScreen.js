import { useCallback, useState } from "react";
import { ActivityIndicator, FlatList, Pressable, RefreshControl, StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect } from "@react-navigation/native";
import AppScreen from "../../components/AppScreen";
import DateStrip from "../../components/DateStrip";
import NotAttendedModal from "../../components/NotAttendedModal";
import { EmptyState, ErrorState, LoadingView } from "../../components/States";
import useDutyActions, { dutyStatus, isActionable } from "../../hooks/useDutyActions";
import { myDuties } from "../../services/dutyService";
import { capitalize } from "../../utils/format";
import { time12, timeRange, toIsoDate } from "../../utils/dates";
import { colors, shadow } from "../../theme";

/** The old app's "Today's schedule" and "Schedule by date" in one screen. */
export default function MyDutiesScreen({ navigation }) {
  const [date, setDate] = useState(toIsoDate());
  const [duties, setDuties] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);
  const [skipping, setSkipping] = useState(null);

  const load = useCallback(
    async (mode = "load") => {
      mode === "refresh" ? setRefreshing(true) : setLoading(true);
      setError(null);
      try {
        setDuties((await myDuties(date)) || []);
      } catch (e) {
        setError(e.message);
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [date],
  );

  // Reload when coming back from a duty, so sign-in state is current.
  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  const { busyId, confirmSignIn, confirmSignOut, notAttended } = useDutyActions(() => load("refresh"));

  const renderDuty = ({ item }) => {
    const status = dutyStatus(item);
    const actionable = isActionable(item) && status.key !== "missed";
    const busy = busyId === item._id;

    return (
      <Pressable
        onPress={() => navigation.navigate("DutyDetail", { duty: item })}
        style={({ pressed }) => [styles.card, pressed && styles.pressed]}
      >
        <View style={styles.cardTop}>
          <View style={styles.timeBox}>
            <Text style={styles.timeStart}>{time12(item.start_time)}</Text>
            <Text style={styles.timeEnd}>{time12(item.end_time)}</Text>
          </View>
          <View style={styles.cardBody}>
            <Text style={styles.patient} numberOfLines={1}>
              {item.patient_name || item.patient_id}
            </Text>
            {!!item.address && (
              <View style={styles.metaRow}>
                <Ionicons name="location-outline" size={13} color={colors.textMuted} />
                <Text style={styles.meta} numberOfLines={1}>
                  {item.address}
                </Text>
              </View>
            )}
            <View style={styles.metaRow}>
              <View style={[styles.chip, { backgroundColor: status.bg }]}>
                <Text style={[styles.chipText, { color: status.color }]}>{status.label}</Text>
              </View>
              {!!item.role && <Text style={styles.meta}>{capitalize(item.role)}</Text>}
            </View>
          </View>
          <Ionicons name="chevron-forward" size={20} color="#c0c8d0" />
        </View>

        {actionable && status.key !== "done" && (
          <View style={styles.actions}>
            {busy ? (
              <ActivityIndicator color={colors.primary} style={styles.flex} />
            ) : status.key === "scheduled" ? (
              <>
                <Pressable onPress={() => setSkipping(item)} style={[styles.actionButton, styles.actionGhost]}>
                  <Text style={styles.actionGhostText}>Can't attend</Text>
                </Pressable>
                <Pressable onPress={() => confirmSignIn(item)} style={styles.actionButton}>
                  <Ionicons name="log-in-outline" size={18} color={colors.onPrimary} />
                  <Text style={styles.actionText}>Sign in</Text>
                </Pressable>
              </>
            ) : (
              <Pressable onPress={() => confirmSignOut(item)} style={[styles.actionButton, styles.signOut]}>
                <Ionicons name="log-out-outline" size={18} color={colors.onPrimary} />
                <Text style={styles.actionText}>Sign out</Text>
              </Pressable>
            )}
          </View>
        )}

        {status.key === "done" && (
          <Text style={styles.doneText}>
            {timeRange(item.signin_time, item.signout_time) && `Attended ${timeRange(item.signin_time, item.signout_time)}`}
          </Text>
        )}
      </Pressable>
    );
  };

  return (
    <AppScreen title="My Duties" headerExtra={<DateStrip date={date} onChange={setDate} />}>
      {loading ? (
        <LoadingView label="Loading duties…" />
      ) : error ? (
        <ErrorState message={error} onRetry={() => load()} />
      ) : (
        <FlatList
          data={duties}
          keyExtractor={(item) => item._id}
          renderItem={renderDuty}
          contentContainerStyle={styles.list}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => load("refresh")} colors={[colors.primary]} />}
          ListHeaderComponent={
            duties.length ? (
              <Text style={styles.count}>
                {duties.length} visit{duties.length === 1 ? "" : "s"}
              </Text>
            ) : null
          }
          ListEmptyComponent={<EmptyState icon="calendar-outline" title="No duties" subtitle="Nothing is scheduled for you on this day." />}
        />
      )}

      <NotAttendedModal
        visible={!!skipping}
        onClose={() => setSkipping(null)}
        onSubmit={(reason) => {
          const duty = skipping;
          setSkipping(null);
          notAttended(duty, reason);
        }}
      />
    </AppScreen>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  list: { padding: 16, paddingBottom: 40, gap: 12 },
  count: { color: colors.textMuted, fontSize: 13, fontWeight: "600" },
  card: { backgroundColor: colors.surface, borderRadius: 16, padding: 14, gap: 12, ...shadow },
  pressed: { opacity: 0.85 },
  cardTop: { flexDirection: "row", alignItems: "center", gap: 12 },
  timeBox: {
    width: 74,
    paddingVertical: 8,
    borderRadius: 12,
    backgroundColor: colors.primarySoft,
    alignItems: "center",
  },
  timeStart: { fontSize: 14, fontWeight: "700", color: colors.primary },
  timeEnd: { fontSize: 12, color: colors.textMuted, marginTop: 2 },
  cardBody: { flex: 1, gap: 4 },
  patient: { fontSize: 16, fontWeight: "700", color: colors.text },
  metaRow: { flexDirection: "row", alignItems: "center", gap: 6 },
  meta: { fontSize: 12, color: colors.textMuted, flexShrink: 1 },
  chip: { borderRadius: 20, paddingHorizontal: 10, paddingVertical: 3 },
  chipText: { fontSize: 11, fontWeight: "700" },
  actions: { flexDirection: "row", gap: 10, minHeight: 44, alignItems: "center" },
  actionButton: {
    flex: 1,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.primary,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
  },
  signOut: { backgroundColor: "#e65100" },
  actionText: { color: colors.onPrimary, fontSize: 14, fontWeight: "700" },
  actionGhost: { backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border },
  actionGhostText: { color: colors.textBody, fontSize: 14, fontWeight: "600" },
  doneText: { fontSize: 12, color: colors.success },
});
