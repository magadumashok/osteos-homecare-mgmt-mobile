import { useState } from "react";
import { Alert, KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, View } from "react-native";
import { useSelector } from "react-redux";
import AppScreen from "../../components/AppScreen";
import DateField from "../../components/DateField";
import { ErrorBanner, PrimaryButton } from "../../components/Form";
import PatientFields, { BLANK_PATIENT, patientPayload } from "../../components/PatientFields";
import { registerWalkIn } from "../../services/patientService";
import { nowTime, toIsoDate } from "../../utils/dates";
import { colors, shadow } from "../../theme";

const addHour = (time) => {
  const [h, m] = time.split(":").map(Number);
  return `${String(Math.min(h + 1, 23)).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
};

/** Old "Walk-in schedule": register a patient seen now and log the visit as your own duty. */
export default function WalkInScreen({ navigation }) {
  const user = useSelector((s) => s.auth.user);
  const [form, setForm] = useState(BLANK_PATIENT);
  const [duty, setDuty] = useState(() => {
    const start = nowTime();
    return { date: toIsoDate(), end_date: toIsoDate(), start_time: start, end_time: addHour(start) };
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const setDutyField = (key) => (value) => setDuty((d) => ({ ...d, [key]: value }));

  const save = async () => {
    setError(null);
    if (!form.patient_name.trim()) {
      setError("Patient name is required.");
      return;
    }
    if (duty.end_date < duty.date || (duty.end_date === duty.date && duty.end_time <= duty.start_time)) {
      setError("The visit must end after it starts.");
      return;
    }
    setSaving(true);
    try {
      const result = await registerWalkIn({
        ...patientPayload(form),
        ...duty,
        role: user?.roles?.[0] || "nurse",
      });
      const patient = result?.patient;
      Alert.alert("Walk-in registered", `${patient?.patient_name} — ID ${patient?.username}. The visit is on your duties.`, [
        { text: "OK", onPress: () => navigation.goBack() },
        patient?.username
          ? { text: "Open patient", onPress: () => navigation.replace("PatientHub", { username: patient.username, name: patient.patient_name }) }
          : null,
      ].filter(Boolean));
    } catch (e) {
      setError(e.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <AppScreen title="Walk-in">
      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === "ios" ? "padding" : undefined}>
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Visit</Text>
            <View style={styles.row}>
              <DateField label="Date" value={duty.date} onChange={(v) => setDuty((d) => ({ ...d, date: v, end_date: v > d.end_date ? v : d.end_date }))} />
              <DateField label="End date" value={duty.end_date} onChange={setDutyField("end_date")} />
            </View>
            <View style={styles.row}>
              <DateField label="Start" value={duty.start_time} onChange={setDutyField("start_time")} mode="time" />
              <DateField label="End" value={duty.end_time} onChange={setDutyField("end_time")} mode="time" />
            </View>
          </View>
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Patient</Text>
            <PatientFields form={form} onChange={setForm} />
          </View>
          <ErrorBanner message={error} />
          <PrimaryButton title="Register walk-in" icon="checkmark" loading={saving} onPress={save} />
        </ScrollView>
      </KeyboardAvoidingView>
    </AppScreen>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  content: { padding: 16, paddingBottom: 40, gap: 16 },
  card: { backgroundColor: colors.surface, borderRadius: 16, padding: 16, gap: 12, ...shadow },
  cardTitle: { fontSize: 17, fontWeight: "700", color: colors.primary },
  row: { flexDirection: "row", gap: 12 },
});
