import api, { unwrap } from "./api";

/** Colleagues in the same homecare, with dialable numbers (user_mobile). */
export const staffDirectory = () => api.get("staff/directory").then(unwrap);

/** ?role=nurse | ?group=visiting|except-drivers */
export const listStaff = (params) => api.get("staff", { params }).then(unwrap);

export const getStaff = (id) => api.get(`staff/${id}`).then(unwrap);

/** Patients this staff member has had duties with. */
export const staffPatients = (id) => api.get(`staff/${id}/patients`).then(unwrap);

/** Ring a colleague's phone into a video room (push notification). */
export const startVideoCall = (username, roomUrl) =>
  api.post("video-calls", { username, video_room_url: roomUrl });
