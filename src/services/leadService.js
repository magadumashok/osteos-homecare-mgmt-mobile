import api, { message, unwrap } from "./api";

// ─── Leads ───────────────────────────────────────────────────────────────────
/** Leads not yet assessed. */
export const listLeads = () => api.get("leads").then(unwrap);

export const getLead = (leadId) => api.get(`leads/${leadId}`).then(unwrap);

/** On create the mobile is local; the server adds the country's code. */
export const createLead = (data) => api.post("leads", data).then(unwrap);

export const updateLead = (leadId, data) => api.put(`leads/${leadId}`, data).then(unwrap);

export const markToBeAssessed = (leadId) => api.post(`leads/${leadId}/to-be-assessed`).then(message);

// ─── Initial assessments ─────────────────────────────────────────────────────
export const listAssessments = () => api.get("assessments").then(unwrap);

export const getAssessment = (id) => api.get(`assessments/${id}`).then(unwrap);

export const createAssessment = (data) => api.post("assessments", data).then(unwrap);

export const updateAssessment = (id, data) => api.put(`assessments/${id}`, data).then(unwrap);

/** Turns the assessment into an admitted patient; returns the patient. */
export const admitAssessment = (id) => api.post(`assessments/${id}/admit`).then(unwrap);
