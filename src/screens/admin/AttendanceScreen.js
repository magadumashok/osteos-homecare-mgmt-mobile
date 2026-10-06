import { useEffect, useMemo, useState } from "react";
import { FlatList, StyleSheet, Text, View } from "react-native";
import AppScreen from "../../components/AppScreen";
import { FilterChips } from "../../components/Segmented";
import SelectField from "../../components/SelectField";
import { EmptyState, ErrorState, LoadingView } from "../../components/States";
import { dutyStatus } from "../../hooks/useDutyActions";
import { staffAttendance } from "../../services/dutyService";
import { driverHistory } from "../../services/driverService";
import { listStaff } from "../../services/staffService";
import { displayName, roleLabel } from "../../utils/format";
import { shortDate, time12, timeRange } from "../../utils/dates";
import { colors, shadow } from "../../theme";

const PERIODS = [
  { value: "7", label: "7 days" },
  { value: "30", label: "30 days" },
  { value: "all", label: "All" },
];

const isDriver = (member) => (member?.roles || []).includes("transport");

/** Old "Staff attendance monitor": a staff member's visits (or a driver's trips) and sign-in times. */
export default function AttendanceScreen({ route }) {
  const [member, setMember] = useState(route.params?.member || null);
  const [staff, setStaff] = useState([]);
  const [rows, setRows] = useState(null);
  const [error, setError] = useState(null);
  const [period, setPeriod] = useState("30");

  useEffect(() => {
    listStaff()
      .then((list) => setStaff(list || []))
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (!member) return;
    setRows(null);
    setError(null);
    const request = isDriver(member) ? driverHistory(member.username) : staffAttendance(member.username);
    request.then((list) => setRows(Array.isArray(list) ? list : []), (e) => setError(e.message));
  }, [member]);

  const shown = useMemo(() => {
    if (!rows) return [];
    if (period === "all") return rows;
    const from = new Date();
    from.setDate(from.getDate() - Number(period));
    const cutoff = from.toISOString().slice(0, 10);
    return rows.filter((r) => (r.date || "") >= cutoff);
  }, [rows, period]);

  const summary = useMemo(() => {
    if (isDriver(member)) return `${shown.filter((t) => t.drop).length} of ${shown.length} trips completed`;
    const attended = shown.filter((d) => d.sign_in).length;
    const missed = shown.filter((d) => d.not_attended).length;
    return `${attended} attended · ${missed} not attended · ${shown.length} total`;
  }, [shown, member]);

  const options = staff.map((m) => ({ value: m.username, label: displayName(m), sub: roleLabel(m) }));

  return (
    <AppScreen title="Attendance" subtitle={member ? displayName(member) : undefined}>
      <View style={styles.top}>
        <SelectField
          label="Staff member"
          value={member?.username}
          options={options}
          onChange={(username) => setMember(staff.find((m) => m.username === username) || null)}
          placeholder="Choose a staff member"
        />
        {!!member && <FilterChips options={PERIODS} value={period} onChange={setPeriod} />}
      </View>
      {!member ? (
        <EmptyState icon="time-outline" title="Choose a staff member" />
      ) : error ? (
        <ErrorState message={error} />
      ) : !rows ? (
        <LoadingView label="Loading attendance…" />
      ) : (
        <FlatList
          data={shown}
          keyExtractor={(item, index) => item._id || String(index)}
          contentContainerStyle={styles.list}
          ListHeaderComponent={<Text style={styles.summary}>{summary}</Text>}
          ListEmptyComponent={<EmptyState icon="calendar-outline" title="Nothing in this period" />}
          renderItem={({ item }) =>
            isDriver(member) ? (
              <View style={styles.card}>
                <Text style={styles.date}>
                  {shortDate(item.date)} · {timeRange(item.start_time, item.end_time)}
                </Text>
                <Text style={styles.meta}>{item.staff_name || item.staff_id}</Text>
                <Text style={item.drop ? styles.ok : styles.meta}>
                  {[item.pickup ? `Pickup ${time12(item.pickup_time)}` : "Not picked up", item.drop ? `Drop ${time12(item.drop_time)}` : null]
                    .filter(Boolean)
                    .join(" · ")}
                </Text>
              </View>
            ) : (
              <DutyRow duty={item} />
            )
          }
        />
      )}
    </AppScreen>
  );
}

function DutyRow({ duty }) {
  const status = dutyStatus(duty);
  return (
    <View style={styles.card}>
      <View style={styles.header}>
        <Text style={styles.date}>{shortDate(duty.date)}</Text>
        <View style={[styles.chip, { backgroundColor: status.bg }]}>
          <Text style={[styles.chipText, { color: status.color }]}>{status.label}</Text>
        </View>
      </View>
      <Text style={styles.meta}>{duty.patient_name || duty.patient_id}</Text>
      <Text style={styles.meta}>Planned {timeRange(duty.start_time, duty.end_time)}</Text>
      {duty.sign_in ? <Text style={styles.ok}>Actual {timeRange(duty.signin_time, duty.signout_time) || time12(duty.signin_time)}</Text> : null}
      {duty.not_attended && duty.not_attended_reason ? <Text style={styles.bad}>{duty.not_attended_reason}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  top: { padding: 16, paddingBottom: 4, gap: 12 },
  list: { padding: 16, paddingBottom: 40, gap: 12 },
  summary: { fontSize: 13, color: colors.textMuted, fontWeight: "600" },
  card: { backgroundColor: colors.surface, borderRadius: 16, padding: 14, gap: 4, ...shadow },
  header: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  date: { fontSize: 15, fontWeight: "700", color: colors.text },
  chip: { borderRadius: 20, paddingHorizontal: 10, paddingVertical: 3 },
  chipText: { fontSize: 11, fontWeight: "700" },
  meta: { fontSize: 13, color: colors.textMuted },
  ok: { fontSize: 13, color: colors.success },
  bad: { fontSize: 13, color: colors.danger },
});
