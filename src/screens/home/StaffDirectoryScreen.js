import { useMemo, useState } from "react";
import { Alert, FlatList, Linking, Pressable, RefreshControl, StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import AppScreen from "../../components/AppScreen";
import ListCard from "../../components/ListCard";
import SearchBar from "../../components/SearchBar";
import { EmptyState, ErrorState, LoadingView } from "../../components/States";
import useApi from "../../hooks/useApi";
import { useSelector } from "react-redux";
import { startVideoCall, staffDirectory } from "../../services/staffService";
import { can } from "../../utils/permissions";
import { joinRoom, newRoomUrl } from "../../utils/videoCall";
import { displayName, roleLabel } from "../../utils/format";
import { colors } from "../../theme";

/** The old app's "Call option" screens: phone any colleague. */
export default function StaffDirectoryScreen() {
  const { data, loading, refreshing, error, reload, refresh } = useApi(staffDirectory);
  const [query, setQuery] = useState("");
  const canVideo = can(useSelector((s) => s.auth.permissions), "video.call");

  const staff = useMemo(() => {
    const q = query.trim().toLowerCase();
    return (data || []).filter((member) =>
      `${displayName(member)} ${roleLabel(member)} ${member.mobile || ""}`.toLowerCase().includes(q),
    );
  }, [data, query]);

  const call = (member) => {
    const number = member.user_mobile || member.mobile;
    if (!number) {
      Alert.alert("No number", `${displayName(member)} has no mobile number on file.`);
      return;
    }
    Linking.openURL(`tel:${number}`).catch(() => Alert.alert("Cannot place call", "Calling is not available on this device."));
  };

  const videoCall = (member) =>
    Alert.alert("Video call", `Ring ${displayName(member)} into a video call?`, [
      { text: "Cancel", style: "cancel" },
      {
        text: "Call",
        onPress: async () => {
          const room = newRoomUrl();
          try {
            await startVideoCall(member.username, room);
            joinRoom(room);
          } catch (e) {
            Alert.alert("Could not call", e.message);
          }
        },
      },
    ]);

  return (
    <AppScreen
      title="Call Staff"
      headerExtra={<SearchBar value={query} onChangeText={setQuery} placeholder="Search by name or role..." />}
    >
      {loading ? (
        <LoadingView label="Loading staff…" />
      ) : error ? (
        <ErrorState message={error} onRetry={reload} />
      ) : (
        <FlatList
          data={staff}
          keyExtractor={(item) => item.username || item._id}
          contentContainerStyle={styles.list}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} colors={[colors.primary]} />}
          ListHeaderComponent={<Text style={styles.count}>{staff.length} colleagues</Text>}
          ListEmptyComponent={<EmptyState icon="people-outline" title="No staff found" />}
          renderItem={({ item }) => (
            <ListCard
              title={displayName(item)}
              meta={[roleLabel(item), item.user_mobile || item.mobile]}
              imageUri={item.profile_image}
              trailing={
                <View style={styles.buttons}>
                  {canVideo && (
                    <Pressable
                      onPress={() => videoCall(item)}
                      style={({ pressed }) => [styles.callButton, styles.videoButton, pressed && { opacity: 0.7 }]}
                      accessibilityLabel={`Video call ${displayName(item)}`}
                    >
                      <Ionicons name="videocam" size={20} color={colors.primary} />
                    </Pressable>
                  )}
                  <Pressable
                    onPress={() => call(item)}
                    style={({ pressed }) => [styles.callButton, pressed && { opacity: 0.7 }]}
                    accessibilityLabel={`Call ${displayName(item)}`}
                  >
                    <Ionicons name="call" size={20} color={colors.onPrimary} />
                  </Pressable>
                </View>
              }
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
  buttons: { flexDirection: "row", gap: 8 },
  videoButton: { backgroundColor: colors.primarySoft },
  callButton: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: colors.primary,
    alignItems: "center",
    justifyContent: "center",
  },
});
