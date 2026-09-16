# Deploy Android APK to Device

Build the web app, sync to Android, build the APK, and install directly via `adb install`.

**Usage:** `/android-deploy`

## Steps Executed

1. Build Vue.js web app (`npm run build`)
2. Sync web assets to Android (`npx cap sync android`)
3. Build debug APK with Gradle
4. Install directly to device via `adb install -r`

## Implementation

Execute these bash commands in sequence:

```bash
# Step 1: Build web app and sync to Android
cd /Users/kresimirnovak/projects/sudoku-battle-mobile/client && npm run build && npx cap sync android

# Step 2: Build APK
export JAVA_HOME="/Applications/Android Studio.app/Contents/jbr/Contents/Home" && cd /Users/kresimirnovak/projects/sudoku-battle-mobile/client/android && ./gradlew assembleDebug

# Step 3: Install directly to device
~/Library/Android/sdk/platform-tools/adb -s R5CY83DFZ6A install -r /Users/kresimirnovak/projects/sudoku-battle-mobile/client/android/app/build/outputs/apk/debug/app-debug.apk
```

## Important Notes

- Device ID `R5CY83DFZ6A` is the connected Android device
- The `-r` flag reinstalls without removing data
- Check connected devices with: `~/Library/Android/sdk/platform-tools/adb devices`
- App installs automatically — no file manager steps needed
- If device ID changes, run `adb devices` first and update the command
