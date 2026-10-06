import { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Image,
  Linking,
  Modal,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useSelector } from "react-redux";
import AppScreen, { HeaderIconButton } from "../../components/AppScreen";
import { PrimaryButton } from "../../components/Form";
import ImageViewer from "../../components/ImageViewer";
import Segmented from "../../components/Segmented";
import { EmptyState, ErrorState, LoadingView } from "../../components/States";
import {
  deleteDocument,
  getDocuments,
  requestMissingDocument,
  uploadDocuments,
  uploadSpecimens,
} from "../../services/patientService";
import { choosePhoto, pickFiles } from "../../utils/photos";
import { can } from "../../utils/permissions";
import { colors, shadow } from "../../theme";

const TABS = [
  { value: "images", label: "Reports", icon: "document-text-outline" },
  { value: "emirates_id", label: "ID", icon: "card-outline" },
  { value: "specimen_images", label: "Specimens", icon: "flask-outline" },
];

const IMAGE_EXT = /\.(jpe?g|png|gif|webp|heic)(\?|$)/i;

// Reports and IDs are URL strings; specimens are { image_path, lab_details } (older ones may be strings).
const normalise = (field, entry) =>
  typeof entry === "string" ? { url: entry, caption: null } : { url: entry?.image_path, caption: entry?.lab_details || null };

const fileName = (url) => decodeURIComponent(String(url).split("/").pop().split("?")[0]);

/** Reports, ID copies and specimen photos (the old app's upload/view document screens). */
export default function DocumentsScreen({ route }) {
  const { username, name, dutyId } = route.params;
  const permissions = useSelector((s) => s.auth.permissions);
  const canUpload = can(permissions, "documents.upload");
  const canDelete = can(permissions, "documents.delete");

  const [field, setField] = useState("images");
  const [docs, setDocs] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [viewing, setViewing] = useState(null);
  const [specimenFiles, setSpecimenFiles] = useState(null);
  const [labDetails, setLabDetails] = useState("");
  const [missingOpen, setMissingOpen] = useState(false);
  const [missingText, setMissingText] = useState("");

  const load = useCallback(
    async (mode = "load") => {
      mode === "refresh" ? setRefreshing(true) : setLoading(true);
      setError(null);
      try {
        setDocs(await getDocuments(username));
      } catch (e) {
        setError(e.message);
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [username],
  );

  useEffect(() => {
    load();
  }, [load]);

  const items = (Array.isArray(docs?.[field]) ? docs[field] : [])
    .map((entry) => normalise(field, entry))
    .filter((item) => item.url)
    .reverse();

  const upload = async (files) => {
    if (!files?.length) return;
    if (field === "specimen_images") {
      setSpecimenFiles(files);
      return;
    }
    setUploading(true);
    try {
      await uploadDocuments(username, field, files);
      await load("refresh");
    } catch (e) {
      Alert.alert("Upload failed", e.message);
    } finally {
      setUploading(false);
    }
  };

  const submitSpecimens = async () => {
    const files = specimenFiles;
    setSpecimenFiles(null);
    setUploading(true);
    try {
      await uploadSpecimens(username, files, { labDetails: labDetails.trim(), dutyId });
      setLabDetails("");
      await load("refresh");
    } catch (e) {
      Alert.alert("Upload failed", e.message);
    } finally {
      setUploading(false);
    }
  };

  const addPhoto = async () => {
    const photo = await choosePhoto(field === "specimen_images" ? "Specimen photo" : "Upload photo");
    if (photo) upload([photo]);
  };

  // Specimens are photos; reports and IDs can also be PDFs. (Android alerts hold three buttons.)
  const onAdd = () =>
    field === "specimen_images"
      ? addPhoto()
      : Alert.alert("Upload", undefined, [
          { text: "Photo", onPress: addPhoto },
          { text: "PDF / file", onPress: async () => upload(await pickFiles()) },
          { text: "Cancel", style: "cancel" },
        ]);

  const open = (item) => {
    if (IMAGE_EXT.test(item.url)) setViewing(item);
    else Linking.openURL(item.url).catch(() => Alert.alert("Cannot open", "No app can open this file."));
  };

  const remove = (item) =>
    Alert.alert("Remove document", `Remove ${fileName(item.url)} from this patient's file?`, [
      { text: "Cancel", style: "cancel" },
      {
        text: "Remove",
        style: "destructive",
        onPress: async () => {
          try {
            await deleteDocument(username, field, item.url);
            await load("refresh");
          } catch (e) {
            Alert.alert("Could not remove", e.message);
          }
        },
      },
    ]);

  const sendMissing = async () => {
    if (!missingText.trim()) return;
    try {
      const result = await requestMissingDocument(username, missingText.trim());
      setMissingOpen(false);
      setMissingText("");
      Alert.alert("Request sent", result);
    } catch (e) {
      Alert.alert("Could not send", e.message);
    }
  };

  return (
    <AppScreen
      title="Documents"
      subtitle={name || username}
      right={<HeaderIconButton icon="mail-unread-outline" label="Request missing document" onPress={() => setMissingOpen(true)} />}
    >
      <Segmented style={styles.tabs} options={TABS} value={field} onChange={setField} />

      {loading ? (
        <LoadingView label="Loading documents…" />
      ) : error ? (
        <ErrorState message={error} onRetry={() => load()} />
      ) : (
        <FlatList
          data={items}
          key={field}
          numColumns={2}
          keyExtractor={(item, index) => `${item.url}-${index}`}
          columnWrapperStyle={styles.column}
          contentContainerStyle={styles.list}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => load("refresh")} colors={[colors.primary]} />}
          ListEmptyComponent={<EmptyState icon="folder-open-outline" title="Nothing uploaded yet" />}
          renderItem={({ item }) => {
            const isImage = IMAGE_EXT.test(item.url);
            return (
              <Pressable onPress={() => open(item)} style={styles.tile}>
                {isImage ? (
                  <Image source={{ uri: item.url }} style={styles.thumb} />
                ) : (
                  <View style={[styles.thumb, styles.fileThumb]}>
                    <Ionicons name="document-attach-outline" size={40} color={colors.primary} />
                  </View>
                )}
                <Text style={styles.tileName} numberOfLines={2}>
                  {item.caption || fileName(item.url)}
                </Text>
                {canDelete && field !== "specimen_images" && (
                  <Pressable onPress={() => remove(item)} style={styles.deleteButton} hitSlop={8} accessibilityLabel="Remove document">
                    <Ionicons name="trash-outline" size={16} color={colors.danger} />
                  </Pressable>
                )}
              </Pressable>
            );
          }}
        />
      )}

      {canUpload && (
        <View style={styles.footer}>
          <PrimaryButton
            title={field === "specimen_images" ? "Add specimen photos" : field === "emirates_id" ? "Upload ID" : "Upload report"}
            icon="cloud-upload-outline"
            loading={uploading}
            onPress={onAdd}
          />
        </View>
      )}

      <ImageViewer uri={viewing?.url} caption={viewing?.caption} onClose={() => setViewing(null)} />

      <Modal visible={!!specimenFiles} transparent animationType="slide" onRequestClose={() => setSpecimenFiles(null)}>
        <Pressable style={styles.backdrop} onPress={() => setSpecimenFiles(null)} />
        <View style={styles.sheet}>
          <Text style={styles.sheetTitle}>Lab details</Text>
          <Text style={styles.sheetHint}>Which lab, which test — saved with the photo.</Text>
          <TextInput
            value={labDetails}
            onChangeText={setLabDetails}
            placeholder="e.g. CBC, sent to City Lab"
            placeholderTextColor={colors.textFaint}
            style={styles.sheetInput}
            multiline
            maxLength={1000}
          />
          <View style={styles.sheetButtons}>
            <PrimaryButton title="Cancel" variant="outline" onPress={() => setSpecimenFiles(null)} style={styles.flex} />
            <PrimaryButton title="Upload" onPress={submitSpecimens} style={styles.flex} />
          </View>
        </View>
      </Modal>

      <Modal visible={missingOpen} transparent animationType="slide" onRequestClose={() => setMissingOpen(false)}>
        <Pressable style={styles.backdrop} onPress={() => setMissingOpen(false)} />
        <View style={styles.sheet}>
          <Text style={styles.sheetTitle}>Request a missing document</Text>
          <Text style={styles.sheetHint}>The nurses will be emailed this message.</Text>
          <TextInput
            value={missingText}
            onChangeText={setMissingText}
            placeholder="Which document is missing?"
            placeholderTextColor={colors.textFaint}
            style={styles.sheetInput}
            multiline
            maxLength={2000}
          />
          <View style={styles.sheetButtons}>
            <PrimaryButton title="Cancel" variant="outline" onPress={() => setMissingOpen(false)} style={styles.flex} />
            <PrimaryButton title="Send" icon="send" onPress={sendMissing} style={styles.flex} />
          </View>
        </View>
      </Modal>

      {uploading && (
        <View style={styles.uploadingOverlay} pointerEvents="none">
          <ActivityIndicator color={colors.onPrimary} />
          <Text style={styles.uploadingText}>Uploading…</Text>
        </View>
      )}
    </AppScreen>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  tabs: { margin: 16, marginBottom: 0 },
  list: { padding: 16, paddingBottom: 24, gap: 12 },
  column: { gap: 12 },
  tile: { flex: 1, maxWidth: "50%", backgroundColor: colors.surface, borderRadius: 14, padding: 8, gap: 6, ...shadow },
  thumb: { width: "100%", aspectRatio: 1, borderRadius: 10, backgroundColor: colors.primarySoft },
  fileThumb: { alignItems: "center", justifyContent: "center" },
  tileName: { fontSize: 12, color: colors.textBody },
  deleteButton: {
    position: "absolute",
    top: 12,
    right: 12,
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: colors.surface,
    alignItems: "center",
    justifyContent: "center",
  },
  footer: { padding: 16, backgroundColor: colors.surface, borderTopWidth: 1, borderTopColor: colors.borderSoft },
  backdrop: { flex: 1, backgroundColor: "rgba(0,0,0,0.35)" },
  sheet: { backgroundColor: colors.surface, borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 20, paddingBottom: 34, gap: 12 },
  sheetTitle: { fontSize: 18, fontWeight: "700", color: colors.text },
  sheetHint: { fontSize: 13, color: colors.textMuted, marginTop: -6 },
  sheetInput: {
    minHeight: 90,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    padding: 12,
    fontSize: 15,
    color: colors.text,
    textAlignVertical: "top",
  },
  sheetButtons: { flexDirection: "row", gap: 12 },
  uploadingOverlay: {
    position: "absolute",
    bottom: 100,
    alignSelf: "center",
    flexDirection: "row",
    gap: 10,
    backgroundColor: "rgba(0,0,0,0.7)",
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  uploadingText: { color: colors.onPrimary, fontWeight: "600" },
});
