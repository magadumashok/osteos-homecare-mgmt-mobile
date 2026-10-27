import api, { message, unwrap, uploadApi } from "./api";

export const listPatients = () => api.get("patients").then(unwrap);

export const getPatient = (username) =>
  api.get(`patients/${encodeURIComponent(username)}`).then(unwrap);

// ─── Notes ───────────────────────────────────────────────────────────────────
// kind: "staff" (any role, what the old app's notes screens used) or "nursing".
// type: "text_notes" | "image_notes" | "audio_notes"
const notesPath = (username, kind) => `patients/${encodeURIComponent(username)}/notes/${kind}`;

export const listNotes = (username, kind, type) =>
  api.get(notesPath(username, kind), { params: { type } }).then(unwrap);

export const addTextNote = (username, kind, notes) =>
  api.post(notesPath(username, kind), { notes }).then(unwrap);

/** Base64 audio, as the API and the legacy app expect. */
export const addAudioNote = (username, kind, audioBase64) =>
  uploadApi.post(notesPath(username, kind), { audio: audioBase64 }).then(unwrap);

export function addImageNote(username, kind, photo) {
  const form = new FormData();
  form.append("image", { uri: photo.uri, name: photo.name, type: photo.mimeType });
  return uploadApi
    .post(notesPath(username, kind), form, { headers: { "Content-Type": "multipart/form-data" } })
    .then(unwrap);
}

// ─── Vital signs ─────────────────────────────────────────────────────────────
const patientPath = (username) => `patients/${encodeURIComponent(username)}`;

/** range: all_time | today | this_week | this_month */
export const listVitals = (username, range = "all_time") =>
  api.get(`${patientPath(username)}/vitals`, { params: { range } }).then(unwrap);

export const recordVitals = (username, data) => api.post(`${patientPath(username)}/vitals`, data).then(unwrap);

// ─── Documents ───────────────────────────────────────────────────────────────
// field: "images" (reports), "emirates_id" (ID), "specimen_images"
export const getDocuments = (username) => api.get(`${patientPath(username)}/documents`).then(unwrap);

const fileForm = (files) => {
  const form = new FormData();
  files.forEach((file) => form.append("files[]", { uri: file.uri, name: file.name, type: file.mimeType }));
  return form;
};

const multipart = { headers: { "Content-Type": "multipart/form-data" } };

export function uploadDocuments(username, field, files) {
  const form = fileForm(files);
  form.append("field", field);
  return uploadApi.post(`${patientPath(username)}/documents`, form, multipart).then(unwrap);
}

export function uploadSpecimens(username, files, { labDetails, dutyId }) {
  const form = fileForm(files);
  if (labDetails) form.append("lab_details", labDetails);
  if (dutyId) form.append("schedule_id", dutyId);
  return uploadApi.post(`${patientPath(username)}/specimens`, form, multipart).then(unwrap);
}

export const deleteDocument = (username, field, url) =>
  api.delete(`${patientPath(username)}/documents`, { data: { field, url } });

export const requestMissingDocument = (username, text) =>
  api.post(`${patientPath(username)}/missing-documents`, { message: text }).then(message);

// ─── Medications ─────────────────────────────────────────────────────────────
export const listMedicationSchedule = (username) => api.get(`${patientPath(username)}/medications`).then(unwrap);

export const addMedication = (username, data) => api.post(`${patientPath(username)}/medications`, data).then(unwrap);

/** The day's medicines with sessions already given (morning/afternoon/evening/night). */
export const medicationChecklist = (username, date) =>
  api.get(`${patientPath(username)}/medications/checklist`, { params: { date } }).then(unwrap);

/** { medicine_name, date, medicine_type: session, medicine_date, medicine_time, guardian_id | guardian_name + image } */
export const administerMedication = (username, data) =>
  api.post(`${patientPath(username)}/medications/administered`, data).then(unwrap);

/** Remove a scheduled medicine entered wrongly or twice (refused once a dose is given). */
export const deleteMedication = (username, id) => api.delete(`${patientPath(username)}/medications/${id}`);

export const listGuardians = (username) => api.get(`${patientPath(username)}/guardians`).then(unwrap);

// ─── Prescriptions ───────────────────────────────────────────────────────────
// type: "medicine" | "test"
export const listPrescriptions = (username, type) =>
  api.get(`${patientPath(username)}/prescriptions/${type}`).then(unwrap);

export const addPrescription = (username, type, data) =>
  api.post(`${patientPath(username)}/prescriptions/${type}`, data).then(unwrap);

/** With patient details, doctor name and signature (for display / printing). */
export const getPrescription = (type, id) => api.get(`prescriptions/${type}/${id}`).then(unwrap);

// ─── Visit services, consent, schedules, discharge ──────────────────────────
/** services: [{ service_package, fees }], scheduleId: the duty they were given on. */
export const updateServices = (username, services, scheduleId) =>
  api.put(`${patientPath(username)}/services`, { services, schedule_id: scheduleId || undefined }).then(message);

/** { terms_conditions, consent_form, amount_paid, image: base64 signature } */
export const recordConsent = (username, data) => api.post(`${patientPath(username)}/consent`, data).then(message);

export const patientSchedules = (username) => api.get(`${patientPath(username)}/schedules`).then(unwrap);

export const scheduleDischarge = (username, data) => api.put(`${patientPath(username)}/discharge-date`, data).then(message);

export const dischargePatient = (username, data) => api.post(`${patientPath(username)}/discharge`, data).then(message);

export const awaitingDischarge = () => api.get("patients/awaiting-discharge").then(unwrap);

export const dischargedPatients = () => api.get("patients/discharged").then(unwrap);

// ─── Registration ────────────────────────────────────────────────────────────
export const registerPatient = (data) => api.post("patients", data).then(unwrap);

export const updatePatient = (username, data) => api.put(patientPath(username), data).then(unwrap);

/** Walk-in: registers the patient and logs the visit as the user's own duty. */
export const registerWalkIn = (data) => api.post("patients/walk-in", data).then(unwrap);
