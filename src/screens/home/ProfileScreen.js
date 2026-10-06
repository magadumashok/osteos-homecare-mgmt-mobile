import { useState } from "react";
import { ActivityIndicator, Alert, Image, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useDispatch, useSelector } from "react-redux";
import AppScreen from "../../components/AppScreen";
import { PrimaryButton } from "../../components/Form";
import { uploadProfileImage } from "../../services/authService";
import { setProfileImage } from "../../store/slices/authSlice";
import { thunkLogout } from "../../store/thunks/authThunks";
import { displayName, initials, roleLabel } from "../../utils/format";
import { choosePhoto } from "../../utils/photos";
import { colors, shadow } from "../../theme";

function Row({ icon, label, value }) {
  if (!value) return null;
  return (
    <View style={styles.row}>
      <Ionicons name={icon} size={20} color={colors.primary} />
      <View style={styles.rowText}>
        <Text style={styles.rowLabel}>{label}</Text>
        <Text style={styles.rowValue}>{value}</Text>
      </View>
    </View>
  );
}

export default function ProfileScreen({ navigation }) {
  const dispatch = useDispatch();
  const { user, homecare } = useSelector((s) => s.auth);
  const [uploading, setUploading] = useState(false);
  const name = displayName(user);

  const onChangePhoto = async () => {
    const photo = await choosePhoto("Profile photo");
    if (!photo) return;
    setUploading(true);
    try {
      const result = await uploadProfileImage(photo);
      dispatch(setProfileImage(result?.profile_image));
    } catch (e) {
      Alert.alert("Could not update photo", e.message);
    } finally {
      setUploading(false);
    }
  };

  const onLogout = () => {
    Alert.alert("Logout", "Are you sure you want to logout?", [
      { text: "Cancel", style: "cancel" },
      { text: "Logout", style: "destructive", onPress: () => dispatch(thunkLogout()) },
    ]);
  };

  const address = user?.permanent_address || user?.temporary_address;
  const addressText =
    typeof address === "object" && address
      ? [address.address, address.city, address.region, address.country].filter(Boolean).join(", ")
      : user?.address;

  return (
    <AppScreen title="My Profile">
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.hero}>
          <Pressable onPress={onChangePhoto} disabled={uploading} accessibilityLabel="Change profile photo">
            <View style={styles.avatar}>
              {user?.profile_image ? (
                <Image source={{ uri: user.profile_image }} style={styles.avatarImage} />
              ) : (
                <Text style={styles.avatarText}>{initials(name)}</Text>
              )}
              {uploading && (
                <View style={styles.avatarOverlay}>
                  <ActivityIndicator color={colors.onPrimary} />
                </View>
              )}
            </View>
            <View style={styles.cameraBadge}>
              <Ionicons name="camera" size={16} color={colors.onPrimary} />
            </View>
          </Pressable>
          <Text style={styles.name}>{name}</Text>
          {!!roleLabel(user) && <Text style={styles.role}>{roleLabel(user)}</Text>}
        </View>

        <View style={styles.card}>
          <Row icon="person-outline" label="Username" value={user?.username} />
          <Row icon="call-outline" label="Mobile" value={user?.mobile ? String(user.mobile) : null} />
          <Row icon="mail-outline" label="Email" value={user?.email} />
          <Row icon="business-outline" label="Homecare" value={homecare?.name} />
          <Row icon="ribbon-outline" label="Specialization" value={user?.specialization} />
          <Row icon="location-outline" label="Address" value={addressText} />
        </View>

        <View style={styles.actions}>
          <PrimaryButton
            title="Change password"
            icon="key-outline"
            variant="outline"
            onPress={() => navigation.navigate("ChangePassword")}
          />
          <PrimaryButton title="Logout" icon="log-out-outline" onPress={onLogout} />
        </View>
      </ScrollView>
    </AppScreen>
  );
}

const styles = StyleSheet.create({
  content: { padding: 20, paddingBottom: 40, gap: 20 },
  hero: { alignItems: "center", gap: 6 },
  avatar: {
    width: 104,
    height: 104,
    borderRadius: 52,
    backgroundColor: colors.primaryTint,
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
  avatarImage: { width: 104, height: 104 },
  avatarText: { color: colors.primary, fontSize: 34, fontWeight: "700" },
  avatarOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.35)",
    alignItems: "center",
    justifyContent: "center",
  },
  cameraBadge: {
    position: "absolute",
    right: 2,
    bottom: 2,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.primary,
    borderWidth: 2,
    borderColor: colors.surface,
    alignItems: "center",
    justifyContent: "center",
  },
  name: { fontSize: 20, fontWeight: "700", color: colors.text, marginTop: 6 },
  role: { fontSize: 14, color: colors.textMuted },
  card: { backgroundColor: colors.surface, borderRadius: 16, padding: 6, ...shadow },
  row: { flexDirection: "row", alignItems: "center", gap: 14, paddingHorizontal: 12, paddingVertical: 12 },
  rowText: { flex: 1 },
  rowLabel: { fontSize: 12, color: colors.textFaint },
  rowValue: { fontSize: 15, color: colors.text, marginTop: 2 },
  actions: { gap: 12 },
});
