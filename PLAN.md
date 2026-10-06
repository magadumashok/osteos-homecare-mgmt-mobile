# Homecare Mobile — Build Plan

| Source | Path | Used for |
|---|---|---|
| UI reference | `F:\SchedulerApplication\apurvi-scheduler` | Look, layout, components, stack (Expo 55, React Navigation 7, Redux Toolkit, SecureStore, Firebase messaging) |
| Functionality reference | `D:\homecare\homecare-mgmt-mobile` | Features, flows, roles (RN 0.73, native-base, router-flux, redux-form) |
| Backend | `D:\homecare\homecare-v2` | `/api/v1` only (`routes/api.php`) — never the legacy `/api/*` routes |

## Tech stack (copied from apurvi-scheduler)

- Expo SDK 55, React 19, React Native 0.83, new architecture
- `@react-navigation/native` + `native-stack`
- `@reduxjs/toolkit` + `react-redux` (slices + thunks)
- `axios` with Bearer-token interceptor; `expo-secure-store` for the JWT (chunked)
- `@react-native-firebase/messaging` for push
- `expo-image-picker`, `expo-image-manipulator`, `expo-document-picker`, `expo-linear-gradient`
- `@expo/vector-icons` (Ionicons)
- Additions needed for homecare features: signature capture (e.g. `react-native-signature-canvas`), date/time picker, audio record/playback (`expo-audio`), location if check-in needs GPS

## UI patterns to reuse

- `ScreenContainer` + `useResponsiveLayout` (phone/tablet sizing)
- Login: gradient background, white rounded card, mobile + password
- Dashboard: teal header (avatar initials, greeting, homecare name, logout), search bar, 2-column colored quick-action grid
- List screens: search + cards (`RegisteredPatientListScreen`, `TodayAppointmentsScreen`)
- Patient hub: `StaffPatientDashboardScreen` (per-patient actions)
- Upload / view documents: `StaffUploadDocumentScreen`, `StaffViewDocumentScreen`
- Colors: primary `#005f7f` / `#0b7b84`, background `#f9f5f5` / `#f1f5f9`

## Roles (from the old app) → permission-driven UI

Old app routed by role after `user_login`: admin, doctor, nurse, physiotherapist, staff, transport (driver), maintenance.
homecare-v2 is permission-based (`app/Support/Permissions.php`), and `auth/login` returns `permissions`.
**The new app shows dashboard tiles by permission, not by role name**, so custom roles work too.

| Old role | Old home menu | v1 permissions that unlock it |
|---|---|---|
| Admin | Add/view leads, register patient, assessed list, confirmed list, all duty schedules, driver schedule, short visit, staff list, attendance monitor, call, profile | `*` |
| Nurse | Today's schedule, schedule by date, walk-in, leads, assessed list, confirmed list, discharge list, call, profile | `schedules.view`, `attendance.record`, `patients.walkin`, `assessments.*`, `medications.*`, `vitals.*`, `notes.*`, `discharge.manage` |
| Doctor | Schedule by date, confirmed patients, signature, call, profile | `prescriptions.write`, `assessments.*`, `notes.*`, `vitals.*` |
| Physiotherapist | Today's schedule, by date, leads, call, profile | `schedules.view`, `attendance.record`, `notes.*`, `vitals.*` |
| Driver (transport) | Driver schedule (pickup/drop), call, profile | `schedules.view`, `attendance.record` |
| Staff / Maintenance | Call, profile only | (no default role in v2 — profile + directory only) |

## Feature → API map

| Feature (old app) | v1 endpoint |
|---|---|
| Login (mobile + password) | `POST auth/login` → `access_token`, `user`, `homecare`, `permissions` |
| Session restore / refresh / logout | `GET auth/me`, `POST auth/refresh`, `POST auth/logout` |
| Push token | `PUT account/firebase-token` |
| Feedback | `POST account/feedback` |
| Doctor signature | `POST account/signature` |
| Video call | `POST video-calls` |
| Call staff (directory) | `GET staff/directory` |
| Patient leads (list/add/edit/to-be-assessed) | `leads`, `leads/{lead}`, `leads/{lead}/to-be-assessed` |
| Assessment form, admit | `assessments`, `assessments/{id}`, `assessments/{id}/admit` |
| Patients list / register / edit / walk-in | `patients`, `patients/{username}`, `patients/walk-in` |
| Consent + signatures | `POST patients/{username}/consent` |
| Update service package | `PUT patients/{username}/services` |
| Discharge | `patients/awaiting-discharge`, `patients/discharged`, `patients/{u}/discharge-date`, `patients/{u}/discharge` |
| Documents, Emirates ID, specimen images | `patients/{u}/documents`, `patients/{u}/specimens`, `patients/{u}/missing-documents` |
| Vital signs collect/history | `patients/{u}/vitals`, `vitals/latest`, `PUT vitals/{id}` |
| Nursing / doctor / physio notes (text, image) | `patients/{u}/notes/{nursing\|staff}` (`?type=text_notes\|image_notes\|audio_notes`) |
| Medication schedule / administer | `patients/{u}/medications`, `medications/checklist`, `medications/administered`, `guardians` |
| Medicine / test prescriptions | `patients/{u}/prescriptions/{medicine\|test}`, `prescriptions/{type}/{id}`, `reference/icd-codes` |
| My duties (today / by date), sign in/out, not attended | `duties/mine`, `duties/{id}/sign-in`, `sign-out`, `not-attended` |
| Admin duty scheduling, reschedule, alternate-day | `duties`, `duties/series`, `PUT duties/{id}` |
| Short visit | `POST short-visits` |
| Driver trips, pickup/drop | `driver-trips/mine`, `driver-trips`, `driver-trips/{id}/pickup`, `drop` |
| Attendance monitor | `attendance/staff/{id}`, `attendance/drivers/{id}`, `staff/{id}/patients` |
| Staff list | `staff`, `staff/{id}` |
| Reference data | `reference/countries`, `nationalities`, `regions/{c}`, `cities/{r}`, `service-packages` |

## API gaps — resolved in homecare-v2

| Gap | Old backend (homecare-mgmt) | Now in v1 |
|---|---|---|
| Change password | app called `change-password`, but no route existed | `PUT account/password` (current + new, min 8, confirmed) |
| Forgot password | `check-user-mobile` returned the OTP to the app; `change-forgot-password` reset any number unverified | `POST auth/otp/send` (purpose `reset`) + `POST auth/password/reset` — code checked on the server |
| OTP login | none | `POST auth/otp/send` (purpose `login`) + `POST auth/otp/login` |
| Profile photo | `save-user-profile-image` (commented out) | `POST account/profile-image` (multipart `image`) |
| Audio notes | `store_staff_notes` with base64 `audio` | already supported: `POST patients/{u}/notes/staff` with `audio` |
| Staff / maintenance roles | roles existed, home = call + profile | default roles `staff`, `maintenance` (no permissions). Existing homecares: run `php artisan homecare:provision --all` |

OTP codes: 6 digits, hashed in cache, 5 min expiry, single use, 5 wrong tries burn the code, 60 s resend cooldown, sent by SMS through Twilio (`TWILIO_SMS_FROM` or the messaging service). Same reply whether or not the number is registered.

Still to check: push notifications sending (`send_notification`) — whether the server sends them on events.

## Folder structure (proposed)

```
homecare-mobile/
  App.js, index.js, app.json, package.json
  assets/
  src/
    App.js
    navigation/      AppNavigator (Auth stack / Main stack), linking
    components/      ScreenContainer, Header, DashboardGrid, Card, ListItem,
                     EmptyState, FormField, DatePickerField, SignaturePad, PhotoGrid
    theme/           colors, spacing, typography
    utils/           responsive, permissions (can()), format, pushNotifications
    services/        api.js (axios + token + 401 refresh), one file per module
    store/           index, slices/authSlice, thunks
    screens/
      auth/          Login, Splash
      home/          Dashboard (permission tiles), Profile
      leads/  assessments/  patients/  documents/  vitals/  notes/
      medications/  prescriptions/  duties/  driver/  attendance/
      staff/  discharge/
```

## Build order

1. ✅ Scaffold Expo app with the apurvi-scheduler stack; theme + shared components
2. ✅ Auth: password + OTP login, forgot password, token storage, `auth/me` restore, refresh on 401, logout, FCM token
3. ✅ Permission-driven dashboard, profile (photo, change password), call staff
4. ✅ My Duties: day view, sign in / sign out with GPS, can't-attend reason, duty detail with patient actions
5. ✅ Patient hub: details, notes (text / photo / audio), vital signs, documents (reports, ID, specimens)
6. ✅ Medications (schedule, administer with guardian witness + signature), prescriptions (medicine / test), doctor signature
7. ✅ Leads → assessment (care plan, physio, equipment, invoice) → admit; consent with signature; patient register / edit; walk-in; short visit; service package
8. ✅ Admin: duty schedules (single, daily, alternate days, reschedule, driver), staff list, attendance (staff and drivers)
9. ✅ Driver: my trips, pickup / drop with GPS
10. ✅ Discharge: awaiting / discharged lists, set date, discharge with summary
11. ✅ Push notifications: incoming video calls; video call from Call Staff (Jitsi room)
12. ⬜ Test on devices against the homecare-v2 API; replace placeholder icons; EAS build

Not carried over: the old app-version update prompt (no API for it), old COVID screening, online appointments and token queue (not part of homecare-v2).
