import { can, hasRole } from "../utils/permissions";

/**
 * Dashboard tiles, one per feature of the old app. A tile shows when the
 * user holds any of `permissions` (and `role`, where set).
 *
 * Old role menus this replaces:
 *   admin  — leads, register, assessed/confirmed lists, duty & driver
 *            schedules, short visit, staff list, attendance monitor
 *   nurse  — today's / dated schedule, walk-in, leads, assessed, confirmed,
 *            discharge list
 *   doctor — schedule, confirmed patients, signature
 *   physio — today's / dated schedule, leads
 *   driver — driver schedule
 *   staff, maintenance — call and profile only
 */
export const DASHBOARD_MODULES = [
  {
    id: "my-duties",
    title: "My Duties",
    subtitle: "Today's and upcoming visits",
    icon: "calendar",
    palette: "green",
    permissions: ["attendance.record"],
    hideForRole: "transport",
    screen: "MyDuties",
  },
  {
    id: "my-trips",
    title: "My Trips",
    subtitle: "Pickups and drops",
    icon: "car",
    palette: "amber",
    role: "transport",
    screen: "MyTrips",
  },
  {
    id: "patients",
    title: "Patients",
    subtitle: "Admitted patients and their records",
    icon: "people",
    palette: "blue",
    permissions: ["patients.view"],
    screen: "Patients",
  },
  {
    id: "register-patient",
    title: "Register Patient",
    subtitle: "Add a new patient",
    icon: "person-add",
    palette: "teal",
    permissions: ["patients.manage"],
    screen: "PatientForm",
  },
  {
    id: "walk-in",
    title: "Walk-in",
    subtitle: "Register a walk-in visit",
    icon: "walk",
    palette: "orange",
    permissions: ["patients.walkin"],
    screen: "WalkIn",
  },
  {
    id: "leads",
    title: "Patient Leads",
    subtitle: "Enquiries and follow-ups",
    icon: "person-add",
    palette: "purple",
    permissions: ["leads.view"],
    screen: "Leads",
  },
  {
    id: "assessments",
    title: "Assessments",
    subtitle: "Initial assessments and consent",
    icon: "clipboard",
    palette: "indigo",
    permissions: ["assessments.view"],
    screen: "Assessments",
  },
  {
    id: "duty-schedules",
    title: "Duty Schedules",
    subtitle: "Assign and reschedule staff",
    icon: "calendar-number",
    palette: "teal",
    permissions: ["schedules.manage"],
    screen: "DutySchedules",
  },
  {
    id: "short-visit",
    title: "Short Visit",
    subtitle: "Log a short visit",
    icon: "timer",
    palette: "amber",
    permissions: ["schedules.manage"],
    screen: "ShortVisit",
  },
  {
    id: "attendance",
    title: "Attendance",
    subtitle: "Staff and driver attendance",
    icon: "time",
    palette: "green",
    permissions: ["attendance.view"],
    screen: "Attendance",
  },
  {
    id: "staff",
    title: "Staff",
    subtitle: "Staff members and roles",
    icon: "id-card",
    palette: "blue",
    permissions: ["staff.view"],
    screen: "StaffList",
  },
  {
    id: "discharge",
    title: "Discharge",
    subtitle: "Awaiting and discharged patients",
    icon: "exit",
    palette: "pink",
    permissions: ["discharge.view"],
    screen: "DischargeList",
  },
  {
    id: "signature",
    title: "My Signature",
    subtitle: "Signature for prescriptions",
    icon: "create",
    palette: "indigo",
    permissions: ["prescriptions.write"],
    screen: "MySignature",
  },
  {
    id: "call",
    title: "Call Staff",
    subtitle: "Phone a colleague",
    icon: "call",
    palette: "teal",
    screen: "StaffDirectory",
  },
  {
    id: "profile",
    title: "My Profile",
    subtitle: "Photo, details and password",
    icon: "person-circle",
    palette: "pink",
    screen: "Profile",
  },
];

export function visibleModules(user, permissions) {
  return DASHBOARD_MODULES.filter((module) => {
    if (module.role && !hasRole(user, module.role)) return false;
    if (module.hideForRole && hasRole(user, module.hideForRole)) return false;
    return can(permissions, module.permissions);
  });
}
