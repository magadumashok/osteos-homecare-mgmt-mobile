import api, { unwrap } from "./api";

let packagesCache = null;

/** Service packages rarely change, so they are kept for the session. */
export async function servicePackages() {
  if (!packagesCache) packagesCache = (await api.get("reference/service-packages").then(unwrap)) || [];
  return packagesCache;
}

// Migrated package documents use different field names (as handled in the web app).
export const packageName = (p) => p?.name ?? p?.package_name ?? p?.service_package ?? p?.title ?? "";
export const packageFees = (p) => p?.fees ?? p?.price ?? p?.amount ?? "";

export const countries = () => api.get("reference/countries").then(unwrap);
export const nationalities = () => api.get("reference/nationalities").then(unwrap);
export const regions = (country) => api.get(`reference/regions/${encodeURIComponent(country)}`).then(unwrap);
export const cities = (region) => api.get(`reference/cities/${encodeURIComponent(region)}`).then(unwrap);
