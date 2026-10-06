import { registerRootComponent } from "expo";
import App from "./src/App";
import { registerBackgroundHandler } from "./src/utils/pushNotifications";

// FCM must have its background handler before the app mounts.
registerBackgroundHandler();

registerRootComponent(App);
