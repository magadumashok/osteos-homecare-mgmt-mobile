import { useCallback, useEffect, useState } from "react";
import {
  FlatList,
  Image,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { SafeAreaView } from "react-native-safe-area-context";
import { useSelector } from "react-redux";
import AppScreen from "../../components/AppScreen";
import DateField from "../../components/DateField";
import { ErrorBanner, PrimaryButton } from "../../components/Form";
import Segmented, { FilterChips } from "../../components/Segmented";
import { EmptyState, ErrorState, LoadingView } from "../../components/States";
import { addPrescription, getPrescription, listPrescriptions } from "../../services/patientService";
import { packageName, servicePackages } from "../../services/referenceService";
import { shortDate, toIsoDate } from "../../utils/dates";
import { can } from "../../utils/permissions";
import { colors, shadow } from "../../theme";

// Line fields as the old app and the web app store them.
const MEDICINE_FIELDS = [
  { key: "drug_name", label: "Medicine *", placeholder: "e.g. Amoxicillin", wide: true },
  { key: "strength", label: "Strength", placeholder: "500 mg" },
  { key: "medication_count", label: "Quantity", placeholder: "10", numeric: true },
  { key: "duration", label: "Days", placeholder: "5", numeric: true },
];
const FREQUENCIES = ["Once a Day", "Twice a Day", "Thrice a Day", "Four times a Day"].map((v) => ({ value: v, label: v }));
const FOOD = ["Before food", "After food", "With food"].map((v) => ({ value: v, label: v }));

const emptyMedicine = () => ({ drug_name: "", strength: "", medication_count: "", duration: "", medication_frequency: "Twice a Day", before_or_after_food: "After food" });

const summary = (type, item) =>
  type === "medicine"
    ? [item.strength, item.medication_frequency, item.before_or_after_food, item.duration && `${item.duration} days`, item.medication_count && `Qty ${item.medication_count}`]
        .filter(Boolean)
        .join(" · ")
    : "";

const itemTitle = (type, item) => (type === "medicine" ? item?.drug_name : item?.service_package || item?.other_service) || item?.name || "—";

export default function PrescriptionsScreen({ route }) {
  const { username, name } = route.params;
  const canWrite = can(useSelector((s) => s.auth.permissions), "prescriptions.write");
  const [type, setType] = useState("medicine");
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);
  const [writing, setWriting] = useState(false);
  const [openId, setOpenId] = useState(null);

  const load = useCallback(
    async (mode = "load") => {
      mode === "refresh" ? setRefreshing(true) : setLoading(true);
      setError(null);
      try {
        setRows((await listPrescriptions(username, type)) || []);
      } catch (e) {
        setError(e.message);
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [username, type],
  );

  useEffect(() => {
    load();
  }, [load]);

  if (writing) {
    return (
      <AppScreen title={type === "medicine" ? "New Prescription" : "New Test Request"} subtitle={name || username} onBack={() => setWriting(false)}>
        <PrescriptionForm
          username={username}
          type={type}
          onCancel={() => setWriting(false)}
          onSaved={() => {
            setWriting(false);
            load("refresh");
          }}
        />
      </AppScreen>
    );
  }

  return (
    <AppScreen title="Prescriptions" subtitle={name || username}>
      <Segmented
        style={styles.tabs}
        value={type}
        onChange={(t) => {
          setRows([]);
          setType(t);
        }}
        options={[
          { value: "medicine", label: "Medicine", icon: "medkit-outline" },
          { value: "test", label: "Tests", icon: "flask-outline" },
        ]}
      />
      {loading ? (
        <LoadingView label="Loading prescriptions…" />
      ) : error ? (
        <ErrorState message={error} onRetry={() => load()} />
      ) : (
        <FlatList
          data={rows}
          keyExtractor={(item, index) => item._id || String(index)}
          contentContainerStyle={styles.list}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => load("refresh")} colors={[colors.primary]} />}
          ListEmptyComponent={<EmptyState icon="receipt-outline" title="No prescriptions yet" />}
          renderItem={({ item }) => {
            const lines = Array.isArray(item.prescription_data) ? item.prescription_data : [];
            return (
              <Pressable onPress={() => setOpenId(item._id)} style={({ pressed }) => [styles.card, pressed && styles.pressed]}>
                <View style={styles.cardHeader}>
                  <Text style={styles.cardDate}>{shortDate(item.date)}</Text>
                  <Text style={styles.cardCount}>
                    {lines.length} item{lines.length === 1 ? "" : "s"}
                  </Text>
                </View>
                {lines.slice(0, 4).map((line, index) => (
                  <Text key={index} style={styles.line} numberOfLines={1}>
                    • {itemTitle(type, line)}
                    {summary(type, line) ? <Text style={styles.lineMeta}>  {summary(type, line)}</Text> : null}
                  </Text>
                ))}
                {lines.length > 4 && <Text style={styles.lineMeta}>+{lines.length - 4} more</Text>}
              </Pressable>
            );
          }}
        />
      )}
      {canWrite && (
        <View style={styles.footer}>
          <PrimaryButton
            title={type === "medicine" ? "Write prescription" : "Request tests"}
            icon="create-outline"
            onPress={() => setWriting(true)}
          />
        </View>
      )}
      <PrescriptionDetail type={type} id={openId} onClose={() => setOpenId(null)} />
    </AppScreen>
  );
}

function PrescriptionDetail({ type, id, onClose }) {
  const [rx, setRx] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!id) return;
    setRx(null);
    setError(null);
    getPrescription(type, id).then(setRx, (e) => setError(e.message));
  }, [type, id]);

  const lines = Array.isArray(rx?.prescription_data) ? rx.prescription_data : [];

  return (
    <Modal visible={!!id} animationType="slide" onRequestClose={onClose}>
      <SafeAreaView style={styles.detailSafe}>
        <View style={styles.detailHeader}>
          <Text style={styles.detailTitle}>{type === "medicine" ? "Prescription" : "Test request"}</Text>
          <Pressable onPress={onClose} hitSlop={10} accessibilityLabel="Close">
            <Ionicons name="close" size={26} color={colors.onPrimary} />
          </Pressable>
        </View>
        {error ? (
          <ErrorState message={error} />
        ) : !rx ? (
          <LoadingView />
        ) : (
          <ScrollView contentContainerStyle={styles.detailBody}>
            <View style={styles.card}>
              <Text style={styles.cardDate}>{rx.patient_name}</Text>
              <Text style={styles.lineMeta}>
                {[rx.age && `${rx.age} yrs`, rx.gender, rx.mobile].filter(Boolean).join(" · ")}
              </Text>
              <Text style={styles.lineMeta}>Date: {shortDate(rx.date)}</Text>
            </View>
            {lines.map((line, index) => (
              <View key={index} style={styles.card}>
                <Text style={styles.detailItem}>
                  {index + 1}. {itemTitle(type, line)}
                </Text>
                {!!summary(type, line) && <Text style={styles.lineMeta}>{summary(type, line)}</Text>}
              </View>
            ))}
            <View style={styles.signature}>
              {!!rx.doctor_signature && <Image source={{ uri: rx.doctor_signature }} style={styles.signatureImage} resizeMode="contain" />}
              <Text style={styles.cardDate}>{rx.doctor_name || rx.doctor_id}</Text>
              <Text style={styles.lineMeta}>Doctor</Text>
            </View>
          </ScrollView>
        )}
      </SafeAreaView>
    </Modal>
  );
}

function PrescriptionForm({ username, type, onCancel, onSaved }) {
  const [date, setDate] = useState(toIsoDate());
  const [lines, setLines] = useState([emptyMedicine()]);
  const [packages, setPackages] = useState([]);
  const [tests, setTests] = useState([]);
  const [otherTest, setOtherTest] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (type === "test") servicePackages().then(setPackages, () => setPackages([]));
  }, [type]);

  const setLine = (index, key, value) => setLines((all) => all.map((line, i) => (i === index ? { ...line, [key]: value } : line)));

  const toggleTest = (name) => setTests((all) => (all.includes(name) ? all.filter((t) => t !== name) : [...all, name]));

  const save = async () => {
    setError(null);
    const data =
      type === "medicine"
        ? lines.filter((l) => l.drug_name.trim()).map((l) => ({ ...l, drug_name: l.drug_name.trim() }))
        : [...tests, ...(otherTest.trim() ? [otherTest.trim()] : [])].map((t) => ({ service_package: t }));
    if (!data.length) {
      setError(type === "medicine" ? "Add at least one medicine." : "Choose at least one test.");
      return;
    }
    setSaving(true);
    try {
      await addPrescription(username, type, { date, prescription_data: data });
      onSaved();
    } catch (e) {
      setError(e.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === "ios" ? "padding" : undefined}>
      <ScrollView contentContainerStyle={styles.form} keyboardShouldPersistTaps="handled">
        <DateField label="Date" value={date} onChange={setDate} />

        {type === "medicine" ? (
          <>
            {lines.map((line, index) => (
              <View key={index} style={styles.lineCard}>
                <View style={styles.cardHeader}>
                  <Text style={styles.cardDate}>Medicine {index + 1}</Text>
                  {lines.length > 1 && (
                    <Pressable onPress={() => setLines((all) => all.filter((_, i) => i !== index))} hitSlop={8} accessibilityLabel="Remove medicine">
                      <Ionicons name="trash-outline" size={20} color={colors.danger} />
                    </Pressable>
                  )}
                </View>
                <View style={styles.fieldGrid}>
                  {MEDICINE_FIELDS.map((field) => (
                    <View key={field.key} style={field.wide ? styles.fieldWide : styles.fieldHalf}>
                      <Text style={styles.label}>{field.label}</Text>
                      <TextInput
                        value={line[field.key]}
                        onChangeText={(v) => setLine(index, field.key, v)}
                        placeholder={field.placeholder}
                        placeholderTextColor={colors.textFaint}
                        keyboardType={field.numeric ? "number-pad" : "default"}
                        style={styles.input}
                      />
                    </View>
                  ))}
                </View>
                <Text style={styles.label}>Frequency</Text>
                <FilterChips options={FREQUENCIES} value={line.medication_frequency} onChange={(v) => setLine(index, "medication_frequency", v)} />
                <Text style={styles.label}>Food</Text>
                <FilterChips options={FOOD} value={line.before_or_after_food} onChange={(v) => setLine(index, "before_or_after_food", v)} />
              </View>
            ))}
            <PrimaryButton title="Add another medicine" icon="add" variant="outline" onPress={() => setLines((all) => [...all, emptyMedicine()])} />
          </>
        ) : (
          <>
            <Text style={styles.label}>Tests / services</Text>
            {packages.length ? (
              <View style={styles.testList}>
                {packages.map((p, index) => {
                  const name = packageName(p);
                  if (!name) return null;
                  const selected = tests.includes(name);
                  return (
                    <Pressable key={`${name}-${index}`} onPress={() => toggleTest(name)} style={[styles.testRow, selected && styles.testRowOn]}>
                      <Ionicons name={selected ? "checkbox" : "square-outline"} size={22} color={colors.primary} />
                      <Text style={styles.testName}>{name}</Text>
                    </Pressable>
                  );
                })}
              </View>
            ) : (
              <Text style={styles.lineMeta}>No service packages found — type the test below.</Text>
            )}
            <Text style={styles.label}>Other test</Text>
            <TextInput
              value={otherTest}
              onChangeText={setOtherTest}
              placeholder="Test not in the list"
              placeholderTextColor={colors.textFaint}
              style={styles.input}
            />
          </>
        )}

        <ErrorBanner message={error} />
        <View style={styles.row}>
          <PrimaryButton title="Cancel" variant="outline" onPress={onCancel} style={styles.flex} />
          <PrimaryButton title="Save" icon="checkmark" loading={saving} onPress={save} style={styles.flex} />
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  tabs: { margin: 16, marginBottom: 0 },
  list: { padding: 16, paddingBottom: 40, gap: 12 },
  card: { backgroundColor: colors.surface, borderRadius: 16, padding: 14, gap: 6, ...shadow },
  pressed: { opacity: 0.85 },
  cardHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", gap: 8 },
  cardDate: { fontSize: 15, fontWeight: "700", color: colors.text },
  cardCount: { fontSize: 12, color: colors.textMuted },
  line: { fontSize: 14, color: colors.text },
  lineMeta: { fontSize: 12, color: colors.textMuted },
  footer: { padding: 16, backgroundColor: colors.surface, borderTopWidth: 1, borderTopColor: colors.borderSoft },

  detailSafe: { flex: 1, backgroundColor: colors.background },
  detailHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 18,
    backgroundColor: colors.primary,
  },
  detailTitle: { color: colors.onPrimary, fontSize: 18, fontWeight: "700" },
  detailBody: { padding: 16, gap: 12, paddingBottom: 40 },
  detailItem: { fontSize: 15, fontWeight: "600", color: colors.text },
  signature: { alignItems: "flex-end", gap: 2, marginTop: 8 },
  signatureImage: { width: 160, height: 60 },

  form: { padding: 16, paddingBottom: 40, gap: 14 },
  lineCard: { backgroundColor: colors.surface, borderRadius: 16, padding: 14, gap: 10, ...shadow },
  fieldGrid: { flexDirection: "row", flexWrap: "wrap", justifyContent: "space-between", rowGap: 10 },
  fieldWide: { width: "100%", gap: 6 },
  fieldHalf: { width: "31%", gap: 6 },
  label: { color: colors.textBody, fontSize: 13, fontWeight: "600" },
  input: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 10,
    fontSize: 15,
    color: colors.text,
    backgroundColor: colors.surface,
  },
  testList: { backgroundColor: colors.surface, borderRadius: 14, overflow: "hidden", ...shadow },
  testRow: { flexDirection: "row", alignItems: "center", gap: 12, padding: 12, borderBottomWidth: 1, borderBottomColor: colors.borderSoft },
  testRowOn: { backgroundColor: colors.primarySoft },
  testName: { fontSize: 15, color: colors.text, flex: 1 },
  row: { flexDirection: "row", gap: 12 },
});
