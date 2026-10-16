const fs = require("fs");
const path = require("path");

// Firebase config files are per environment and not committed. Push
// notifications are enabled only when they are present.
const googleServicesFile = "./google-services.json";
const hasGoogleServices = fs.existsSync(path.join(__dirname, googleServicesFile));
const googleServiceInfoPlist = "./GoogleService-Info.plist";
const hasGoogleServiceInfo = fs.existsSync(path.join(__dirname, googleServiceInfoPlist));

module.exports = {
  expo: {
    name: "Homecare",
    slug: "homecare-mobile",
    version: "1.0.0",
    orientation: "portrait",
    icon: "./assets/icon.png",
    userInterfaceStyle: "light",
    newArchEnabled: true,
    splash: {
      image: "./assets/splash-icon.png",
      resizeMode: "contain",
      backgroundColor: "#005f7f",
    },
    ios: {
      supportsTablet: true,
      bundleIdentifier: "com.osteos.homecare",
      ...(hasGoogleServiceInfo ? { googleServicesFile: googleServiceInfoPlist } : {}),
      infoPlist: {
        NSMicrophoneUsageDescription: "Allow Homecare to record audio notes for your patients.",
      },
    },
    android: {
      package: "com.osteos.homecare",
      versionCode: 1,
      softwareKeyboardLayoutMode: "resize",
      edgeToEdgeEnabled: true,
      adaptiveIcon: {
        foregroundImage: "./assets/adaptive-icon.png",
        backgroundColor: "#005f7f",
      },
      permissions: [
        "android.permission.CAMERA",
        "android.permission.RECORD_AUDIO",
        "android.permission.ACCESS_COARSE_LOCATION",
        "android.permission.ACCESS_FINE_LOCATION",
        "android.permission.POST_NOTIFICATIONS",
      ],
      ...(hasGoogleServices ? { googleServicesFile } : {}),
    },
    plugins: [
      "expo-secure-store",
      [
        "expo-image-picker",
        {
          cameraPermission: "Allow Homecare to use your camera to photograph notes and documents.",
          photosPermission: "Allow Homecare to access your photos to upload notes and documents.",
        },
      ],
      [
        "expo-location",
        {
          locationWhenInUsePermission: "Allow Homecare to record where you sign in and out of your duties.",
        },
      ],
      [
        "expo-audio",
        {
          microphonePermission: "Allow Homecare to record audio notes for your patients.",
        },
      ],
      ...(hasGoogleServices || hasGoogleServiceInfo
        ? ["@react-native-firebase/app", "@react-native-firebase/messaging"]
        : []),
    ],
    extra: {
      // Override per build: API_BASE_URL=https://... npx expo run:android
      apiBaseUrl: process.env.API_BASE_URL || "http://10.0.2.2:8000/api/v1",
      pushEnabled: hasGoogleServices || hasGoogleServiceInfo,
    },
  },
};
