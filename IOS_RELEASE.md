# iOS Release

Apple developer account, signing, privacy labels, location explanation, screenshots, TestFlight.

## Codemagic Runner scheme checklist

If Codemagic reports `Scheme "Runner" not found from repository`, treat this as **BLOCKING** until the full local regeneration and force-add process is completed on the same branch.

```bash
cd mobile
flutter create .
git add -f ios/
git status --short
```

Then commit and push. Do not open duplicate PRs for Runner-scheme failures; complete this exact procedure on the current branch first.
For this iOS-specific remediation, the force-add command is intentionally limited to `ios/` (and excludes `android`) to avoid unintentionally committing unrelated Android artifact changes.

Before committing, confirm neither the repository root `.gitignore` nor `mobile/ios/.gitignore` excludes required iOS artifacts (`Runner.xcworkspace`, `Runner.xcodeproj`, `Runner/Info.plist`, and required `ios/Flutter/*.xcconfig` files).

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

## Repository and PR scope guard

- Apply this Runner-scheme fix only in `dukens11-create/drive`.
- Do not open repeated PRs for the same missing-scheme root cause when the required files listed above are already committed; continue on the existing PR/branch instead.

## GitHub verification checklist

Before retrying Codemagic, verify these files are visible in GitHub on the branch being built:

- `mobile/ios/Runner.xcodeproj/project.pbxproj`
- `mobile/ios/Runner.xcodeproj/xcshareddata/xcschemes/Runner.xcscheme`
- `mobile/ios/Runner.xcworkspace/contents.xcworkspacedata`
- `mobile/ios/Runner/Info.plist`
- `mobile/ios/Flutter/Debug.xcconfig`
- `mobile/ios/Flutter/Release.xcconfig`
- `mobile/android/gradlew`
- `mobile/android/gradlew.bat`
- `mobile/android/gradle/wrapper/gradle-wrapper.jar`

Maintenance note: keep these platform files committed (do not add ignore rules for `.xcodeproj`, `.xcworkspace`, or required Flutter config files), and regenerate with `flutter create .` from `mobile/` if they are ever missing.
