import { useState } from "react";
import { ActivityIndicator, Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { colors, radius } from "../theme";

export function TextField({ label, style, ...inputProps }) {
  return (
    <View style={styles.fieldGroup}>
      {!!label && <Text style={styles.label}>{label}</Text>}
      <View style={styles.inputWrap}>
        <TextInput placeholderTextColor={colors.textFaint} style={[styles.input, style]} {...inputProps} />
      </View>
    </View>
  );
}

export function PasswordField({ label, ...inputProps }) {
  const [visible, setVisible] = useState(false);
  return (
    <View style={styles.fieldGroup}>
      {!!label && <Text style={styles.label}>{label}</Text>}
      <View style={styles.inputWrap}>
        <TextInput
          secureTextEntry={!visible}
          autoCapitalize="none"
          autoCorrect={false}
          placeholderTextColor={colors.textFaint}
          style={styles.input}
          {...inputProps}
        />
        <Pressable
          onPress={() => setVisible((v) => !v)}
          hitSlop={10}
          accessibilityLabel={visible ? "Hide password" : "Show password"}
        >
          <Ionicons name={visible ? "eye-off-outline" : "eye-outline"} size={22} color={colors.textMuted} />
        </Pressable>
      </View>
    </View>
  );
}

export function PrimaryButton({ title, icon, onPress, loading, disabled, variant = "solid", style }) {
  const outline = variant === "outline";
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled || loading}
      accessibilityRole="button"
      style={({ pressed }) => [
        styles.button,
        outline && styles.buttonOutline,
        (pressed || loading) && styles.pressed,
        disabled && styles.disabled,
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator color={outline ? colors.primary : colors.onPrimary} />
      ) : (
        <View style={styles.buttonContent}>
          {!!icon && <Ionicons name={icon} size={20} color={outline ? colors.primary : colors.onPrimary} />}
          <Text style={[styles.buttonText, outline && styles.buttonTextOutline]}>{title}</Text>
        </View>
      )}
    </Pressable>
  );
}

export function ErrorBanner({ message }) {
  if (!message) return null;
  return (
    <View style={styles.errorBanner}>
      <Ionicons name="alert-circle-outline" size={16} color={colors.danger} />
      <Text style={styles.errorText}>{message}</Text>
    </View>
  );
}

/** Six single-digit boxes that move focus as the user types. */
export function OtpInput({ value, onChange, editable = true, refs }) {
  const digits = value.padEnd(6, " ").split("").slice(0, 6);

  const setDigit = (text, index) => {
    const digit = text.replace(/\D/g, "").slice(-1);
    const next = digits.map((d, i) => (i === index ? digit || " " : d)).join("");
    onChange(next.replace(/\s+$/, ""));
    if (digit && index < 5) refs.current[index + 1]?.focus();
  };

  const onKeyPress = (key, index) => {
    if (key === "Backspace" && digits[index] === " " && index > 0) refs.current[index - 1]?.focus();
  };

  return (
    <View style={styles.otpRow}>
      {digits.map((digit, index) => (
        <TextInput
          key={index}
          ref={(r) => {
            refs.current[index] = r;
          }}
          value={digit.trim()}
          onChangeText={(text) => setDigit(text, index)}
          onKeyPress={({ nativeEvent }) => onKeyPress(nativeEvent.key, index)}
          keyboardType="number-pad"
          maxLength={1}
          textAlign="center"
          editable={editable}
          style={styles.otpBox}
          accessibilityLabel={`Digit ${index + 1}`}
        />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  fieldGroup: { gap: 8 },
  label: { color: colors.textBody, fontSize: 14, fontWeight: "600" },
  inputWrap: {
    minHeight: 52,
    paddingHorizontal: 14,
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    backgroundColor: colors.surface,
  },
  input: { flex: 1, color: colors.text, fontSize: 16, paddingVertical: 10 },

  button: {
    height: 52,
    borderRadius: 35,
    backgroundColor: colors.primaryDark,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.18,
    shadowRadius: 10,
    elevation: 6,
  },
  buttonOutline: {
    backgroundColor: colors.surface,
    borderWidth: 1.5,
    borderColor: colors.primary,
    shadowOpacity: 0,
    elevation: 0,
  },
  pressed: { opacity: 0.85 },
  disabled: { opacity: 0.5 },
  buttonContent: { flexDirection: "row", alignItems: "center", gap: 10 },
  buttonText: { color: colors.onPrimary, fontSize: 16, fontWeight: "700" },
  buttonTextOutline: { color: colors.primary },

  errorBanner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: colors.dangerSoft,
    borderWidth: 1,
    borderColor: colors.dangerBorder,
    borderRadius: radius.sm,
    padding: 10,
  },
  errorText: { flex: 1, color: colors.danger, fontSize: 13 },

  otpRow: { flexDirection: "row", justifyContent: "space-between", gap: 6 },
  otpBox: {
    flex: 1,
    maxWidth: 48,
    height: 54,
    borderWidth: 1,
    borderColor: "#cbd5e1",
    borderRadius: 10,
    backgroundColor: colors.surface,
    fontSize: 22,
    color: "#0f172a",
    fontWeight: "600",
  },
});
