import { createAsyncThunk } from "@reduxjs/toolkit";
import * as authService from "../../services/authService";
import { getToken, removeToken, saveToken } from "../../services/api";

const fail = (error) => error?.message || "Something went wrong. Please try again.";

/** Keep the token, return the session the reducer stores. */
async function startSession(data) {
  await saveToken(data.access_token);
  return { user: data.user, homecare: data.homecare, permissions: data.permissions || [] };
}

/** On launch: resume the stored session if the token still works. */
export const thunkRestoreSession = createAsyncThunk("auth/restore", async () => {
  const token = await getToken();
  if (!token) return null;
  try {
    return await authService.me();
  } catch (error) {
    // Offline: keep the token and try again next launch. Rejected: sign out.
    if (error?.status === 401) await removeToken();
    return null;
  }
});

export const thunkLoginWithPassword = createAsyncThunk(
  "auth/loginPassword",
  async ({ mobile, password }, { rejectWithValue }) => {
    try {
      return await startSession(await authService.login(mobile, password));
    } catch (error) {
      return rejectWithValue(fail(error));
    }
  },
);

export const thunkSendLoginOtp = createAsyncThunk(
  "auth/sendLoginOtp",
  async ({ mobile }, { rejectWithValue }) => {
    try {
      return await authService.sendOtp(mobile, "login");
    } catch (error) {
      return rejectWithValue(fail(error));
    }
  },
);

export const thunkLoginWithOtp = createAsyncThunk(
  "auth/loginOtp",
  async ({ mobile, otp }, { rejectWithValue }) => {
    try {
      return await startSession(await authService.otpLogin(mobile, otp));
    } catch (error) {
      return rejectWithValue(fail(error));
    }
  },
);

/** Re-read the user and permissions (after a profile change or role edit). */
export const thunkRefreshProfile = createAsyncThunk("auth/refreshProfile", async (_, { rejectWithValue }) => {
  try {
    return await authService.me();
  } catch (error) {
    return rejectWithValue(fail(error));
  }
});

export const thunkLogout = createAsyncThunk("auth/logout", async () => {
  try {
    // Stop pushes to this device for this account, then end the token.
    await authService.updateFirebaseToken(null);
    await authService.logout();
  } catch {
    // Signing out locally must work offline too.
  }
  await removeToken();
});
