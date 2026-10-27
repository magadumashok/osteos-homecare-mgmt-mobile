import { useCallback, useEffect, useMemo, useState } from "react";
import { Alert, Pressable, StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useSelector } from "react-redux";
import AppScreen from "../../components/AppScreen";
import DateStrip from "../../components/DateStrip";
import KeyboardAwareView from "../../components/KeyboardAwareView";
import KeyboardAwareScrollView from "../../components/KeyboardAwareScrollView";
import NotAttendedModal from "../../components/NotAttendedModal";
import SelectField from "../../components/SelectField";
import { ErrorBanner, PrimaryButton, TextField } from "../../components/Form";
import { ErrorState, LoadingView } from "../../components/States";
import { careLogs, coverCareDay, saveCareLog, skipCareDay } from "../../services/dutyService";
import { listStaff } from "../../services/staffService";
import { can } from "../../utils/permissions";
import { displayName } from "../../utils/format";
import { longDate, nowTime, shortDate, time12, toIsoDate } from "../../utils/dates";
import { colors, shadow } from "../../theme";

const SKIP_REASONS = ["Personal emergency", "Unwell", "Family function", "Travel"];

/** The day's tasks: the duty's list, ticked from the saved update (plus any extra saved ones). */
function tasksFor(duty, log) {
  const saved = Array.isArray(log?.tasks) ? log.tasks : [];
  const names = [...(duty?.care_tasks || []), ...saved.map((t) => t.name).filter((n) => !(duty?.care_tasks || []).includes(n))];
  return names.map((name) => saved.find((t) => t.name === name) || { name, done: false, time: null, note: null });
}

/**
 * One day of a caretaker's 24-hour duty: tick off the care tasks, report
 * symptoms and add notes, or skip the day with a reason. Admins see the
 * same day read-only and can give a skipped day to another caretaker.
 */
export default function CareLogScreen({ navigation, route }) {
  const { user, permissions } = useSelector((s) => s.auth);
  const [date, setDate] = useState(route.params?.date || toIsoDate());
  const [duty, setDuty] = useState(route.params.duty);
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [tasks, setTasks] = useState([]);
  const [symptoms, setSymptoms] = useState("");
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState(null);
  const [skipping, setSkipping] = useState(false);

  const [caretakers, setCaretakers] = useState([]);
  const [coverId, setCoverId] = useState("");
  const [covering, setCovering] = useState(false);

  const load = useCallback(async () => {
    setError(null);
    try {
      const data = await careLogs(route.params.duty._id);
      setDuty(data.duty);
      setLogs(data.logs || []);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, [route.params.duty._id]);

  useEffect(() => {
    load();
  }, [load]);

  const log = useMemo(() => logs.find((l) => l.date === date), [logs, date]);
  const today = toIsoDate();
  const own = duty.staff_id === user?.username;
  const canManage = can(permissions, "schedules.manage");
  const editable = own || canManage;
  const inRange = date >= duty.date && date <= (duty.end_date || duty.date);
  const skipped = log?.status === "skipped";

  // Fill the form from the day's saved update whenever the day or data changes.
  useEffect(() => {
    setTasks(tasksFor(duty, log));
    setSymptoms(log?.status === "logged" ? log.symptoms || "" : "");
    setNotes(log?.status === "logged" ? log.notes || "" : "");
    setSaveError(null);
  }, [duty, log]);

  useEffect(() => {
    if (!canManage || !skipped || log?.cover_duty_id) return;
    listStaff({ role: duty.role || "caretaker" })
      .then((list) =>
        setCaretakers((list || []).filter((s) => s.username !== duty.staff_id).map((s) => ({ value: s.username, label: displayName(s) }))),
      )
      .catch(() => {});
  }, [canManage, skipped, log, duty]);

  const toggle = (name) =>
    setTasks((list) => list.map((t) => (t.name === name ? { ...t, done: !t.done, time: t.done ? null : nowTime() } : t)));

  const save = async () => {
    setSaving(true);
    setSaveError(null);
    try {
      const message = await saveCareLog(duty._id, date, { tasks, symptoms: symptoms.trim(), notes: notes.trim() });
      Alert.alert("Saved", message || "Care update saved.", [{ text: "OK", onPress: () => navigation.goBack() }]);
    } catch (e) {
      setSaveError(e.message);
    } finally {
      setSaving(false);
    }
  };

  const skip = async (reason) => {
    setSkipping(false);
    try {
      const message = await skipCareDay(duty._id, date, reason);
      Alert.alert("Day skipped", message || "Your coordinator has been told.", [{ text: "OK", onPress: () => navigation.goBack() }]);
    } catch (e) {
      Alert.alert("Could not skip the day", e.message);
    }
  };

  const assignCover = async () => {
    setCovering(true);
    try {
      const message = await coverCareDay(duty._id, date, coverId);
      Alert.alert("Cover assigned", message || "The caretaker has been notified.");
      setCoverId("");
      load();
    } catch (e) {
      Alert.alert("Could not assign cover", e.message);
    } finally {
      setCovering(false);
    }
  };

  const doneCount = tasks.filter((t) => t.done).length;

  const body = () => {
    if (!inRange) {
      return (
        <View style={styles.card}>
          <Text style={styles.muted}>
            This duty runs from {shortDate(duty.date)} to {shortDate(duty.end_date)}. Pick a day in that range.
          </Text>
        </View>
      );
    }

    if (skipped) {
      return (
        <View style={styles.card}>
          <View style={[styles.chip, { backgroundColor: "#fef2f2" }]}>
            <Text style={[styles.chipText, { color: "#b91c1c" }]}>Day skipped</Text>
          </View>
          <Text style={styles.value}>Reason: {log.skip_reason || "—"}</Text>
          <Text style={styles.muted}>{log.cover_duty_id ? "A cover caretaker has been assigned for this day." : "No cover caretaker yet."}</Text>
          {canManage && !log.cover_duty_id && (
            <>
              <SelectField label="Cover caretaker" value={coverId} options={caretakers} onChange={setCoverId} />
              <PrimaryButton title="Assign cover" icon="person-add-outline" loading={covering} disabled={!coverId} onPress={assignCover} />
            </>
          )}
        </View>
      );
    }

    const canSkip = own && !log && date >= today;

    if (date > today) {
      return (
        <View style={styles.card}>
          <Text style={styles.muted}>You can fill in this day's update on the day.</Text>
          {canSkip && <PrimaryButton title="Can't come this day" variant="outline" icon="close-circle-outline" onPress={() => setSkipping(true)} />}
        </View>
      );
    }

    return (
      <>
        <View style={styles.card}>
          <View style={styles.headerRow}>
            <Text style={styles.sectionTitle}>Care tasks</Text>
            <Text style={styles.muted}>
              {doneCount} of {tasks.length} done
            </Text>
          </View>
          {tasks.length === 0 && <Text style={styles.muted}>No tasks were set for this duty.</Text>}
          {tasks.map((t) => (
            <Pressable
              key={t.name}
              onPress={() => editable && toggle(t.name)}
              disabled={!editable}
              style={({ pressed }) => [styles.task, t.done && styles.taskDone, pressed && styles.pressed]}
              accessibilityRole="checkbox"
              accessibilityState={{ checked: t.done }}
            >
              <Ionicons name={t.done ? "checkmark-circle" : "ellipse-outline"} size={24} color={t.done ? colors.success : colors.textFaint} />
              <Text style={[styles.taskText, t.done && styles.taskTextDone]}>{t.name}</Text>
              {t.done && !!t.time && <Text style={styles.muted}>{time12(t.time)}</Text>}
            </Pressable>
          ))}
        </View>

        <View style={styles.card}>
          <TextField
            label="Symptoms noticed"
            placeholder="e.g. mild fever in the evening, not eating well"
            value={symptoms}
            onChangeText={setSymptoms}
            editable={editable}
            multiline
            maxLength={2000}
            style={styles.multiline}
          />
          <Text style={styles.hint}>Symptoms are sent to the coordinator straight away.</Text>
          <TextField
            label="Notes"
            placeholder="Anything else about the day"
            value={notes}
            onChangeText={setNotes}
            editable={editable}
            multiline
            maxLength={4000}
            style={styles.multiline}
          />
        </View>

        {log?.status === "logged" && (
          <Text style={styles.muted}>
            Last saved {time12(log.updated_time)}
            {!own && log.staff_name ? ` by ${log.staff_name}` : ""}
          </Text>
        )}
        <ErrorBanner message={saveError} />
        {editable && <PrimaryButton title={log ? "Update" : "Save today's update"} icon="checkmark" loading={saving} onPress={save} />}
        {canSkip && <PrimaryButton title="Can't come today" variant="outline" icon="close-circle-outline" onPress={() => setSkipping(true)} />}
      </>
    );
  };

  return (
    <AppScreen
      title={duty.patient_name || "Care log"}
      subtitle={`24-hour care · ${shortDate(duty.date)} → ${shortDate(duty.end_date)}`}
      headerExtra={<DateStrip date={date} onChange={setDate} />}
    >
      {loading ? (
        <LoadingView label="Loading care log…" />
      ) : error ? (
        <ErrorState message={error} onRetry={load} />
      ) : (
        <KeyboardAwareView style={styles.flex}>
          <KeyboardAwareScrollView contentContainerStyle={styles.content}>
            <Text style={styles.day}>{longDate(date)}</Text>
            {!own && <Text style={styles.muted}>Caretaker: {duty.staff_name || duty.staff_id}</Text>}
            {body()}
          </KeyboardAwareScrollView>
        </KeyboardAwareView>
      )}

      <NotAttendedModal
        visible={skipping}
        onClose={() => setSkipping(false)}
        onSubmit={skip}
        title={date === today ? "Can't come today" : `Skip ${shortDate(date)}`}
        subtitle="Your coordinator will be told and can send another caretaker."
        reasons={SKIP_REASONS}
      />
    </AppScreen>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  content: { padding: 16, paddingBottom: 40, gap: 14 },
  day: { fontSize: 18, fontWeight: "700", color: colors.text },
  card: { backgroundColor: colors.surface, borderRadius: 16, padding: 14, gap: 10, ...shadow },
  headerRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  sectionTitle: { fontSize: 16, fontWeight: "700", color: colors.text },
  muted: { fontSize: 13, color: colors.textMuted },
  hint: { fontSize: 12, color: colors.textMuted, marginTop: -4 },
  value: { fontSize: 15, color: colors.text },
  chip: { alignSelf: "flex-start", borderRadius: 20, paddingHorizontal: 12, paddingVertical: 4 },
  chipText: { fontSize: 12, fontWeight: "700" },
  task: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    minHeight: 48,
    paddingHorizontal: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
  },
  taskDone: { borderColor: "#a5d6a7", backgroundColor: "#f1f8f1" },
  taskText: { flex: 1, fontSize: 15, color: colors.text },
  taskTextDone: { color: colors.success, fontWeight: "600" },
  pressed: { opacity: 0.8 },
  multiline: { minHeight: 80, textAlignVertical: "top" },
});
