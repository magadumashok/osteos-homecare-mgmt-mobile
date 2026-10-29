import { useEffect, useMemo, useState } from "react";
import { Alert, Pressable, StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import KeyboardAwareView from "../../components/KeyboardAwareView";
import KeyboardAwareScrollView from "../../components/KeyboardAwareScrollView";
import AppScreen from "../../components/AppScreen";
import DateField from "../../components/DateField";
import { ErrorBanner, PrimaryButton, TextField } from "../../components/Form";
import Segmented, { FilterChips } from "../../components/Segmented";
import SelectField from "../../components/SelectField";
import { careTasks, createDuty, createDutySeries, rescheduleDuty } from "../../services/dutyService";
import { listPatients } from "../../services/patientService";
import { listStaff } from "../../services/staffService";
import { displayName, roleLabel } from "../../utils/format";
import { SERVICE_OPTIONS, serviceChoice, serviceValue } from "../../utils/services";
import { addDays, fromIsoDate, shortDate, toIsoDate } from "../../utils/dates";
import { colors, shadow } from "../../theme";

const ROLES = ["nurse", "physiotherapist", "doctor", "caretaker"].map((v) => ({ value: v, label: v.charAt(0).toUpperCase() + v.slice(1) }));
const HOURS = [
  { value: "shift", label: "Shift (set hours)", icon: "time-outline" },
  { value: "24h", label: "24 hours", icon: "moon-outline" },
];
const STAYS = [1, 3, 6].map((n) => ({ value: n, label: `${n} month${n > 1 ? "s" : ""}` }));
const SHIFT_HOURS = [5, 8, 10, 12].map((h) => ({ value: h, label: `${h} h` }));
const REPEATS = [
  { value: 1, label: "Every day" },
  { value: 2, label: "Alternate days" },
];
const MAX_SHIFTS = 200; // about six months of daily shifts (the server's limit)

const daysBetween = (a, b) => Math.round((fromIsoDate(b) - fromIsoDate(a)) / 86400000);
const minutes = (t) => {
  const [h, m] = String(t || "").split(":").map(Number);
  return Number.isFinite(h) && Number.isFinite(m) ? h * 60 + m : null;
};
const hhmm = (total) => `${String(Math.floor(total / 60) % 24).padStart(2, "0")}:${String(total % 60).padStart(2, "0")}`;

/** "12h", "10h 30m": a shift's length, allowing it to run past midnight. */
function shiftLength(start, end) {
  const s = minutes(start);
  const e = minutes(end);
  if (s === null || e === null) return "";
  const total = (e - s + 1440) % 1440 || 1440;
  return `${Math.floor(total / 60)}h${total % 60 ? ` ${total % 60}m` : ""}`;
}

/** The last day of an n-month period starting on `date`. */
function monthsLater(date, n) {
  const start = fromIsoDate(date);
  const monthLength = new Date(start.getFullYear(), start.getMonth() + n + 1, 0).getDate();
  return toIsoDate(new Date(start.getFullYear(), start.getMonth() + n, Math.min(start.getDate(), monthLength) - 1));
}

/**
 * Schedule a duty or reschedule one, for any role:
 *  - Shift: set start and end times (5, 10, 12 hours…), on one day or every
 *    (or every other) day up to a last day — one duty per day, each signed
 *    in and out with location. A shift ending before it starts runs overnight.
 *  - 24 hours: stays with the patient from a start to an end date and sends
 *    a daily update instead of signing in; no times, driver or repeat.
 * Service and fees start from the patient's registration.
 */
export default function DutyFormScreen({ navigation, route }) {
  const existing = route.params?.duty;
  const isEdit = Boolean(existing);
  const startDate = existing?.date || route.params?.date || toIsoDate();

  const [patients, setPatients] = useState([]);
  const [staff, setStaff] = useState([]);
  const [drivers, setDrivers] = useState([]);
  const [form, setForm] = useState(() => {
    const choice = serviceChoice(existing?.service);
    return {
      patient_id: existing?.patient_id || "",
      staff_id: existing?.staff_id || "",
      role: existing?.role || "nurse",
      driver: existing?.driver || "",
      hours: existing?.live_in ? "24h" : "shift",
      date: startDate,
      end_date: existing?.live_in ? existing.end_date : startDate,
      start_time: existing && !existing.live_in ? existing.start_time : "08:00",
      end_time: existing && !existing.live_in ? existing.end_time : "20:00",
      service: choice.service,
      service_other: choice.other,
      fees: existing?.fees != null ? String(existing.fees) : "",
    };
  });
  const [step, setStep] = useState(1);
  const [taskOptions, setTaskOptions] = useState(existing?.care_tasks || []);
  const [tasks, setTasks] = useState(existing?.care_tasks || []);
  const [customTask, setCustomTask] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const set = (key) => (value) => setForm((f) => ({ ...f, [key]: value }));
  const liveIn = form.hours === "24h";
  // Caretakers tick off their tasks on shifts too; 24-hour duties of any role have them.
  const showTasks = liveIn || form.role === "caretaker";
  const overnight = minutes(form.end_time) !== null && minutes(form.end_time) <= minutes(form.start_time);

  useEffect(() => {
    if (!isEdit) {
      listPatients()
        .then((list) =>
          setPatients((list || []).map((p) => ({ value: p.username, label: p.patient_name || p.username, sub: p.username, service: p.service, fees: p.fees }))),
        )
        .catch(() => {});
    }
    listStaff({ group: "visiting" })
      .then((list) => setStaff((list || []).map((m) => ({ value: m.username, label: displayName(m), sub: roleLabel(m), role: m.roles?.[0] }))))
      .catch(() => {});
    listStaff({ role: "transport" })
      .then((list) => setDrivers((list || []).map((d) => ({ value: d.name, label: displayName(d) }))))
      .catch(() => {});
    careTasks()
      .then((list) => setTaskOptions((current) => [...(list || []), ...current.filter((t) => !(list || []).includes(t))]))
      .catch(() => {});
  }, [isEdit]);

  // A new duty takes the service and fees the patient was registered with.
  const choosePatient = (value) => {
    const patient = patients.find((p) => p.value === value);
    const choice = serviceChoice(patient?.service);
    setForm((f) => ({
      ...f,
      patient_id: value,
      service: choice.service,
      service_other: choice.other,
      fees: patient?.fees != null ? String(patient.fees) : "",
    }));
  };

  const setHours = (hours) =>
    setForm((f) => ({ ...f, hours, end_date: hours === "24h" && f.end_date <= f.date ? monthsLater(f.date, 1) : f.end_date }));

  // A new caretaker duty starts with every standard task ticked (shift or 24 hours).
  useEffect(() => {
    if (!isEdit && form.role === "caretaker") setTasks((current) => (current.length ? current : taskOptions));
  }, [isEdit, form.role, taskOptions]);

  const toggleTask = (task) => setTasks((list) => (list.includes(task) ? list.filter((t) => t !== task) : [...list, task]));
  const addCustomTask = () => {
    const task = customTask.trim();
    if (!task) return;
    if (!taskOptions.includes(task)) setTaskOptions((list) => [...list, task]);
    if (!tasks.includes(task)) setTasks((list) => [...list, task]);
    setCustomTask("");
  };

  // Shift days from the start date to the last day, every day or every other day.
  const shiftDays = useMemo(() => {
    if (liveIn || isEdit || form.end_date < form.date) return [];
    const list = [];
    for (let d = form.date; d <= form.end_date && list.length <= MAX_SHIFTS; d = addDays(d, step)) list.push(d);
    return list;
  }, [liveIn, isEdit, form.date, form.end_date, step]);

  const validate = () => {
    if (!isEdit && !form.patient_id) return "Choose the patient.";
    if (!form.staff_id) return "Choose the staff member.";
    if (form.service === "other" && !form.service_other.trim()) return "Enter the service name.";
    if (form.end_date < form.date) return "The end date is before the start date.";
    if (!liveIn && form.start_time === form.end_time) return "The shift must end at a different time than it starts.";
    if (shiftDays.length > MAX_SHIFTS) return `At most ${MAX_SHIFTS} shifts can be scheduled at once. Choose an earlier last day.`;
    return null;
  };

  const save = async () => {
    const problem = validate();
    setError(problem);
    if (problem) return;

    const common = {
      patient_id: form.patient_id,
      staff_id: form.staff_id,
      role: form.role,
      service: serviceValue(form.service, form.service_other) || null,
      fees: form.fees.trim() === "" ? null : Number(form.fees),
    };
    const endOf = (d) => (overnight ? addDays(d, 1) : d);

    setSaving(true);
    try {
      let message;
      if (liveIn) {
        const stay = { ...common, live_in: true, date: form.date, end_date: form.end_date, care_tasks: tasks };
        if (isEdit) {
          const { patient_id, ...changes } = stay;
          message = await rescheduleDuty(existing._id, changes);
        } else {
          message = (await createDuty(stay)).data?.message;
        }
      } else {
        const shift = {
          ...common,
          live_in: false,
          start_time: form.start_time,
          end_time: form.end_time,
          care_tasks: showTasks ? tasks : [],
        };
        if (isEdit) {
          const { patient_id, ...changes } = shift;
          message = await rescheduleDuty(existing._id, { ...changes, driver: form.driver || null, date: form.date, end_date: endOf(form.date) });
        } else if (shiftDays.length > 1) {
          message = (
            await createDutySeries({ ...shift, ranges: shiftDays.map((d) => ({ start_date: d, end_date: endOf(d) })) })
          ).data?.message;
        } else {
          message = (await createDuty({ ...shift, driver: form.driver || null, date: form.date, end_date: endOf(form.date) })).data?.message;
        }
      }
      Alert.alert("Saved", message || "Duty saved.", [{ text: "OK", onPress: () => navigation.goBack() }]);
    } catch (e) {
      // 409: the staff member or the patient is already booked then.
      setError(e.status === 409 ? `${e.message} Pick other dates or another staff member.` : e.message);
    } finally {
      setSaving(false);
    }
  };

  const shiftEnd = (h) => (minutes(form.start_time) !== null ? hhmm(minutes(form.start_time) + h * 60) : null);

  return (
    <AppScreen title={isEdit ? "Reschedule Duty" : "Schedule Duty"} subtitle={isEdit ? existing.patient_name : undefined}>
      <KeyboardAwareView style={styles.flex}>
        <KeyboardAwareScrollView contentContainerStyle={styles.content}>
          {!isEdit && <SelectField label="Patient *" value={form.patient_id} options={patients} onChange={choosePatient} />}
          <SelectField
            label="Staff member *"
            value={form.staff_id}
            options={staff}
            onChange={(value) => {
              const chosen = staff.find((s) => s.value === value);
              setForm((f) => ({ ...f, staff_id: value, role: ROLES.some((r) => r.value === chosen?.role) ? chosen.role : f.role }));
            }}
          />
          <Text style={styles.label}>Role on this duty</Text>
          <FilterChips options={ROLES} value={form.role} onChange={set("role")} />

          <SelectField
            label="Service"
            value={form.service}
            options={SERVICE_OPTIONS}
            allowClear
            placeholder="Nursing, Care taking or Other"
            onChange={(value) => setForm((f) => ({ ...f, service: value || "" }))}
          />
          {form.service === "other" && (
            <TextField label="Service name *" value={form.service_other} onChangeText={set("service_other")} />
          )}
          <TextField label="Fees" value={form.fees} onChangeText={set("fees")} keyboardType="decimal-pad" />

          <Text style={styles.label}>Duty hours</Text>
          <Segmented options={HOURS} value={form.hours} onChange={setHours} />
          <Text style={styles.hint}>
            {liveIn
              ? "Stays with the patient round the clock. No sign in or out; they send a daily update instead."
              : "Works set hours each day and signs in and out every day (with location)."}
          </Text>

          <View style={styles.card}>
            <View style={styles.row}>
              <DateField
                label="Start date"
                value={form.date}
                onChange={(v) =>
                  setForm((f) => ({ ...f, date: v, end_date: f.end_date < v ? (f.hours === "24h" ? monthsLater(v, 1) : v) : f.end_date }))
                }
              />
              {(liveIn || !isEdit) && (
                <DateField label={liveIn ? "End date" : "Last day"} value={form.end_date} onChange={set("end_date")} minimumDate={fromIsoDate(form.date)} />
              )}
            </View>
            {(liveIn || !isEdit) && (
              <FilterChips
                options={STAYS}
                value={STAYS.find((s) => monthsLater(form.date, s.value) === form.end_date)?.value}
                onChange={(n) => set("end_date")(monthsLater(form.date, n))}
              />
            )}

            {!liveIn && (
              <>
                <View style={styles.row}>
                  <DateField label="Shift starts" value={form.start_time} onChange={set("start_time")} mode="time" />
                  <DateField label="Shift ends" value={form.end_time} onChange={set("end_time")} mode="time" />
                </View>
                <FilterChips
                  options={SHIFT_HOURS}
                  value={SHIFT_HOURS.find((h) => shiftEnd(h.value) === form.end_time)?.value}
                  onChange={(h) => set("end_time")(shiftEnd(h))}
                />
                <Text style={styles.hint}>
                  {shiftLength(form.start_time, form.end_time)} shift{overnight ? " · ends the next morning" : ""}
                </Text>
                {!isEdit && form.end_date > form.date && (
                  <>
                    <FilterChips options={REPEATS} value={step} onChange={setStep} />
                    <Text style={styles.hint}>
                      {shiftDays.length > MAX_SHIFTS
                        ? `More than ${MAX_SHIFTS} shifts. Choose an earlier last day.`
                        : `${shiftDays.length} shifts: ${shortDate(shiftDays[0])} → ${shortDate(shiftDays[shiftDays.length - 1])}. Drivers are booked for single shifts only.`}
                    </Text>
                  </>
                )}
              </>
            )}
            {liveIn && (
              <Text style={styles.hint}>
                {daysBetween(form.date, form.end_date) + 1} days. They see this duty under My Duties every day until {shortDate(form.end_date)}.
              </Text>
            )}
          </View>

          {showTasks && (
            <View style={styles.card}>
              <Text style={styles.label}>{liveIn ? "Daily tasks" : "Tasks each shift"}</Text>
              <Text style={styles.hint}>
                {liveIn ? "Ticked off in the daily update (optional)." : "Ticked off in the shift's care update (optional)."}
              </Text>
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
          )}

          {!liveIn && shiftDays.length <= 1 && (
            <SelectField label="Driver" value={form.driver} options={drivers} onChange={set("driver")} allowClear placeholder="No driver" />
          )}

          <ErrorBanner message={error} />
          <PrimaryButton
            title={isEdit ? "Reschedule" : liveIn ? "Schedule 24-hour duty" : shiftDays.length > 1 ? `Schedule ${shiftDays.length} shifts` : "Schedule shift"}
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
