# Changelog

## [1.1.0](https://github.com/dukens11-create/drive/compare/drive-home-mobile-v1.0.0...drive-home-mobile-v1.1.0) (2026-06-08)


### Features

* add food delivery features to passenger and driver mobile apps ([#9](https://github.com/dukens11-create/drive/issues/9)) ([4385496](https://github.com/dukens11-create/drive/commit/43854963e08d537136a1f092b79798568af95df3))
* add full-screen ride request popup ([a354143](https://github.com/dukens11-create/drive/commit/a354143ba25aa6ba302bd7e358e923113229b034))
* add in-app passenger communication system ([bf37649](https://github.com/dukens11-create/drive/commit/bf376496603e632dcb6c053f5eaead7468bd7475))
* add trip communication hooks for chat, calls, and realtime updates ([192b09c](https://github.com/dukens11-create/drive/commit/192b09c81867bf1b3291cf7dd828fe94f2a13eff))
* expand driver navigation mode ([9d9d69c](https://github.com/dukens11-create/drive/commit/9d9d69c06562ef835dcf78f391a923b9888b1d76))
* in-app passenger communication system (call, chat, voice notes, translation, quick replies) ([64b73fe](https://github.com/dukens11-create/drive/commit/64b73fe72a61f15f33aeaa85f87dba79675af10a))
* **mobile:** complete driver trip lifecycle with fare summary and receipt ([f122487](https://github.com/dukens11-create/drive/commit/f122487ff23982fc092e66cd1fe547487aa645e8))
* wire Mapbox public token across all app surfaces ([997a7e0](https://github.com/dukens11-create/drive/commit/997a7e0f49abfd9c747ea0f3fafc934d06e576d3))


### Bug Fixes

* bump react-native-worklets to 0.9.1 to satisfy react-native-reanimated@4.4.0 peer dep ([3964666](https://github.com/dukens11-create/drive/commit/3964666d2ccf2fa60eb2543102c8cc4f5cfb0555))
* clarify food delivery completion logic (advance state then check completed) ([4385496](https://github.com/dukens11-create/drive/commit/43854963e08d537136a1f092b79798568af95df3))
* downgrade react-native-worklets to ~0.8.3 for expo-modules-core compatibility ([ee6dc75](https://github.com/dukens11-create/drive/commit/ee6dc75b9099546944a244a6f55fc2df75bb7d95))
* downgrade react-native-worklets to ~0.8.3 for expo-modules-core compatibility ([37edf9c](https://github.com/dukens11-create/drive/commit/37edf9c9421c5453487cb55c23668a7ac6c6bf10))
* keep navigation validation changes focused ([b4583b6](https://github.com/dukens11-create/drive/commit/b4583b6d8016912aa63ae368610a8520e7f13958))
* **mobile:** align worklets with reanimated and unblock npm ci ([91d4263](https://github.com/dukens11-create/drive/commit/91d42638b97aaf3ee10a8fc0b25b05501273e489))
* **mobile:** bump react-native-worklets to 0.9.1 to satisfy reanimated 4.4.0 peer dep ([30d98a3](https://github.com/dukens11-create/drive/commit/30d98a33cfe07127ca12ff49837883a1a2451c85))
* **mobile:** regenerate lockfile for npm ci sync ([b415d44](https://github.com/dukens11-create/drive/commit/b415d44e4b42670fd506e9e38437aaddce658087))
* **mobile:** rename notification sound to satisfy Android resource naming rules ([fee9af9](https://github.com/dukens11-create/drive/commit/fee9af9e2f9df21ea4d1d6e56355192b107b369e))
* regenerate mobile/package-lock.json to resolve npm ci lockfile mismatch ([4711ad6](https://github.com/dukens11-create/drive/commit/4711ad6a65dbe10167b7ab7c79df042b9ddf0e48))
* regenerate mobile/package-lock.json to sync with package.json ([f06918a](https://github.com/dukens11-create/drive/commit/f06918aeb3c46411d713ade450ab700885df9688))
* remove fragile allergen 'none' string check (use empty array instead) ([4385496](https://github.com/dukens11-create/drive/commit/43854963e08d537136a1f092b79798568af95df3))
* sync mobile/package-lock.json with package.json (react-native-worklets 0.9.1 → 0.8.3) ([9ca06c5](https://github.com/dukens11-create/drive/commit/9ca06c57f63956ef1bbf97693104aa18da02b8f5))
* sync mobile/package-lock.json with package.json (react-native-worklets 0.9.1→0.8.3) ([02d49c1](https://github.com/dukens11-create/drive/commit/02d49c1daf1f1de9036b0c709140c7b7249c14ab))
* Update notification sound filename from incoming-request to incoming_request (Android resource naming requirement) ([a6d8c6d](https://github.com/dukens11-create/drive/commit/a6d8c6d21e9af9dd02da248cf2649ca8e84567ec))
