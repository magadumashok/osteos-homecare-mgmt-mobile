import { FlatList, RefreshControl, StyleSheet, Text, View } from "react-native";
import AppScreen from "../../components/AppScreen";
import { EmptyState, ErrorState, LoadingView } from "../../components/States";
import useApi from "../../hooks/useApi";
import { dutyStatus } from "../../hooks/useDutyActions";
import { patientSchedules } from "../../services/patientService";
import { capitalize } from "../../utils/format";
import { shortDate, timeRange } from "../../utils/dates";
import { colors, shadow } from "../../theme";

/** Every visit for one patient, newest first, with who attended. */
export default function PatientSchedulesScreen({ route }) {
  const { username, name } = route.params;
  const { data, loading, refreshing, error, reload, refresh } = useApi(() => patientSchedules(username), [username]);

  return (
    <AppScreen title="Schedules" subtitle={name || username}>
      {loading ? (
        <LoadingView label="Loading visits…" />
      ) : error ? (
        <ErrorState message={error} onRetry={reload} />
      ) : (
        <FlatList
          data={data || []}
          keyExtractor={(item) => item._id}
          contentContainerStyle={styles.list}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} colors={[colors.primary]} />}
          ListEmptyComponent={<EmptyState icon="calendar-outline" title="No visits scheduled" />}
          renderItem={({ item }) => {
            const status = dutyStatus(item);
            return (
              <View style={styles.card}>
                <View style={styles.header}>
                  <Text style={styles.date}>{shortDate(item.date)}</Text>
                  <View style={[styles.chip, { backgroundColor: status.bg }]}>
                    <Text style={[styles.chipText, { color: status.color }]}>{status.label}</Text>
                  </View>
                </View>
                <Text style={styles.meta}>{timeRange(item.start_time, item.end_time)}</Text>
                <Text style={styles.meta}>
                  {[item.staff_name || item.staff_id, capitalize(item.role)].filter(Boolean).join(" · ")}
                </Text>
                {item.sign_in ? (
                  <Text style={styles.attended}>Attended {timeRange(item.signin_time, item.signout_time)}</Text>
                ) : null}
                {item.not_attended && item.not_attended_reason ? <Text style={styles.missed}>{item.not_attended_reason}</Text> : null}
              </View>
            );
          }}
        />
      )}
    </AppScreen>
  );
}

const styles = StyleSheet.create({
  list: { padding: 16, paddingBottom: 40, gap: 12 },
  card: { backgroundColor: colors.surface, borderRadius: 16, padding: 14, gap: 4, ...shadow },
  header: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  date: { fontSize: 15, fontWeight: "700", color: colors.text },
  chip: { borderRadius: 20, paddingHorizontal: 10, paddingVertical: 3 },
  chipText: { fontSize: 11, fontWeight: "700" },
  meta: { fontSize: 13, color: colors.textMuted },
  attended: { fontSize: 12, color: colors.success },
  missed: { fontSize: 12, color: colors.danger },
});
