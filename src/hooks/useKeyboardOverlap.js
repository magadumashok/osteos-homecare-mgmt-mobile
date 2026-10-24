import { useEffect, useRef, useState } from "react";
import { Keyboard, Platform } from "react-native";

/**
 * How far the keyboard covers the view `ref` is attached to. Measured rather
 * than taken from the keyboard height, so it is 0 when the window already
 * resized for the keyboard and correct under edge-to-edge when it did not.
 */
export default function useKeyboardOverlap() {
  const ref = useRef(null);
  const [overlap, setOverlap] = useState(0);

  useEffect(() => {
    const showEvent = Platform.OS === "ios" ? "keyboardWillShow" : "keyboardDidShow";
    const hideEvent = Platform.OS === "ios" ? "keyboardWillHide" : "keyboardDidHide";

    const show = Keyboard.addListener(showEvent, (e) => {
      const keyboardTop = e.endCoordinates.screenY;
      ref.current?.measureInWindow((x, y, width, height) => {
        setOverlap(Math.max(0, y + height - keyboardTop));
      });
    });
    const hide = Keyboard.addListener(hideEvent, () => setOverlap(0));

    return () => {
      show.remove();
      hide.remove();
    };
  }, []);

  return [ref, overlap];
}
