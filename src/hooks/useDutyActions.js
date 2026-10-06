import { useState } from "react";
import { Alert } from "react-native";
import { markNotAttended, signIn, signOut } from "../services/dutyService";
import { nowTime, toIsoDate } from "../utils/dates";
import { currentPosition } from "../utils/location";

/** Where a duty stands, for the status chip and which buttons to show. */
export function dutyStatus(duty) {
  if (duty.not_attended) return { key: "missed", label: "Not attended", color: "#b91c1c", bg: "#fef2f2" };
  if (duty.sign_out) return { key: "done", label: "Completed", color: "#2e7d32", bg: "#e8f5e9" };
  if (duty.sign_in) return { key: "active", label: "In progress", color: "#e65100", bg: "#fff3e0" };
  return { key: "scheduled", label: "Scheduled", color: "#1565c0", bg: "#e3f2fd" };
}

/** Sign-in/out happens on the day of the visit, as in the old "today's schedule". */
export function isActionable(duty) {
  const today = toIsoDate();
  return duty.date <= today && (duty.end_date || duty.date) >= today;
}

/**
 * Sign in, sign out and "can't attend", with confirmation and GPS.
 * `onChanged(patch)` runs after a successful update with the changed fields.
 */
export default function useDutyActions(onChanged) {
  const [busyId, setBusyId] = useState(null);

  /** Returns true on success. `patch` is applied locally via onChanged(patch). */
  const run = async (duty, request, done, patch) => {
    setBusyId(duty._id);
    try {
      await request();
      Alert.alert(done);
      onChanged?.(patch);
      return true;
    } catch (e) {
      Alert.alert("Could not update duty", e.message);
      return false;
    } finally {
      setBusyId(null);
    }
  };

  const confirmSignIn = (duty) =>
    Alert.alert("Sign in", `Start your visit with ${duty.patient_name || "this patient"} now?`, [
      { text: "Cancel", style: "cancel" },
      {
        text: "Sign in",
        onPress: () => {
          const time = nowTime();
          run(duty, async () => signIn(duty._id, { time, position: await currentPosition() }), "Signed in", {
            sign_in: true,
            signin_time: time,
          });
        },
      },
    ]);

  const confirmSignOut = (duty) =>
    Alert.alert("Sign out", `Finish your visit with ${duty.patient_name || "this patient"} now?`, [
      { text: "Cancel", style: "cancel" },
      {
        text: "Sign out",
        onPress: () => {
          const time = nowTime();
          run(duty, async () => signOut(duty._id, { time, position: await currentPosition() }), "Signed out", {
            sign_out: true,
            signout_time: time,
          });
        },
      },
    ]);

  const notAttended = (duty, reason) =>
    run(duty, () => markNotAttended(duty._id, reason), "Duty updated", { not_attended: true, not_attended_reason: reason });

  return { busyId, confirmSignIn, confirmSignOut, notAttended };
}
