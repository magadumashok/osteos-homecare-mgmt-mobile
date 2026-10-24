import { StyleSheet, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { colors } from "../theme";

/**
 * Action bar pinned under a list (e.g. "Add medicine"). The app draws
 * edge-to-edge, so it pads itself above the system navigation bar.
 */
export default function BottomBar({ children, style }) {
  const insets = useSafeAreaInsets();
  return <View style={[styles.bar, { paddingBottom: 16 + insets.bottom }, style]}>{children}</View>;
}

const styles = StyleSheet.create({
  bar: { padding: 16, backgroundColor: colors.surface, borderTopWidth: 1, borderTopColor: colors.borderSoft },
});
