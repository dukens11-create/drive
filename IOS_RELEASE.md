# iOS Release

Apple developer account, signing, privacy labels, location explanation, screenshots, TestFlight.

## Codemagic Runner scheme checklist

If Codemagic reports "Scheme \"Runner\" not found from repository", verify the committed Flutter iOS project files from the `mobile/` app:

```bash
cd mobile
flutter create .
git add -f ios android
git status --short
```

Required iOS files include:

- `mobile/ios/Runner.xcodeproj/project.pbxproj`
- `mobile/ios/Runner.xcodeproj/xcshareddata/xcschemes/Runner.xcscheme`
- `mobile/ios/Runner.xcworkspace/contents.xcworkspacedata`
- `mobile/ios/Runner/Info.plist`
- `mobile/ios/Flutter/Debug.xcconfig`
- `mobile/ios/Flutter/Release.xcconfig`

Required Android files include:

- `mobile/android/gradlew`
- `mobile/android/gradlew.bat`
- `mobile/android/gradle/wrapper/gradle-wrapper.jar`
- `mobile/android/gradle/wrapper/gradle-wrapper.properties`

After pushing the commit, retry the Codemagic build.
