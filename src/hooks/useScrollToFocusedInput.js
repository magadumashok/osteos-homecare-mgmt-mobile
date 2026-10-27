import { useEffect, useRef, useState } from "react";
import { Keyboard, TextInput, useWindowDimensions } from "react-native";
import { useIsFocused } from "@react-navigation/native";

// The focused field is moved to this fraction of the visible height, which
// stays above the keyboard on phones and tablets.
const TARGET = 0.25;
// How often to look for a newly focused field while the keyboard is open.
const CHECK_MS = 150;

/**
 * Keeps the focused text field of a ScrollView above the keyboard.
 *
 * Under edge-to-edge, Android often reports the wrong keyboard size, or
 * nothing at all when the keyboard changes (e.g. number pad → letters, or
 * moving to the next field), so keyboard measurements are not used. While
 * the keyboard is open, the content gets extra bottom space so it can always
 * scroll, and whichever field has focus is scrolled into the top part.
 *
 * Returns props for the ScrollView and the extra bottom padding for its
 * content container. Only the screen in front reacts: the navigator keeps
 * earlier screens mounted underneath.
 */
export default function useScrollToFocusedInput(wanted = true) {
  const enabled = useIsFocused() && wanted;
  const scrollRef = useRef(null);
  const offsetRef = useRef(0);
  const { height: windowHeight } = useWindowDimensions();
  const [keyboardOpen, setKeyboardOpen] = useState(false);

  useEffect(() => {
    if (!enabled) return undefined;
    let interval;
    let lastInput = null;

    const check = () => {
      const input = TextInput.State.currentlyFocusedInput();
      const scroll = scrollRef.current;
      // Only act when focus moves, so the user can still scroll freely.
      if (!input || !scroll || input === lastInput) return;
      lastInput = input;
      scroll.measureInWindow((sx, sy, sw, viewportHeight) => {
        input.measureInWindow((ix, iy) => {
          const inputTop = iy - sy;
          const target = viewportHeight * TARGET;
          if (inputTop > target) scroll.scrollTo({ y: offsetRef.current + inputTop - target, animated: true });
        });
      });
    };

    const show = Keyboard.addListener("keyboardDidShow", () => {
      setKeyboardOpen(true);
      lastInput = null;
      clearInterval(interval);
      // Give the extra space a moment to lay out before scrolling.
      setTimeout(check, 80);
      interval = setInterval(check, CHECK_MS);
    });
    const hide = Keyboard.addListener("keyboardDidHide", () => {
      clearInterval(interval);
      lastInput = null;
      setKeyboardOpen(false);
    });

    return () => {
      clearInterval(interval);
      show.remove();
      hide.remove();
      setKeyboardOpen(false);
    };
  }, [enabled]);

  return {
    scrollProps: {
      ref: scrollRef,
      scrollEventThrottle: 16,
      onScroll: (e) => {
        offsetRef.current = e.nativeEvent.contentOffset.y;
      },
    },
    extraBottom: enabled && keyboardOpen ? Math.round(windowHeight * 0.5) : 0,
  };
}
