import { useEffect, useMemo, useState } from "react";
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Switch, Text, TextInput, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import AppScreen from "../../components/AppScreen";
import DateField from "../../components/DateField";
import { ErrorBanner, PrimaryButton, TextField } from "../../components/Form";
import { FilterChips } from "../../components/Segmented";
import SelectField from "../../components/SelectField";
import { LoadingView } from "../../components/States";
import useReference from "../../hooks/useReference";
import { createAssessment, getAssessment, getLead, updateAssessment } from "../../services/leadService";
import { icdCodes } from "../../services/referenceService";
import { SERVICES, invoiceTotals } from "../../utils/invoice";
import { colors, shadow } from "../../theme";

// Same fields and keys as the web app's assessment form.
const GENDERS = ["Male", "Female", "Other"].map((v) => ({ value: v, label: v }));
const EQUIPMENT = [
  ["bed", "Medical bed"],
  ["nurse_bed_chair", "Bed / chair for nurse"],
  ["wheelchair_walker", "Wheelchair / walker"],
  ["electrotherapy_device", "Electrotherapy device"],
  ["others", "Other"],
];
const PHYSIO_FINDINGS = [
  ["poorstrength", "Patient has poor strength"],
  ["spasticity", "Increased tone / spasticity on the neck muscles"],
  ["balancing", "Balancing problem"],
  ["defect", "Posture defect"],
];
const PHYSIO_PLAN = [
  ["mobility", "Mobility"],
  ["neckstretching", "Neck stretching"],
  ["sitbalance", "Sitting and balancing"],
  ["standbalance", "Standing balance"],
  ["limbfunctioning", "Upper limb functions"],
];

const blank = {
  patient_name: "", mobile: "", email: "", identity_number: "", birth_date: "", age: "", gender: "",
  address: "", nationality: "", physician: "", diagnosis_name: "",
  physical_assessment: "", daily_activities: "", medications: "",
  care_plan: { nursing: false, physiotherapy: false, doctor: false },
  nursing: { quotation: "", duration: "", fees: "" },
  physiotherapy: { quotation: "", duration: "", sessions: "", fees: "" },
  doctor: { quotation: "", duration: "", sessions: "", fees: "" },
  equipment: { bed: false, nurse_bed_chair: false, wheelchair_walker: false, electrotherapy_device: false, others: false, other_equipment_details: "" },
  physiotherapy_details: {},
  physiotherapy_treatment_plan: {},
  invoice_details: { discount: "", vat: "", other_fees: "" },
};

/** Stored values over the blank form (older documents may miss sections). */
const toForm = (doc) => {
  const merged = { ...blank };
  Object.keys(blank).forEach((k) => {
    const v = doc?.[k];
    if (v === undefined || v === null) return;
    merged[k] = typeof blank[k] === "object" && typeof v === "object" ? { ...blank[k], ...v } : typeof v === "number" ? String(v) : v;
  });
  return merged;
};

function Section({ title, children }) {
  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>{title}</Text>
      {children}
    </View>
  );
}

function Check({ label, value, onChange }) {
  return (
    <Pressable onPress={() => onChange(!value)} style={styles.check} accessibilityRole="checkbox" accessibilityState={{ checked: !!value }}>
      <Ionicons name={value ? "checkbox" : "square-outline"} size={22} color={colors.primary} />
      <Text style={styles.checkLabel}>{label}</Text>
    </Pressable>
  );
}

function SmallInput({ label, value, onChangeText, numeric }) {
  return (
    <View style={styles.smallField}>
      <Text style={styles.smallLabel}>{label}</Text>
      <TextInput
        value={String(value ?? "")}
        onChangeText={onChangeText}
        keyboardType={numeric ? "decimal-pad" : "default"}
        style={styles.smallInput}
        placeholderTextColor={colors.textFaint}
      />
    </View>
  );
}

/** ICD search that also accepts free text. */
function DiagnosisField({ value, onChange }) {
  const [options, setOptions] = useState([]);
  const [focused, setFocused] = useState(false);

  useEffect(() => {
    const text = String(value || "").trim();
    if (!focused || text.length < 2) {
      setOptions([]);
      return undefined;
    }
    const t = setTimeout(() => icdCodes(text).then((list) => setOptions((list || []).slice(0, 8)), () => setOptions([])), 300);
    return () => clearTimeout(t);
  }, [value, focused]);

  return (
    <View style={styles.diagnosis}>
      <TextField
        label="Diagnosis (search ICD codes)"
        value={value}
        onChangeText={onChange}
        onFocus={() => setFocused(true)}
        onBlur={() => setTimeout(() => setFocused(false), 200)}
        placeholder="Type at least 2 letters"
      />
      {options.length > 0 && (
        <View style={styles.suggestions}>
          {options.map((option) => (
            <Pressable
              key={option}
              onPress={() => {
                onChange(option);
                setOptions([]);
                setFocused(false);
              }}
              style={styles.suggestion}
            >
              <Text style={styles.suggestionText} numberOfLines={2}>
                {option}
              </Text>
            </Pressable>
          ))}
        </View>
      )}
    </View>
  );
}

/** Record a lead's initial assessment (leadId) or edit one (assessmentId). */
export default function AssessmentFormScreen({ navigation, route }) {
  const { leadId, assessmentId } = route.params || {};
  const isEdit = Boolean(assessmentId);
  const nationalities = useReference("nationalities");
  const [form, setForm] = useState(blank);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    const load = isEdit
      ? getAssessment(assessmentId).then((a) => setForm(toForm(a)))
      : getLead(leadId).then((l) => setForm(toForm({ patient_name: l?.patient_name, mobile: l?.mobile, email: l?.email })));
    load.catch((e) => setError(e.message)).finally(() => setLoading(false));
  }, [isEdit, assessmentId, leadId]);

  const set = (key) => (value) => setForm((f) => ({ ...f, [key]: value }));
  const setIn = (group, key) => (value) => setForm((f) => ({ ...f, [group]: { ...f[group], [key]: value } }));
  const totals = useMemo(() => invoiceTotals(form), [form]);

  const save = async () => {
    setError(null);
    if (!form.patient_name.trim()) {
      setError("Patient name is required.");
      return;
    }
    const body = {
      ...form,
      age: form.age === "" ? null : Number(form.age),
      birth_date: form.birth_date || null,
      email: form.email || null,
      invoice_details: { ...form.invoice_details, subtotal: totals.subtotal, total_amount: totals.total },
    };
    setSaving(true);
    try {
      if (isEdit) await updateAssessment(assessmentId, body);
      else await createAssessment({ ...body, lead_id: leadId });
      navigation.goBack();
    } catch (e) {
      setError(e.message);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <AppScreen title="Assessment">
        <LoadingView />
      </AppScreen>
    );
  }

  const care = form.care_plan || {};

  return (
    <AppScreen title={isEdit ? form.patient_name || "Assessment" : "Initial Assessment"} subtitle={isEdit ? "Edit assessment" : `Lead #${leadId}`}>
      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === "ios" ? "padding" : undefined}>
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          <Section title="Patient">
            <TextField label="Patient name *" value={form.patient_name} onChangeText={set("patient_name")} />
            <TextField label="Mobile" value={String(form.mobile || "")} onChangeText={set("mobile")} keyboardType="phone-pad" />
            <TextField label="Email" value={form.email || ""} onChangeText={set("email")} keyboardType="email-address" autoCapitalize="none" />
            <View style={styles.row}>
              <DateField label="Date of birth" value={form.birth_date} onChange={set("birth_date")} maximumDate={new Date()} placeholder="Optional" />
              <View style={styles.flex}>
                <TextField label="Age" value={String(form.age ?? "")} onChangeText={set("age")} keyboardType="number-pad" />
              </View>
            </View>
            <Text style={styles.label}>Gender</Text>
            <FilterChips options={GENDERS} value={form.gender} onChange={set("gender")} />
            <SelectField label="Nationality" value={form.nationality} options={nationalities} onChange={set("nationality")} allowClear />
            <TextField label="ID number" value={form.identity_number || ""} onChangeText={set("identity_number")} />
            <TextField label="Address" value={form.address || ""} onChangeText={set("address")} multiline />
          </Section>

          <Section title="Assessment">
            <TextField label="Referring physician" value={form.physician || ""} onChangeText={set("physician")} />
            <DiagnosisField value={form.diagnosis_name || ""} onChange={set("diagnosis_name")} />
            <TextField label="Physical assessment" value={form.physical_assessment || ""} onChangeText={set("physical_assessment")} multiline style={styles.multiline} />
            <TextField label="Daily activities" value={form.daily_activities || ""} onChangeText={set("daily_activities")} multiline style={styles.multiline} />
            <TextField label="Current medications" value={form.medications || ""} onChangeText={set("medications")} multiline style={styles.multiline} />
          </Section>

          <Section title="Care plan & quotation">
            {SERVICES.map(({ key, label }) => (
              <View key={key} style={styles.service}>
                <View style={styles.serviceHeader}>
                  <Text style={styles.serviceLabel}>{label}</Text>
                  <Switch value={!!care[key]} onValueChange={setIn("care_plan", key)} trackColor={{ true: colors.primary }} accessibilityLabel={label} />
                </View>
                {!!care[key] && (
                  <>
                    <SmallInput label="Quotation / plan" value={form[key]?.quotation} onChangeText={setIn(key, "quotation")} />
                    <View style={styles.row}>
                      <SmallInput label="Duration" value={form[key]?.duration} onChangeText={setIn(key, "duration")} />
                      {key !== "nursing" && <SmallInput label="Sessions" value={form[key]?.sessions} onChangeText={setIn(key, "sessions")} numeric />}
                      <SmallInput label="Fees" value={form[key]?.fees} onChangeText={setIn(key, "fees")} numeric />
                    </View>
                  </>
                )}
              </View>
            ))}
          </Section>

          {!!care.physiotherapy && (
            <Section title="Physiotherapy">
              <Text style={styles.subLabel}>Findings</Text>
              {PHYSIO_FINDINGS.map(([k, l]) => (
                <Check key={k} label={l} value={form.physiotherapy_details?.[k]} onChange={setIn("physiotherapy_details", k)} />
              ))}
              <Text style={styles.subLabel}>Treatment plan</Text>
              {PHYSIO_PLAN.map(([k, l]) => (
                <Check key={k} label={l} value={form.physiotherapy_treatment_plan?.[k]} onChange={setIn("physiotherapy_treatment_plan", k)} />
              ))}
            </Section>
          )}

          <Section title="Equipment needed">
            {EQUIPMENT.map(([k, l]) => (
              <Check key={k} label={l} value={form.equipment?.[k]} onChange={setIn("equipment", k)} />
            ))}
            {!!form.equipment?.others && (
              <TextField label="Other equipment" value={form.equipment.other_equipment_details || ""} onChangeText={setIn("equipment", "other_equipment_details")} />
            )}
          </Section>

          <Section title="Invoice">
            <View style={styles.row}>
              <SmallInput label="Discount %" value={form.invoice_details?.discount} onChangeText={setIn("invoice_details", "discount")} numeric />
              <SmallInput label="VAT %" value={form.invoice_details?.vat} onChangeText={setIn("invoice_details", "vat")} numeric />
              <SmallInput label="Other fees" value={form.invoice_details?.other_fees} onChangeText={setIn("invoice_details", "other_fees")} numeric />
            </View>
            <View style={styles.totals}>
              <Text style={styles.totalLine}>Subtotal {totals.subtotal.toFixed(2)}</Text>
              {totals.discount > 0 && <Text style={styles.totalLine}>Discount −{totals.discount.toFixed(2)}</Text>}
              {totals.vat > 0 && <Text style={styles.totalLine}>VAT +{totals.vat.toFixed(2)}</Text>}
              <Text style={styles.total}>Total {totals.total.toFixed(2)}</Text>
            </View>
          </Section>

          <ErrorBanner message={error} />
          <PrimaryButton title={isEdit ? "Save changes" : "Save assessment"} icon="checkmark" loading={saving} onPress={save} />
        </ScrollView>
      </KeyboardAvoidingView>
    </AppScreen>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  content: { padding: 16, paddingBottom: 40, gap: 16 },
  section: { backgroundColor: colors.surface, borderRadius: 16, padding: 16, gap: 12, ...shadow },
  sectionTitle: { fontSize: 17, fontWeight: "700", color: colors.primary },
  row: { flexDirection: "row", gap: 10 },
  label: { color: colors.textBody, fontSize: 14, fontWeight: "600" },
  subLabel: { color: colors.textMuted, fontSize: 13, fontWeight: "600", marginTop: 4 },
  multiline: { minHeight: 70, textAlignVertical: "top" },
  check: { flexDirection: "row", alignItems: "center", gap: 10, paddingVertical: 4 },
  checkLabel: { fontSize: 15, color: colors.text, flex: 1 },
  service: { borderWidth: 1, borderColor: colors.borderSoft, borderRadius: 12, padding: 12, gap: 10 },
  serviceHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  serviceLabel: { fontSize: 15, fontWeight: "700", color: colors.text },
  smallField: { flex: 1, gap: 4 },
  smallLabel: { fontSize: 12, color: colors.textMuted, fontWeight: "600" },
  smallInput: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 9,
    fontSize: 15,
    color: colors.text,
    backgroundColor: colors.surface,
  },
  diagnosis: { gap: 4 },
  suggestions: { borderWidth: 1, borderColor: colors.border, borderRadius: 12, overflow: "hidden" },
  suggestion: { paddingHorizontal: 12, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: colors.borderSoft, backgroundColor: colors.surface },
  suggestionText: { fontSize: 14, color: colors.text },
  totals: { alignItems: "flex-end", gap: 2 },
  totalLine: { fontSize: 13, color: colors.textMuted },
  total: { fontSize: 17, fontWeight: "700", color: colors.text, marginTop: 2 },
});
