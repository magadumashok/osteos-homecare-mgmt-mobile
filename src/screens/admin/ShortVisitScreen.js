import { useEffect, useState } from "react";
import { Alert, KeyboardAvoidingView, Platform, ScrollView, StyleSheet, View } from "react-native";
import AppScreen from "../../components/AppScreen";
import DateField from "../../components/DateField";
import { ErrorBanner, PrimaryButton, TextField } from "../../components/Form";
import SelectField from "../../components/SelectField";
import useReference from "../../hooks/useReference";
import { createShortVisit } from "../../services/dutyService";
import { listStaff } from "../../services/staffService";
import { displayName, roleLabel } from "../../utils/format";
import { nowTime, toIsoDate } from "../../utils/dates";

/** Old "Short visit form": a one-off visit by a staff member to someone not admitted. */
export default function ShortVisitScreen({ navigation }) {
  const countries = useReference("countriesByCode");
  const [staff, setStaff] = useState([]);
  const [form, setForm] = useState({
    staff_id: "",
    patient_name: "",
    mobile: "",
    email: "",
    country: "",
    patient_address: "",
    date: toIsoDate(),
    time: nowTime(),
    visit_purpose: "",
    visit_fees: "",
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const set = (key) => (value) => setForm((f) => ({ ...f, [key]: value }));

  useEffect(() => {
    listStaff({ group: "visiting" })
      .then((list) => setStaff((list || []).map((m) => ({ value: m.username, label: displayName(m), sub: roleLabel(m) }))))
      .catch(() => {});
  }, []);

  const save = async () => {
    setError(null);
    if (!form.staff_id || !form.patient_name.trim()) {
      setError("Choose the staff member and enter the patient's name.");
      return;
    }
    setSaving(true);
    try {
      const payload = Object.fromEntries(Object.entries(form).filter(([, v]) => String(v).trim() !== ""));
      if (payload.visit_fees) payload.visit_fees = Number(payload.visit_fees);
      const result = await createShortVisit(payload);
      Alert.alert("Saved", result || "Short visit scheduled.", [{ text: "OK", onPress: () => navigation.goBack() }]);
    } catch (e) {
      setError(e.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <AppScreen title="Short Visit">
      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === "ios" ? "padding" : undefined}>
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          <SelectField label="Staff member *" value={form.staff_id} options={staff} onChange={set("staff_id")} />
          <TextField label="Patient name *" value={form.patient_name} onChangeText={set("patient_name")} />
          <SelectField label="Country" value={form.country} options={countries} onChange={set("country")} allowClear />
          <TextField label="Mobile" value={form.mobile} onChangeText={set("mobile")} keyboardType="phone-pad" />
          <TextField label="Email" value={form.email} onChangeText={set("email")} keyboardType="email-address" autoCapitalize="none" />
          <TextField label="Address" value={form.patient_address} onChangeText={set("patient_address")} multiline />
          <View style={styles.row}>
            <DateField label="Date" value={form.date} onChange={set("date")} />
            <DateField label="Time" value={form.time} onChange={set("time")} mode="time" />
          </View>
          <TextField label="Purpose of visit" value={form.visit_purpose} onChangeText={set("visit_purpose")} multiline />
          <TextField label="Fees" value={form.visit_fees} onChangeText={set("visit_fees")} keyboardType="decimal-pad" />
          <ErrorBanner message={error} />
          <PrimaryButton title="Save short visit" icon="checkmark" loading={saving} onPress={save} />
        </ScrollView>
      </KeyboardAvoidingView>
    </AppScreen>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  content: { padding: 16, paddingBottom: 40, gap: 14 },
  row: { flexDirection: "row", gap: 12 },
});
