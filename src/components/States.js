import { ActivityIndicator, StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { colors } from "../theme";
import { PrimaryButton } from "./Form";

export function LoadingView({ label = "Loading…" }) {
  return (
    <View style={styles.center}>
      <ActivityIndicator size="large" color={colors.primary} />
      <Text style={styles.muted}>{label}</Text>
    </View>
  );
}

export function EmptyState({ icon = "file-tray-outline", title, subtitle }) {
  return (
    <View style={styles.empty}>
      <Ionicons name={icon} size={48} color="#d1d5db" />
      <Text style={styles.emptyTitle}>{title}</Text>
      {!!subtitle && <Text style={styles.emptySubtitle}>{subtitle}</Text>}
    </View>
  );
}

export function ErrorState({ message, onRetry }) {
  return (
    <View style={styles.center}>
      <Ionicons name="cloud-offline-outline" size={44} color={colors.danger} />
      <Text style={styles.errorText}>{message}</Text>
      {!!onRetry && <PrimaryButton title="Try again" icon="refresh" variant="outline" onPress={onRetry} />}
    </View>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: "center", justifyContent: "center", gap: 12, padding: 24 },
  muted: { color: colors.textMuted, fontSize: 13 },
  empty: { alignItems: "center", paddingTop: 60, gap: 10, paddingHorizontal: 24 },
  emptyTitle: { color: colors.textBody, fontSize: 16, fontWeight: "600" },
  emptySubtitle: { color: colors.textFaint, fontSize: 13, textAlign: "center" },
  errorText: { color: colors.textBody, fontSize: 14, textAlign: "center" },
});
