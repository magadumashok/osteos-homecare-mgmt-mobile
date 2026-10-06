/**
 * State:
 *   bootstrapped  — the stored session has been checked on launch
 *   user          — the signed-in user (name, username, roles, profile_image, ...)
 *   homecare      — { homecare_id, name, ... }
 *   permissions   — effective permissions from the server, e.g. ["patients.view"]
 *   loading/error — for the login screens
 */
import { createSlice } from "@reduxjs/toolkit";
import {
  thunkLoginWithOtp,
  thunkLoginWithPassword,
  thunkLogout,
  thunkRefreshProfile,
  thunkRestoreSession,
  thunkSendLoginOtp,
} from "../thunks/authThunks";

const initialState = {
  bootstrapped: false,
  user: null,
  homecare: null,
  permissions: [],
  loading: false,
  error: null,
};

const signedOut = () => ({ ...initialState, bootstrapped: true });

function applySession(state, session) {
  state.user = session.user;
  state.homecare = session.homecare;
  state.permissions = session.permissions || [];
  state.loading = false;
  state.error = null;
}

const pending = (state) => {
  state.loading = true;
  state.error = null;
};

const rejected = (state, action) => {
  state.loading = false;
  state.error = action.payload || "Something went wrong. Please try again.";
};

const authSlice = createSlice({
  name: "auth",
  initialState,
  reducers: {
    clearError(state) {
      state.error = null;
    },
    sessionExpired: signedOut,
    setProfileImage(state, action) {
      if (state.user) state.user.profile_image = action.payload;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(thunkRestoreSession.fulfilled, (state, action) => {
        state.bootstrapped = true;
        if (action.payload) applySession(state, action.payload);
      })
      .addCase(thunkRestoreSession.rejected, signedOut);

    builder
      .addCase(thunkLoginWithPassword.pending, pending)
      .addCase(thunkLoginWithPassword.fulfilled, (state, action) => applySession(state, action.payload))
      .addCase(thunkLoginWithPassword.rejected, rejected);

    builder
      .addCase(thunkSendLoginOtp.pending, pending)
      .addCase(thunkSendLoginOtp.fulfilled, (state) => {
        state.loading = false;
      })
      .addCase(thunkSendLoginOtp.rejected, rejected);

    builder
      .addCase(thunkLoginWithOtp.pending, pending)
      .addCase(thunkLoginWithOtp.fulfilled, (state, action) => applySession(state, action.payload))
      .addCase(thunkLoginWithOtp.rejected, rejected);

    builder.addCase(thunkRefreshProfile.fulfilled, (state, action) => applySession(state, action.payload));

    builder.addCase(thunkLogout.fulfilled, signedOut).addCase(thunkLogout.rejected, signedOut);
  },
});

export const { clearError, sessionExpired, setProfileImage } = authSlice.actions;
export default authSlice.reducer;
