import { useRef, useState } from "react";
import { Alert, KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import AppScreen from "../../components/AppScreen";
import { ErrorBanner, OtpInput, PasswordField, PrimaryButton, TextField } from "../../components/Form";
import { resetPassword, sendOtp } from "../../services/authService";
import { cleanMobile } from "../../utils/format";
import { colors } from "../../theme";

/**
 * Step 1: mobile number → a code is texted.
 * Step 2: code + new password. The server checks the code; the old app
 * compared it on the phone and let anyone reset any number.
 */
export default function ForgotPasswordScreen({ navigation, route }) {
  const [mobile, setMobile] = useState(route?.params?.mobile || "");
  const [step, setStep] = useState(1);
  const [otp, setOtp] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);
  const [notice, setNotice] = useState(null);
  const otpRefs = useRef([]);

  const onSendCode = async () => {
    setError(null);
    if (cleanMobile(mobile).length < 6) {
      setError("Please enter your registered mobile number.");
      return;
    }
    setBusy(true);
    try {
      setNotice(await sendOtp(cleanMobile(mobile), "reset"));
      setOtp("");
      setStep(2);
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  };

  const onReset = async () => {
    setError(null);
    if (!/^\d{6}$/.test(otp)) {
      setError("Please enter the 6-digit code.");
      return;
    }
    if (password.length < 8) {
      setError("The new password must be at least 8 characters.");
      return;
    }
    if (password !== confirm) {
      setError("The two passwords do not match.");
      return;
    }
    setBusy(true);
    try {
      const result = await resetPassword({ mobile: cleanMobile(mobile), otp, password });
      Alert.alert("Password changed", result || "You can now log in with your new password.", [
        { text: "OK", onPress: () => navigation.goBack() },
      ]);
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <AppScreen title="Forgot Password">
      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === "ios" ? "padding" : undefined}>
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          <View style={styles.iconCircle}>
            <Ionicons name="lock-open" size={36} color={colors.primary} />
          </View>
          <Text style={styles.title}>{step === 1 ? "Reset your password" : "Enter the code"}</Text>
          <Text style={styles.description}>
            {step === 1
              ? "Enter your registered mobile number and we'll text you a code."
              : `We sent a 6-digit code to ${cleanMobile(mobile)}. Enter it and choose a new password.`}
          </Text>

          <View style={styles.form}>
            <ErrorBanner message={error} />
            {!!notice && !error && step === 2 && <Text style={styles.notice}>{notice}</Text>}

            {step === 1 ? (
              <>
                <TextField
                  label="Mobile Number"
                  value={mobile}
                  onChangeText={setMobile}
                  keyboardType="phone-pad"
                  autoComplete="tel"
                  maxLength={15}
                  placeholder="Registered mobile number"
                />
                <PrimaryButton title="Send code" icon="paper-plane-outline" loading={busy} onPress={onSendCode} />
              </>
            ) : (
              <>
                <OtpInput value={otp} onChange={setOtp} editable={!busy} refs={otpRefs} />
                <PasswordField
                  label="New Password"
                  value={password}
                  onChangeText={setPassword}
                  placeholder="At least 8 characters"
                />
                <PasswordField
                  label="Confirm New Password"
                  value={confirm}
                  onChangeText={setConfirm}
                  placeholder="Repeat the new password"
                />
                <PrimaryButton title="Change password" icon="checkmark-circle-outline" loading={busy} onPress={onReset} />
                <View style={styles.linkRow}>
                  <Pressable onPress={onSendCode} disabled={busy}>
                    <Text style={styles.link}>Resend code</Text>
                  </Pressable>
                  <Pressable onPress={() => setStep(1)} disabled={busy}>
                    <Text style={styles.link}>Change number</Text>
                  </Pressable>
                </View>
              </>
            )}
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
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
  description: {
    alignSelf: "center",
    maxWidth: 340,
    marginTop: 8,
    color: colors.textMuted,
    fontSize: 15,
    lineHeight: 22,
    textAlign: "center",
  },
  form: { width: "100%", maxWidth: 440, alignSelf: "center", marginTop: 28, gap: 18 },
  notice: { color: colors.success, fontSize: 13, textAlign: "center" },
  linkRow: { flexDirection: "row", justifyContent: "space-between" },
  link: { color: "#0b5a79", fontSize: 14, fontWeight: "600" },
});
