import { useState } from "react";
import { Alert } from "react-native";
import { markNotAttended, signIn, signOut } from "../services/dutyService";
import { fromIsoDate, nowTime, time12, toIsoDate } from "../utils/dates";
import { currentPosition } from "../utils/location";

/** Where a duty stands, for the status chip and which buttons to show. */
export function dutyStatus(duty) {
  // Caretakers stay round the clock between two dates; they log each day instead of signing in.
  if (duty.live_in) {
    const today = toIsoDate();
    if (duty.not_attended) return { key: "missed", label: "Cancelled", color: "#b91c1c", bg: "#fef2f2" };
    if (duty.date > today) return { key: "upcoming", label: "Upcoming", color: "#1565c0", bg: "#e3f2fd" };
    if ((duty.end_date || duty.date) < today) return { key: "done", label: "Ended", color: "#2e7d32", bg: "#e8f5e9" };
    return { key: "live_in", label: "24-hour care", color: "#6a1b9a", bg: "#f3e5f5" };
  }
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

// Sign-in is allowed this many minutes either side of the start time (the server checks too).
const GRACE_MINUTES = 5;

function at(date, time) {
  const d = fromIsoDate(date);
  const [h, m] = String(time || "00:00").split(":").map(Number);
  d.setHours(h || 0, m || 0, 0, 0);
  return d;
}

const clock = (d) => time12(`${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`);

/** When the visit starts and ends, and when sign-in is open (a visit ending "before" it starts runs overnight). */
export function dutyWindow(duty) {
  const start = at(duty.date, duty.start_time);
  let end = at(duty.end_date || duty.date, duty.end_time);
  if (end <= start) end = new Date(end.getTime() + 86400000);
  return {
    start,
    end,
    signInFrom: new Date(start.getTime() - GRACE_MINUTES * 60000),
    signInUntil: new Date(start.getTime() + GRACE_MINUTES * 60000),
  };
}

/** "Sign in between 8:55 am and 9:05 am" for the card under the button. */
export function signInHint(duty) {
  const { signInFrom, signInUntil } = dutyWindow(duty);
  return `Sign in between ${clock(signInFrom)} and ${clock(signInUntil)}`;
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

  const confirmSignIn = (duty) => {
    const { signInFrom, signInUntil } = dutyWindow(duty);
    const now = new Date();
    if (now < signInFrom) {
      Alert.alert("Too early", `You can sign in from ${clock(signInFrom)} (${GRACE_MINUTES} minutes before the visit starts).`);
      return;
    }
    if (now > signInUntil) {
      Alert.alert(
        "Sign-in closed",
        `Sign-in was open until ${clock(signInUntil)}, ${GRACE_MINUTES} minutes after the start time. Ask your coordinator to reschedule the duty.`,
      );
      return;
    }
    return Alert.alert("Sign in", `Start your visit with ${duty.patient_name || "this patient"} now?`, [
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
  };

  const confirmSignOut = (duty) => {
    if (!duty.sign_in) {
      Alert.alert("Not signed in", "Sign in to this duty first.");
      return;
    }
    const { end } = dutyWindow(duty);
    if (new Date() < end) {
      Alert.alert("Session not over", `You can sign out from ${clock(end)}, when the session ends.`);
      return;
    }
    return Alert.alert("Sign out", `Finish your visit with ${duty.patient_name || "this patient"} now?`, [
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
  };

  const notAttended = (duty, reason) =>
    run(duty, () => markNotAttended(duty._id, reason), "Duty updated", { not_attended: true, not_attended_reason: reason });

  return { busyId, confirmSignIn, confirmSignOut, notAttended };
}
