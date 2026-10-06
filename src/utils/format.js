export function initials(name) {
  return (
    String(name || "")
      .split(/\s+/)
      .filter(Boolean)
      .map((word) => word[0])
      .join("")
      .toUpperCase()
      .slice(0, 2) || "?"
  );
}

export function displayName(user) {
  if (!user) return "";
  // The homecare owner account keeps the center's name in `name`.
  if (user.user_type === "homecare") return user.owner || user.name || user.username;
  return user.name || user.full_name || user.username || "";
}

export function capitalize(text) {
  const value = String(text || "");
  return value ? value.charAt(0).toUpperCase() + value.slice(1) : "";
}

export function roleLabel(user) {
  const role = Array.isArray(user?.roles) ? user.roles[0] : null;
  if (!role) return user?.user_type === "homecare" ? "Administrator" : "";
  return role === "transport" ? "Driver" : capitalize(role);
}

/** "2025-01-31" + "14:30:00" → "31 Jan 2025, 2:30 PM" */
export function formatDateTime(date, time) {
  if (!date) return "";
  const [y, m, d] = String(date).split("-").map(Number);
  const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  const day = y && m && d ? `${d} ${months[m - 1]} ${y}` : String(date);
  if (!time) return day;
  const [hh, mm] = String(time).split(":").map(Number);
  if (Number.isNaN(hh) || Number.isNaN(mm)) return `${day}, ${time}`;
  const suffix = hh >= 12 ? "PM" : "AM";
  const hour12 = hh % 12 || 12;
  return `${day}, ${hour12}:${String(mm).padStart(2, "0")} ${suffix}`;
}

export function cleanMobile(value) {
  return String(value || "").replace(/\D/g, "");
}

/** "not_reachable" → "Not reachable" */
export function humanize(value) {
  return capitalize(String(value || "").replace(/_/g, " "));
}
