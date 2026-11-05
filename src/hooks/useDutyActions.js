import { useState } from "react";
import { Alert } from "react-native";
import { markNotAttended, signIn, signOut } from "../services/dutyService";
import { fromIsoDate, nowTime, shortDate, time12, toIsoDate } from "../utils/dates";
import { currentPosition } from "../utils/location";

/** Where a duty stands, for the status chip and which buttons to show. */
export function dutyStatus(duty) {
  // 24-hour stays run between two dates and are signed in and out once a day
  // (the server sends that day's sign_in / sign_out on the duty).
  if (duty.live_in) {
    const today = toIsoDate();
    if (duty.not_attended) return { key: "missed", label: "Cancelled", color: "#b91c1c", bg: "#fef2f2" };
    if (duty.sign_in && !duty.sign_out) return { key: "active", label: "On duty", color: "#e65100", bg: "#fff3e0" };
    if (duty.date > today) return { key: "upcoming", label: "Upcoming", color: "#1565c0", bg: "#e3f2fd" };
    if ((duty.end_date || duty.date) < today) return { key: "ended", label: "Ended", color: "#2e7d32", bg: "#e8f5e9" };
    if (duty.sign_out) return { key: "done", label: "Done for the day", color: "#2e7d32", bg: "#e8f5e9" };
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
  // A 24-hour day still open (e.g. handover next morning) can always be signed out.
  if (duty.live_in && duty.sign_in && !duty.sign_out) return true;
  return duty.date <= today && (duty.end_date || duty.date) >= today;
}

// Sign-in opens this long before the start time and closes this long after it.
// The server has the same limits and has the final say (config/homecare.php).
const EARLY_MINUTES = 10;
const LATE_MINUTES = 10;
// Sign-out opens this long before the end time and has no closing time.
const SIGNOUT_EARLY_MINUTES = 10;

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
    signInFrom: new Date(start.getTime() - EARLY_MINUTES * 60000),
    signInUntil: new Date(start.getTime() + LATE_MINUTES * 60000),
    signOutFrom: new Date(end.getTime() - SIGNOUT_EARLY_MINUTES * 60000),
  };
}

/** Today's sign-in window around a 24-hour duty's daily start time. */
function dayWindow(duty) {
  const start = at(toIsoDate(), duty.day_start_time);
  return {
    start,
    signInFrom: new Date(start.getTime() - EARLY_MINUTES * 60000),
    signInUntil: new Date(start.getTime() + LATE_MINUTES * 60000),
  };
}

/** Is sign-in open around the daily start time (even across midnight)? */
function inDayWindow(duty, now = new Date()) {
  const [h, m] = String(duty.day_start_time).split(":").map(Number);
  const gap = now.getHours() * 60 + now.getMinutes() - (h * 60 + m);
  // Minutes after the start (negative before it), the short way round the clock.
  const offset = ((gap + 720 + 1440) % 1440) - 720;
  return offset >= -EARLY_MINUTES && offset <= LATE_MINUTES;
}

/** "Sign in between 8:55 am and 9:05 am" for the card under the button. */
export function signInHint(duty) {
  if (duty.live_in) {
    if (!duty.day_start_time) return "Sign in when you start today's care, and sign out at handover.";
    const { start, signInFrom, signInUntil } = dayWindow(duty);
    const signOutFrom = new Date(start.getTime() - SIGNOUT_EARLY_MINUTES * 60000);
    return `Sign in between ${clock(signInFrom)} and ${clock(signInUntil)}. Sign out from ${clock(signOutFrom)} the next day.`;
  }
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
    if (duty.live_in) return confirmDay(duty, "in");
    const { signInFrom, signInUntil } = dutyWindow(duty);
    const now = new Date();
    if (now < signInFrom) {
      Alert.alert("Too early", `You can sign in from ${clock(signInFrom)} (${EARLY_MINUTES} minutes before the visit starts).`);
      return;
    }
    if (now > signInUntil) {
      Alert.alert(
        "Sign-in closed",
        `Sign-in was open until ${clock(signInUntil)}, ${LATE_MINUTES} minutes after the start time. Ask your coordinator to reschedule the duty.`,
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

  /**
   * A day of a 24-hour stay: signed in around the daily start time and out
   * from that time the next day (duties without a start time have no window).
   * The server checks too; a day it has not named is left for it to judge.
   */
  const confirmDay = (duty, direction) => {
    const signingIn = direction === "in";
    const who = duty.patient_name || "this patient";
    if (duty.day_start_time && signingIn && !inDayWindow(duty)) {
      const { signInFrom, signInUntil } = dayWindow(duty);
      Alert.alert("Sign-in closed", `You can sign in between ${clock(signInFrom)} and ${clock(signInUntil)}. If you missed it, ask your coordinator.`);
      return;
    }
    if (duty.day_start_time && !signingIn && duty.attendance_date) {
      const end = new Date(at(duty.attendance_date, duty.day_start_time).getTime() + 86400000);
      const from = new Date(end.getTime() - SIGNOUT_EARLY_MINUTES * 60000);
      if (new Date() < from) {
        Alert.alert("24 hours not over", `You can sign out from ${clock(from)} on ${shortDate(toIsoDate(from))}.`);
        return;
      }
    }
    return Alert.alert(
      signingIn ? "Sign in for today" : "Sign out",
      signingIn ? `Start today's care with ${who} now?` : `End your day with ${who} now? Sign out at handover.`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: signingIn ? "Sign in" : "Sign out",
          onPress: () => {
            const time = nowTime();
            const send = signingIn ? signIn : signOut;
            run(
              duty,
              async () => send(duty._id, { time, position: await currentPosition() }),
              signingIn ? "Signed in" : "Signed out",
              signingIn ? { sign_in: true, signin_time: time } : { sign_out: true, signout_time: time },
            );
          },
        },
      ],
    );
  };

  const confirmSignOut = (duty) => {
    if (!duty.sign_in) {
      Alert.alert("Not signed in", "Sign in to this duty first.");
      return;
    }
    if (duty.live_in) return confirmDay(duty, "out");
    const { end, signOutFrom } = dutyWindow(duty);
    if (new Date() < signOutFrom) {
      Alert.alert("Session not over", `You can sign out from ${clock(signOutFrom)}. The session ends at ${clock(end)}.`);
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
