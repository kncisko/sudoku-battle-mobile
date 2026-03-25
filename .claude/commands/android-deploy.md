# Deploy Android APK to Xiaomi Device

Build the Android debug APK and push it to the connected Xiaomi physical device.

**Usage:** `/android-deploy`

## What This Command Does

This command automates the process of building and deploying the Android app to the Xiaomi device for testing. It's needed because USB debugging cannot be enabled on this particular Xiaomi device, so we build an APK and push it via ADB to the device's file manager for manual installation.

## Steps Executed

1. **Build the Android APK**
   - Set JAVA_HOME to Android Studio's bundled JDK
   - Run Gradle build to create debug APK
   - APK will be ~28MB in size

2. **Copy APK to Downloads**
   - Copy the built APK to ~/Downloads folder
   - Rename it to `sudoku-battle-latest.apk` for easy identification

3. **Push to Device**
   - Use ADB to push the APK to the device's Download folder
   - Device ID: `4137de7f` (Xiaomi physical device)

4. **Notify User**
   - Tell the user to open File Manager on the device
   - Navigate to Download folder
   - Tap on sudoku-battle-latest.apk to install

## Implementation

Execute these bash commands in sequence:

```bash
# Step 1: Build APK
export JAVA_HOME="/Applications/Android Studio.app/Contents/jbr/Contents/Home" && cd android && ./gradlew assembleDebug && cd ..

# Step 2: Copy to Downloads
cp android/app/build/outputs/apk/debug/app-debug.apk ~/Downloads/sudoku-battle-latest.apk

# Step 3: Push to device
~/Library/Android/sdk/platform-tools/adb -s 4137de7f push ~/Downloads/sudoku-battle-latest.apk /sdcard/Download/sudoku-battle-latest.apk
```

## Important Notes

- Device must be connected via USB (even though debugging is disabled)
- Check device is connected with: `~/Library/Android/sdk/platform-tools/adb devices`
- Device ID `4137de7f` is the Xiaomi physical device
- Emulator ID is `emulator-5554` (don't use this one)
- User must enable "Install from unknown sources" for File Manager on the device
- Build takes ~1-2 seconds (most tasks are cached)

## After Deployment

Tell the user to:
1. Open **File Manager** app on the Xiaomi device
2. Navigate to **Download** folder
3. Find **sudoku-battle-latest.apk**
4. Tap it to install
5. If prompted, allow installation from File Manager

## When to Use

Use this command whenever the user wants to:
- Test on Android device
- Build and deploy to Xiaomi
- Push APK to phone
- Test Android version
- Build Android package
