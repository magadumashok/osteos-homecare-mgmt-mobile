import { useEffect, useState } from "react";
import { Alert, Image, Pressable, ScrollView, StyleSheet, Switch, Text, View } from "react-native";
import AppScreen from "../../components/AppScreen";
import { ErrorBanner, PrimaryButton } from "../../components/Form";
import SignaturePad from "../../components/SignaturePad";
import { LoadingView } from "../../components/States";
import { getPatient, recordConsent } from "../../services/patientService";
import { colors, shadow } from "../../theme";

const ITEMS = [
  { key: "terms_conditions", title: "Terms & conditions", text: "The patient or guardian has read and accepts the homecare terms and conditions." },
  { key: "consent_form", title: "Consent for care", text: "The patient or guardian consents to the agreed care plan and home visits." },
  { key: "amount_paid", title: "Payment received", text: "The agreed amount has been paid." },
];

/** The old "Consent / terms & conditions" form, signed by the patient or guardian. */
export default function ConsentScreen({ navigation, route }) {
  const { username, name } = route.params;
  const [flags, setFlags] = useState(null);
  const [existingSignature, setExistingSignature] = useState(null);
  const [signature, setSignature] = useState(null);
  const [padOpen, setPadOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    getPatient(username)
      .then((p) => {
        setFlags(Object.fromEntries(ITEMS.map((i) => [i.key, p?.[i.key] === true || p?.[i.key] === "true"])));
        setExistingSignature(p?.digitalsignature || null);
      })
      .catch(() => setFlags(Object.fromEntries(ITEMS.map((i) => [i.key, false]))));
  }, [username]);

  const save = async () => {
    setError(null);
    if (!flags.terms_conditions || !flags.consent_form) {
      setError("Terms and consent must both be accepted.");
      return;
    }
    if (!signature && !existingSignature) {
      setError("The patient or guardian must sign.");
      return;
    }
    setSaving(true);
    try {
      const result = await recordConsent(username, { ...flags, ...(signature ? { image: signature } : {}) });
      Alert.alert("Saved", result || "Consent recorded.", [{ text: "OK", onPress: () => navigation.goBack() }]);
    } catch (e) {
      setError(e.message);
    } finally {
      setSaving(false);
    }
  };

  const shownSignature = signature || existingSignature;

  return (
    <AppScreen title="Consent" subtitle={name || username}>
      {!flags ? (
        <LoadingView />
      ) : (
        <ScrollView contentContainerStyle={styles.content}>
          {ITEMS.map((item) => (
            <View key={item.key} style={styles.card}>
              <View style={styles.flex}>
                <Text style={styles.title}>{item.title}</Text>
                <Text style={styles.text}>{item.text}</Text>
              </View>
              <Switch
                value={flags[item.key]}
                onValueChange={(v) => setFlags((f) => ({ ...f, [item.key]: v }))}
                trackColor={{ true: colors.primary }}
                accessibilityLabel={item.title}
              />
            </View>
          ))}

          <Text style={styles.section}>Signature</Text>
          <Pressable onPress={() => setPadOpen(true)} style={styles.signatureBox} accessibilityLabel="Sign">
            {shownSignature ? (
              <Image source={{ uri: shownSignature }} style={styles.signatureImage} resizeMode="contain" />
            ) : (
              <Text style={styles.signHint}>Tap to sign</Text>
            )}
          </Pressable>
          {!!shownSignature && (
            <Text style={styles.signNote}>{signature ? "New signature — tap to redo" : "Signature on file — tap to sign again"}</Text>
          )}

          <ErrorBanner message={error} />
          <PrimaryButton title="Save consent" icon="checkmark" loading={saving} onPress={save} />
        </ScrollView>
      )}
      <SignaturePad
        visible={padOpen}
        title="Patient / guardian signature"
        onClose={() => setPadOpen(false)}
        onSave={(dataUrl) => {
          setSignature(dataUrl);
          setPadOpen(false);
        }}
      />
    </AppScreen>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  content: { padding: 16, paddingBottom: 40, gap: 12 },
  card: { flexDirection: "row", alignItems: "center", gap: 12, backgroundColor: colors.surface, borderRadius: 16, padding: 14, ...shadow },
  title: { fontSize: 15, fontWeight: "700", color: colors.text },
  text: { fontSize: 13, color: colors.textMuted, marginTop: 2 },
  section: { fontSize: 16, fontWeight: "700", color: colors.text, marginTop: 8 },
  signatureBox: {
    height: 160,
    borderWidth: 1.5,
    borderStyle: "dashed",
    borderColor: colors.border,
    borderRadius: 16,
    backgroundColor: colors.surface,
    alignItems: "center",
    justifyContent: "center",
  },
  signatureImage: { width: "90%", height: "85%" },
  signHint: { color: colors.textFaint, fontSize: 15 },
  signNote: { fontSize: 12, color: colors.textMuted, textAlign: "center" },
});
