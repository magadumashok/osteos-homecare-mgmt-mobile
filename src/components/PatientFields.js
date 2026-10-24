import { useEffect, useMemo, useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import { TextField } from "./Form";
import { FilterChips } from "./Segmented";
import SelectField from "./SelectField";
import useReference from "../hooks/useReference";
import { cities, packageFees, packageName, regions, servicePackages } from "../services/referenceService";
import { colors } from "../theme";

const GENDERS = ["male", "female", "other"].map((v) => ({ value: v, label: v.charAt(0).toUpperCase() + v.slice(1) }));
const SOURCES = ["Phone call", "Walk-in", "Referral", "Hospital", "Website", "Social media", "Other"].map((v) => ({ value: v, label: v }));

// Options valued by name, as on the web form. Older patients have free-text
// states, so a saved value that is not in the list is kept as an option.
const namedOptions = (rows, current) => {
  const options = (rows || []).map((r) => ({ value: r.name ?? r.label, label: r.name ?? r.label })).filter((o) => o.value);
  return current && !options.some((o) => o.value === current) ? [{ value: current, label: current }, ...options] : options;
};

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
  city: "",
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
  const [regionRows, setRegionRows] = useState([]);
  const [cityRows, setCityRows] = useState([]);
  const set = (key) => (value) => onChange({ ...form, [key]: value });

  // States of the chosen country.
  useEffect(() => {
    setRegionRows([]);
    if (form.country) regions(form.country).then((list) => setRegionRows(list || [])).catch(() => setRegionRows([]));
  }, [form.country]);

  // State and city are saved by name (they go into the directions link),
  // so the chosen state's code is looked up to list its cities.
  const regionCode = useMemo(
    () => regionRows.find((r) => (r.name ?? r.label) === form.state)?.code ?? "",
    [regionRows, form.state],
  );

  useEffect(() => {
    setCityRows([]);
    if (regionCode) cities(regionCode).then((list) => setCityRows(list || [])).catch(() => setCityRows([]));
  }, [regionCode]);

  const stateOptions = useMemo(() => namedOptions(regionRows, form.state), [regionRows, form.state]);
  const cityOptions = useMemo(() => namedOptions(cityRows, form.city), [cityRows, form.city]);

  useEffect(() => {
    servicePackages()
      .then((list) => setPackages((list || []).filter((p) => packageName(p)).map((p) => ({ value: packageName(p), label: packageName(p), sub: String(packageFees(p) || ""), fees: packageFees(p) }))))
      .catch(() => {});
  }, []);

  return (
    <View style={styles.wrap}>
      <TextField label="Patient name *" value={form.patient_name} onChangeText={set("patient_name")} />
      <SelectField
        label={isEdit ? "Country" : "Country *"}
        value={form.country}
        options={countries}
        onChange={(value) => onChange({ ...form, country: value, state: "", city: "" })}
      />
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
      <SelectField
        label="State / Region"
        value={form.state || ""}
        options={stateOptions}
        placeholder={form.country ? "Select" : "Choose a country first"}
        disabled={!form.country}
        allowClear
        onChange={(value) => onChange({ ...form, state: value, city: "" })}
      />
      <SelectField
        label="City"
        value={form.city || ""}
        options={cityOptions}
        placeholder={form.state ? "Select" : "Choose a state first"}
        disabled={!form.state}
        allowClear
        onChange={set("city")}
      />
      <TextField label="Street address (used for directions)" value={form.address || ""} onChangeText={set("address")} multiline />
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
