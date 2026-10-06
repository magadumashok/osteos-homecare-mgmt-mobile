import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useResponsiveLayout } from "../utils/responsive";

/** Centered, width-capped content for the login-style screens. */
export default function ScreenContainer({
  children,
  backgroundColor = "#f1f5f9",
  scrollEnabled = true,
  centered = true,
  keyboardAware = false,
}) {
  const responsive = useResponsiveLayout();

  const content = (
    <View
      style={[
        styles.inner,
        !scrollEnabled && styles.innerNoScroll,
        { maxWidth: responsive.contentMaxWidth, paddingHorizontal: responsive.horizontalPadding },
      ]}
    >
      {children}
    </View>
  );

  return (
    <SafeAreaView style={[styles.flex, { backgroundColor }]}>
      <KeyboardAvoidingView
        behavior={keyboardAware && Platform.OS === "ios" ? "padding" : undefined}
        style={styles.flex}
      >
        {scrollEnabled ? (
          <ScrollView
            bounces={false}
            contentContainerStyle={[styles.scrollContent, centered && styles.centered]}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            {content}
          </ScrollView>
        ) : (
          <View style={[styles.flex, centered && styles.centered]}>{content}</View>
        )}
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  scrollContent: { flexGrow: 1, paddingVertical: 18 },
  centered: { justifyContent: "center" },
  inner: { width: "100%", alignSelf: "center" },
  innerNoScroll: { flex: 1 },
});
