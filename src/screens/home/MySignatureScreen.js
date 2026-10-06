import { useState } from "react";
import { Alert, Image, Pressable, StyleSheet, Text, View } from "react-native";
import { useDispatch, useSelector } from "react-redux";
import AppScreen from "../../components/AppScreen";
import { PrimaryButton } from "../../components/Form";
import SignaturePad from "../../components/SignaturePad";
import { saveSignature } from "../../services/authService";
import { thunkRefreshProfile } from "../../store/thunks/authThunks";
import { colors } from "../../theme";

/** The doctor's signature, printed on prescriptions (old "Save doctor signature"). */
export default function MySignatureScreen() {
  const dispatch = useDispatch();
  const current = useSelector((s) => s.auth.user?.digitalsignature);
  const [padOpen, setPadOpen] = useState(false);
  const [saving, setSaving] = useState(false);

  const save = async (dataUrl) => {
    setPadOpen(false);
    setSaving(true);
    try {
      await saveSignature(dataUrl);
      await dispatch(thunkRefreshProfile());
      Alert.alert("Saved", "Your signature will appear on new prescriptions.");
    } catch (e) {
      Alert.alert("Could not save signature", e.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <AppScreen title="My Signature">
      <View style={styles.content}>
        <Text style={styles.hint}>This signature is printed on the prescriptions you write.</Text>
        <Pressable onPress={() => setPadOpen(true)} style={styles.box} accessibilityLabel="Draw signature">
          {current ? (
            <Image source={{ uri: current }} style={styles.image} resizeMode="contain" />
          ) : (
            <Text style={styles.empty}>No signature saved yet</Text>
          )}
        </Pressable>
        <PrimaryButton
          title={current ? "Draw a new signature" : "Draw signature"}
          icon="create-outline"
          loading={saving}
          onPress={() => setPadOpen(true)}
        />
      </View>
      <SignaturePad visible={padOpen} title="Your signature" onClose={() => setPadOpen(false)} onSave={save} />
    </AppScreen>
  );
}

const styles = StyleSheet.create({
  content: { padding: 20, gap: 16 },
  hint: { fontSize: 14, color: colors.textMuted, textAlign: "center" },
  box: {
    height: 200,
    borderRadius: 16,
    borderWidth: 1.5,
    borderStyle: "dashed",
    borderColor: colors.border,
    backgroundColor: colors.surface,
    alignItems: "center",
    justifyContent: "center",
  },
  image: { width: "90%", height: "85%" },
  empty: { color: colors.textFaint, fontSize: 15 },
});
