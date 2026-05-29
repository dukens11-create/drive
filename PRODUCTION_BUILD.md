# Production Build Guide

This guide covers generating **APK** (for testing/sideloading) and **AAB** (Android App Bundle, for Google Play Store submission) from the **Drive Home** React Native (Expo) mobile app located in `mobile/`.

---

## Table of Contents

1. [Prerequisites](#prerequisites)
2. [Recommended: Expo EAS Build](#recommended-expo-eas-build)
   - [Install EAS CLI and log in](#1-install-eas-cli-and-log-in)
   - [Configure the project](#2-configure-the-project)
   - [Build APK (testing/sideload)](#3-build-apk-testingsideload)
   - [Build AAB (Play Store)](#4-build-aab-play-store)
   - [Download your build](#5-download-your-build)
3. [Alternative: React Native CLI (Local Build)](#alternative-react-native-cli-local-build)
   - [Generate a signing keystore](#1-generate-a-signing-keystore)
   - [Configure Gradle signing](#2-configure-gradle-signing)
   - [Build APK](#3-build-apk)
   - [Build AAB](#4-build-aab)
4. [Play Store Readiness Checklist](#play-store-readiness-checklist)
5. [Common Errors and Fixes](#common-errors-and-fixes)

---

## Prerequisites

- Node.js 18+ and npm installed
- [Expo account](https://expo.dev/signup) (free tier works for EAS builds)
- Android Studio installed (only required for local/CLI builds)
- Java 17 (`JAVA_HOME` set) — required for local Gradle builds

Ensure mobile dependencies are installed:

```bash
cd mobile
npm install
```

---

## Recommended: Expo EAS Build

[Expo Application Services (EAS)](https://docs.expo.dev/eas/) builds your app in the cloud without needing Android Studio or a local Android toolchain.

### 1. Install EAS CLI and log in

```bash
npm install -g eas-cli
eas login
```

Enter your Expo account credentials when prompted.

### 2. Configure the project

From inside the `mobile/` directory:

```bash
cd mobile
eas build:configure
```

This creates (or updates) `eas.json` with build profiles. Accept the prompts for Android. A minimal `eas.json` looks like:

```json
{
  "cli": {
    "version": ">= 5.0.0"
  },
  "build": {
    "development": {
      "developmentClient": true,
      "distribution": "internal"
    },
    "preview": {
      "android": {
        "buildType": "apk"
      },
      "distribution": "internal"
    },
    "production": {
      "android": {
        "buildType": "app-bundle"
      }
    }
  }
}
```

### 3. Build APK (testing/sideload)

Use the `preview` profile to produce a plain APK you can install directly on a device or share with testers:

```bash
cd mobile
eas build -p android --profile preview
```

> **Tip:** Add `--local` to run the build on your machine instead of EAS cloud (requires Android SDK).

### 4. Build AAB (Play Store)

Use the `production` profile to produce an Android App Bundle (`.aab`) accepted by Google Play:

```bash
cd mobile
eas build -p android --profile production
```

EAS manages Android signing automatically. On your first production build you will be prompted to:
- Generate a new keystore (recommended — EAS stores it securely), **or**
- Upload an existing keystore.

> **Important:** Keep your keystore safe. Losing it means you cannot publish updates to the same Play Store listing.

### 5. Download your build

After the build completes, the CLI prints a direct download URL:

```
✓ Build finished.
  Download: https://expo.dev/artifacts/eas/...
```

You can also view and download all builds from the [Expo dashboard](https://expo.dev/accounts/your-account/projects/drive-home/builds).

---

## Alternative: React Native CLI (Local Build)

Use this approach if you prefer not to use Expo EAS or need full control over the Android build.

> **Note:** The `mobile/` directory contains an Expo-managed project. Run `npx expo prebuild --platform android` first to generate the native `android/` folder if it does not already exist.

```bash
cd mobile
npx expo prebuild --platform android
```

### 1. Generate a signing keystore

```bash
keytool -genkey -v \
  -keystore drive-release.keystore \
  -alias drive-release \
  -keyalg RSA \
  -keysize 2048 \
  -validity 10000
```

Store the generated `drive-release.keystore` file outside the repository (never commit it).

### 2. Configure Gradle signing

Create (or edit) `mobile/android/gradle.properties` and add:

```properties
DRIVE_STORE_FILE=/path/to/drive-release.keystore
DRIVE_KEY_ALIAS=drive-release
DRIVE_STORE_PASSWORD=your_store_password
DRIVE_KEY_PASSWORD=your_key_password
```

Then update `mobile/android/app/build.gradle`:

```groovy
android {
    ...
    signingConfigs {
        release {
            storeFile file(DRIVE_STORE_FILE)
            storePassword DRIVE_STORE_PASSWORD
            keyAlias DRIVE_KEY_ALIAS
            keyPassword DRIVE_KEY_PASSWORD
        }
    }
    buildTypes {
        release {
            signingConfig signingConfigs.release
            minifyEnabled true
            proguardFiles getDefaultProguardFile('proguard-android.txt'), 'proguard-rules.pro'
        }
    }
}
```

### 3. Build APK

```bash
cd mobile/android
./gradlew assembleRelease
```

Output: `mobile/android/app/build/outputs/apk/release/app-release.apk`

### 4. Build AAB

```bash
cd mobile/android
./gradlew bundleRelease
```

Output: `mobile/android/app/build/outputs/bundle/release/app-release.aab`

---

## Play Store Readiness Checklist

Before uploading an AAB to Google Play Console:

- [ ] **App ID / Package name** matches your Play Console listing (`com.dukens11.drivehome` in `mobile/app.json`).
- [ ] **Version code** is incremented for every new upload (`expo.android.versionCode` in `app.json`).
- [ ] **Version name** is updated (`expo.version` in `app.json`).
- [ ] **Signing keystore** is the same one used for previous releases (Play does not allow changing it).
- [ ] **Permissions** declared in `app.json` (`ACCESS_FINE_LOCATION`, etc.) match the Data Safety form in Play Console.
- [ ] **Background location** — if used, provide a privacy policy URL and complete the Play Console declaration.
- [ ] **Google Maps API key** is added and restricted to the production Android app (SHA-1 fingerprint + package name).
- [ ] **Firebase config** values in `mobile/app.json` (`expo.extra.firebase`) are populated for production.
- [ ] App passes [Pre-launch report](https://play.google.com/console) tests with no critical issues.
- [ ] At least one closed/internal test track release is completed before open or production release.

---

## Common Errors and Fixes

| Error | Likely Cause | Fix |
|---|---|---|
| `eas: command not found` | EAS CLI not installed | Run `npm install -g eas-cli` |
| `No project found for slug "drive-home"` | Not logged in or wrong Expo account | Run `eas login` and verify your account |
| `Keystore not found` | Path in `gradle.properties` is wrong | Use an absolute path; confirm the file exists |
| `INSTALL_FAILED_UPDATE_INCOMPATIBLE` | APK signed with a different key than installed version | Uninstall the app from the device before reinstalling |
| `Gradle build failed: SDK not found` | `ANDROID_HOME` not set | Install Android Studio and export `ANDROID_HOME` |
| `minSdkVersion` conflict | A library requires a higher min SDK | Bump `minSdkVersion` in `android/build.gradle` |
| EAS build times out | Large project or slow network on EAS side | Retry; use `--local` flag to build on your machine |
| AAB rejected by Play Console | Not signed or wrong format | Ensure you used `bundleRelease` or EAS production profile |

---

For iOS build instructions, see [IOS_RELEASE.md](./IOS_RELEASE.md).
For general Android release steps, see [ANDROID_RELEASE.md](./ANDROID_RELEASE.md).
