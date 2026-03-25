# Install Android APK Directly to Samsung Device

Build the Android debug APK and install it directly to the connected Samsung A26 5G device using adb install.

**Usage:** `/android-install`

## What This Command Does

This command builds and directly installs the app to the Samsung device. Unlike `/android-deploy` which pushes to the file manager for manual installation, this command uses `adb install` to automatically install the APK.

## When to Use

Use this command when:
- Testing on the Samsung A26 5G (device ID: R5CY83DFZ6A)
- You want quick iteration during development
- The device has USB debugging enabled

Use `/android-deploy` instead when:
- Sending builds to friends for manual installation
- Testing on Xiaomi or other devices without USB debugging
- You want to keep the APK in the Downloads folder

## Steps Executed

1. **Build the Android APK**
   - Set JAVA_HOME to Android Studio's bundled JDK
   - Run Gradle build to create debug APK

2. **Install directly to device**
   - Use `adb install -r` to install (or reinstall) the app
   - The `-r` flag replaces existing installation
   - No manual installation needed

## Implementation

Execute these bash commands in sequence:

```bash
# Step 1: Build APK
export JAVA_HOME="/Applications/Android Studio.app/Contents/jbr/Contents/Home" && cd android && ./gradlew assembleDebug && cd ..

# Step 2: Install directly to Samsung device
~/Library/Android/sdk/platform-tools/adb -s R5CY83DFZ6A install -r android/app/build/outputs/apk/debug/app-debug.apk
```

## Important Notes

- Device must be connected via USB with USB debugging enabled
- Device ID `R5CY83DFZ6A` is the Samsung A26 5G
- The `-r` flag reinstalls the app if already present (keeps data)
- Installation happens automatically - no manual file manager steps needed
- Build takes ~1-2 seconds (most tasks are cached)

## After Installation

The app will be automatically installed and you can launch it immediately from the app drawer or home screen. No need to use file manager.

## Device Setup Requirements

The Samsung device must have:
- USB debugging enabled in Developer options
- Auto Blocker disabled (Samsung security feature)
- Connected via USB in File Transfer mode
