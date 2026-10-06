import { useRef, useState } from "react";
import { Image, Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useDispatch, useSelector } from "react-redux";
import ScreenContainer from "../../components/ScreenContainer";
import { ErrorBanner, OtpInput, PrimaryButton } from "../../components/Form";
import { clearError } from "../../store/slices/authSlice";
import {
  thunkLoginWithOtp,
  thunkLoginWithPassword,
  thunkSendLoginOtp,
} from "../../store/thunks/authThunks";
import { useResponsiveLayout } from "../../utils/responsive";
import { cleanMobile } from "../../utils/format";
import { colors } from "../../theme";

const TABS = { PASSWORD: "password", OTP: "otp" };

// Numbers are stored without the country code, as the old app entered them.
const MIN_MOBILE_LENGTH = 6;

export default function LoginScreen({ navigation }) {
  const dispatch = useDispatch();
  const responsive = useResponsiveLayout();
  const { loading, error } = useSelector((s) => s.auth);

  const [tab, setTab] = useState(TABS.PASSWORD);
  const [mobile, setMobile] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [otpStep, setOtpStep] = useState(false);
  const [otp, setOtp] = useState("");
  const [notice, setNotice] = useState(null);
  const [localError, setLocalError] = useState(null);
  const otpRefs = useRef([]);

  const shownError = localError || error;

  const resetMessages = () => {
    setLocalError(null);
    setNotice(null);
    dispatch(clearError());
  };

  const validMobile = () => {
    if (cleanMobile(mobile).length < MIN_MOBILE_LENGTH) {
      setLocalError("Please enter your registered mobile number.");
      return false;
    }
    return true;
  };

  // Navigation reacts to the signed-in state, so nothing to do on success.
  const onPasswordLogin = () => {
    resetMessages();
    if (!validMobile()) return;
    if (!password) {
      setLocalError("Please enter your password.");
      return;
    }
    dispatch(thunkLoginWithPassword({ mobile: cleanMobile(mobile), password }));
  };

  const onSendOtp = async () => {
    resetMessages();
    if (!validMobile()) return;
    const result = await dispatch(thunkSendLoginOtp({ mobile: cleanMobile(mobile) }));
    if (result.meta.requestStatus === "fulfilled") {
      setOtp("");
      setOtpStep(true);
      setNotice(result.payload);
    }
  };

  const onVerifyOtp = () => {
    resetMessages();
    if (!/^\d{6}$/.test(otp)) {
      setLocalError("Please enter the 6-digit code.");
      return;
    }
    dispatch(thunkLoginWithOtp({ mobile: cleanMobile(mobile), otp }));
  };

  const switchTab = (next) => {
    setTab(next);
    setOtpStep(false);
    resetMessages();
  };

  const mobileInput = (
    <View style={[styles.inputWrap, { minHeight: responsive.controlHeight }]}>
      <Ionicons name="call-outline" size={20} color={colors.primaryDark} />
      <TextInput
        keyboardType="phone-pad"
        autoComplete="tel"
        maxLength={15}
        value={mobile}
        onChangeText={(v) => {
          setMobile(v);
          resetMessages();
        }}
        placeholder="Mobile number"
        placeholderTextColor={colors.textFaint}
        style={styles.input}
        editable={!loading}
        accessibilityLabel="Mobile number"
      />
    </View>
  );

  return (
    <LinearGradient
      colors={colors.loginGradient}
      locations={[0, 0.35, 0.7, 1]}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={styles.flex}
    >
      <ScreenContainer keyboardAware backgroundColor="transparent">
        <View style={styles.layout}>
          <View style={[styles.card, { padding: responsive.cardPadding + 4 }]}>
            <View style={styles.logoWrap}>
              <Image resizeMode="contain" source={require("../../../assets/icon.png")} style={styles.logo} />
              <Text style={styles.brand}>Homecare</Text>
            </View>

            {!otpStep && (
              <View style={styles.tabRow}>
                {[TABS.PASSWORD, TABS.OTP].map((t) => {
                  const active = tab === t;
                  return (
                    <Pressable
                      key={t}
                      onPress={() => switchTab(t)}
                      style={[styles.tab, active && styles.tabActive]}
                      accessibilityRole="tab"
                      accessibilityState={{ selected: active }}
                    >
                      <Ionicons
                        name={t === TABS.OTP ? "phone-portrait-outline" : "lock-closed-outline"}
                        size={16}
                        color={active ? colors.onPrimary : colors.primaryDark}
                      />
                      <Text style={[styles.tabText, active && styles.tabTextActive]}>
                        {t === TABS.OTP ? "Login with OTP" : "Login with Password"}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
            )}

            <View style={styles.form}>
              <ErrorBanner message={shownError} />
              {!!notice && !shownError && <Text style={styles.notice}>{notice}</Text>}

              {tab === TABS.PASSWORD && (
                <>
                  <Text style={styles.heading}>Login</Text>
                  {mobileInput}
                  <View style={[styles.inputWrap, { minHeight: responsive.controlHeight }]}>
                    <Ionicons name="key-outline" size={20} color={colors.primaryDark} />
                    <TextInput
                      secureTextEntry={!showPassword}
                      autoCapitalize="none"
                      value={password}
                      onChangeText={(v) => {
                        setPassword(v);
                        resetMessages();
                      }}
                      placeholder="Password"
                      placeholderTextColor={colors.textFaint}
                      style={styles.input}
                      editable={!loading}
                      onSubmitEditing={onPasswordLogin}
                      accessibilityLabel="Password"
                    />
                    <Pressable onPress={() => setShowPassword((v) => !v)} hitSlop={10}>
                      <Ionicons
                        name={showPassword ? "eye-off-outline" : "eye-outline"}
                        size={20}
                        color={colors.textMuted}
                      />
                    </Pressable>
                  </View>
                  <PrimaryButton title="Login" icon="log-in-outline" loading={loading} onPress={onPasswordLogin} />
                  <Pressable
                    onPress={() => {
                      resetMessages();
                      navigation.navigate("ForgotPassword", { mobile: cleanMobile(mobile) });
                    }}
                    style={styles.linkCenter}
                  >
                    <Text style={styles.link}>Forgot password?</Text>
                  </Pressable>
                </>
              )}

              {tab === TABS.OTP && !otpStep && (
                <>
                  <Text style={styles.heading}>Login</Text>
                  {mobileInput}
                  <Text style={styles.hint}>We'll text a 6-digit code to this number.</Text>
                  <PrimaryButton title="Send code" icon="paper-plane-outline" loading={loading} onPress={onSendOtp} />
                </>
              )}

              {tab === TABS.OTP && otpStep && (
                <>
                  <Text style={styles.heading}>Enter code</Text>
                  <Text style={styles.hint}>Sent to {cleanMobile(mobile)}</Text>
                  <OtpInput value={otp} onChange={setOtp} editable={!loading} refs={otpRefs} />
                  <PrimaryButton
                    title="Verify & login"
                    icon="checkmark-circle-outline"
                    loading={loading}
                    onPress={onVerifyOtp}
                  />
                  <View style={styles.linkRow}>
                    <Pressable onPress={onSendOtp} disabled={loading}>
                      <Text style={styles.link}>Resend code</Text>
                    </Pressable>
                    <Pressable
                      onPress={() => {
                        setOtpStep(false);
                        resetMessages();
                      }}
                      disabled={loading}
                    >
                      <Text style={styles.link}>Change number</Text>
                    </Pressable>
                  </View>
                </>
              )}
            </View>
          </View>
          <Text style={styles.footer}>Powered by Osteos.io</Text>
        </View>
      </ScreenContainer>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  layout: { gap: 14 },
  card: {
    backgroundColor: colors.surface,
    borderRadius: 30,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.15,
    shadowRadius: 20,
    elevation: 12,
  },
  logoWrap: { alignItems: "center", marginBottom: 16, gap: 6 },
  logo: { width: 84, height: 84 },
  brand: { fontSize: 22, fontWeight: "800", color: colors.primaryDark },

  tabRow: {
    flexDirection: "row",
    borderRadius: 30,
    borderWidth: 1,
    borderColor: colors.primaryDark,
    overflow: "hidden",
    marginBottom: 18,
  },
  tab: {
    flex: 1,
    height: 40,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    backgroundColor: colors.surface,
  },
  tabActive: { backgroundColor: colors.primaryDark },
  tabText: { fontSize: 12, fontWeight: "600", color: colors.primaryDark },
  tabTextActive: { color: colors.onPrimary },

  form: { gap: 14 },
  heading: { color: colors.text, fontSize: 20, fontWeight: "800" },
  inputWrap: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    borderWidth: 1.5,
    borderColor: colors.primaryDark,
    borderRadius: 16,
    paddingHorizontal: 12,
    backgroundColor: colors.surface,
  },
  input: { flex: 1, color: colors.text, fontSize: 16, fontWeight: "600", paddingVertical: 8 },
  hint: { color: colors.textMuted, fontSize: 14 },
  notice: { color: colors.success, fontSize: 13 },
  linkCenter: { alignItems: "center", paddingVertical: 4 },
  linkRow: { flexDirection: "row", justifyContent: "space-between" },
  link: { color: "#0b5a79", fontSize: 14, fontWeight: "600" },
  footer: { color: colors.onPrimary, fontSize: 12, fontWeight: "500", textAlign: "center", paddingVertical: 12 },
});
