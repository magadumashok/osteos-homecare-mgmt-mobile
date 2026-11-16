import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Image,
  Linking,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useDispatch, useSelector } from "react-redux";
import AppScreen from "../../components/AppScreen";
import { PrimaryButton } from "../../components/Form";
import ImageViewer from "../../components/ImageViewer";
import { myDocuments, uploadAadhaarCard, uploadProfileImage } from "../../services/authService";
import { setProfileImage } from "../../store/slices/authSlice";
import { thunkLogout } from "../../store/thunks/authThunks";
import { displayName, initials, roleLabel } from "../../utils/format";
import { choosePhoto, pickFiles, pickPhoto } from "../../utils/photos";

const isPdf = (url) => /\.pdf($|\?)/i.test(url || "");

/** Camera, gallery or a PDF (Android shows at most three buttons; tap outside to cancel). */
function chooseDocument(title) {
  return new Promise((resolve) => {
    Alert.alert(
      title,
      "Take a clear photo of the card, or choose a PDF.",
      [
        { text: "Camera", onPress: () => pickPhoto("camera").then(resolve, () => resolve(null)) },
        { text: "Gallery", onPress: () => pickPhoto("library").then(resolve, () => resolve(null)) },
        { text: "PDF", onPress: () => pickFiles({ multiple: false }).then((files) => resolve(files[0] || null), () => resolve(null)) },
      ],
      { cancelable: true, onDismiss: () => resolve(null) },
    );
  });
}

/** One of my documents: status, view, and upload / replace. */
function DocumentRow({ icon, label, url, busy, onUpload, onView }) {
  return (
    <View style={styles.row}>
      <Ionicons name={icon} size={20} color={colors.primary} />
      <View style={styles.rowText}>
        <Text style={styles.rowLabel}>{label}</Text>
        <Text style={[styles.rowValue, !url && styles.missing]}>{url ? "Uploaded" : "Not uploaded"}</Text>
      </View>
      {busy ? (
        <ActivityIndicator color={colors.primary} />
      ) : (
        <>
          {!!url && (
            <Pressable onPress={onView} hitSlop={8} accessibilityLabel={`View ${label}`}>
              <Text style={styles.link}>View</Text>
            </Pressable>
          )}
          <Pressable onPress={onUpload} hitSlop={8} accessibilityLabel={`Upload ${label}`}>
            <Text style={styles.link}>{url ? "Replace" : "Upload"}</Text>
          </Pressable>
        </>
      )}
    </View>
  );
}
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
  const [docs, setDocs] = useState({});
  const [aadhaarBusy, setAadhaarBusy] = useState(false);
  const [viewing, setViewing] = useState(null);
  const name = displayName(user);

  useEffect(() => {
    myDocuments()
      .then((d) => setDocs(d || {}))
      .catch(() => {});
  }, []);

  const view = (url, caption) => (isPdf(url) ? Linking.openURL(url) : setViewing({ uri: url, caption }));

  const onUploadAadhaar = async () => {
    const file = await chooseDocument("Aadhaar card");
    if (!file) return;
    setAadhaarBusy(true);
    try {
      setDocs((await uploadAadhaarCard(file)) || {});
      Alert.alert("Aadhaar card uploaded");
    } catch (e) {
      Alert.alert("Could not upload Aadhaar card", e.message);
    } finally {
      setAadhaarBusy(false);
    }
  };

  const onChangePhoto = async () => {
    const photo = await choosePhoto("Profile photo");
    if (!photo) return;
    setUploading(true);
    try {
      const result = await uploadProfileImage(photo);
      dispatch(setProfileImage(result?.profile_image));
      setDocs((d) => ({ ...d, profile_image: result?.profile_image }));
    } catch (e) {
      Alert.alert("Could not update photo", e.message);
    } finally {
      setUploading(false);
    }
  };

  const onLogout = () => {
    Alert.alert("Logout", "Are you sure you want to logout?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Logout",
        style: "destructive",
        onPress: () => dispatch(thunkLogout()),
      },
    ]);
  };

  const address = user?.permanent_address || user?.address;
  const addressText =
    typeof address === "object" && address
      ? [address.address, address.city, address.region, address.country]
          .filter(Boolean)
          .join(", ")
      : user?.address;

  return (
    <AppScreen title="My Profile">
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.hero}>
          <Pressable
            onPress={onChangePhoto}
            disabled={uploading}
            accessibilityLabel="Change profile photo"
          >
            <View style={styles.avatar}>
              {user?.profile_image ? (
                <Image
                  source={{ uri: user.profile_image }}
                  style={styles.avatarImage}
                />
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
          {!!roleLabel(user) && (
            <Text style={styles.role}>{roleLabel(user)}</Text>
          )}
        </View>

        <View style={styles.card}>
          <Row icon="person-outline" label="Username" value={user?.username} />
          <Row
            icon="call-outline"
            label="Mobile"
            value={user?.mobile ? String(user.mobile) : null}
          />
          <Row icon="mail-outline" label="Email" value={user?.email} />
          <Row
            icon="business-outline"
            label="Homecare"
            value={homecare?.name}
          />
          <Row
            icon="ribbon-outline"
            label="Specialization"
            value={user?.specialization}
          />
          <Row icon="briefcase-outline" label="Experience" value={user?.experience} />
          <Row icon="location-outline" label="Address" value={addressText} />
        </View>

        <Text style={styles.sectionTitle}>My documents</Text>
        <View style={styles.card}>
          <DocumentRow
            icon="person-circle-outline"
            label="Profile photo"
            url={user?.profile_image || docs.profile_image}
            busy={uploading}
            onUpload={onChangePhoto}
            onView={() => view(user?.profile_image || docs.profile_image, "Profile photo")}
          />
          <DocumentRow
            icon="card-outline"
            label="Aadhaar card"
            url={docs.aadhaar_card}
            busy={aadhaarBusy}
            onUpload={onUploadAadhaar}
            onView={() => view(docs.aadhaar_card, "Aadhaar card")}
          />
          {!!docs.police_verification && (
            <DocumentRow
              icon="shield-checkmark-outline"
              label="Police verification (added by admin)"
              url={docs.police_verification}
              onUpload={() => Alert.alert("Police verification", "Ask your admin to update this document.")}
              onView={() => view(docs.police_verification, "Police verification")}
            />
          )}
        </View>

        <View style={styles.actions}>
          <PrimaryButton
            title="Change password"
            icon="key-outline"
            variant="outline"
            onPress={() => navigation.navigate("ChangePassword")}
          />
          <PrimaryButton
            title="Logout"
            icon="log-out-outline"
            onPress={onLogout}
          />
        </View>
      </ScrollView>
      <ImageViewer uri={viewing?.uri} caption={viewing?.caption} onClose={() => setViewing(null)} />
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
  card: {
    backgroundColor: colors.surface,
    borderRadius: 16,
    padding: 6,
    ...shadow,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    paddingHorizontal: 12,
    paddingVertical: 12,
  },
  rowText: { flex: 1 },
  rowLabel: { fontSize: 12, color: colors.textFaint },
  rowValue: { fontSize: 15, color: colors.text, marginTop: 2 },
  actions: { gap: 12 },
  sectionTitle: { fontSize: 16, fontWeight: "700", color: colors.text, marginBottom: -8 },
  missing: { color: colors.textFaint },
  link: { color: colors.primary, fontSize: 14, fontWeight: "600", marginLeft: 14 },
});
