import { useEffect, useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import { TextField } from "./Form";
import { FilterChips } from "./Segmented";
import SelectField from "./SelectField";
import useReference from "../hooks/useReference";
import { packageFees, packageName, servicePackages } from "../services/referenceService";
import { colors } from "../theme";

const GENDERS = ["male", "female", "other"].map((v) => ({ value: v, label: v.charAt(0).toUpperCase() + v.slice(1) }));
const SOURCES = ["Phone call", "Walk-in", "Referral", "Hospital", "Website", "Social media", "Other"].map((v) => ({ value: v, label: v }));

export const BLANK_PATIENT = {
  patient_name: "",
  country: "",
  mobile: "",
  email: "",
  gender: "",
  age: "",
  date_of_birth: "",
  id_no: "",
  nationality: "",
  insurance_name: "",
  weight: "",
  state: "",
  address: "",
  source_of_contact: "",
  service_package: "",
  fees: "",
  comments: "",
};

/** Empty strings → null and numbers as numbers, so the API's validation is happy. */
export function patientPayload(form) {
  const out = {};
  Object.entries(form).forEach(([key, value]) => {
    const v = typeof value === "string" ? value.trim() : value;
    if (v === "" || v === null || v === undefined) return;
    out[key] = ["age", "weight", "fees"].includes(key) ? Number(v) : v;
  });
  return out;
}

/**
 * The patient registration fields (shared by register, edit and walk-in).
 * Date of birth, weight, nationality, ID number and insurance are no longer
 * asked for (matches the web form); existing values are kept on edit.
 */
export default function PatientFields({ form, onChange, isEdit = false }) {
  const countries = useReference("countriesByCode");
  const [packages, setPackages] = useState([]);
  const set = (key) => (value) => onChange({ ...form, [key]: value });

  useEffect(() => {
    servicePackages()
      .then((list) => setPackages((list || []).filter((p) => packageName(p)).map((p) => ({ value: packageName(p), label: packageName(p), sub: String(packageFees(p) || ""), fees: packageFees(p) }))))
      .catch(() => {});
  }, []);

  return (
    <View style={styles.wrap}>
      <TextField label="Patient name *" value={form.patient_name} onChangeText={set("patient_name")} />
      <SelectField label={isEdit ? "Country" : "Country *"} value={form.country} options={countries} onChange={set("country")} />
      <TextField
        label={isEdit ? "Mobile (with country code)" : "Mobile (without country code)"}
        value={String(form.mobile || "")}
        onChangeText={set("mobile")}
        keyboardType="phone-pad"
      />
      <TextField label="Email" value={form.email || ""} onChangeText={set("email")} keyboardType="email-address" autoCapitalize="none" />
      <Text style={styles.label}>Gender</Text>
      <FilterChips options={GENDERS} value={String(form.gender || "").toLowerCase()} onChange={set("gender")} />
      <TextField label="Age" value={String(form.age ?? "")} onChangeText={set("age")} keyboardType="number-pad" />
      <TextField label="State / area" value={form.state || ""} onChangeText={set("state")} />
      <TextField label="Address (used for directions)" value={form.address || ""} onChangeText={set("address")} multiline />
      <Text style={styles.label}>Source of contact</Text>
      <FilterChips options={SOURCES} value={form.source_of_contact} onChange={set("source_of_contact")} />
      <SelectField
        label="Service package"
        value={form.service_package}
        options={packages}
        allowClear
        onChange={(value) => {
          const chosen = packages.find((p) => p.value === value);
          onChange({ ...form, service_package: value, fees: chosen?.fees != null ? String(chosen.fees) : form.fees });
        }}
      />
      {!!form.service_package && (
        <TextField label="Fees" value={String(form.fees ?? "")} onChangeText={set("fees")} keyboardType="decimal-pad" />
      )}
      <TextField label="Comments" value={form.comments || ""} onChangeText={set("comments")} multiline />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: 14 },
  label: { color: colors.textBody, fontSize: 14, fontWeight: "600" },
});
