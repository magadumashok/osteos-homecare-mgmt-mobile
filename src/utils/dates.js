// The API stores dates as "YYYY-MM-DD" and times as "HH:MM" in local time.

const pad = (n) => String(n).padStart(2, "0");

export function toIsoDate(date = new Date()) {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

export function fromIsoDate(iso) {
  const [y, m, d] = String(iso || "").split("-").map(Number);
  return y && m && d ? new Date(y, m - 1, d) : new Date();
}

export function addDays(iso, days) {
  const date = fromIsoDate(iso);
  date.setDate(date.getDate() + days);
  return toIsoDate(date);
}

export function nowTime(date = new Date()) {
  return `${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

export function toTimeString(date) {
  return nowTime(date);
}

export function fromTimeString(time) {
  const [h, m] = String(time || "").split(":").map(Number);
  const date = new Date();
  date.setHours(Number.isNaN(h) ? 9 : h, Number.isNaN(m) ? 0 : m, 0, 0);
  return date;
}

const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

/** "Today", "Tomorrow", "Yesterday" or "Mon, 3 Feb 2025". */
export function dayLabel(iso) {
  const today = toIsoDate();
  if (iso === today) return "Today";
  if (iso === addDays(today, 1)) return "Tomorrow";
  if (iso === addDays(today, -1)) return "Yesterday";
  return longDate(iso);
}

export function longDate(iso) {
  const d = fromIsoDate(iso);
  return `${DAYS[d.getDay()]}, ${d.getDate()} ${MONTHS[d.getMonth()]} ${d.getFullYear()}`;
}

export function shortDate(iso) {
  if (!iso) return "";
  const d = fromIsoDate(iso);
  return `${d.getDate()} ${MONTHS[d.getMonth()]} ${d.getFullYear()}`;
}

/** "28 Oct 2026", or "28 Oct 2026 → 27 Jan 2027" when the duty runs over several days. */
export function dateRange(start, end) {
  if (!start) return "";
  return end && end !== start ? `${shortDate(start)} → ${shortDate(end)}` : shortDate(start);
}

/** "14:30" → "2:30 PM" */
export function time12(time) {
  if (!time) return "";
  const [hh, mm] = String(time).split(":").map(Number);
  if (Number.isNaN(hh) || Number.isNaN(mm)) return String(time);
  return `${hh % 12 || 12}:${pad(mm)} ${hh >= 12 ? "PM" : "AM"}`;
}

export function timeRange(start, end) {
  return [time12(start), time12(end)].filter(Boolean).join(" – ");
}
