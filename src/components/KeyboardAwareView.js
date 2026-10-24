import { View } from "react-native";
import useKeyboardOverlap from "../hooks/useKeyboardOverlap";

/**
 * Drop-in for KeyboardAvoidingView that also works on Android, where the app
 * runs edge-to-edge and the window no longer resizes for the keyboard. The
 * content shrinks by however much the keyboard covers this view.
 */
export default function KeyboardAwareView({ style, children }) {
  const [ref, overlap] = useKeyboardOverlap();
  return (
    <View ref={ref} style={[style, { paddingBottom: overlap }]}>
      {children}
    </View>
  );
}
