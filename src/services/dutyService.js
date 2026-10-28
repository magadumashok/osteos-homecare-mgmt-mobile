import api, { message, unwrap, uploadApi } from "./api";

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

/** A photo of the staff member with the patient at their home, with the GPS position. */
export const addPresencePhoto = (id, photo, position) => {
  const form = new FormData();
  form.append("photo", { uri: photo.uri, name: photo.name, type: photo.mimeType });
  if (position) {
    form.append("latitude", String(position.latitude));
    form.append("longitude", String(position.longitude));
  }
  return uploadApi
    .post(`duties/${id}/presence-photos`, form, { headers: { "Content-Type": "multipart/form-data" } })
    .then(unwrap);
};

export const markNotAttended = (id, reason) =>
  api.post(`duties/${id}/not-attended`, { reason }).then(message);

// ─── Scheduling (admin) ──────────────────────────────────────────────────────
/** ?date= duties starting that day; ?since= from that day on. */
export const listDuties = (params) => api.get("duties", { params }).then(unwrap);

export const createDuty = (data) => api.post("duties", data);

export const createDutySeries = (data) => api.post("duties/series", data);

export const rescheduleDuty = (id, data) => api.put(`duties/${id}`, data).then(message);

export const createShortVisit = (data) => api.post("short-visits", data).then(message);

// ─── 24-hour caretaker duties ────────────────────────────────────────────────
/** Care tasks offered when scheduling a caretaker. */
export const careTasks = () => api.get("care-logs/tasks").then(unwrap);

/** { duty, logs }: the duty (with names) and every logged or skipped day. */
export const careLogs = (dutyId) => api.get(`duties/${dutyId}/care-logs`).then(unwrap);

/** Every caretaker duty running on `date`, each with its `log` for the day (or null). */
export const careDay = (date) => api.get("care-logs", { params: { date } }).then(unwrap);

/** The day's update: { tasks: [{ name, done, time, note }], symptoms, notes }. */
export const saveCareLog = (dutyId, date, data) => api.put(`duties/${dutyId}/care-logs/${date}`, data).then(message);

export const skipCareDay = (dutyId, date, reason) => api.post(`duties/${dutyId}/skip-day`, { date, reason }).then(message);

export const coverCareDay = (dutyId, date, staffId) =>
  api.post(`duties/${dutyId}/cover-day`, { date, staff_id: staffId }).then(message);

/** A staff member's duties (with one patient when patientId is given). */
export const staffAttendance = (staffId, patientId) =>
  api.get(`attendance/staff/${encodeURIComponent(staffId)}`, { params: patientId ? { patient_id: patientId } : {} }).then(unwrap);
