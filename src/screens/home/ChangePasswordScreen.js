import { useState } from "react";
import { Alert, StyleSheet, Text, View } from "react-native";
import KeyboardAwareView from "../../components/KeyboardAwareView";
import KeyboardAwareScrollView from "../../components/KeyboardAwareScrollView";
import { Ionicons } from "@expo/vector-icons";
import AppScreen from "../../components/AppScreen";
import { ErrorBanner, PasswordField, PrimaryButton } from "../../components/Form";
import { changePassword } from "../../services/authService";
import { colors } from "../../theme";

export default function ChangePasswordScreen({ navigation }) {
  const [current, setCurrent] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);

  const onSubmit = async () => {
    setError(null);
    if (!current || !password || !confirm) {
      setError("Please fill in all three fields.");
      return;
    }
    if (password.length < 8) {
      setError("The new password must be at least 8 characters.");
      return;
    }
    if (password !== confirm) {
      setError("The two new passwords do not match.");
      return;
    }
    if (password === current) {
      setError("The new password must be different from the current one.");
      return;
    }
    setBusy(true);
    try {
      const result = await changePassword({ currentPassword: current, password });
      Alert.alert("Password changed", result || "Your password has been changed.", [
        { text: "OK", onPress: () => navigation.goBack() },
      ]);
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <AppScreen title="Change Password">
      <KeyboardAwareView style={styles.flex}>
        <KeyboardAwareScrollView contentContainerStyle={styles.content}>
          <View style={styles.iconCircle}>
            <Ionicons name="lock-closed" size={36} color={colors.primary} />
          </View>
          <Text style={styles.title}>Set a new password</Text>
          <View style={styles.form}>
            <ErrorBanner message={error} />
            <PasswordField label="Current Password" value={current} onChangeText={setCurrent} placeholder="Current password" />
            <PasswordField label="New Password" value={password} onChangeText={setPassword} placeholder="At least 8 characters" />
            <PasswordField
              label="Confirm New Password"
              value={confirm}
              onChangeText={setConfirm}
              placeholder="Repeat the new password"
            />
            <PrimaryButton title="Update password" icon="checkmark-circle-outline" loading={busy} onPress={onSubmit} />
          </View>
        </KeyboardAwareScrollView>
      </KeyboardAwareView>
    </AppScreen>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  content: { padding: 20, paddingBottom: 60 },
  iconCircle: {
    width: 76,
    height: 76,
    borderRadius: 38,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.primaryTint,
    alignSelf: "center",
    marginTop: 8,
    marginBottom: 16,
  },
  title: { alignSelf: "center", fontSize: 22, fontWeight: "700", color: colors.text },
  form: { width: "100%", maxWidth: 440, alignSelf: "center", marginTop: 28, gap: 18 },
});
