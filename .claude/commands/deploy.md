# Deploy to Both iOS and Android Platforms

Build the web app, sync with Capacitor, build Android APK, and deploy to connected device. iOS will be ready to build from Xcode.

**Usage:** `/deploy`

## What This Command Does

This command automates the complete deployment workflow for both iOS and Android platforms:
- Builds the Vue.js web application
- Syncs web assets to both iOS and Android Capacitor projects
- Builds Android debug APK
- Saves APK to Downloads folder for sharing
- Pushes APK to connected Android device for installation

## Steps Executed

1. **Build Web Application**
   - Run `npm run build` to create production build
   - Compiles TypeScript and bundles with Vite
   - Output goes to `dist/` folder

2. **Sync iOS Platform**
   - Run `npx cap sync ios`
   - Copies web assets to iOS project
   - Updates iOS plugins and dependencies
   - iOS project ready to build from Xcode

3. **Sync Android Platform**
   - Run `npx cap sync android`
   - Copies web assets to Android project
   - Updates Android plugins and dependencies

4. **Build Android APK**
   - Set JAVA_HOME to Android Studio's bundled JDK
   - Run Gradle build to create debug APK
   - APK will be ~28-29MB in size

5. **Save APK for Sharing**
   - Copy the built APK to ~/Downloads folder
   - Rename it to `sudoku-battle-latest.apk` for easy identification

6. **Deploy to Connected Android Device**
   - Detect connected Android device
   - Use ADB to push APK to device's Download folder
   - Ready for manual installation

## Implementation

Execute these bash commands in sequence:

```bash
# Step 1: Build web app
npm run build

# Step 2: Sync iOS (no additional steps needed, ready for Xcode)
npx cap sync ios

# Step 3: Sync Android
npx cap sync android

# Step 4: Build Android APK
export JAVA_HOME="/Applications/Android Studio.app/Contents/jbr/Contents/Home" && cd android && ./gradlew assembleDebug && cd ..

# Step 5: Copy to Downloads for sharing
cp android/app/build/outputs/apk/debug/app-debug.apk ~/Downloads/sudoku-battle-latest.apk

# Step 6: Deploy to connected device
# First check for connected devices
~/Library/Android/sdk/platform-tools/adb devices

# Push to the first connected device (auto-detect)
~/Library/Android/sdk/platform-tools/adb push ~/Downloads/sudoku-battle-latest.apk /sdcard/Download/sudoku-battle-latest.apk
```

## Important Notes

- **iOS**: After this command completes, iOS project is ready to build and run from Xcode (which should already be open)
- **Android**: Device must be connected via USB
- Check connected devices with: `~/Library/Android/sdk/platform-tools/adb devices`
- If multiple devices are connected, the command will use the first one
- User must enable "Install from unknown sources" for File Manager on Android device
- Web build takes ~1-2 seconds
- Android APK build takes ~1-2 seconds (most tasks are cached)

## After Deployment

**For iOS:**
- Open Xcode (if not already open)
- Select target device (Kresimir's iPhone)
- Click Run button to build and deploy

**For Android:**
1. Open **File Manager** app on the device
2. Navigate to **Download** folder
3. Find **sudoku-battle-latest.apk**
4. Tap it to install
5. If prompted, allow installation from File Manager

**For Sharing:**
- APK is saved at `~/Downloads/sudoku-battle-latest.apk`
- Send this file to testers via AirDrop, email, etc.

## When to Use

Use this command whenever you want to:
- Deploy to both platforms after making code changes
- Test on both iOS and Android
- Create a shareable Android APK
- Complete end-to-end deployment workflow
- Save time by automating the full deployment process
