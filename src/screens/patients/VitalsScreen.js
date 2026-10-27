import { useCallback, useEffect, useState } from "react";
import { Alert, FlatList, RefreshControl, StyleSheet, Text, TextInput, View } from "react-native";
import KeyboardAwareView from "../../components/KeyboardAwareView";
import KeyboardAwareScrollView from "../../components/KeyboardAwareScrollView";
import { useSelector } from "react-redux";
import AppScreen from "../../components/AppScreen";
import DateField from "../../components/DateField";
import { ErrorBanner, PrimaryButton } from "../../components/Form";
import Segmented, { FilterChips } from "../../components/Segmented";
import { EmptyState, ErrorState, LoadingView } from "../../components/States";
import { listVitals, recordVitals } from "../../services/patientService";
import { formatDateTime } from "../../utils/format";
import { nowTime, toIsoDate } from "../../utils/dates";
import { can } from "../../utils/permissions";
import { colors, shadow } from "../../theme";

/**
 * `possible` blocks typos; `normal` only colours the value. The old app
 * refused anything outside the normal range (pulse < 60, SpO₂ < 95), which
 * stopped nurses recording exactly the readings that matter.
 */
const FIELDS = [
  { key: "patient_bp_systolic_value", label: "Systolic BP", unit: "mmHg", possible: [40, 300], normal: [90, 140] },
  { key: "patient_bp_diastolic_value", label: "Diastolic BP", unit: "mmHg", possible: [20, 200], normal: [60, 90] },
  { key: "temperature", label: "Temperature", unit: "°C", possible: [25, 45], normal: [36, 37.5], decimal: true },
  { key: "pulse", label: "Pulse", unit: "bpm", possible: [20, 250], normal: [60, 100] },
  { key: "resp", label: "Respiratory rate", unit: "/min", possible: [4, 70], normal: [12, 20] },
  { key: "sat_O2", label: "SpO₂", unit: "%", possible: [50, 100], normal: [95, 100] },
  { key: "intake", label: "Intake", unit: "ml", text: true },
  { key: "output", label: "Output", unit: "ml", text: true },
];

const RANGES = [
  { value: "today", label: "Today" },
  { value: "this_week", label: "7 days" },
  { value: "this_month", label: "This month" },
  { value: "all_time", label: "All" },
];

const abnormal = (field, value) => {
  if (!field.normal || value === "" || value == null) return false;
  const n = Number(value);
  return !Number.isNaN(n) && (n < field.normal[0] || n > field.normal[1]);
};

export default function VitalsScreen({ route }) {
  const { username, name } = route.params;
  const canRecord = can(useSelector((s) => s.auth.permissions), "vitals.record");
  const [tab, setTab] = useState(canRecord ? "record" : "history");

  return (
    <AppScreen title="Vital Signs" subtitle={name || username}>
      {canRecord && (
        <Segmented
          style={styles.tabs}
          value={tab}
          onChange={setTab}
          options={[
            { value: "record", label: "Record", icon: "add-circle-outline" },
            { value: "history", label: "History", icon: "list-outline" },
          ]}
        />
      )}
      {tab === "record" ? <RecordForm username={username} onSaved={() => setTab("history")} /> : <History username={username} />}
    </AppScreen>
  );
}

function RecordForm({ username, onSaved }) {
  const [date, setDate] = useState(toIsoDate());
  const [time, setTime] = useState(nowTime());
  const [values, setValues] = useState({});
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  const save = async () => {
    setError(null);
    const entered = FIELDS.filter((f) => String(values[f.key] ?? "").trim() !== "");
    if (!entered.length) {
      setError("Enter at least one reading.");
      return;
    }
    for (const field of entered) {
      if (field.text) continue;
      const n = Number(values[field.key]);
      if (Number.isNaN(n) || n < field.possible[0] || n > field.possible[1]) {
        setError(`${field.label} must be between ${field.possible[0]} and ${field.possible[1]} ${field.unit}.`);
        return;
      }
    }
    const sys = Number(values.patient_bp_systolic_value);
    const dia = Number(values.patient_bp_diastolic_value);
    if (sys && dia && dia >= sys) {
      setError("Diastolic BP must be lower than systolic BP.");
      return;
    }

    setSaving(true);
    try {
      const payload = { date, time };
      entered.forEach((f) => {
        payload[f.key] = String(values[f.key]).trim();
      });
      await recordVitals(username, payload);
      setValues({});
      Alert.alert("Saved", "Vital signs recorded.");
      onSaved();
    } catch (e) {
      setError(e.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <KeyboardAwareView style={styles.flex}>
      <KeyboardAwareScrollView contentContainerStyle={styles.form}>
        <View style={styles.row}>
          <DateField label="Date" value={date} onChange={setDate} maximumDate={new Date()} />
          <DateField label="Time" value={time} onChange={setTime} mode="time" />
        </View>
        <View style={styles.grid}>
          {FIELDS.map((field) => {
            const value = values[field.key] ?? "";
            const flagged = abnormal(field, value);
            return (
              <View key={field.key} style={styles.cell}>
                <Text style={styles.label}>{field.label}</Text>
                <View style={[styles.inputWrap, flagged && styles.inputFlagged]}>
                  <TextInput
                    value={value}
                    onChangeText={(v) => setValues((current) => ({ ...current, [field.key]: v }))}
                    keyboardType={field.text ? "default" : field.decimal ? "decimal-pad" : "number-pad"}
                    placeholder="—"
                    placeholderTextColor={colors.textFaint}
                    style={styles.input}
                    maxLength={field.text ? 30 : 6}
                    accessibilityLabel={field.label}
                  />
                  <Text style={styles.unit}>{field.unit}</Text>
                </View>
                {flagged && <Text style={styles.flagText}>Outside normal range</Text>}
              </View>
            );
          })}
        </View>
        <ErrorBanner message={error} />
        <PrimaryButton title="Save vital signs" icon="checkmark-circle-outline" loading={saving} onPress={save} />
      </KeyboardAwareScrollView>
    </KeyboardAwareView>
  );
}

function History({ username }) {
  const [range, setRange] = useState("this_week");
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);

  const load = useCallback(
    async (mode = "load") => {
      mode === "refresh" ? setRefreshing(true) : setLoading(true);
      setError(null);
      try {
        setRows((await listVitals(username, range)) || []);
      } catch (e) {
        setError(e.message);
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [username, range],
  );

  useEffect(() => {
    load();
  }, [load]);

  return (
    <View style={styles.flex}>
      <View style={styles.filters}>
        <FilterChips options={RANGES} value={range} onChange={setRange} />
      </View>
      {loading ? (
        <LoadingView label="Loading readings…" />
      ) : error ? (
        <ErrorState message={error} onRetry={() => load()} />
      ) : (
        <FlatList
          data={rows}
          keyExtractor={(item, index) => item._id || String(index)}
          contentContainerStyle={styles.list}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => load("refresh")} colors={[colors.primary]} />}
          ListEmptyComponent={<EmptyState icon="pulse-outline" title="No readings" subtitle="No vital signs in this period." />}
          renderItem={({ item }) => (
            <View style={styles.card}>
              <View style={styles.cardHeader}>
                <Text style={styles.cardDate}>{formatDateTime(item.date, item.time)}</Text>
                {!!item.nurse_name && <Text style={styles.cardBy}>{item.nurse_name}</Text>}
              </View>
              <View style={styles.readings}>
                {item.patient_bp_systolic_value || item.patient_bp_diastolic_value ? (
                  <Reading
                    label="BP"
                    value={`${item.patient_bp_systolic_value || "–"}/${item.patient_bp_diastolic_value || "–"}`}
                    unit="mmHg"
                    flagged={abnormal(FIELDS[0], item.patient_bp_systolic_value) || abnormal(FIELDS[1], item.patient_bp_diastolic_value)}
                  />
                ) : null}
                {FIELDS.slice(2).map((field) =>
                  item[field.key] ? (
                    <Reading
                      key={field.key}
                      label={field.label}
                      value={item[field.key]}
                      unit={field.unit}
                      flagged={abnormal(field, item[field.key])}
                    />
                  ) : null,
                )}
              </View>
            </View>
          )}
        />
      )}
    </View>
  );
}

function Reading({ label, value, unit, flagged }) {
  return (
    <View style={[styles.reading, flagged && styles.readingFlagged]}>
      <Text style={styles.readingLabel}>{label}</Text>
      <Text style={[styles.readingValue, flagged && styles.readingValueFlagged]}>
        {value} <Text style={styles.readingUnit}>{unit}</Text>
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  tabs: { margin: 16, marginBottom: 0 },
  form: { padding: 16, paddingBottom: 40, gap: 16 },
  row: { flexDirection: "row", gap: 12 },
  grid: { flexDirection: "row", flexWrap: "wrap", justifyContent: "space-between", rowGap: 14 },
  cell: { width: "48%", gap: 6 },
  label: { color: colors.textBody, fontSize: 13, fontWeight: "600" },
  inputWrap: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    backgroundColor: colors.surface,
    paddingHorizontal: 12,
    minHeight: 50,
  },
  inputFlagged: { borderColor: "#f59e0b", backgroundColor: "#fffbeb" },
  input: { flex: 1, fontSize: 17, color: colors.text, fontWeight: "600", paddingVertical: 8 },
  unit: { fontSize: 12, color: colors.textMuted },
  flagText: { fontSize: 11, color: "#b45309" },

  filters: { paddingHorizontal: 16, paddingTop: 16 },
  list: { padding: 16, paddingBottom: 40, gap: 12 },
  card: { backgroundColor: colors.surface, borderRadius: 16, padding: 14, gap: 10, ...shadow },
  cardHeader: { flexDirection: "row", justifyContent: "space-between", gap: 8 },
  cardDate: { fontSize: 14, fontWeight: "700", color: colors.text },
  cardBy: { fontSize: 12, color: colors.textMuted, flexShrink: 1 },
  readings: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  reading: { backgroundColor: colors.primarySoft, borderRadius: 10, paddingHorizontal: 10, paddingVertical: 6 },
  readingFlagged: { backgroundColor: "#fffbeb" },
  readingLabel: { fontSize: 11, color: colors.textMuted },
  readingValue: { fontSize: 15, fontWeight: "700", color: colors.primary },
  readingValueFlagged: { color: "#b45309" },
  readingUnit: { fontSize: 11, fontWeight: "400", color: colors.textMuted },
});
