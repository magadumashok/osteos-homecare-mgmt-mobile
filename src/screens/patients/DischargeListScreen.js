import { useCallback, useState } from "react";
import { FlatList, Modal, Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { SafeAreaView } from "react-native-safe-area-context";
import { useFocusEffect } from "@react-navigation/native";
import { useSelector } from "react-redux";
import AppScreen from "../../components/AppScreen";
import ListCard from "../../components/ListCard";
import Segmented from "../../components/Segmented";
import { EmptyState, ErrorState, LoadingView } from "../../components/States";
import { awaitingDischarge, dischargedPatients, listPatients } from "../../services/patientService";
import { shortDate, time12 } from "../../utils/dates";
import { can } from "../../utils/permissions";
import { colors } from "../../theme";

/**
 * Old nurse "Patients for discharge" and the discharged list. Awaiting
 * combines the user's own patients with a planned date and, for
 * coordinators who can see every patient, all of them.
 */
export default function DischargeListScreen({ navigation }) {
  const permissions = useSelector((s) => s.auth.permissions);
  const canDischarge = can(permissions, "discharge.manage");
  const [tab, setTab] = useState("awaiting");
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);
  const [summaryOf, setSummaryOf] = useState(null);

  const load = useCallback(
    async (mode = "load") => {
      mode === "refresh" ? setRefreshing(true) : setLoading(true);
      setError(null);
      try {
        if (tab === "discharged") {
          setRows((await dischargedPatients()) || []);
        } else {
          const [mine, all] = await Promise.all([
            awaitingDischarge().catch(() => []),
            can(permissions, "patients.view") ? listPatients().catch(() => []) : Promise.resolve([]),
          ]);
          const byUsername = new Map();
          [...(mine || []), ...(all || []).filter((p) => p?.discharge?.date)].forEach((p) => byUsername.set(p.username, p));
          setRows([...byUsername.values()].sort((a, b) => String(a.discharge?.date).localeCompare(String(b.discharge?.date))));
        }
      } catch (e) {
        setError(e.message);
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [tab, permissions],
  );

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  return (
    <AppScreen title="Discharge">
      <Segmented
        style={styles.tabs}
        value={tab}
        onChange={(t) => {
          setRows([]);
          setTab(t);
        }}
        options={[
          { value: "awaiting", label: "Awaiting", icon: "hourglass-outline" },
          { value: "discharged", label: "Discharged", icon: "checkmark-done-outline" },
        ]}
      />
      {loading ? (
        <LoadingView />
      ) : error ? (
        <ErrorState message={error} onRetry={() => load()} />
      ) : (
        <FlatList
          data={rows}
          keyExtractor={(item, index) => `${item.username}-${index}`}
          contentContainerStyle={styles.list}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => load("refresh")} colors={[colors.primary]} />}
          ListEmptyComponent={
            <EmptyState icon="exit-outline" title={tab === "awaiting" ? "No discharges planned" : "No discharged patients"} />
          }
          renderItem={({ item }) =>
            tab === "awaiting" ? (
              <ListCard
                title={item.patient_name || item.username}
                meta={[`ID: ${item.username}`, item.discharge?.date && `Planned ${shortDate(item.discharge.date)}${item.discharge.time ? `, ${time12(item.discharge.time)}` : ""}`]}
                onPress={() =>
                  navigation.navigate(canDischarge ? "DischargePatient" : "PatientHub", { username: item.username, name: item.patient_name })
                }
              />
            ) : (
              <ListCard
                title={item.patient_name || item.username}
                meta={[
                  `Discharged ${shortDate(item.discharged_date)}${item.discharged_time ? `, ${time12(item.discharged_time)}` : ""}`,
                  item.discharged_by && `By ${item.discharged_by}`,
                ]}
                onPress={() => setSummaryOf(item)}
              />
            )
          }
        />
      )}

      <Modal visible={!!summaryOf} animationType="slide" onRequestClose={() => setSummaryOf(null)}>
        <SafeAreaView style={styles.sheet}>
          <View style={styles.sheetHeader}>
            <Text style={styles.sheetTitle}>{summaryOf?.patient_name}</Text>
            <Pressable onPress={() => setSummaryOf(null)} hitSlop={10} accessibilityLabel="Close">
              <Ionicons name="close" size={26} color={colors.onPrimary} />
            </Pressable>
          </View>
          <ScrollView contentContainerStyle={styles.sheetBody}>
            <Text style={styles.meta}>
              Discharged {shortDate(summaryOf?.discharged_date)}
              {summaryOf?.discharged_by ? ` by ${summaryOf.discharged_by}` : ""}
            </Text>
            <Text style={styles.summary}>{summaryOf?.discharged_summary || "No summary recorded."}</Text>
          </ScrollView>
        </SafeAreaView>
      </Modal>
    </AppScreen>
  );
}

const styles = StyleSheet.create({
  tabs: { margin: 16, marginBottom: 0 },
  list: { padding: 16, paddingBottom: 40, gap: 12 },
  sheet: { flex: 1, backgroundColor: colors.background },
  sheetHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", padding: 18, backgroundColor: colors.primary },
  sheetTitle: { color: colors.onPrimary, fontSize: 18, fontWeight: "700", flex: 1 },
  sheetBody: { padding: 20, gap: 12 },
  meta: { fontSize: 13, color: colors.textMuted },
  summary: { fontSize: 15, color: colors.text, lineHeight: 22 },
});
