import { useCallback, useEffect, useState } from "react";
import {
  Alert,
  FlatList,
  Modal,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  View,
} from "react-native";
import KeyboardAwareView from "../../components/KeyboardAwareView";
import KeyboardAwareScrollView from "../../components/KeyboardAwareScrollView";
import { Ionicons } from "@expo/vector-icons";
import { useSelector } from "react-redux";
import AppScreen from "../../components/AppScreen";
import BottomBar from "../../components/BottomBar";
import DateField from "../../components/DateField";
import { ErrorBanner, PrimaryButton, TextField } from "../../components/Form";
import Segmented, { FilterChips } from "../../components/Segmented";
import SignaturePad from "../../components/SignaturePad";
import { EmptyState, ErrorState, LoadingView } from "../../components/States";
import {
  addMedication,
  administerMedication,
  deleteMedication,
  listGuardians,
  listMedicationSchedule,
  medicationChecklist,
} from "../../services/patientService";
import { nowTime, shortDate, time12, toIsoDate } from "../../utils/dates";
import { can } from "../../utils/permissions";
import { colors, shadow } from "../../theme";

const SESSIONS = [
  { key: "morning", label: "Morning", icon: "partly-sunny-outline" },
  { key: "afternoon", label: "Afternoon", icon: "sunny-outline" },
  { key: "evening", label: "Evening", icon: "cloudy-night-outline" },
  { key: "night", label: "Night", icon: "moon-outline" },
];

// Options from the old medication schedule form.
const DOSE_UNITS = ["mg", "ml", "ug", "g", "IU", "tablet", "drop"].map((v) => ({ value: v, label: v }));
const FREQUENCIES = ["Once a Day", "Twice a Day", "Thrice a Day", "Four times a Day"].map((v) => ({ value: v, label: v }));
const FOOD = ["Before food", "After food"].map((v) => ({ value: v, label: v }));

const dose = (m) => [m.dosage, m.dose_unit].filter(Boolean).join(" ");

/** Ask before removing a duplicate or wrongly entered medicine, then reload. */
function confirmDelete(username, medicine, onDeleted) {
  Alert.alert(
    "Delete medicine?",
    `${medicine.medicine_name}\n${[dose(medicine), medicine.frequency, shortDate(medicine.date)].filter(Boolean).join(" · ")}\n\nThis removes it from the patient's medication list.`,
    [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: async () => {
          try {
            await deleteMedication(username, medicine._id);
            onDeleted();
          } catch (e) {
            Alert.alert("Could not delete", e.message);
          }
        },
      },
    ],
  );
}

function DeleteButton({ onPress }) {
  return (
    <Pressable onPress={onPress} hitSlop={10} style={styles.deleteButton} accessibilityLabel="Delete medicine">
      <Ionicons name="trash-outline" size={18} color={colors.danger} />
    </Pressable>
  );
}

export default function MedicationsScreen({ route }) {
  const { username, name } = route.params;
  const permissions = useSelector((s) => s.auth.permissions);
  const [tab, setTab] = useState("today");

  return (
    <AppScreen title="Medications" subtitle={name || username}>
      <Segmented
        style={styles.tabs}
        value={tab}
        onChange={setTab}
        options={[
          { value: "today", label: "Give", icon: "checkmark-done-outline" },
          { value: "schedule", label: "Schedule", icon: "list-outline" },
        ]}
      />
      {tab === "today" ? (
        <Checklist
          username={username}
          canGive={can(permissions, "medications.administer")}
          canDelete={can(permissions, ["medications.manage", "medications.administer"])}
        />
      ) : (
        <Schedule
          username={username}
          canAdd={can(permissions, "medications.manage")}
          canDelete={can(permissions, ["medications.manage", "medications.administer"])}
        />
      )}
    </AppScreen>
  );
}

/**
 * The old "Administer medication" screen: tick each session given, with a
 * witness. Each tap is confirmed first, as a given dose cannot be undone.
 * The bin removes a wrongly entered medicine until a dose of it is given.
 */
function Checklist({ username, canGive, canDelete }) {
  const [date, setDate] = useState(toIsoDate());
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);
  const [giving, setGiving] = useState(null); // { medicine, session }

  const load = useCallback(
    async (mode = "load") => {
      mode === "refresh" ? setRefreshing(true) : setLoading(true);
      setError(null);
      try {
        setRows((await medicationChecklist(username, date)) || []);
      } catch (e) {
        setError(e.message);
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [username, date],
  );

  useEffect(() => {
    load();
  }, [load]);

  // Guard against an accidental tap: a dose marked given cannot be undone.
  const confirmGive = (medicine, session) =>
    Alert.alert(
      `${session.label} dose`,
      `Mark ${medicine.medicine_name}${dose(medicine) ? ` (${dose(medicine)})` : ""} as given for ${session.label.toLowerCase()} on ${shortDate(date)}?\n\nThis cannot be undone.`,
      [
        { text: "Cancel", style: "cancel" },
        { text: "Continue", onPress: () => setGiving({ medicine, session }) },
      ],
    );

  return (
    <View style={styles.flex}>
      <View style={styles.dateRow}>
        <DateField label="Date" value={date} onChange={setDate} />
      </View>
      {loading ? (
        <LoadingView label="Loading medicines…" />
      ) : error ? (
        <ErrorState message={error} onRetry={() => load()} />
      ) : (
        <FlatList
          data={rows}
          keyExtractor={(item, index) => item._id || String(index)}
          contentContainerStyle={styles.list}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => load("refresh")} colors={[colors.primary]} />}
          ListEmptyComponent={
            <EmptyState icon="medkit-outline" title="No medicines scheduled" subtitle={`Nothing scheduled for ${shortDate(date)}.`} />
          }
          renderItem={({ item }) => (
            <View style={styles.card}>
              <View style={styles.cardHeader}>
                <Text style={styles.medName}>{item.medicine_name}</Text>
                {canDelete && item.deletable && <DeleteButton onPress={() => confirmDelete(username, item, () => load("refresh"))} />}
              </View>
              <Text style={styles.medMeta}>
                {[dose(item), item.frequency, item.before_or_after_food].filter(Boolean).join(" · ")}
              </Text>
              <View style={styles.sessions}>
                {SESSIONS.map((session) => {
                  const given = item[session.key];
                  return (
                    <Pressable
                      key={session.key}
                      disabled={!!given || !canGive}
                      onPress={() => confirmGive(item, session)}
                      style={[styles.session, given && styles.sessionGiven]}
                      accessibilityLabel={`${session.label}${given ? " given" : ""}`}
                    >
                      <Ionicons
                        name={given ? "checkmark-circle" : session.icon}
                        size={18}
                        color={given ? colors.success : colors.primary}
                      />
                      <Text style={[styles.sessionLabel, given && styles.sessionLabelGiven]}>{session.label}</Text>
                      {!!given && (
                        <Text style={styles.sessionBy} numberOfLines={2}>
                          {[given.nurse_name, time12(given.given_time)].filter(Boolean).join("\n")}
                        </Text>
                      )}
                    </Pressable>
                  );
                })}
              </View>
            </View>
          )}
        />
      )}

      <AdministerSheet
        username={username}
        date={date}
        giving={giving}
        onClose={() => setGiving(null)}
        onDone={() => {
          setGiving(null);
          load("refresh");
        }}
      />
    </View>
  );
}

/** Choose who witnessed the dose: an existing guardian, a new one who signs, or nobody. */
function AdministerSheet({ username, date, giving, onClose, onDone }) {
  const [guardians, setGuardians] = useState([]);
  const [choice, setChoice] = useState("none");
  const [newName, setNewName] = useState("");
  const [signature, setSignature] = useState(null);
  const [padOpen, setPadOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!giving) return;
    setChoice("none");
    setNewName("");
    setSignature(null);
    setError(null);
    listGuardians(username)
      .then((list) => setGuardians(list || []))
      .catch(() => setGuardians([]));
  }, [giving, username]);

  if (!giving) return null;

  const submit = async () => {
    setError(null);
    const payload = {
      medicine_name: giving.medicine.medicine_name,
      date,
      medicine_type: giving.session.key,
      medicine_date: toIsoDate(),
      medicine_time: nowTime(),
    };
    if (choice === "new") {
      if (!newName.trim() || !signature) {
        setError("Enter the guardian's name and get their signature.");
        return;
      }
      payload.guardian_name = newName.trim();
      payload.image = signature;
    } else if (choice !== "none") {
      payload.guardian_id = choice;
    }

    setSaving(true);
    try {
      await administerMedication(username, payload);
      onDone();
    } catch (e) {
      setError(e.message);
    } finally {
      setSaving(false);
    }
  };

  const options = [
    { value: "none", label: "No witness" },
    ...guardians.map((g) => ({ value: g.guardian_id, label: g.guardian_name })),
    { value: "new", label: "+ New guardian" },
  ];

  return (
    <Modal visible transparent animationType="slide" onRequestClose={onClose}>
      <KeyboardAwareView style={styles.flex}>
        <Pressable style={styles.backdrop} onPress={onClose} />
        <View style={styles.sheet}>
          <Text style={styles.sheetTitle}>
            Give {giving.medicine.medicine_name} — {giving.session.label}
          </Text>
          <Text style={styles.sheetHint}>
            {[dose(giving.medicine), giving.medicine.before_or_after_food].filter(Boolean).join(" · ")} · recorded at{" "}
            {time12(nowTime())}
          </Text>
          <Text style={styles.label}>Witnessed by</Text>
          <FilterChips options={options} value={choice} onChange={setChoice} />
          {choice === "new" && (
            <>
              <TextField label="Guardian name" value={newName} onChangeText={setNewName} placeholder="Full name" />
              <PrimaryButton
                title={signature ? "Signature captured — redo" : "Get signature"}
                icon="create-outline"
                variant="outline"
                onPress={() => setPadOpen(true)}
              />
            </>
          )}
          <ErrorBanner message={error} />
          <View style={styles.sheetButtons}>
            <PrimaryButton title="Cancel" variant="outline" onPress={onClose} style={styles.flex} />
            <PrimaryButton title="Mark given" icon="checkmark" loading={saving} onPress={submit} style={styles.flex} />
          </View>
        </View>
      </KeyboardAwareView>
      <SignaturePad
        visible={padOpen}
        title="Guardian signature"
        onClose={() => setPadOpen(false)}
        onSave={(dataUrl) => {
          setSignature(dataUrl);
          setPadOpen(false);
        }}
      />
    </Modal>
  );
}

/** The old "Medication schedule" screen: the list, and a form to add a medicine. */
function Schedule({ username, canAdd, canDelete }) {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [adding, setAdding] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setRows((await listMedicationSchedule(username)) || []);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, [username]);

  useEffect(() => {
    load();
  }, [load]);

  if (adding) {
    return (
      <AddMedicationForm
        username={username}
        onCancel={() => setAdding(false)}
        onSaved={() => {
          setAdding(false);
          load();
        }}
      />
    );
  }

  return (
    <View style={styles.flex}>
      {loading ? (
        <LoadingView label="Loading schedule…" />
      ) : error ? (
        <ErrorState message={error} onRetry={load} />
      ) : (
        <FlatList
          data={rows}
          keyExtractor={(item, index) => item._id || String(index)}
          contentContainerStyle={styles.list}
          ListEmptyComponent={<EmptyState icon="medkit-outline" title="No medicines scheduled" />}
          renderItem={({ item }) => (
            <View style={styles.card}>
              <View style={styles.cardHeader}>
                <Text style={styles.medName}>{item.medicine_name}</Text>
                <View style={styles.headerRight}>
                  <Text style={styles.medDate}>{shortDate(item.date)}</Text>
                  {canDelete && item.deletable && <DeleteButton onPress={() => confirmDelete(username, item, load)} />}
                </View>
              </View>
              <Text style={styles.medMeta}>
                {[dose(item), item.frequency, item.before_or_after_food, item.time && time12(item.time)].filter(Boolean).join(" · ")}
              </Text>
              {!!item.nurse_name && <Text style={styles.medBy}>Entered by {item.nurse_name}</Text>}
            </View>
          )}
        />
      )}
      {canAdd && (
        <BottomBar>
          <PrimaryButton title="Add medicine" icon="add-circle-outline" onPress={() => setAdding(true)} />
        </BottomBar>
      )}
    </View>
  );
}

function AddMedicationForm({ username, onCancel, onSaved }) {
  const [form, setForm] = useState({
    medicine_name: "",
    dosage: "",
    dose_unit: "mg",
    frequency: "Once a Day",
    before_or_after_food: "After food",
    date: toIsoDate(),
    time: nowTime(),
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const set = (key) => (value) => setForm((f) => ({ ...f, [key]: value }));

  const save = () => {
    setError(null);
    if (!form.medicine_name.trim()) {
      setError("Enter the medicine name.");
      return;
    }
    if (!form.dosage.trim()) {
      setError("Enter the dose.");
      return;
    }
    // The old app asked the nurse to confirm before saving.
    Alert.alert(
      "Confirm medicine",
      `${form.medicine_name}\n${form.dosage} ${form.dose_unit} · ${form.frequency} · ${form.before_or_after_food}\nFrom ${shortDate(form.date)}`,
      [
        { text: "Edit", style: "cancel" },
        {
          text: "Save",
          onPress: async () => {
            setSaving(true);
            try {
              await addMedication(username, { ...form, medicine_name: form.medicine_name.trim(), dosage: form.dosage.trim() });
              onSaved();
            } catch (e) {
              setError(e.message);
            } finally {
              setSaving(false);
            }
          },
        },
      ],
    );
  };

  return (
    <KeyboardAwareView style={styles.flex}>
      <KeyboardAwareScrollView contentContainerStyle={styles.form}>
        <TextField label="Medicine name *" value={form.medicine_name} onChangeText={set("medicine_name")} placeholder="e.g. Paracetamol" />
        <TextField label="Dose *" value={form.dosage} onChangeText={set("dosage")} keyboardType="decimal-pad" placeholder="e.g. 500" />
        <Text style={styles.label}>Unit</Text>
        <FilterChips options={DOSE_UNITS} value={form.dose_unit} onChange={set("dose_unit")} />
        <Text style={styles.label}>Frequency</Text>
        <FilterChips options={FREQUENCIES} value={form.frequency} onChange={set("frequency")} />
        <Text style={styles.label}>Food</Text>
        <FilterChips options={FOOD} value={form.before_or_after_food} onChange={set("before_or_after_food")} />
        <View style={styles.row}>
          <DateField label="Date" value={form.date} onChange={set("date")} />
          <DateField label="Time" value={form.time} onChange={set("time")} mode="time" />
        </View>
        <ErrorBanner message={error} />
        <View style={styles.row}>
          <PrimaryButton title="Cancel" variant="outline" onPress={onCancel} style={styles.flex} />
          <PrimaryButton title="Save" icon="checkmark" loading={saving} onPress={save} style={styles.flex} />
        </View>
      </KeyboardAwareScrollView>
    </KeyboardAwareView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  tabs: { margin: 16, marginBottom: 0 },
  dateRow: { paddingHorizontal: 16, paddingTop: 12 },
  list: { padding: 16, paddingBottom: 40, gap: 12 },
  card: { backgroundColor: colors.surface, borderRadius: 16, padding: 14, gap: 6, ...shadow },
  cardHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", gap: 8 },
  headerRight: { flexDirection: "row", alignItems: "center", gap: 10 },
  deleteButton: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#fef2f2",
  },
  medName: { fontSize: 16, fontWeight: "700", color: colors.text, flexShrink: 1 },
  medDate: { fontSize: 12, color: colors.textMuted },
  medMeta: { fontSize: 13, color: colors.textMuted },
  medBy: { fontSize: 12, color: colors.textFaint },
  sessions: { flexDirection: "row", gap: 8, marginTop: 6 },
  session: {
    flex: 1,
    alignItems: "center",
    gap: 3,
    paddingVertical: 8,
    paddingHorizontal: 2,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.primary,
    backgroundColor: colors.primarySoft,
  },
  sessionGiven: { borderColor: "#a5d6a7", backgroundColor: "#e8f5e9" },
  sessionLabel: { fontSize: 11, fontWeight: "700", color: colors.primary },
  sessionLabelGiven: { color: colors.success },
  sessionBy: { fontSize: 10, color: colors.textMuted, textAlign: "center" },
  form: { padding: 16, paddingBottom: 40, gap: 14 },
  row: { flexDirection: "row", gap: 12 },
  label: { color: colors.textBody, fontSize: 14, fontWeight: "600" },
  backdrop: { flex: 1, backgroundColor: "rgba(0,0,0,0.35)" },
  sheet: { backgroundColor: colors.surface, borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 20, paddingBottom: 34, gap: 12 },
  sheetTitle: { fontSize: 18, fontWeight: "700", color: colors.text },
  sheetHint: { fontSize: 13, color: colors.textMuted, marginTop: -6 },
  sheetButtons: { flexDirection: "row", gap: 12 },
});
