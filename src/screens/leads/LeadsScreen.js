import { useCallback, useMemo, useState } from "react";
import { FlatList, RefreshControl, ScrollView, StyleSheet, Text, View } from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import { useSelector } from "react-redux";
import AppScreen, { HeaderIconButton } from "../../components/AppScreen";
import ListCard from "../../components/ListCard";
import SearchBar from "../../components/SearchBar";
import { FilterChips } from "../../components/Segmented";
import { EmptyState, ErrorState, LoadingView } from "../../components/States";
import { listLeads } from "../../services/leadService";
import { humanize } from "../../utils/format";
import { shortDate } from "../../utils/dates";
import { can } from "../../utils/permissions";
import { colors } from "../../theme";

export const FOLLOWUPS = ["new", "follow_up", "not_reachable", "not_interested", "to_be_assessed"];

const FILTERS = [{ value: "all", label: "All" }, ...FOLLOWUPS.map((v) => ({ value: v, label: humanize(v) }))];

/** Enquiries not yet assessed (old "View patient leads"). */
export default function LeadsScreen({ navigation }) {
  const canManage = can(useSelector((s) => s.auth.permissions), "leads.manage");
  const [leads, setLeads] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState("all");

  const load = useCallback(async (mode = "load") => {
    mode === "refresh" ? setRefreshing(true) : setLoading(true);
    setError(null);
    try {
      setLeads((await listLeads()) || []);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      load(leads.length ? "refresh" : "load");
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [load]),
  );

  const shown = useMemo(() => {
    const q = query.trim().toLowerCase();
    return leads
      .filter((l) => filter === "all" || (l.followup || "new") === filter)
      .filter((l) => `${l.patient_name || ""} ${l.mobile || ""} ${l.lead_id || ""}`.toLowerCase().includes(q));
  }, [leads, query, filter]);

  return (
    <AppScreen
      title="Patient Leads"
      right={canManage ? <HeaderIconButton icon="add" label="Add lead" onPress={() => navigation.navigate("LeadForm")} /> : null}
      headerExtra={<SearchBar value={query} onChangeText={setQuery} placeholder="Search by name or mobile..." />}
    >
      <View>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filters}>
          <FilterChips options={FILTERS} value={filter} onChange={setFilter} />
        </ScrollView>
      </View>
      {loading ? (
        <LoadingView label="Loading leads…" />
      ) : error ? (
        <ErrorState message={error} onRetry={() => load()} />
      ) : (
        <FlatList
          data={shown}
          keyExtractor={(item) => String(item.lead_id || item._id)}
          contentContainerStyle={styles.list}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => load("refresh")} colors={[colors.primary]} />}
          ListHeaderComponent={<Text style={styles.count}>{shown.length} leads</Text>}
          ListEmptyComponent={<EmptyState icon="person-add-outline" title="No leads" />}
          renderItem={({ item }) => (
            <ListCard
              title={item.patient_name}
              meta={[item.mobile, [item.source, item.date && shortDate(item.date)].filter(Boolean).join(" · ")]}
              badges={[humanize(item.followup || "new"), item.staff]}
              onPress={() => navigation.navigate("LeadForm", { leadId: item.lead_id })}
            />
          )}
        />
      )}
    </AppScreen>
  );
}

const styles = StyleSheet.create({
  filters: { paddingHorizontal: 16, paddingTop: 14, paddingBottom: 2 },
  list: { padding: 16, paddingBottom: 40, gap: 12 },
  count: { color: colors.textMuted, fontSize: 13, fontWeight: "600" },
});
