import { useEffect, useMemo, useState } from "react";
import { Alert, Pressable, StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import KeyboardAwareView from "../../components/KeyboardAwareView";
import KeyboardAwareScrollView from "../../components/KeyboardAwareScrollView";
import AppScreen from "../../components/AppScreen";
import DateField from "../../components/DateField";
import { ErrorBanner, PrimaryButton, TextField } from "../../components/Form";
import { FilterChips } from "../../components/Segmented";
import SelectField from "../../components/SelectField";
import { careTasks, createDuty, createDutySeries, rescheduleDuty } from "../../services/dutyService";
import { listPatients } from "../../services/patientService";
import { listStaff } from "../../services/staffService";
import { displayName, roleLabel } from "../../utils/format";
import { addDays, fromIsoDate, shortDate, toIsoDate } from "../../utils/dates";
import { colors, shadow } from "../../theme";

const ROLES = ["nurse", "physiotherapist", "doctor", "caretaker"].map((v) => ({ value: v, label: v.charAt(0).toUpperCase() + v.slice(1) }));
// Caretakers stay with the patient around the clock between two dates.
const LIVE_IN_ROLES = ["caretaker"];
const STAYS = [1, 3, 6].map((n) => ({ value: n, label: `${n} month${n > 1 ? "s" : ""}` }));
const REPEATS = [
  { value: "once", label: "Once" },
  { value: "daily", label: "Every day" },
  { value: "alternate", label: "Alternate days" },
];

const daysBetween = (a, b) => Math.round((fromIsoDate(b) - fromIsoDate(a)) / 86400000);

/** The last day of an n-month stay starting on `date`. */
function monthsLater(date, n) {
  const start = fromIsoDate(date);
  const monthLength = new Date(start.getFullYear(), start.getMonth() + n + 1, 0).getDate();
  return toIsoDate(new Date(start.getFullYear(), start.getMonth() + n, Math.min(start.getDate(), monthLength) - 1));
}

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
 * reschedule one (old "Reschedule staff duty"). A caretaker duty is one
 * 24-hour stay between two dates with the tasks they log each day; it has
 * no times, driver or repeat.
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
  const [taskOptions, setTaskOptions] = useState(existing?.care_tasks || []);
  const [tasks, setTasks] = useState(existing?.care_tasks || []);
  const [customTask, setCustomTask] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const set = (key) => (value) => setForm((f) => ({ ...f, [key]: value }));
  const liveIn = LIVE_IN_ROLES.includes(form.role);

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
    careTasks()
      .then((list) => {
        setTaskOptions((current) => [...(list || []), ...current.filter((t) => !(list || []).includes(t))]);
        // A new caretaker duty starts with every standard task ticked.
        if (!isEdit) setTasks(list || []);
      })
      .catch(() => {});
  }, [isEdit]);

  const setRole = (role) =>
    setForm((f) => {
      const next = { ...f, role };
      // A new stay defaults to one month.
      if (LIVE_IN_ROLES.includes(role) && !LIVE_IN_ROLES.includes(f.role) && f.end_date <= f.date) {
        next.end_date = monthsLater(f.date, 1);
      }
      return next;
    });

  const toggleTask = (task) => setTasks((list) => (list.includes(task) ? list.filter((t) => t !== task) : [...list, task]));
  const addCustomTask = () => {
    const task = customTask.trim();
    if (!task) return;
    if (!taskOptions.includes(task)) setTaskOptions((list) => [...list, task]);
    if (!tasks.includes(task)) setTasks((list) => [...list, task]);
    setCustomTask("");
  };

  const ranges = useMemo(
    () => (repeat === "once" || liveIn ? [] : seriesRanges(form.date, form.end_date, until, repeat === "daily" ? 1 : 2)),
    [repeat, liveIn, form.date, form.end_date, until],
  );

  const validate = () => {
    if (!isEdit && !form.patient_id) return "Choose the patient.";
    if (!form.staff_id) return "Choose the staff member.";
    if (form.end_date < form.date) return "The end date is before the start date.";
    if (liveIn) return tasks.length ? null : "Choose at least one care task.";
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
      const body = liveIn
        ? { patient_id: form.patient_id, staff_id: form.staff_id, role: form.role, date: form.date, end_date: form.end_date, care_tasks: tasks }
        : { ...form, driver: form.driver || null };
      let message;
      if (isEdit) {
        const { patient_id, ...changes } = body;
        message = await rescheduleDuty(existing._id, changes);
      } else if (liveIn || repeat === "once") {
        message = (await createDuty(body)).data?.message;
      } else {
        const { date, end_date, driver, ...rest } = body;
        message = (await createDutySeries({ ...rest, ranges })).data?.message;
      }
      Alert.alert("Saved", message || "Duty saved.", [{ text: "OK", onPress: () => navigation.goBack() }]);
    } catch (e) {
      // 409: the staff member is already booked at that time.
      setError(e.status === 409 ? `${e.message} Pick other dates or another staff member.` : e.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <AppScreen title={isEdit ? "Reschedule Duty" : "Schedule Duty"} subtitle={isEdit ? existing.patient_name : undefined}>
      <KeyboardAwareView style={styles.flex}>
        <KeyboardAwareScrollView contentContainerStyle={styles.content}>
          {!isEdit && <SelectField label="Patient *" value={form.patient_id} options={patients} onChange={set("patient_id")} />}
          <SelectField
            label="Staff member *"
            value={form.staff_id}
            options={staff}
            onChange={(value) => {
              const chosen = staff.find((s) => s.value === value);
              setForm((f) => ({ ...f, staff_id: value }));
              if (ROLES.some((r) => r.value === chosen?.role)) setRole(chosen.role);
            }}
          />
          <Text style={styles.label}>Role on this visit</Text>
          <FilterChips options={ROLES} value={form.role} onChange={setRole} />

          {liveIn ? (
            <>
              <View style={styles.card}>
                <Text style={styles.label}>Stay (24-hour care)</Text>
                <View style={styles.row}>
                  <DateField
                    label="Start date"
                    value={form.date}
                    onChange={(v) => setForm((f) => ({ ...f, date: v, end_date: f.end_date < v ? monthsLater(v, 1) : f.end_date }))}
                  />
                  <DateField label="End date" value={form.end_date} onChange={set("end_date")} minimumDate={fromIsoDate(form.date)} />
                </View>
                <FilterChips
                  options={STAYS}
                  value={STAYS.find((s) => monthsLater(form.date, s.value) === form.end_date)?.value}
                  onChange={(n) => set("end_date")(monthsLater(form.date, n))}
                />
                <Text style={styles.hint}>
                  {daysBetween(form.date, form.end_date) + 1} days. The caretaker sees this duty under My Duties every day until{" "}
                  {shortDate(form.end_date)}.
                </Text>
              </View>

              <View style={styles.card}>
                <Text style={styles.label}>Care tasks</Text>
                <Text style={styles.hint}>The caretaker ticks these off in their daily update.</Text>
                <View style={styles.tasks}>
                  {taskOptions.map((task) => {
                    const on = tasks.includes(task);
                    return (
                      <Pressable key={task} onPress={() => toggleTask(task)} style={[styles.task, on && styles.taskOn]} accessibilityState={{ checked: on }}>
                        <Ionicons name={on ? "checkbox" : "square-outline"} size={18} color={on ? colors.primary : colors.textFaint} />
                        <Text style={[styles.taskText, on && styles.taskTextOn]}>{task}</Text>
                      </Pressable>
                    );
                  })}
                </View>
                <View style={styles.addRow}>
                  <View style={styles.flex}>
                    <TextField placeholder="Other task" value={customTask} onChangeText={setCustomTask} onSubmitEditing={addCustomTask} returnKeyType="done" />
                  </View>
                  <PrimaryButton title="Add" variant="outline" onPress={addCustomTask} disabled={!customTask.trim()} style={styles.addButton} />
                </View>
              </View>
            </>
          ) : (
            <>
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
            </>
          )}

          <ErrorBanner message={error} />
          <PrimaryButton
            title={isEdit ? "Reschedule" : liveIn ? "Schedule caretaker" : "Schedule"}
            icon="checkmark"
            loading={saving}
            onPress={save}
          />
        </KeyboardAwareScrollView>
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
  tasks: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  task: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 20,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  taskOn: { borderColor: colors.primary, backgroundColor: colors.primarySoft },
  taskText: { fontSize: 13, color: colors.textBody },
  taskTextOn: { color: colors.primary, fontWeight: "600" },
  addRow: { flexDirection: "row", alignItems: "flex-end", gap: 10 },
  addButton: { paddingHorizontal: 18 },
});
