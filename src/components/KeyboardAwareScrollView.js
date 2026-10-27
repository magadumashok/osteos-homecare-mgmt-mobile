import { ScrollView } from "react-native";
import useScrollToFocusedInput from "../hooks/useScrollToFocusedInput";

/**
 * ScrollView for forms: keeps the focused field above the keyboard, also on
 * Android where the keyboard's size is not reliably reported (see
 * useScrollToFocusedInput). Takes the usual ScrollView props.
 */
export default function KeyboardAwareScrollView({ contentContainerStyle, children, ...props }) {
  const { scrollProps, extraBottom } = useScrollToFocusedInput();
  return (
    <ScrollView
      keyboardShouldPersistTaps="handled"
      {...props}
      {...scrollProps}
      contentContainerStyle={[contentContainerStyle, extraBottom > 0 && { paddingBottom: extraBottom }]}
    >
      {children}
    </ScrollView>
  );
}
