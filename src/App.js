import { useEffect } from "react";
import { Alert } from "react-native";
import { NavigationContainer } from "@react-navigation/native";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import { Provider, useSelector } from "react-redux";
import AppNavigator from "./navigation/AppNavigator";
import { store } from "./store";
import { listenForNotifications, registerForPushNotifications } from "./utils/pushNotifications";
import { isSafeRoomUrl, joinRoom } from "./utils/videoCall";

/** Registers for pushes once signed in and shows messages that arrive while open. */
function PushNotifications() {
  const username = useSelector((s) => s.auth.user?.username);

  useEffect(() => {
    if (username) registerForPushNotifications();
  }, [username]);

  useEffect(
    () =>
      listenForNotifications({
        onForeground: (message) => {
          const { title, body } = message?.notification || {};
          const room = message?.data?.videoRoomUrl;
          // Incoming video call (sent by POST video-calls): offer to join.
          if (isSafeRoomUrl(room)) {
            Alert.alert(title || "Incoming video call", body || "", [
              { text: "Not now", style: "cancel" },
              { text: "Join", onPress: () => joinRoom(room) },
            ]);
          } else if (title || body) {
            Alert.alert(title || "New notification", body || "");
          }
        },
        // Tapping the call notification opens the room straight away.
        onOpened: (data) => joinRoom(data?.videoRoomUrl),
      }),
    [],
  );

  return null;
}

export default function App() {
  return (
    <Provider store={store}>
      <SafeAreaProvider>
        <PushNotifications />
        <NavigationContainer>
          <StatusBar style="light" />
          <AppNavigator />
        </NavigationContainer>
      </SafeAreaProvider>
    </Provider>
  );
}
