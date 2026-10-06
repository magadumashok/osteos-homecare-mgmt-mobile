# Homecare Mobile

Expo (SDK 55) app for homecare staff. It talks to the homecare-v2 API (`/api/v1`) only.
See [PLAN.md](PLAN.md) for the feature map and build order.

## Run

```bash
yarn install

# Android emulator against a local API (default URL is http://10.0.2.2:8000/api/v1)
npx expo run:android

# Any other API
API_BASE_URL=https://your-server/api/v1 npx expo run:android
```

The app uses native modules (secure storage, audio recording, Firebase), so it runs as a
development build (`expo run:*` or EAS), not in Expo Go.

## Push notifications

Put `google-services.json` (Android) and/or `GoogleService-Info.plist` (iOS) in the project
root. `app.config.js` enables Firebase only when they exist. They are git-ignored.

## Layout

```
src/
  App.js                 providers, push registration, incoming video calls
  navigation/            AppNavigator, modules.js (dashboard tiles), patientModules.js (patient actions)
  screens/auth/          Login (password / OTP), Forgot password
  screens/home/          Dashboard, Profile, Change password, Call staff, My signature
  screens/duties/        My duties, Duty detail, Walk-in
  screens/patients/      List, Hub, Register/Edit, Notes, Vitals, Documents, Medications,
                         Prescriptions, Service package, Consent, Schedules, Discharge
  screens/leads/         Leads, Lead form
  screens/assessments/   Assessments (admit), Assessment form
  screens/admin/         Duty schedules, Duty form, Short visit, Staff, Attendance
  screens/driver/        My trips
  components/            AppScreen, ActionGrid, ListCard, Form, DateField, DateStrip, SelectField,
                         Segmented, SignaturePad, PatientFields, ImageViewer, States
  services/              api.js (axios, token, 401 refresh) and one file per API area
  store/                 Redux Toolkit auth slice + thunks
  hooks/                 useApi, useDutyActions, useReference
  utils/                 permissions, dates, format, invoice, location, photos, push, videoCall
```

## Adding a feature

1. Add the API calls to a file in `src/services/`.
2. Add the screen under `src/screens/` and register it in `navigation/AppNavigator.js`.
3. Add a tile in `navigation/modules.js` (dashboard) or `navigation/patientModules.js` (per patient).
   Tiles are shown by permission.

## Placeholders to replace

`assets/icon.png`, `adaptive-icon.png`, `splash-icon.png` and `favicon.png` are copied from the
Apurvi Scheduler app. Replace them with the Homecare branding before release.
