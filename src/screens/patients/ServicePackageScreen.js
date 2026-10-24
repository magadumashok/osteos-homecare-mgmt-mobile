import { useEffect, useState } from "react";
import { Alert, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import KeyboardAwareView from "../../components/KeyboardAwareView";
import { Ionicons } from "@expo/vector-icons";
import AppScreen from "../../components/AppScreen";
import { ErrorBanner, PrimaryButton } from "../../components/Form";
import { LoadingView } from "../../components/States";
import { getPatient, updateServices } from "../../services/patientService";
import { packageFees, packageName, servicePackages } from "../../services/referenceService";
import { colors, shadow } from "../../theme";

/** The old "Update service package": which services were given on this visit, and their fees. */
export default function ServicePackageScreen({ navigation, route }) {
  const { username, name, dutyId } = route.params;
  const [packages, setPackages] = useState(null);
  const [selected, setSelected] = useState({}); // name → fees
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    Promise.all([servicePackages(), getPatient(username).catch(() => null)])
      .then(([list, patient]) => {
        setPackages(list || []);
        // Start from what the patient already has.
        const current = Array.isArray(patient?.services) ? patient.services : [];
        setSelected(Object.fromEntries(current.filter((s) => s?.service_package).map((s) => [s.service_package, String(s.fees ?? "")])));
      })
      .catch((e) => {
        setPackages([]);
        setError(e.message);
      });
  }, [username]);

  const toggle = (p) => {
    const key = packageName(p);
    setSelected((all) => {
      const next = { ...all };
      if (key in next) delete next[key];
      else next[key] = String(packageFees(p) ?? "");
      return next;
    });
  };

  const total = Object.values(selected).reduce((sum, fee) => sum + (Number(fee) || 0), 0);

  const save = async () => {
    setError(null);
    const services = Object.entries(selected).map(([service_package, fees]) => ({
      service_package,
      fees: fees === "" ? null : Number(fees),
    }));
    if (!services.length) {
      setError("Choose at least one service.");
      return;
    }
    if (services.some((s) => s.fees !== null && Number.isNaN(s.fees))) {
      setError("Fees must be numbers.");
      return;
    }
    setSaving(true);
    try {
      const result = await updateServices(username, services, dutyId);
      Alert.alert("Saved", result || "Services updated.", [{ text: "OK", onPress: () => navigation.goBack() }]);
    } catch (e) {
      setError(e.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <AppScreen title="Service Package" subtitle={name || username}>
      {!packages ? (
        <LoadingView label="Loading services…" />
      ) : (
        <KeyboardAwareView style={styles.flex}>
          <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
            <Text style={styles.hint}>Tick the services given on this visit. Fees can be adjusted.</Text>
            <View style={styles.list}>
              {packages.map((p, index) => {
                const key = packageName(p);
                if (!key) return null;
                const on = key in selected;
                return (
                  <View key={`${key}-${index}`} style={[styles.row, on && styles.rowOn]}>
                    <Pressable onPress={() => toggle(p)} style={styles.rowMain} accessibilityRole="checkbox" accessibilityState={{ checked: on }}>
                      <Ionicons name={on ? "checkbox" : "square-outline"} size={22} color={colors.primary} />
                      <Text style={styles.rowName}>{key}</Text>
                    </Pressable>
                    {on && (
                      <TextInput
                        value={selected[key]}
                        onChangeText={(v) => setSelected((all) => ({ ...all, [key]: v }))}
                        keyboardType="decimal-pad"
                        placeholder="Fee"
                        placeholderTextColor={colors.textFaint}
                        style={styles.fee}
                        accessibilityLabel={`${key} fee`}
                      />
                    )}
                  </View>
                );
              })}
            </View>
            <View style={styles.totalRow}>
              <Text style={styles.totalLabel}>Total</Text>
              <Text style={styles.totalValue}>{total.toFixed(2)}</Text>
            </View>
            <ErrorBanner message={error} />
            <PrimaryButton title="Save services" icon="checkmark" loading={saving} onPress={save} />
          </ScrollView>
        </KeyboardAwareView>
      )}
    </AppScreen>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  content: { padding: 16, paddingBottom: 40, gap: 14 },
  hint: { fontSize: 13, color: colors.textMuted },
  list: { backgroundColor: colors.surface, borderRadius: 16, overflow: "hidden", ...shadow },
  row: { flexDirection: "row", alignItems: "center", paddingRight: 12, borderBottomWidth: 1, borderBottomColor: colors.borderSoft },
  rowOn: { backgroundColor: colors.primarySoft },
  rowMain: { flex: 1, flexDirection: "row", alignItems: "center", gap: 12, padding: 14 },
  rowName: { fontSize: 15, color: colors.text, flex: 1 },
  fee: {
    width: 90,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 8,
    fontSize: 15,
    textAlign: "right",
    backgroundColor: colors.surface,
    color: colors.text,
  },
  totalRow: { flexDirection: "row", justifyContent: "space-between", paddingHorizontal: 4 },
  totalLabel: { fontSize: 16, fontWeight: "700", color: colors.text },
  totalValue: { fontSize: 16, fontWeight: "700", color: colors.primary },
});
