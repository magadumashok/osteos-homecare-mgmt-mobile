import { useCallback, useMemo, useRef } from "react";
import { useFocusEffect } from "@react-navigation/native";
import { ScrollView, StyleSheet, Text, View } from "react-native";
import { useSelector } from "react-redux";
import ActionGrid from "../../components/ActionGrid";
import AppScreen, { HeaderIconButton } from "../../components/AppScreen";
import { ErrorState, LoadingView } from "../../components/States";
import useApi from "../../hooks/useApi";
import { getPatient } from "../../services/patientService";
import { capitalize } from "../../utils/format";
import { patientActions } from "../../navigation/patientModules";
import { can } from "../../utils/permissions";
import { colors, shadow } from "../../theme";

function Detail({ label, value }) {
  if (!value) return null;
  return (
    <View style={styles.detail}>
      <Text style={styles.detailLabel}>{label}</Text>
      <Text style={styles.detailValue}>{value}</Text>
    </View>
  );
}

export default function PatientHubScreen({ navigation, route }) {
  const { username, name } = route.params;
  const permissions = useSelector((s) => s.auth.permissions);
  const { data: patient, loading, error, reload, refresh } = useApi(() => getPatient(username), [username]);

  // Pick up edits made on the patient form (skip the first focus; useApi already loads).
  const focusedBefore = useRef(false);
  useFocusEffect(
    useCallback(() => {
      if (focusedBefore.current) refresh();
      focusedBefore.current = true;
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []),
  );

  const modules = useMemo(
    () => patientActions({ permissions, navigation, username, name }),
    [permissions, navigation, username, name],
  );

  return (
    <AppScreen
      title={patient?.patient_name || name || "Patient"}
      subtitle={`ID: ${username}`}
      right={
        can(permissions, "patients.manage") ? (
          <HeaderIconButton icon="create-outline" label="Edit patient" onPress={() => navigation.navigate("PatientForm", { username })} />
        ) : null
      }
    >
      {loading ? (
        <LoadingView label="Loading patient…" />
      ) : error ? (
        <ErrorState message={error} onRetry={reload} />
      ) : (
        <ScrollView contentContainerStyle={styles.content}>
          <View style={styles.card}>
            <Detail label="Gender / Age" value={[capitalize(patient.gender), patient.age && `${patient.age} yrs`].filter(Boolean).join(" · ")} />
            <Detail label="Mobile" value={patient.mobile} />
            <Detail label="Address" value={patient.address} />
            <Detail label="Service package" value={patient.service_package} />
            <Detail label="Diagnosis" value={patient.diagnosis_name || patient.diagnosis} />
            <Detail label="Physician" value={patient.physician} />
          </View>
          <Text style={styles.sectionTitle}>Patient Actions</Text>
          <ActionGrid items={modules} />
        </ScrollView>
      )}
    </AppScreen>
  );
}

const styles = StyleSheet.create({
  content: { padding: 20, paddingBottom: 40, gap: 16 },
  card: { backgroundColor: colors.surface, borderRadius: 16, padding: 16, gap: 12, ...shadow },
  detail: { gap: 2 },
  detailLabel: { fontSize: 12, color: colors.textFaint },
  detailValue: { fontSize: 15, color: colors.text },
  sectionTitle: { fontSize: 20, fontWeight: "700", color: colors.text, marginTop: 4 },
});
