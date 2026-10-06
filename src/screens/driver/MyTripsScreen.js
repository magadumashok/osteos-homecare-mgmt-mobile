import { useCallback, useState } from "react";
import { ActivityIndicator, Alert, FlatList, Linking, Platform, Pressable, RefreshControl, StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect } from "@react-navigation/native";
import AppScreen from "../../components/AppScreen";
import DateStrip from "../../components/DateStrip";
import { EmptyState, ErrorState, LoadingView } from "../../components/States";
import { myTrips, recordDrop, recordPickup } from "../../services/driverService";
import { capitalize } from "../../utils/format";
import { nowTime, time12, toIsoDate } from "../../utils/dates";
import { currentPosition } from "../../utils/location";
import { colors, shadow } from "../../theme";

function tripStatus(trip) {
  if (trip.drop) return { key: "done", label: "Dropped", color: "#2e7d32", bg: "#e8f5e9" };
  if (trip.pickup) return { key: "active", label: "Picked up", color: "#e65100", bg: "#fff3e0" };
  return { key: "scheduled", label: "Scheduled", color: "#1565c0", bg: "#e3f2fd" };
}

/** Old "Driver schedule": the day's trips with pickup and drop (with GPS). */
export default function MyTripsScreen() {
  const [date, setDate] = useState(toIsoDate());
  const [trips, setTrips] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);
  const [busyId, setBusyId] = useState(null);

  const load = useCallback(
    async (mode = "load") => {
      mode === "refresh" ? setRefreshing(true) : setLoading(true);
      setError(null);
      try {
        setTrips((await myTrips(date)) || []);
      } catch (e) {
        setError(e.message);
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [date],
  );

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  const record = (trip, kind) =>
    Alert.alert(kind === "pickup" ? "Record pickup" : "Record drop", `${kind === "pickup" ? "Picked up" : "Dropped"} ${trip.staff_name || "staff"} now?`, [
      { text: "Cancel", style: "cancel" },
      {
        text: "Yes",
        onPress: async () => {
          setBusyId(trip._id);
          try {
            const args = { time: nowTime(), position: await currentPosition() };
            await (kind === "pickup" ? recordPickup(trip._id, args) : recordDrop(trip._id, args));
            await load("refresh");
          } catch (e) {
            Alert.alert("Could not update trip", e.message);
          } finally {
            setBusyId(null);
          }
        },
      },
    ]);

  const openMaps = (address) => {
    const query = encodeURIComponent(address);
    Linking.openURL(Platform.OS === "ios" ? `maps:0,0?q=${query}` : `geo:0,0?q=${query}`).catch(() =>
      Linking.openURL(`https://www.google.com/maps/search/?api=1&query=${query}`),
    );
  };

  return (
    <AppScreen title="My Trips" headerExtra={<DateStrip date={date} onChange={setDate} />}>
      {loading ? (
        <LoadingView label="Loading trips…" />
      ) : error ? (
        <ErrorState message={error} onRetry={() => load()} />
      ) : (
        <FlatList
          data={trips}
          keyExtractor={(item) => item._id}
          contentContainerStyle={styles.list}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => load("refresh")} colors={[colors.primary]} />}
          ListEmptyComponent={<EmptyState icon="car-outline" title="No trips" subtitle="Nothing is booked for you on this day." />}
          renderItem={({ item }) => {
            const status = tripStatus(item);
            const busy = busyId === item._id;
            const today = date === toIsoDate();
            return (
              <View style={styles.card}>
                <View style={styles.header}>
                  <Text style={styles.time}>
                    {time12(item.start_time)} – {time12(item.end_time)}
                  </Text>
                  <View style={[styles.chip, { backgroundColor: status.bg }]}>
                    <Text style={[styles.chipText, { color: status.color }]}>{status.label}</Text>
                  </View>
                </View>
                <Text style={styles.staff}>
                  {item.staff_name || item.staff_id}
                  {item.staff_role ? <Text style={styles.meta}>  {capitalize(item.staff_role)}</Text> : null}
                </Text>
                {!!item.address && (
                  <Pressable onPress={() => openMaps(item.address)} style={styles.addressRow}>
                    <Ionicons name="navigate-outline" size={16} color={colors.primary} />
                    <Text style={styles.address}>{item.address}</Text>
                  </Pressable>
                )}
                {(item.pickup || item.drop) && (
                  <Text style={styles.meta}>
                    {[item.pickup && `Pickup ${time12(item.pickup_time)}`, item.drop && `Drop ${time12(item.drop_time)}`].filter(Boolean).join(" · ")}
                  </Text>
                )}
                {today && status.key !== "done" && (
                  <Pressable
                    disabled={busy}
                    onPress={() => record(item, status.key === "scheduled" ? "pickup" : "drop")}
                    style={[styles.action, status.key === "active" && styles.actionDrop]}
                  >
                    {busy ? (
                      <ActivityIndicator color={colors.onPrimary} />
                    ) : (
                      <Text style={styles.actionText}>{status.key === "scheduled" ? "Picked up" : "Dropped"}</Text>
                    )}
                  </Pressable>
                )}
              </View>
            );
          }}
        />
      )}
    </AppScreen>
  );
}

const styles = StyleSheet.create({
  list: { padding: 16, paddingBottom: 40, gap: 12 },
  card: { backgroundColor: colors.surface, borderRadius: 16, padding: 14, gap: 8, ...shadow },
  header: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  time: { fontSize: 15, fontWeight: "700", color: colors.primary },
  chip: { borderRadius: 20, paddingHorizontal: 10, paddingVertical: 3 },
  chipText: { fontSize: 11, fontWeight: "700" },
  staff: { fontSize: 16, fontWeight: "700", color: colors.text },
  meta: { fontSize: 12, color: colors.textMuted, fontWeight: "400" },
  addressRow: { flexDirection: "row", gap: 6, alignItems: "flex-start" },
  address: { fontSize: 13, color: colors.primary, flex: 1 },
  action: { height: 44, borderRadius: 22, backgroundColor: colors.primary, alignItems: "center", justifyContent: "center", marginTop: 4 },
  actionDrop: { backgroundColor: "#e65100" },
  actionText: { color: colors.onPrimary, fontSize: 15, fontWeight: "700" },
});
