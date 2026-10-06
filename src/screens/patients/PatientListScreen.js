import { useMemo, useState } from "react";
import { FlatList, RefreshControl, StyleSheet, Text } from "react-native";
import { useSelector } from "react-redux";
import AppScreen, { HeaderIconButton } from "../../components/AppScreen";
import ListCard from "../../components/ListCard";
import SearchBar from "../../components/SearchBar";
import { EmptyState, ErrorState, LoadingView } from "../../components/States";
import useApi from "../../hooks/useApi";
import { listPatients } from "../../services/patientService";
import { capitalize } from "../../utils/format";
import { can } from "../../utils/permissions";
import { colors } from "../../theme";

export default function PatientListScreen({ navigation }) {
  const { data, loading, refreshing, error, reload, refresh } = useApi(listPatients);
  const canRegister = can(useSelector((s) => s.auth.permissions), "patients.manage");
  const [query, setQuery] = useState("");

  const patients = useMemo(() => {
    const q = query.trim().toLowerCase();
    return (data || []).filter((p) =>
      `${p.patient_name || ""} ${p.username || ""} ${p.mobile || ""}`.toLowerCase().includes(q),
    );
  }, [data, query]);

  return (
    <AppScreen
      title="Patients"
      subtitle="Admitted patients"
      right={canRegister ? <HeaderIconButton icon="person-add" label="Register patient" onPress={() => navigation.navigate("PatientForm")} /> : null}
      headerExtra={<SearchBar value={query} onChangeText={setQuery} placeholder="Search by name, ID or mobile..." />}
    >
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
            <EmptyState icon="people-outline" title="No patients found" subtitle="Try a different name, ID or mobile number" />
          }
          renderItem={({ item }) => (
            <ListCard
              title={item.patient_name || item.username}
              meta={[`ID: ${item.username}`, item.mobile]}
              badges={[capitalize(item.gender), item.age ? `${item.age} yrs` : null, item.service_package]}
              onPress={() => navigation.navigate("PatientHub", { username: item.username, name: item.patient_name })}
            />
          )}
        />
      )}
    </AppScreen>
  );
}

const styles = StyleSheet.create({
  list: { padding: 20, paddingBottom: 40, gap: 12 },
  count: { color: colors.textMuted, fontSize: 13, fontWeight: "600" },
});
