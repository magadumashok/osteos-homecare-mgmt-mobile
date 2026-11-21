import { useMemo, useState } from "react";
import { Alert, FlatList, RefreshControl, StyleSheet, Text, View } from "react-native";
import { useSelector } from "react-redux";
import AppScreen, { HeaderIconButton } from "../../components/AppScreen";
import ListCard from "../../components/ListCard";
import SearchBar from "../../components/SearchBar";
import Segmented from "../../components/Segmented";
import { EmptyState, ErrorState, LoadingView } from "../../components/States";
import useApi from "../../hooks/useApi";
import { listPatients, listRegisteredPatients } from "../../services/patientService";
import { capitalize } from "../../utils/format";
import { can } from "../../utils/permissions";
import { colors } from "../../theme";

export default function PatientListScreen({ navigation }) {
  const permissions = useSelector((s) => s.auth.permissions);
  const canRegister = can(permissions, "patients.manage");
  // Admins already see every patient; nurses and caretakers can switch to
  // the full register, where patients not assigned to them show basic details only.
  const seesAll = can(permissions, "patients.view_all");
  const [tab, setTab] = useState("mine");
  const registered = !seesAll && tab === "all";
  const { data, loading, refreshing, error, reload, refresh } = useApi(registered ? listRegisteredPatients : listPatients, [registered]);
  const [query, setQuery] = useState("");

  const patients = useMemo(() => {
    const q = query.trim().toLowerCase();
    return (data || []).filter((p) =>
      `${p.patient_name || ""} ${p.username || ""} ${p.mobile || ""}`.toLowerCase().includes(q),
    );
  }, [data, query]);

  const open = (item) => {
    if (item.assigned === false) {
      Alert.alert("Not assigned to you", `${item.patient_name || item.username} is not assigned to you, so you cannot open their records. Ask your coordinator if you need access.`);
      return;
    }
    navigation.navigate("PatientHub", { username: item.username, name: item.patient_name });
  };

  return (
    <AppScreen
      title="Patients"
      subtitle={registered ? "All registered patients" : seesAll ? "Admitted patients" : "Patients assigned to you"}
      right={canRegister ? <HeaderIconButton icon="person-add" label="Register patient" onPress={() => navigation.navigate("PatientForm")} /> : null}
      headerExtra={<SearchBar value={query} onChangeText={setQuery} placeholder="Search by name, ID or mobile..." />}
    >
      {!seesAll && (
        <View style={styles.tabs}>
          <Segmented
            value={tab}
            onChange={setTab}
            options={[
              { value: "mine", label: "My patients", icon: "person-outline" },
              { value: "all", label: "All registered", icon: "people-outline" },
            ]}
          />
        </View>
      )}
      {loading ? (
        <LoadingView label="Loading patients…" />
      ) : error ? (
        <ErrorState message={error} onRetry={reload} />
      ) : (
        <FlatList
          data={patients}
          keyExtractor={(item) => item.username || item._id}
          contentContainerStyle={styles.list}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} colors={[colors.primary]} />}
          ListHeaderComponent={
            <Text style={styles.count}>
              {patients.length} patient{patients.length === 1 ? "" : "s"}
            </Text>
          }
          ListEmptyComponent={
            !seesAll && tab === "mine" && !query ? (
              <EmptyState
                icon="people-outline"
                title="No patients assigned"
                subtitle="Patients appear here while you have a duty with them. See All registered for every patient."
              />
            ) : (
              <EmptyState icon="people-outline" title="No patients found" subtitle="Try a different name, ID or mobile number" />
            )
          }
          renderItem={({ item }) => (
            <ListCard
              title={item.patient_name || item.username}
              meta={[`ID: ${item.username}`, item.mobile]}
              badges={[
                capitalize(item.gender),
                item.age ? `${item.age} yrs` : null,
                item.service,
                registered && item.assigned ? "Assigned to you" : null,
              ]}
              onPress={() => open(item)}
            />
          )}
        />
      )}
    </AppScreen>
  );
}

const styles = StyleSheet.create({
  tabs: { paddingHorizontal: 20, paddingTop: 12 },
  list: { padding: 20, paddingBottom: 40, gap: 12 },
  count: { color: colors.textMuted, fontSize: 13, fontWeight: "600" },
});
