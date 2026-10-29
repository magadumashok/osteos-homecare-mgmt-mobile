// The service a patient is registered for, and a duty is for (same as the
// web app). "Other" lets staff type their own; it is stored as that text.
export const SERVICES = ["Nursing", "Care taking"];

export const SERVICE_OPTIONS = [...SERVICES.map((s) => ({ value: s, label: s })), { value: "other", label: "Other" }];

/** A stored service as the form's { service, other } pair. */
export function serviceChoice(stored) {
  if (!stored) return { service: "", other: "" };
  return SERVICES.includes(stored) ? { service: stored, other: "" } : { service: "other", other: stored };
}

/** The form's pair back to the stored text ("" when not set). */
export function serviceValue(service, other) {
  return service === "other" ? (other || "").trim() : service || "";
}
