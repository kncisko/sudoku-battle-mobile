# Install Android APK Directly to Samsung Device

Build the web app, sync to Android, build the APK, and install directly to the connected Samsung A26 5G device using adb install.

**Usage:** `/android-install`

## What This Command Does

Full pipeline from source to device in one shot:
1. Build the Vue.js web app
2. Sync web assets to Android Capacitor project
3. Build the Android debug APK with Gradle
4. Install directly to the Samsung via `adb install -r`

## When to Use

Use this command when:
- Testing on the Samsung A26 5G (device ID: R5CY83DFZ6A)
- You want quick iteration during development
- The device has USB debugging enabled

Use `/android-deploy` instead when:
- Sending builds to friends for manual installation
- Testing on Xiaomi or other devices without USB debugging
- You want to keep the APK in the Downloads folder

## Implementation

Execute these bash commands in sequence:

```bash
# Step 1: Build web app and sync to Android
cd /Users/kresimirnovak/projects/sudoku-battle-mobile/client && npm run build && npx cap sync android

# Step 2: Build APK
export JAVA_HOME="/Applications/Android Studio.app/Contents/jbr/Contents/Home" && cd /Users/kresimirnovak/projects/sudoku-battle-mobile/client/android && ./gradlew assembleDebug

# Step 3: Install directly to Samsung device
~/Library/Android/sdk/platform-tools/adb -s R5CY83DFZ6A install -r /Users/kresimirnovak/projects/sudoku-battle-mobile/client/android/app/build/outputs/apk/debug/app-debug.apk
```

## Important Notes

- Device must be connected via USB with USB debugging enabled
- Device ID `R5CY83DFZ6A` is the Samsung A26 5G
- The `-r` flag reinstalls the app if already present (keeps data)
- Installation happens automatically - no manual file manager steps needed
- Web build + APK build takes ~5-10 seconds (most Gradle tasks are cached)

## After Installation

The app will be automatically installed and you can launch it immediately from the app drawer or home screen.

## Device Setup Requirements

The Samsung device must have:
- USB debugging enabled in Developer options
- Auto Blocker disabled (Samsung security feature)
- Connected via USB in File Transfer mode
