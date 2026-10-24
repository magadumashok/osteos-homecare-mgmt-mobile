import { useCallback, useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Image,
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
import { useSafeAreaInsets } from "react-native-safe-area-context";
import {
  RecordingPresets,
  requestRecordingPermissionsAsync,
  setAudioModeAsync,
  useAudioPlayer,
  useAudioPlayerStatus,
  useAudioRecorder,
  useAudioRecorderState,
} from "expo-audio";
import { File } from "expo-file-system";
import AppScreen from "../../components/AppScreen";
import useKeyboardOverlap from "../../hooks/useKeyboardOverlap";
import { EmptyState, ErrorState, LoadingView } from "../../components/States";
import { addAudioNote, addImageNote, addTextNote, listNotes } from "../../services/patientService";
import { capitalize, formatDateTime } from "../../utils/format";
import { choosePhoto } from "../../utils/photos";
import { can } from "../../utils/permissions";
import { colors, shadow } from "../../theme";

// The old app's doctor, nurse and physio notes screens all saved staff notes.
const KIND = "staff";

const TABS = [
  { type: "text_notes", label: "Text", icon: "document-text-outline" },
  { type: "image_notes", label: "Photos", icon: "image-outline" },
  { type: "audio_notes", label: "Audio", icon: "mic-outline" },
];

const author = (note) =>
  [note.nurse_name || note.staff_name, capitalize(note.role_name || note.staff_role)].filter(Boolean).join(" · ");

const formatSeconds = (s) => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, "0")}`;

export default function NotesScreen({ route }) {
  const { username, name } = route.params;
  const canWrite = can(useSelector((s) => s.auth.permissions), "notes.write");

  const [tab, setTab] = useState(TABS[0].type);
  const [notes, setNotes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);
  const [saving, setSaving] = useState(false);
  const [text, setText] = useState("");
  const [viewing, setViewing] = useState(null);
  const insets = useSafeAreaInsets();
  const [bodyRef, keyboardOverlap] = useKeyboardOverlap();

  const load = useCallback(
    async (mode = "load") => {
      mode === "refresh" ? setRefreshing(true) : setLoading(true);
      setError(null);
      try {
        setNotes((await listNotes(username, KIND, tab)) || []);
      } catch (e) {
        setError(e.message);
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [username, tab],
  );

  useEffect(() => {
    load();
  }, [load]);

  const save = async (request) => {
    setSaving(true);
    try {
      await request();
      await load("refresh");
      return true;
    } catch (e) {
      Alert.alert("Could not save note", e.message);
      return false;
    } finally {
      setSaving(false);
    }
  };

  const onSaveText = async () => {
    if (!text.trim()) return;
    if (await save(() => addTextNote(username, KIND, text.trim()))) setText("");
  };

  const onAddPhoto = async () => {
    const photo = await choosePhoto("Photo note");
    if (photo) save(() => addImageNote(username, KIND, photo));
  };

  const onSaveAudio = (base64) => save(() => addAudioNote(username, KIND, base64));

  return (
    <AppScreen title="Notes" subtitle={name || username}>
      <View ref={bodyRef} style={[styles.flex, styles.column]}>
        <View style={styles.tabs}>
          {TABS.map((t) => {
            const active = t.type === tab;
            return (
              <Pressable
                key={t.type}
                onPress={() => {
                  if (active) return;
                  // Drop the other tab's notes so they never render with this tab's layout.
                  setNotes([]);
                  setLoading(true);
                  setTab(t.type);
                }}
                style={[styles.tab, active && styles.tabActive]}
                accessibilityRole="tab"
                accessibilityState={{ selected: active }}
              >
                <Ionicons name={t.icon} size={16} color={active ? colors.onPrimary : colors.primary} />
                <Text style={[styles.tabText, active && styles.tabTextActive]}>{t.label}</Text>
              </Pressable>
            );
          })}
        </View>

        {loading ? (
          <LoadingView label="Loading notes…" />
        ) : error ? (
          <ErrorState message={error} onRetry={() => load()} />
        ) : tab === "audio_notes" ? (
          <AudioNoteList notes={notes} refreshing={refreshing} onRefresh={() => load("refresh")} />
        ) : (
          <FlatList
            data={notes}
            keyExtractor={(item, index) => item._id || item.id || String(index)}
            contentContainerStyle={styles.list}
            refreshControl={
              <RefreshControl refreshing={refreshing} onRefresh={() => load("refresh")} colors={[colors.primary]} />
            }
            ListEmptyComponent={<EmptyState icon="document-text-outline" title="No notes yet" />}
            renderItem={({ item }) => (
              <View style={styles.note}>
                <View style={styles.noteHeader}>
                  <Text style={styles.noteAuthor}>{author(item) || "Staff"}</Text>
                  <Text style={styles.noteDate}>{formatDateTime(item.date, item.time)}</Text>
                </View>
                {tab === "image_notes" ? (
                  <Pressable onPress={() => setViewing(item.image_notes)} accessibilityLabel="Open photo">
                    <Image source={{ uri: item.image_notes }} style={styles.noteImage} resizeMode="cover" />
                  </Pressable>
                ) : (
                  <Text style={styles.noteText}>{item.notes}</Text>
                )}
              </View>
            )}
          />
        )}

        {canWrite && tab === "text_notes" && (
          <View style={styles.composer}>
            <TextInput
              value={text}
              onChangeText={setText}
              placeholder="Write a note…"
              placeholderTextColor={colors.textFaint}
              style={styles.composerInput}
              multiline
              editable={!saving}
            />
            <Pressable
              onPress={onSaveText}
              disabled={saving || !text.trim()}
              style={[styles.sendButton, (saving || !text.trim()) && styles.disabled]}
              accessibilityLabel="Save note"
            >
              {saving ? <ActivityIndicator color={colors.onPrimary} /> : <Ionicons name="send" size={20} color={colors.onPrimary} />}
            </Pressable>
          </View>
        )}

        {canWrite && tab === "image_notes" && (
          <View style={styles.composer}>
            <Pressable onPress={onAddPhoto} disabled={saving} style={[styles.wideButton, saving && styles.disabled]}>
              {saving ? (
                <ActivityIndicator color={colors.onPrimary} />
              ) : (
                <>
                  <Ionicons name="camera" size={20} color={colors.onPrimary} />
                  <Text style={styles.wideButtonText}>Add photo note</Text>
                </>
              )}
            </Pressable>
          </View>
        )}

        {canWrite && tab === "audio_notes" && <AudioRecorderBar saving={saving} onSave={onSaveAudio} />}

        {/* Keeps the note bar above the keyboard, or above the system navigation bar. */}
        <View style={{ height: keyboardOverlap || insets.bottom, backgroundColor: canWrite ? colors.surface : "transparent" }} />
      </View>

      <Modal visible={!!viewing} transparent animationType="fade" onRequestClose={() => setViewing(null)}>
        <Pressable style={styles.viewer} onPress={() => setViewing(null)}>
          {!!viewing && <Image source={{ uri: viewing }} style={styles.viewerImage} resizeMode="contain" />}
          <Ionicons name="close" size={30} color="#fff" style={[styles.viewerClose, { top: insets.top + 12 }]} />
        </Pressable>
      </Modal>
    </AppScreen>
  );
}

/** One shared player: tapping a note plays it, tapping again stops. */
function AudioNoteList({ notes, refreshing, onRefresh }) {
  const player = useAudioPlayer(null);
  const status = useAudioPlayerStatus(player);
  const [current, setCurrent] = useState(null);

  useEffect(() => {
    if (status.didJustFinish) setCurrent(null);
  }, [status.didJustFinish]);

  const toggle = async (uri) => {
    if (current === uri && status.playing) {
      player.pause();
      setCurrent(null);
      return;
    }
    await setAudioModeAsync({ playsInSilentMode: true, allowsRecording: false });
    player.replace({ uri });
    player.play();
    setCurrent(uri);
  };

  return (
    <FlatList
      data={notes}
      keyExtractor={(item, index) => item._id || item.id || String(index)}
      contentContainerStyle={styles.list}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[colors.primary]} />}
      ListEmptyComponent={<EmptyState icon="mic-outline" title="No audio notes yet" />}
      renderItem={({ item }) => {
        const playing = current === item.audio_notes && status.playing;
        const loadingThis = current === item.audio_notes && !status.isLoaded;
        return (
          <View style={[styles.note, styles.audioNote]}>
            <Pressable
              onPress={() => toggle(item.audio_notes)}
              style={styles.playButton}
              accessibilityLabel={playing ? "Stop" : "Play audio note"}
            >
              {loadingThis ? (
                <ActivityIndicator color={colors.onPrimary} />
              ) : (
                <Ionicons name={playing ? "stop" : "play"} size={20} color={colors.onPrimary} />
              )}
            </Pressable>
            <View style={styles.flex}>
              <Text style={styles.noteAuthor}>{author(item) || "Staff"}</Text>
              <Text style={styles.noteDate}>
                {formatDateTime(item.date, item.time)}
                {playing ? `  ·  ${formatSeconds(status.currentTime)}` : ""}
              </Text>
            </View>
          </View>
        );
      }}
    />
  );
}

/** Record → review (play / discard) → save. Sent as base64, like the old app. */
function AudioRecorderBar({ saving, onSave }) {
  const recorder = useAudioRecorder(RecordingPresets.HIGH_QUALITY);
  const state = useAudioRecorderState(recorder, 250);
  const [recordedUri, setRecordedUri] = useState(null);
  const preview = useAudioPlayer(null);
  const previewStatus = useAudioPlayerStatus(preview);

  // The recorder state is polled, so a quick second tap would otherwise
  // prepare the recorder twice, which the native module rejects.
  const busy = useRef(false);
  const [starting, setStarting] = useState(false);

  const start = async () => {
    if (busy.current) return;
    busy.current = true;
    setStarting(true);
    try {
      const permission = await requestRecordingPermissionsAsync();
      if (!permission.granted) {
        Alert.alert("Microphone needed", "Allow microphone access in Settings to record audio notes.");
        return;
      }
      preview.pause();
      await setAudioModeAsync({ playsInSilentMode: true, allowsRecording: true });
      const status = recorder.getStatus();
      if (status.isRecording) return;
      // A session left prepared (e.g. a failed earlier start) is reused rather than prepared again.
      if (!status.canRecord) await recorder.prepareToRecordAsync();
      recorder.record();
    } catch (e) {
      Alert.alert("Could not start recording", e?.message || "Please try again.");
      await recorder.stop().catch(() => {});
      await setAudioModeAsync({ playsInSilentMode: true, allowsRecording: false }).catch(() => {});
    } finally {
      busy.current = false;
      setStarting(false);
    }
  };

  const stop = async () => {
    if (busy.current) return;
    busy.current = true;
    try {
      await recorder.stop();
      setRecordedUri(recorder.uri);
      if (recorder.uri) preview.replace({ uri: recorder.uri });
    } catch (e) {
      Alert.alert("Could not stop recording", e?.message || "Please record again.");
    } finally {
      await setAudioModeAsync({ playsInSilentMode: true, allowsRecording: false }).catch(() => {});
      busy.current = false;
    }
  };

  const discard = () => {
    preview.pause();
    setRecordedUri(null);
  };

  const save = async () => {
    preview.pause();
    try {
      const base64 = await new File(recordedUri).base64();
      if (await onSave(base64)) setRecordedUri(null);
    } catch (e) {
      Alert.alert("Could not read recording", e?.message || "Please record again.");
    }
  };

  if (state.isRecording) {
    return (
      <View style={styles.composer}>
        <View style={styles.recordingDot} />
        <Text style={styles.recordingText}>Recording {formatSeconds((state.durationMillis || 0) / 1000)}</Text>
        <Pressable onPress={stop} style={[styles.sendButton, styles.stopButton]} accessibilityLabel="Stop recording">
          <Ionicons name="stop" size={20} color={colors.onPrimary} />
        </Pressable>
      </View>
    );
  }

  if (recordedUri) {
    return (
      <View style={styles.composer}>
        <Pressable
          onPress={() => (previewStatus.playing ? preview.pause() : (preview.seekTo(0), preview.play()))}
          style={styles.playButton}
          accessibilityLabel={previewStatus.playing ? "Pause" : "Play recording"}
        >
          <Ionicons name={previewStatus.playing ? "pause" : "play"} size={20} color={colors.onPrimary} />
        </Pressable>
        <Text style={styles.recordingText}>New recording</Text>
        <Pressable onPress={discard} disabled={saving} style={styles.iconButton} accessibilityLabel="Discard recording">
          <Ionicons name="trash-outline" size={22} color={colors.danger} />
        </Pressable>
        <Pressable onPress={save} disabled={saving} style={[styles.sendButton, saving && styles.disabled]} accessibilityLabel="Save audio note">
          {saving ? <ActivityIndicator color={colors.onPrimary} /> : <Ionicons name="send" size={20} color={colors.onPrimary} />}
        </Pressable>
      </View>
    );
  }

  return (
    <View style={styles.composer}>
      <Pressable onPress={start} disabled={starting} style={[styles.wideButton, starting && styles.disabled]}>
        {starting ? <ActivityIndicator color={colors.onPrimary} /> : <Ionicons name="mic" size={20} color={colors.onPrimary} />}
        <Text style={styles.wideButtonText}>Record audio note</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  // On tablets the notes, tabs and note bar stay at a readable width.
  column: { width: "100%", maxWidth: 760, alignSelf: "center" },
  tabs: {
    flexDirection: "row",
    margin: 16,
    marginBottom: 4,
    borderRadius: 30,
    borderWidth: 1,
    borderColor: colors.primary,
    overflow: "hidden",
    backgroundColor: colors.surface,
  },
  tab: { flex: 1, height: 40, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6 },
  tabActive: { backgroundColor: colors.primary },
  tabText: { fontSize: 13, fontWeight: "600", color: colors.primary },
  tabTextActive: { color: colors.onPrimary },

  list: { padding: 16, paddingBottom: 24, gap: 12 },
  note: { backgroundColor: colors.surface, borderRadius: 14, padding: 14, gap: 8, ...shadow },
  noteHeader: { flexDirection: "row", justifyContent: "space-between", gap: 8 },
  noteAuthor: { fontSize: 13, fontWeight: "700", color: colors.primary, flexShrink: 1 },
  noteDate: { fontSize: 12, color: colors.textFaint },
  noteText: { fontSize: 15, color: colors.text, lineHeight: 21 },
  // Scales with the card, so photos are not a thin strip on tablets.
  noteImage: { width: "100%", aspectRatio: 16 / 10, maxHeight: 420, borderRadius: 10, backgroundColor: colors.primarySoft },
  audioNote: { flexDirection: "row", alignItems: "center", gap: 12 },

  composer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    padding: 12,
    backgroundColor: colors.surface,
    borderTopWidth: 1,
    borderTopColor: colors.borderSoft,
  },
  composerInput: {
    flex: 1,
    maxHeight: 120,
    minHeight: 44,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 15,
    color: colors.text,
  },
  sendButton: {
    width: 46,
    height: 46,
    borderRadius: 23,
    backgroundColor: colors.primary,
    alignItems: "center",
    justifyContent: "center",
  },
  stopButton: { backgroundColor: colors.danger },
  playButton: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: colors.primary,
    alignItems: "center",
    justifyContent: "center",
  },
  iconButton: { width: 42, height: 42, alignItems: "center", justifyContent: "center" },
  wideButton: {
    flex: 1,
    height: 48,
    borderRadius: 30,
    backgroundColor: colors.primary,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
  },
  wideButtonText: { color: colors.onPrimary, fontSize: 15, fontWeight: "700" },
  disabled: { opacity: 0.5 },
  recordingDot: { width: 12, height: 12, borderRadius: 6, backgroundColor: colors.danger },
  recordingText: { flex: 1, fontSize: 15, color: colors.text, fontWeight: "600" },

  viewer: { flex: 1, backgroundColor: "rgba(0,0,0,0.92)", alignItems: "center", justifyContent: "center" },
  viewerImage: { width: "100%", height: "80%" },
  viewerClose: { position: "absolute", right: 20 },
});
