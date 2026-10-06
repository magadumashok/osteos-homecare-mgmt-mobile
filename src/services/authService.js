import api, { message, unwrap, uploadApi } from "./api";

export const login = (mobile, password) =>
  api.post("auth/login", { mobile, password }).then(unwrap);

/** purpose: "login" | "reset" */
export const sendOtp = (mobile, purpose) =>
  api.post("auth/otp/send", { mobile, purpose }).then(message);

export const otpLogin = (mobile, otp) =>
  api.post("auth/otp/login", { mobile, otp }).then(unwrap);

export const resetPassword = ({ mobile, otp, password }) =>
  api
    .post("auth/password/reset", { mobile, otp, password, password_confirmation: password })
    .then(message);

/** { user, homecare, permissions } */
export const me = () => api.get("auth/me").then(unwrap);

export const logout = () => api.post("auth/logout");

export const changePassword = ({ currentPassword, password }) =>
  api
    .put("account/password", {
      current_password: currentPassword,
      password,
      password_confirmation: password,
    })
    .then(message);

/** `photo` is { uri, name, mimeType } from the image picker. */
export function uploadProfileImage(photo) {
  const form = new FormData();
  form.append("image", { uri: photo.uri, name: photo.name, type: photo.mimeType });
  return uploadApi
    .post("account/profile-image", form, { headers: { "Content-Type": "multipart/form-data" } })
    .then(unwrap);
}

export const updateFirebaseToken = (token) =>
  api.put("account/firebase-token", { firebase_token: token });

export const sendFeedback = (feedback) =>
  api.post("account/feedback", { feedback }).then(message);

/** Base64 PNG of the doctor's signature, printed on prescriptions. */
export const saveSignature = (image) => api.post("account/signature", { image }).then(unwrap);
