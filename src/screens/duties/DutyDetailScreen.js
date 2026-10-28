import { useCallback, useMemo, useState } from "react";
import { Alert, Image, Linking, Platform, ScrollView, StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useSelector } from "react-redux";
import ActionGrid from "../../components/ActionGrid";
import AppScreen from "../../components/AppScreen";
import { PrimaryButton } from "../../components/Form";
import NotAttendedModal from "../../components/NotAttendedModal";
import useDutyActions, { dutyStatus, isActionable, signInHint } from "../../hooks/useDutyActions";
import { patientActions } from "../../navigation/patientModules";
import { addPresencePhoto, getDuty } from "../../services/dutyService";
import { capitalize } from "../../utils/format";
import { currentPosition } from "../../utils/location";
import { pickPhoto } from "../../utils/photos";
import { longDate, shortDate, time12, timeRange, toIsoDate } from "../../utils/dates";
import { colors, shadow } from "../../theme";

function Row({ icon, label, value }) {
  if (!value) return null;
  return (
    <View style={styles.row}>
      <Ionicons name={icon} size={18} color={colors.primary} />
      <View style={styles.flex}>
        <Text style={styles.rowLabel}>{label}</Text>
        <Text style={styles.rowValue}>{value}</Text>
      </View>
    </View>
  );
}

/** One visit: attendance buttons plus everything to record for the patient. */
export default function DutyDetailScreen({ navigation, route }) {
  const { permissions, user } = useSelector((s) => s.auth);
  const [duty, setDuty] = useState(route.params.duty);
  const [skipping, setSkipping] = useState(false);
  const [uploading, setUploading] = useState(false);

  // GET duties/{id} needs schedules.view; keep the list's copy if it is refused.
  const reload = useCallback(async () => {
    try {
      const fresh = await getDuty(duty._id);
      setDuty((current) => ({ ...current, ...fresh }));
    } catch {
      // keep what we have
    }
  }, [duty._id]);

  const { busyId, confirmSignIn, confirmSignOut, notAttended } = useDutyActions((patch) => {
    setDuty((current) => ({ ...current, ...patch }));
    reload();
  });
  const status = dutyStatus(duty);
  const actionable = isActionable(duty) && status.key !== "missed";
  const busy = busyId === duty._id;

  const actions = useMemo(
    () =>
      patientActions({
        permissions,
        navigation,
        username: duty.patient_id,
        name: duty.patient_name,
        duty,
      }),
    [permissions, navigation, duty],
  );

  // Proof of the visit: while signed in to a visit, or on any day of a 24-hour stay (server checks too).
  const own = duty.staff_id === user?.username;
  const today = toIsoDate();
  const canPhoto =
    own &&
    !duty.not_attended &&
    (duty.live_in
      ? duty.date <= today && (duty.end_date || duty.date) >= today && !(duty.skipped_dates || []).includes(today)
      : duty.sign_in && !duty.sign_out);
  const photos = Array.isArray(duty.presence_photos) ? duty.presence_photos : [];

  const takePhoto = async () => {
    // Camera only: the photo has to be taken there and then, not picked from the gallery.
    const photo = await pickPhoto("camera");
    if (!photo) return;
    setUploading(true);
    try {
      const entry = await addPresencePhoto(duty._id, photo, await currentPosition());
      setDuty((current) => ({ ...current, presence_photos: [...(current.presence_photos || []), entry] }));
      Alert.alert("Photo saved", "Your coordinator can see it with this duty.");
    } catch (e) {
      Alert.alert("Could not save photo", e.message);
    } finally {
      setUploading(false);
    }
  };

  const openMaps = () => {
    const query = encodeURIComponent(duty.address);
    Linking.openURL(Platform.OS === "ios" ? `maps:0,0?q=${query}` : `geo:0,0?q=${query}`).catch(() =>
      Linking.openURL(`https://www.google.com/maps/search/?api=1&query=${query}`),
    );
  };

  const dateText =
    duty.end_date && duty.end_date !== duty.date ? `${longDate(duty.date)} → ${longDate(duty.end_date)}` : longDate(duty.date);

  return (
    <AppScreen title={duty.patient_name || "Duty"} subtitle={duty.live_in ? "24-hour care" : timeRange(duty.start_time, duty.end_time)}>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.card}>
          <View style={[styles.chip, { backgroundColor: status.bg }]}>
            <Text style={[styles.chipText, { color: status.color }]}>{status.label}</Text>
          </View>
          <Row icon="calendar-outline" label={duty.live_in ? "Stay" : "Date"} value={dateText} />
          <Row icon="time-outline" label="Time" value={duty.live_in ? "Round the clock" : timeRange(duty.start_time, duty.end_time)} />
          <Row icon="list-outline" label="Care tasks" value={duty.live_in ? (duty.care_tasks || []).join(", ") : null} />
          <Row icon="briefcase-outline" label="Role" value={capitalize(duty.role)} />
          <Row icon="pricetag-outline" label="Service package" value={duty.service_package} />
          <Row icon="car-outline" label="Driver" value={duty.driver} />
          <Row icon="log-in-outline" label="Signed in" value={duty.sign_in ? time12(duty.signin_time) : null} />
          <Row icon="log-out-outline" label="Signed out" value={duty.sign_out ? time12(duty.signout_time) : null} />
          <Row icon="alert-circle-outline" label="Not attended" value={duty.not_attended ? duty.not_attended_reason || "Yes" : null} />
          {!!duty.address && (
            <>
              <Row icon="location-outline" label="Address" value={duty.address} />
              <PrimaryButton title="Directions" icon="navigate-outline" variant="outline" onPress={openMaps} />
            </>
          )}
        </View>

        {actionable && status.key === "scheduled" && (
          <>
            <View style={styles.buttons}>
              <PrimaryButton title="Can't attend" variant="outline" onPress={() => setSkipping(true)} style={styles.flex} />
              <PrimaryButton title="Sign in" icon="log-in-outline" loading={busy} onPress={() => confirmSignIn(duty)} style={styles.flex} />
            </View>
            <Text style={styles.hint}>{signInHint(duty)}</Text>
          </>
        )}

        {canPhoto && (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Photo with patient</Text>
            <Text style={styles.hint}>
              Take a photo of yourself with the patient at their home to confirm the visit. Your location is saved with it.
            </Text>
            {photos.length > 0 && (
              <ScrollView horizontal contentContainerStyle={styles.photos} showsHorizontalScrollIndicator={false}>
                {photos.map((p) => (
                  <View key={p.url} style={styles.photoBox}>
                    <Image source={{ uri: p.url }} style={styles.photo} />
                    <Text style={styles.photoTime}>{[shortDate(p.date), time12(p.time)].join(" · ")}</Text>
                  </View>
                ))}
              </ScrollView>
            )}
            <PrimaryButton
              title={photos.some((p) => p.date === toIsoDate()) ? "Take another photo" : "Take photo with patient"}
              icon="camera-outline"
              variant="outline"
              loading={uploading}
              onPress={takePhoto}
            />
          </View>
        )}
        {duty.live_in && (
          <PrimaryButton
            title="Daily care update"
            icon="clipboard-outline"
            onPress={() => navigation.navigate("CareLog", { duty, date: route.params?.date })}
          />
        )}
        {actionable && status.key === "active" && (
          <PrimaryButton title="Sign out" icon="log-out-outline" loading={busy} onPress={() => confirmSignOut(duty)} />
        )}

        <Text style={styles.sectionTitle}>Patient</Text>
        <ActionGrid
          items={[
            {
              id: "record",
              title: "Patient Record",
              subtitle: "Details and history",
              icon: "person",
              palette: "teal",
              onPress: () => navigation.navigate("PatientHub", { username: duty.patient_id, name: duty.patient_name }),
            },
            ...actions,
          ]}
        />
      </ScrollView>

      <NotAttendedModal
        visible={skipping}
        onClose={() => setSkipping(false)}
        onSubmit={async (reason) => {
          setSkipping(false);
          if (await notAttended(duty, reason)) navigation.goBack();
        }}
      />
    </AppScreen>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  content: { padding: 20, paddingBottom: 40, gap: 16 },
  card: { backgroundColor: colors.surface, borderRadius: 16, padding: 16, gap: 12, ...shadow },
  chip: { alignSelf: "flex-start", borderRadius: 20, paddingHorizontal: 12, paddingVertical: 4 },
  chipText: { fontSize: 12, fontWeight: "700" },
  row: { flexDirection: "row", alignItems: "flex-start", gap: 12 },
  rowLabel: { fontSize: 12, color: colors.textFaint },
  rowValue: { fontSize: 15, color: colors.text, marginTop: 1 },
  buttons: { flexDirection: "row", gap: 12 },
  hint: { fontSize: 12, color: colors.textMuted, textAlign: "center" },
  cardTitle: { fontSize: 16, fontWeight: "700", color: colors.text },
  photos: { gap: 10 },
  photoBox: { width: 110, gap: 4 },
  photo: { width: 110, height: 110, borderRadius: 12, backgroundColor: colors.border },
  photoTime: { fontSize: 11, color: colors.textMuted, textAlign: "center" },
  sectionTitle: { fontSize: 20, fontWeight: "700", color: colors.text, marginTop: 4 },
});
