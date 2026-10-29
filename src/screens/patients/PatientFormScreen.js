import { useEffect, useState } from "react";
import { Alert, StyleSheet } from "react-native";
import KeyboardAwareView from "../../components/KeyboardAwareView";
import KeyboardAwareScrollView from "../../components/KeyboardAwareScrollView";
import AppScreen from "../../components/AppScreen";
import { ErrorBanner, PrimaryButton } from "../../components/Form";
import PatientFields, { BLANK_PATIENT, patientForm, patientPayload } from "../../components/PatientFields";
import { LoadingView } from "../../components/States";
import { getPatient, registerPatient, updatePatient } from "../../services/patientService";

/** Register a patient (old "Patient registration") or edit one (old "Edit patient profile"). */
export default function PatientFormScreen({ navigation, route }) {
  const username = route.params?.username;
  const isEdit = Boolean(username);
  const [form, setForm] = useState(BLANK_PATIENT);
  const [loading, setLoading] = useState(isEdit);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!isEdit) return;
    getPatient(username)
      .then((p) => setForm(patientForm(Object.fromEntries(Object.keys(BLANK_PATIENT).map((k) => [k, p?.[k] ?? ""])))))
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [isEdit, username]);

  const save = async () => {
    setError(null);
    if (!form.patient_name.trim() || (!isEdit && !form.country)) {
      setError("Patient name and country are required.");
      return;
    }
    if (form.service === "other" && !form.service_other.trim()) {
      setError("Enter the service name.");
      return;
    }
    setSaving(true);
    try {
      if (isEdit) {
        await updatePatient(username, patientPayload(form));
        navigation.goBack();
      } else {
        const patient = await registerPatient(patientPayload(form));
        Alert.alert("Patient registered", `${patient?.patient_name} — ID ${patient?.username}`, [
          { text: "OK", onPress: () => navigation.replace("PatientHub", { username: patient.username, name: patient.patient_name }) },
        ]);
      }
    } catch (e) {
      setError(e.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <AppScreen title={isEdit ? "Edit Patient" : "Register Patient"} subtitle={isEdit ? username : undefined}>
      {loading ? (
        <LoadingView />
      ) : (
        <KeyboardAwareView style={styles.flex}>
          <KeyboardAwareScrollView contentContainerStyle={styles.content}>
            <PatientFields form={form} onChange={setForm} isEdit={isEdit} />
            <ErrorBanner message={error} />
            <PrimaryButton title={isEdit ? "Save changes" : "Register patient"} icon="checkmark" loading={saving} onPress={save} />
          </KeyboardAwareScrollView>
        </KeyboardAwareView>
      )}
    </AppScreen>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  content: { padding: 16, paddingBottom: 40, gap: 16 },
});
