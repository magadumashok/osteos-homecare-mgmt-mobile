import { can } from "../utils/permissions";

/**
 * Per-patient actions, shown on the patient page and on a duty (the old
 * app's "patient schedule details" buttons). `withDuty` actions only make
 * sense during a visit and get the duty id.
 */
export const PATIENT_MODULES = [
  { id: "notes", title: "Notes", subtitle: "Text, photo and audio notes", icon: "document-text", palette: "blue", permissions: ["notes.view"], screen: "Notes" },
  { id: "vitals", title: "Vital Signs", subtitle: "Record and view history", icon: "pulse", palette: "pink", permissions: ["vitals.view"], screen: "Vitals" },
  { id: "medications", title: "Medications", subtitle: "Schedule and administer", icon: "medkit", palette: "orange", permissions: ["medications.view"], screen: "Medications" },
  { id: "prescriptions", title: "Prescriptions", subtitle: "Medicine and test", icon: "receipt", palette: "purple", permissions: ["prescriptions.view"], screen: "Prescriptions" },
  { id: "documents", title: "Documents", subtitle: "Reports, IDs and specimens", icon: "folder", palette: "indigo", permissions: ["documents.view"], screen: "Documents" },
  { id: "services", title: "Service Package", subtitle: "Services given this visit", icon: "pricetags", palette: "amber", permissions: ["schedules.manage", "attendance.record"], screen: "ServicePackage", withDuty: true },
  { id: "consent", title: "Consent", subtitle: "Terms, consent and signature", icon: "create", palette: "teal", permissions: ["assessments.manage"], screen: "Consent" },
  { id: "schedules", title: "Schedules", subtitle: "Visits for this patient", icon: "calendar", palette: "green", permissions: ["schedules.view"], screen: "PatientSchedules" },
  { id: "discharge", title: "Discharge", subtitle: "Discharge this patient", icon: "exit", palette: "pink", permissions: ["discharge.manage"], screen: "DischargePatient" },
];

/** Tiles for one patient. `duty` is set when opened from a visit. */
export function patientActions({ permissions, navigation, username, name, duty }) {
  return PATIENT_MODULES.filter((m) => can(permissions, m.permissions))
    .filter((m) => !m.withDuty || duty)
    .map((m) => ({
      ...m,
      onPress: () => navigation.navigate(m.screen, { username, name, dutyId: duty?._id }),
    }));
}
