# Deploy iOS App

Build the web app and sync with iOS Capacitor project. Ready to build and run from Xcode.

**Usage:** `/ios-deploy`

## What This Command Does

This command automates the process of preparing the iOS app for testing:
- Builds the Vue.js web application
- Syncs web assets to iOS Capacitor project
- iOS project ready to build from Xcode

## Steps Executed

1. **Build Web Application**
   - Run `npm run build` to create production build
   - Compiles TypeScript and bundles with Vite
   - Output goes to `dist/` folder

2. **Sync iOS Platform**
   - Run `npx cap sync ios`
   - Copies web assets to iOS project
   - Updates iOS plugins and dependencies

## Implementation

Execute this bash command:

```bash
npm run build && npx cap sync ios
```

## After Deployment

- Open Xcode (if not already open)
- Select target device (Kresimir's iPhone)
- Click Run button to build and deploy

## When to Use

Use this command whenever you want to:
- Test on iOS device
- Prepare iOS build after code changes
- Sync latest changes to Xcode project
