import { useCallback, useMemo, useState } from "react";
import { Alert, FlatList, Pressable, RefreshControl, StyleSheet, Text } from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import { useSelector } from "react-redux";
import AppScreen from "../../components/AppScreen";
import ListCard from "../../components/ListCard";
import SearchBar from "../../components/SearchBar";
import { EmptyState, ErrorState, LoadingView } from "../../components/States";
import { admitAssessment, listAssessments } from "../../services/leadService";
import { can } from "../../utils/permissions";
import { colors } from "../../theme";

/** Assessed patients waiting to be admitted (old "Assessed patient list"). */
export default function AssessmentsScreen({ navigation }) {
  const permissions = useSelector((s) => s.auth.permissions);
  const canAdmit = can(permissions, "patients.manage");
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);
  const [query, setQuery] = useState("");
  const [admitting, setAdmitting] = useState(null);

  const load = useCallback(async (mode = "load") => {
    mode === "refresh" ? setRefreshing(true) : setLoading(true);
    setError(null);
    try {
      setRows((await listAssessments()) || []);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  const shown = useMemo(() => {
    const q = query.trim().toLowerCase();
    return rows.filter((a) => `${a.patient_name || ""} ${a.mobile || ""} ${a.diagnosis_name || ""}`.toLowerCase().includes(q));
  }, [rows, query]);

  const admit = (assessment) =>
    Alert.alert("Admit patient", `Admit ${assessment.patient_name} as a patient?`, [
      { text: "Cancel", style: "cancel" },
      {
        text: "Admit",
        onPress: async () => {
          setAdmitting(assessment._id);
          try {
            const patient = await admitAssessment(assessment._id);
            await load("refresh");
            Alert.alert("Admitted", `${patient?.patient_name || assessment.patient_name} admitted as ${patient?.username || "a patient"}.`, [
              { text: "OK" },
              patient?.username
                ? { text: "Open patient", onPress: () => navigation.navigate("PatientHub", { username: patient.username, name: patient.patient_name }) }
                : null,
            ].filter(Boolean));
          } catch (e) {
            Alert.alert("Could not admit", e.message);
          } finally {
            setAdmitting(null);
          }
        },
      },
    ]);

  return (
    <AppScreen title="Assessments" headerExtra={<SearchBar value={query} onChangeText={setQuery} placeholder="Search assessments..." />}>
      {loading ? (
        <LoadingView label="Loading assessments…" />
      ) : error ? (
        <ErrorState message={error} onRetry={() => load()} />
      ) : (
        <FlatList
          data={shown}
          keyExtractor={(item) => item._id}
          contentContainerStyle={styles.list}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => load("refresh")} colors={[colors.primary]} />}
          ListHeaderComponent={<Text style={styles.count}>{shown.length} assessments</Text>}
          ListEmptyComponent={
            // Patient Leads is hidden for now, so its hint is too:
            // <EmptyState icon="clipboard-outline" title="No assessments" subtitle="Start one from a lead on the Patient Leads screen." />
            <EmptyState icon="clipboard-outline" title="No assessments" />
          }
          renderItem={({ item }) => (
            <ListCard
              title={item.patient_name}
              meta={[item.mobile, item.diagnosis_name]}
              badges={[item.assessment_id && `Lead #${item.assessment_id}`]}
              onPress={() => navigation.navigate("AssessmentForm", { assessmentId: item._id })}
              trailing={
                canAdmit ? (
                  <Pressable onPress={() => admit(item)} disabled={admitting === item._id} style={styles.admit}>
                    <Text style={styles.admitText}>{admitting === item._id ? "…" : "Admit"}</Text>
                  </Pressable>
                ) : undefined
              }
            />
          )}
        />
      )}
    </AppScreen>
  );
}

const styles = StyleSheet.create({
  list: { padding: 16, paddingBottom: 40, gap: 12 },
  count: { color: colors.textMuted, fontSize: 13, fontWeight: "600" },
  admit: { backgroundColor: colors.primary, borderRadius: 18, paddingHorizontal: 14, paddingVertical: 8 },
  admitText: { color: colors.onPrimary, fontWeight: "700", fontSize: 13 },
});
