import { configureStore } from "@reduxjs/toolkit";
import authReducer, { sessionExpired } from "./slices/authSlice";
import { removeToken, setSessionExpiredHandler } from "../services/api";

export const store = configureStore({
  reducer: {
    auth: authReducer,
  },
});

// A 401 that a token refresh could not fix sends the user back to login.
setSessionExpiredHandler(async () => {
  await removeToken();
  store.dispatch(sessionExpired());
});
