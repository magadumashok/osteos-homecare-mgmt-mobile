import api, { message, unwrap } from "./api";

/** The signed-in driver's trips for a day, with the staff member's name and role. */
export const myTrips = (date) => api.get("driver-trips/mine", { params: { date } }).then(unwrap);

export const recordPickup = (id, { time, position }) =>
  api
    .post(`driver-trips/${id}/pickup`, {
      pickup_time: time,
      pickup_latitude: position?.latitude ?? null,
      pickup_longitude: position?.longitude ?? null,
    })
    .then(message);

export const recordDrop = (id, { time, position }) =>
  api
    .post(`driver-trips/${id}/drop`, {
      drop_time: time,
      drop_latitude: position?.latitude ?? null,
      drop_longitude: position?.longitude ?? null,
    })
    .then(message);

/** Admin: book a driver for a staff member's visit. */
export const createTrip = (data) => api.post("driver-trips", data).then(unwrap);

/** Every trip of a driver, newest first. */
export const driverHistory = (driverId) => api.get(`attendance/drivers/${encodeURIComponent(driverId)}`).then(unwrap);
