import { useMemo, useState } from "react";
import { FlatList, Pressable, RefreshControl, StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import AppScreen from "../../components/AppScreen";
import Segmented from "../../components/Segmented";
import { EmptyState, ErrorState, LoadingView } from "../../components/States";
import useApi from "../../hooks/useApi";
import { mySalary } from "../../services/staffService";
import { addDays, fromIsoDate, longDate, shortDate, timeRange, toIsoDate } from "../../utils/dates";
import { colors, shadow } from "../../theme";

const PERIODS = [
  { value: "week", label: "Week" },
  { value: "month", label: "Month" },
];

/** Monday to Sunday, or the calendar month, `offset` periods back from today. */
function periodRange(period, offset) {
  const today = fromIsoDate(toIsoDate());
  if (period === "week") {
    const monday = addDays(toIsoDate(today), -((today.getDay() + 6) % 7) + offset * 7);
    return [monday, addDays(monday, 6)];
  }
  const first = new Date(today.getFullYear(), today.getMonth() + offset, 1);
  const last = new Date(today.getFullYear(), today.getMonth() + offset + 1, 0);
  return [toIsoDate(first), toIsoDate(last)];
}

const money = (value, currency) =>
  value === null || value === undefined ? "Not set" : `${Number(value).toLocaleString(undefined, { maximumFractionDigits: 2 })} ${currency || ""}`.trim();

/**
 * What the signed-in staff member has earned: one day's salary for each day
 * with a completed sign in and sign out, by week or month.
 */
export default function MySalaryScreen() {
  const [period, setPeriod] = useState("month");
  const [offset, setOffset] = useState(0);
  const [from, to] = useMemo(() => periodRange(period, offset), [period, offset]);

  const { data, loading, refreshing, error, reload, refresh } = useApi(() => mySalary(from, to), [from, to]);

  const title =
    period === "month"
      ? fromIsoDate(from).toLocaleDateString(undefined, { month: "long", year: "numeric" })
      : `${shortDate(from)} – ${shortDate(to)}`;

  const header = (
    <View>
      <Segmented
        options={PERIODS}
        value={period}
        onChange={(value) => {
          setPeriod(value);
          setOffset(0);
        }}
      />
      <View style={styles.periodRow}>
        <Pressable onPress={() => setOffset((o) => o - 1)} hitSlop={10} accessibilityLabel="Previous">
          <Ionicons name="chevron-back" size={22} color={colors.primary} />
        </Pressable>
        <Text style={styles.periodText}>{title}</Text>
        <Pressable onPress={() => setOffset((o) => Math.min(o + 1, 0))} hitSlop={10} disabled={offset === 0} accessibilityLabel="Next">
          <Ionicons name="chevron-forward" size={22} color={offset === 0 ? colors.textFaint : colors.primary} />
        </Pressable>
      </View>
      {data && (
        <View style={styles.summary}>
          <Stat label="Days worked" value={String(data.days_worked)} />
          <Stat label="Per day" value={money(data.daily_salary, data.currency)} />
          <Stat label="Total" value={money(data.total, data.currency)} strong />
        </View>
      )}
      <Text style={styles.note}>A day counts once you sign in and sign out, whatever the hours.</Text>
    </View>
  );

  return (
    <AppScreen title="My Salary">
      {loading && !data ? (
        <LoadingView />
      ) : error && !data ? (
        <ErrorState message={error} onRetry={reload} />
      ) : (
        <FlatList
          data={data?.days || []}
          keyExtractor={(day) => day.date}
          ListHeaderComponent={header}
          contentContainerStyle={styles.content}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} />}
          ListEmptyComponent={<EmptyState icon="wallet-outline" title="No completed days" subtitle="Days appear here after you sign out." />}
          renderItem={({ item }) => (
            <View style={styles.card}>
              <View style={styles.cardTop}>
                <Text style={styles.date}>{longDate(item.date)}</Text>
                <Text style={styles.amount}>{money(item.rate, data?.currency)}</Text>
              </View>
              {item.duties.map((duty, i) => (
                <Text key={i} style={styles.duty}>
                  {duty.patient_name || duty.patient_id} · {timeRange(duty.signin_time, duty.signout_time)}
                  {duty.live_in ? " · 24-hour" : ""}
                </Text>
              ))}
            </View>
          )}
        />
      )}
    </AppScreen>
  );
}

function Stat({ label, value, strong }) {
  return (
    <View style={styles.stat}>
      <Text style={[styles.statValue, strong && styles.statStrong]} numberOfLines={1}>
        {value}
      </Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  content: { padding: 16, paddingBottom: 32, gap: 10 },
  periodRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginTop: 14, marginBottom: 10 },
  periodText: { fontSize: 16, fontWeight: "700", color: colors.text },
  summary: { flexDirection: "row", backgroundColor: colors.surface, borderRadius: 14, padding: 14, gap: 8, ...shadow },
  stat: { flex: 1, alignItems: "center" },
  statValue: { fontSize: 15, fontWeight: "700", color: colors.text },
  statStrong: { color: colors.primary, fontSize: 17 },
  statLabel: { fontSize: 11, color: colors.textMuted, marginTop: 2, textTransform: "uppercase" },
  note: { fontSize: 12, color: colors.textMuted, marginTop: 10, marginBottom: 6 },
  card: { backgroundColor: colors.surface, borderRadius: 12, padding: 14, ...shadow },
  cardTop: { flexDirection: "row", justifyContent: "space-between", marginBottom: 4 },
  date: { fontSize: 14, fontWeight: "600", color: colors.text },
  amount: { fontSize: 14, fontWeight: "700", color: colors.primary },
  duty: { fontSize: 12, color: colors.textBody, marginTop: 2 },
});
