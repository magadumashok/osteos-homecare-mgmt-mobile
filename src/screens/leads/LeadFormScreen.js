import { useEffect, useState } from "react";
import { Alert, StyleSheet, Text, View } from "react-native";
import KeyboardAwareView from "../../components/KeyboardAwareView";
import KeyboardAwareScrollView from "../../components/KeyboardAwareScrollView";
import { useSelector } from "react-redux";
import AppScreen from "../../components/AppScreen";
import DateField from "../../components/DateField";
import { ErrorBanner, PrimaryButton, TextField } from "../../components/Form";
import { FilterChips } from "../../components/Segmented";
import SelectField from "../../components/SelectField";
import { LoadingView } from "../../components/States";
import useReference from "../../hooks/useReference";
import { createLead, getLead, markToBeAssessed, updateLead } from "../../services/leadService";
import { staffDirectory } from "../../services/staffService";
import { displayName, humanize } from "../../utils/format";
import { nowTime, toIsoDate } from "../../utils/dates";
import { can } from "../../utils/permissions";
import { colors } from "../../theme";
import { FOLLOWUPS } from "./LeadsScreen";

const SOURCES = ["Phone call", "Walk-in", "Referral", "Hospital", "Website", "Social media", "Other"].map((v) => ({ value: v, label: v }));
// "To be assessed" is set with its own button so the lead lands in the assessment queue.
const FOLLOWUP_OPTIONS = FOLLOWUPS.filter((v) => v !== "to_be_assessed").map((v) => ({ value: v, label: humanize(v) }));

/** Add or edit a lead (old "Patient lead form" / "Edit patient lead"). */
export default function LeadFormScreen({ navigation, route }) {
  const leadId = route.params?.leadId;
  const isEdit = Boolean(leadId);
  const permissions = useSelector((s) => s.auth.permissions);
  const canManage = can(permissions, "leads.manage");
  const canAssess = can(permissions, "assessments.manage");
  const countries = useReference("countriesByName");

  const [form, setForm] = useState({
    patient_name: "",
    mobile: "",
    country: "",
    email: "",
    staff: "",
    source: "Phone call",
    date: toIsoDate(),
    time: nowTime(),
    followup: "new",
    comments: "",
  });
  const [staff, setStaff] = useState([]);
  const [loading, setLoading] = useState(isEdit);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const set = (key) => (value) => setForm((f) => ({ ...f, [key]: value }));

  useEffect(() => {
    staffDirectory()
      .then((list) => setStaff((list || []).map((m) => ({ value: displayName(m), label: displayName(m) }))))
      .catch(() => {});
    if (!isEdit) return;
    getLead(leadId)
      .then((lead) => setForm((f) => ({ ...f, ...Object.fromEntries(Object.keys(f).map((k) => [k, lead?.[k] ?? f[k]])) })))
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [isEdit, leadId]);

  const save = async () => {
    setError(null);
    if (!form.patient_name.trim() || !form.mobile.trim() || !form.country) {
      setError("Name, mobile and country are required.");
      return;
    }
    setSaving(true);
    try {
      const payload = { ...form, email: form.email.trim() || null, patient_name: form.patient_name.trim(), mobile: form.mobile.trim() };
      if (isEdit) await updateLead(leadId, payload);
      else await createLead(payload);
      navigation.goBack();
    } catch (e) {
      setError(e.message);
    } finally {
      setSaving(false);
    }
  };

  const toAssessment = () =>
    Alert.alert("Move to assessment", `Move ${form.patient_name} to the assessment queue?`, [
      { text: "Cancel", style: "cancel" },
      {
        text: "Move",
        onPress: async () => {
          try {
            await markToBeAssessed(leadId);
            set("followup")("to_be_assessed");
            Alert.alert("Done", "Lead moved to assessment.");
          } catch (e) {
            Alert.alert("Could not update lead", e.message);
          }
        },
      },
    ]);

  if (loading) {
    return (
      <AppScreen title="Lead">
        <LoadingView />
      </AppScreen>
    );
  }

  return (
    <AppScreen title={isEdit ? form.patient_name || "Lead" : "New Lead"} subtitle={isEdit ? `Lead #${leadId}` : undefined}>
      <KeyboardAwareView style={styles.flex}>
        <KeyboardAwareScrollView contentContainerStyle={styles.content}>
          <TextField label="Patient name *" value={form.patient_name} onChangeText={set("patient_name")} editable={canManage} />
          <SelectField label="Country *" value={form.country} options={countries} onChange={set("country")} />
          <TextField
            label={isEdit ? "Mobile" : "Mobile (without country code) *"}
            value={String(form.mobile || "")}
            onChangeText={set("mobile")}
            keyboardType="phone-pad"
            editable={canManage}
          />
          <TextField label="Email" value={form.email || ""} onChangeText={set("email")} keyboardType="email-address" autoCapitalize="none" editable={canManage} />
          <Text style={styles.label}>Source</Text>
          <FilterChips options={SOURCES} value={form.source} onChange={set("source")} />
          <SelectField label="Handled by" value={form.staff} options={staff} onChange={set("staff")} allowClear />
          <View style={styles.row}>
            <DateField label="Date" value={form.date} onChange={set("date")} />
            <DateField label="Time" value={form.time} onChange={set("time")} mode="time" />
          </View>
          {form.followup === "to_be_assessed" ? (
            <Text style={styles.note}>This lead is waiting for its assessment.</Text>
          ) : (
            <>
              <Text style={styles.label}>Follow-up</Text>
              <FilterChips options={FOLLOWUP_OPTIONS} value={form.followup} onChange={set("followup")} />
            </>
          )}
          <TextField label="Comments" value={form.comments || ""} onChangeText={set("comments")} multiline style={styles.multiline} editable={canManage} />
          <ErrorBanner message={error} />
          {canManage && <PrimaryButton title={isEdit ? "Save changes" : "Add lead"} icon="checkmark" loading={saving} onPress={save} />}
          {isEdit && canManage && form.followup !== "to_be_assessed" && (
            <PrimaryButton title="Move to assessment" icon="arrow-forward" variant="outline" onPress={toAssessment} />
          )}
          {isEdit && canAssess && (
            <PrimaryButton
              title="Start assessment"
              icon="clipboard-outline"
              variant="outline"
              onPress={() => navigation.navigate("AssessmentForm", { leadId })}
            />
          )}
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
  note: { fontSize: 14, color: colors.success, fontWeight: "600" },
  multiline: { minHeight: 80, textAlignVertical: "top" },
});
