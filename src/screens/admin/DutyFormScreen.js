import { useEffect, useMemo, useState } from "react";
import { Alert, ScrollView, StyleSheet, Text, View } from "react-native";
import KeyboardAwareView from "../../components/KeyboardAwareView";
import AppScreen from "../../components/AppScreen";
import DateField from "../../components/DateField";
import { ErrorBanner, PrimaryButton } from "../../components/Form";
import { FilterChips } from "../../components/Segmented";
import SelectField from "../../components/SelectField";
import { createDuty, createDutySeries, rescheduleDuty } from "../../services/dutyService";
import { listPatients } from "../../services/patientService";
import { listStaff } from "../../services/staffService";
import { displayName, roleLabel } from "../../utils/format";
import { addDays, fromIsoDate, shortDate, toIsoDate } from "../../utils/dates";
import { colors, shadow } from "../../theme";

const ROLES = ["nurse", "physiotherapist", "doctor"].map((v) => ({ value: v, label: v.charAt(0).toUpperCase() + v.slice(1) }));
const REPEATS = [
  { value: "once", label: "Once" },
  { value: "daily", label: "Every day" },
  { value: "alternate", label: "Alternate days" },
];

const daysBetween = (a, b) => Math.round((fromIsoDate(b) - fromIsoDate(a)) / 86400000);

/** Every occurrence from the first visit until `until`, stepping 1 or 2 days. */
function seriesRanges(date, endDate, until, step) {
  const span = daysBetween(date, endDate);
  const ranges = [];
  for (let d = date; d <= until && ranges.length < 62; d = addDays(d, step)) {
    ranges.push({ start_date: d, end_date: addDays(d, span) });
  }
  return ranges;
}

/**
 * Schedule a duty (old "Add shift schedule" / "Alternate day schedule") or
 * reschedule one (old "Reschedule staff duty").
 */
export default function DutyFormScreen({ navigation, route }) {
  const existing = route.params?.duty;
  const isEdit = Boolean(existing);

  const [patients, setPatients] = useState([]);
  const [staff, setStaff] = useState([]);
  const [drivers, setDrivers] = useState([]);
  const [form, setForm] = useState(() => ({
    patient_id: existing?.patient_id || "",
    staff_id: existing?.staff_id || "",
    role: existing?.role || "nurse",
    driver: existing?.driver || "",
    date: existing?.date || route.params?.date || toIsoDate(),
    end_date: existing?.end_date || existing?.date || route.params?.date || toIsoDate(),
    start_time: existing?.start_time || "09:00",
    end_time: existing?.end_time || "10:00",
  }));
  const [repeat, setRepeat] = useState("once");
  const [until, setUntil] = useState(addDays(form.date, 6));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const set = (key) => (value) => setForm((f) => ({ ...f, [key]: value }));

  useEffect(() => {
    if (!isEdit) {
      listPatients()
        .then((list) => setPatients((list || []).map((p) => ({ value: p.username, label: p.patient_name || p.username, sub: p.username }))))
        .catch(() => {});
    }
    listStaff({ group: "visiting" })
      .then((list) => setStaff((list || []).map((m) => ({ value: m.username, label: displayName(m), sub: roleLabel(m), role: m.roles?.[0] }))))
      .catch(() => {});
    listStaff({ role: "transport" })
      .then((list) => setDrivers((list || []).map((d) => ({ value: d.name, label: displayName(d) }))))
      .catch(() => {});
  }, [isEdit]);

  const ranges = useMemo(
    () => (repeat === "once" ? [] : seriesRanges(form.date, form.end_date, until, repeat === "daily" ? 1 : 2)),
    [repeat, form.date, form.end_date, until],
  );

  const validate = () => {
    if (!isEdit && !form.patient_id) return "Choose the patient.";
    if (!form.staff_id) return "Choose the staff member.";
    if (form.end_date < form.date) return "The end date is before the start date.";
    if (form.end_date === form.date && form.end_time <= form.start_time) return "The duty must end after it starts (use the end date for overnight duties).";
    if (repeat !== "once" && ranges.length < 2) return "Choose a 'repeat until' date after the first visit.";
    return null;
  };

  const save = async () => {
    const problem = validate();
    setError(problem);
    if (problem) return;

    setSaving(true);
    try {
      const body = { ...form, driver: form.driver || null };
      let message;
      if (isEdit) {
        const { patient_id, ...changes } = body;
        message = await rescheduleDuty(existing._id, changes);
      } else if (repeat === "once") {
        message = (await createDuty(body)).data?.message;
      } else {
        const { date, end_date, driver, ...rest } = body;
        message = (await createDutySeries({ ...rest, ranges })).data?.message;
      }
      Alert.alert("Saved", message || "Duty saved.", [{ text: "OK", onPress: () => navigation.goBack() }]);
    } catch (e) {
      // 409: the staff member is already booked at that time.
      setError(e.status === 409 ? `${e.message} Pick another time or staff member.` : e.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <AppScreen title={isEdit ? "Reschedule Duty" : "Schedule Duty"} subtitle={isEdit ? existing.patient_name : undefined}>
      <KeyboardAwareView style={styles.flex}>
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          {!isEdit && <SelectField label="Patient *" value={form.patient_id} options={patients} onChange={set("patient_id")} />}
          <SelectField
            label="Staff member *"
            value={form.staff_id}
            options={staff}
            onChange={(value) => {
              const chosen = staff.find((s) => s.value === value);
              setForm((f) => ({ ...f, staff_id: value, role: ROLES.some((r) => r.value === chosen?.role) ? chosen.role : f.role }));
            }}
          />
          <Text style={styles.label}>Role on this visit</Text>
          <FilterChips options={ROLES} value={form.role} onChange={set("role")} />

          <View style={styles.row}>
            <DateField
              label="Date"
              value={form.date}
              onChange={(v) => setForm((f) => ({ ...f, date: v, end_date: f.end_date < v ? v : f.end_date }))}
            />
            <DateField label="End date" value={form.end_date} onChange={set("end_date")} />
          </View>
          <View style={styles.row}>
            <DateField label="Start" value={form.start_time} onChange={set("start_time")} mode="time" />
            <DateField label="End" value={form.end_time} onChange={set("end_time")} mode="time" />
          </View>

          {!isEdit && (
            <View style={styles.card}>
              <Text style={styles.label}>Repeat</Text>
              <FilterChips options={REPEATS} value={repeat} onChange={setRepeat} />
              {repeat !== "once" && (
                <>
                  <DateField label="Repeat until" value={until} onChange={setUntil} />
                  <Text style={styles.hint}>
                    {ranges.length} visit{ranges.length === 1 ? "" : "s"}
                    {ranges.length ? `: ${shortDate(ranges[0].start_date)} → ${shortDate(ranges[ranges.length - 1].start_date)}` : ""}
                    {ranges.length >= 62 ? " (maximum 62)" : ""}
                  </Text>
                  <Text style={styles.hint}>Drivers are booked for single visits only.</Text>
                </>
              )}
            </View>
          )}

          {repeat === "once" && (
            <SelectField label="Driver" value={form.driver} options={drivers} onChange={set("driver")} allowClear placeholder="No driver" />
          )}

          <ErrorBanner message={error} />
          <PrimaryButton title={isEdit ? "Reschedule" : "Schedule"} icon="checkmark" loading={saving} onPress={save} />
        </ScrollView>
      </KeyboardAwareView>
    </AppScreen>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  content: { padding: 16, paddingBottom: 40, gap: 14 },
  row: { flexDirection: "row", gap: 12 },
  label: { color: colors.textBody, fontSize: 14, fontWeight: "600" },
  card: { backgroundColor: colors.surface, borderRadius: 16, padding: 14, gap: 10, ...shadow },
  hint: { fontSize: 12, color: colors.textMuted },
});
