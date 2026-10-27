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
  const [focused, setFocused] = useState(null);
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

  const fieldStyle = (name) => [
    styles.inputWrap,
    { minHeight: responsive.controlHeight },
    focused === name && styles.inputWrapFocused,
  ];
  const iconColor = (name) => (focused === name ? colors.primaryDark : colors.textFaint);

  const mobileInput = (
    <View style={styles.field}>
      <Text style={styles.label}>Mobile number</Text>
      <View style={fieldStyle("mobile")}>
        <Ionicons name="call-outline" size={20} color={iconColor("mobile")} />
        <TextInput
          keyboardType="phone-pad"
          autoComplete="tel"
          maxLength={15}
          value={mobile}
          onChangeText={(v) => {
            setMobile(v);
            resetMessages();
          }}
          onFocus={() => setFocused("mobile")}
          onBlur={() => setFocused(null)}
          placeholder="Enter your mobile number"
          placeholderTextColor={colors.textFaint}
          style={styles.input}
          editable={!loading}
          accessibilityLabel="Mobile number"
        />
      </View>
    </View>
  );

  const title = otpStep ? "Verify your number" : "Welcome back";
  const subtitle = otpStep
    ? `Enter the 6-digit code sent to ${cleanMobile(mobile)}`
    : "Sign in to continue to your account";

  return (
    <LinearGradient
      colors={colors.loginGradient}
      locations={[0, 0.35, 0.7, 1]}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={styles.flex}
    >
      {/* Soft decorative shapes behind the content */}
      <View pointerEvents="none" style={[styles.blob, styles.blobTop]} />
      <View pointerEvents="none" style={[styles.blob, styles.blobBottom]} />

      <ScreenContainer keyboardAware backgroundColor="transparent">
        <View style={styles.layout}>
          <View style={styles.hero}>
            <Image
              resizeMode="contain"
              source={require("../../../assets/osteos-logo.png")}
              style={[styles.logo, responsive.isTablet ? styles.logoTablet : responsive.height < 700 && styles.logoCompact]}
            />
            <View style={styles.brandPill}>
              <Ionicons name="medkit-outline" size={14} color={colors.onPrimary} />
              <Text style={styles.brandText}>Homecare</Text>
            </View>
          </View>

          <View style={[styles.card, { padding: responsive.cardPadding + 4 }]}>
            <View style={styles.cardHeader}>
              {otpStep && (
                <View style={styles.headerIcon}>
                  <Ionicons name="shield-checkmark-outline" size={26} color={colors.primaryDark} />
                </View>
              )}
              <Text style={styles.heading}>{title}</Text>
              <Text style={styles.subheading}>{subtitle}</Text>
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
                        color={active ? colors.primaryDark : colors.textMuted}
                      />
                      <Text style={[styles.tabText, active && styles.tabTextActive]}>
                        {t === TABS.OTP ? "OTP" : "Password"}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
            )}

            <View style={styles.form}>
              <ErrorBanner message={shownError} />
              {!!notice && !shownError && (
                <View style={styles.noticeBox}>
                  <Ionicons name="checkmark-circle" size={18} color={colors.success} />
                  <Text style={styles.notice}>{notice}</Text>
                </View>
              )}

              {tab === TABS.PASSWORD && (
                <>
                  {mobileInput}
                  <View style={styles.field}>
                    <View style={styles.labelRow}>
                      <Text style={styles.label}>Password</Text>
                      <Pressable
                        onPress={() => {
                          resetMessages();
                          navigation.navigate("ForgotPassword", { mobile: cleanMobile(mobile) });
                        }}
                        hitSlop={8}
                      >
                        <Text style={styles.link}>Forgot password?</Text>
                      </Pressable>
                    </View>
                    <View style={fieldStyle("password")}>
                      <Ionicons name="lock-closed-outline" size={20} color={iconColor("password")} />
                      <TextInput
                        secureTextEntry={!showPassword}
                        autoCapitalize="none"
                        value={password}
                        onChangeText={(v) => {
                          setPassword(v);
                          resetMessages();
                        }}
                        onFocus={() => setFocused("password")}
                        onBlur={() => setFocused(null)}
                        placeholder="Enter your password"
                        placeholderTextColor={colors.textFaint}
                        style={styles.input}
                        editable={!loading}
                        onSubmitEditing={onPasswordLogin}
                        accessibilityLabel="Password"
                      />
                      <Pressable
                        onPress={() => setShowPassword((v) => !v)}
                        hitSlop={10}
                        accessibilityLabel={showPassword ? "Hide password" : "Show password"}
                      >
                        <Ionicons
                          name={showPassword ? "eye-off-outline" : "eye-outline"}
                          size={20}
                          color={colors.textMuted}
                        />
                      </Pressable>
                    </View>
                  </View>
                  <PrimaryButton
                    title="Sign in"
                    icon="log-in-outline"
                    loading={loading}
                    onPress={onPasswordLogin}
                    style={styles.submit}
                  />
                </>
              )}

              {tab === TABS.OTP && !otpStep && (
                <>
                  {mobileInput}
                  <View style={styles.hintRow}>
                    <Ionicons name="information-circle-outline" size={16} color={colors.textMuted} />
                    <Text style={styles.hint}>We'll text a 6-digit code to this number.</Text>
                  </View>
                  <PrimaryButton
                    title="Send code"
                    icon="paper-plane-outline"
                    loading={loading}
                    onPress={onSendOtp}
                    style={styles.submit}
                  />
                </>
              )}

              {tab === TABS.OTP && otpStep && (
                <>
                  <OtpInput value={otp} onChange={setOtp} editable={!loading} refs={otpRefs} />
                  <PrimaryButton
                    title="Verify & sign in"
                    icon="checkmark-circle-outline"
                    loading={loading}
                    onPress={onVerifyOtp}
                    style={styles.submit}
                  />
                  <View style={styles.linkRow}>
                    <Pressable
                      onPress={() => {
                        setOtpStep(false);
                        resetMessages();
                      }}
                      disabled={loading}
                      style={styles.linkButton}
                      hitSlop={8}
                    >
                      <Ionicons name="arrow-back" size={16} color={colors.primaryDark} />
                      <Text style={styles.link}>Change number</Text>
                    </Pressable>
                    <Pressable onPress={onSendOtp} disabled={loading} style={styles.linkButton} hitSlop={8}>
                      <Ionicons name="refresh" size={16} color={colors.primaryDark} />
                      <Text style={styles.link}>Resend code</Text>
                    </Pressable>
                  </View>
                </>
              )}
            </View>
          </View>

          <View style={styles.footer}>
            <Ionicons name="lock-closed" size={12} color={colors.onPrimaryMuted} />
            <Text style={styles.footerText}>Secure login · Powered by Osteos.io</Text>
          </View>
        </View>
      </ScreenContainer>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  layout: { gap: 20, width: "100%", maxWidth: 460, alignSelf: "center" },

  blob: { position: "absolute", borderRadius: 999, backgroundColor: "rgba(255,255,255,0.06)" },
  blobTop: { width: 320, height: 320, top: -120, right: -100 },
  blobBottom: { width: 260, height: 260, bottom: -90, left: -110 },

  hero: { alignItems: "center", gap: 14, paddingTop: 8 },
  logo: { width: 210, height: 104 },
  logoTablet: { width: 260, height: 128 },
  // Short phones: a smaller logo keeps the Sign in button on screen.
  logoCompact: { width: 160, height: 80 },
  brandPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: colors.onPrimaryGlass,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.25)",
  },
  brandText: { color: colors.onPrimary, fontSize: 13, fontWeight: "700", letterSpacing: 1.2, textTransform: "uppercase" },

  card: {
    backgroundColor: colors.surface,
    borderRadius: 28,
    shadowColor: "#001c26",
    shadowOffset: { width: 0, height: 16 },
    shadowOpacity: 0.25,
    shadowRadius: 24,
    elevation: 14,
  },
  cardHeader: { marginBottom: 14, gap: 4 },
  headerIcon: {
    width: 44,
    height: 44,
    borderRadius: 16,
    backgroundColor: colors.primarySoft,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 2,
  },
  heading: { color: colors.text, fontSize: 22, fontWeight: "800" },
  subheading: { color: colors.textMuted, fontSize: 14, lineHeight: 20 },

  tabRow: {
    flexDirection: "row",
    padding: 4,
    borderRadius: 14,
    backgroundColor: "#f1f5f9",
    marginBottom: 14,
  },
  tab: {
    flex: 1,
    minHeight: 38,
    paddingVertical: 6,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    borderRadius: 11,
  },
  tabActive: {
    backgroundColor: colors.surface,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
    elevation: 2,
  },
  tabText: { fontSize: 14, fontWeight: "600", color: colors.textMuted },
  tabTextActive: { color: colors.primaryDark, fontWeight: "700" },

  form: { gap: 12 },
  field: { gap: 6 },
  labelRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  label: { color: colors.textBody, fontSize: 13, fontWeight: "700" },
  inputWrap: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    borderWidth: 1.5,
    borderColor: "#e5e7eb",
    borderRadius: 14,
    paddingHorizontal: 14,
    backgroundColor: "#f9fafb",
  },
  inputWrapFocused: { borderColor: colors.primaryDark, backgroundColor: colors.surface },
  input: { flex: 1, color: colors.text, fontSize: 16, fontWeight: "500", paddingVertical: 8 },

  hintRow: { flexDirection: "row", alignItems: "center", gap: 6, marginTop: -6 },
  hint: { flex: 1, color: colors.textMuted, fontSize: 13 },
  noticeBox: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    padding: 12,
    borderRadius: 12,
    backgroundColor: "#ecfdf3",
  },
  notice: { flex: 1, color: colors.success, fontSize: 13, fontWeight: "500" },

  submit: { marginTop: 2, borderRadius: 14 },
  linkRow: { flexDirection: "row", justifyContent: "space-between" },
  linkButton: { flexDirection: "row", alignItems: "center", gap: 4 },
  link: { color: colors.primaryDark, fontSize: 13, fontWeight: "700" },

  footer: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6, paddingVertical: 8 },
  footerText: { color: colors.onPrimaryMuted, fontSize: 12, fontWeight: "500" },
});
