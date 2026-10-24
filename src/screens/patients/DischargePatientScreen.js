import { useEffect, useState } from "react";
import { Alert, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import KeyboardAwareView from "../../components/KeyboardAwareView";
import AppScreen from "../../components/AppScreen";
import DateField from "../../components/DateField";
import { ErrorBanner, PrimaryButton } from "../../components/Form";
import Segmented from "../../components/Segmented";
import { getPatient, dischargePatient, scheduleDischarge } from "../../services/patientService";
import { nowTime, shortDate, time12, toIsoDate } from "../../utils/dates";
import { colors, shadow } from "../../theme";

/**
 * Two steps, as in the old app: the coordinator sets a planned discharge
 * date, then the nurse discharges with a summary.
 */
export default function DischargePatientScreen({ navigation, route }) {
  const { username, name } = route.params;
  const [mode, setMode] = useState("discharge");
  const [planned, setPlanned] = useState(null);
  const [date, setDate] = useState(toIsoDate());
  const [time, setTime] = useState(nowTime());
  const [summary, setSummary] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    getPatient(username)
      .then((p) => {
        if (p?.discharge?.date) {
          setPlanned(p.discharge);
          setDate(p.discharge.date);
          if (p.discharge.time) setTime(p.discharge.time);
        }
      })
      .catch(() => {});
  }, [username]);

  const submit = () => {
    setError(null);
    if (mode === "plan") {
      run(() => scheduleDischarge(username, { date, time }), "Discharge date set.");
      return;
    }
    if (!summary.trim()) {
      setError("Write a discharge summary.");
      return;
    }
    Alert.alert("Discharge patient", `Discharge ${name || username}? They will leave the admitted patients list.`, [
      { text: "Cancel", style: "cancel" },
      {
        text: "Discharge",
        style: "destructive",
        onPress: () => run(() => dischargePatient(username, { date, time, summary: summary.trim() }), "Patient discharged.", true),
      },
    ]);
  };

  const run = async (request, done, leaveToRoot = false) => {
    setSaving(true);
    try {
      const result = await request();
      Alert.alert("Done", result || done, [
        { text: "OK", onPress: () => (leaveToRoot ? navigation.popToTop() : navigation.goBack()) },
      ]);
    } catch (e) {
      setError(e.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <AppScreen title="Discharge" subtitle={name || username}>
      <KeyboardAwareView style={styles.flex}>
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          <Segmented
            value={mode}
            onChange={setMode}
            options={[
              { value: "discharge", label: "Discharge now", icon: "exit-outline" },
              { value: "plan", label: "Set date", icon: "calendar-outline" },
            ]}
          />
          {!!planned && (
            <View style={styles.card}>
              <Text style={styles.cardLabel}>Planned discharge</Text>
              <Text style={styles.cardValue}>
                {shortDate(planned.date)}
                {planned.time ? `, ${time12(planned.time)}` : ""}
              </Text>
            </View>
          )}
          <View style={styles.row}>
            <DateField label="Date" value={date} onChange={setDate} />
            <DateField label="Time" value={time} onChange={setTime} mode="time" />
          </View>
          {mode === "discharge" && (
            <>
              <Text style={styles.label}>Discharge summary *</Text>
              <TextInput
                value={summary}
                onChangeText={setSummary}
                placeholder="Condition at discharge, instructions, follow-up…"
                placeholderTextColor={colors.textFaint}
                multiline
                maxLength={10000}
                style={styles.summary}
              />
            </>
          )}
          <ErrorBanner message={error} />
          <PrimaryButton
            title={mode === "plan" ? "Set discharge date" : "Discharge patient"}
            icon={mode === "plan" ? "calendar" : "exit"}
            loading={saving}
            onPress={submit}
          />
        </ScrollView>
      </KeyboardAwareView>
    </AppScreen>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  content: { padding: 16, paddingBottom: 40, gap: 14 },
  card: { backgroundColor: colors.surface, borderRadius: 16, padding: 14, ...shadow },
  cardLabel: { fontSize: 12, color: colors.textFaint },
  cardValue: { fontSize: 16, fontWeight: "700", color: colors.text, marginTop: 2 },
  row: { flexDirection: "row", gap: 12 },
  label: { color: colors.textBody, fontSize: 14, fontWeight: "600" },
  summary: {
    minHeight: 160,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    padding: 12,
    fontSize: 15,
    color: colors.text,
    backgroundColor: colors.surface,
    textAlignVertical: "top",
  },
});
