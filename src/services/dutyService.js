import api, { message, unwrap } from "./api";

/** The signed-in user's duties ending on `date` (their day's work), with patient name and address. */
export const myDuties = (date) => api.get("duties/mine", { params: { date } }).then(unwrap);

export const getDuty = (id) => api.get(`duties/${id}`).then(unwrap);

export const signIn = (id, { time, position }) =>
  api
    .post(`duties/${id}/sign-in`, {
      signin_time: time,
      signin_latitude: position?.latitude ?? null,
      signin_longitude: position?.longitude ?? null,
    })
    .then(message);

export const signOut = (id, { time, position }) =>
  api
    .post(`duties/${id}/sign-out`, {
      signout_time: time,
      signout_latitude: position?.latitude ?? null,
      signout_longitude: position?.longitude ?? null,
    })
    .then(message);

export const markNotAttended = (id, reason) =>
  api.post(`duties/${id}/not-attended`, { reason }).then(message);

// ─── Scheduling (admin) ──────────────────────────────────────────────────────
/** ?date= duties starting that day; ?since= from that day on. */
export const listDuties = (params) => api.get("duties", { params }).then(unwrap);

export const createDuty = (data) => api.post("duties", data);

export const createDutySeries = (data) => api.post("duties/series", data);

export const rescheduleDuty = (id, data) => api.put(`duties/${id}`, data).then(message);

export const createShortVisit = (data) => api.post("short-visits", data).then(message);

/** A staff member's duties (with one patient when patientId is given). */
export const staffAttendance = (staffId, patientId) =>
  api.get(`attendance/staff/${encodeURIComponent(staffId)}`, { params: patientId ? { patient_id: patientId } : {} }).then(unwrap);
