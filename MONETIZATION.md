# Monetization Strategy for Sudoku Battle

## Recommended: Freemium + Hybrid Model

### 1. Ad-Supported Free Tier
- Interstitial ads between games (not during gameplay)
- Banner ads on lobby/menu screens
- Rewarded video ads for optional benefits (e.g., hints, undo moves)

### 2. Premium Upgrade (One-Time Purchase)
- Remove all ads permanently (~$2.99-4.99)
- This is the most user-friendly approach for puzzle games

### 3. Cosmetic In-App Purchases
- Custom board themes/color schemes
- Player avatars/badges
- Victory animations
- Sound packs
- These don't affect gameplay fairness

### 4. Optional Subscription (if more content is added)
- Daily challenges with leaderboards
- Exclusive puzzle packs
- Detailed statistics/analytics
- Cloud save across devices

## What to Avoid
- Pay-to-win mechanics (ruins competitive integrity)
- Aggressive ad frequency (drives users away)
- Energy systems (frustrating for puzzle games)

## Implementation Priority

### Phase 1: Quick Win (Start Here)
1. Free with non-intrusive ads
2. Single IAP to remove ads ($2.99)

This builds user base first, then cosmetics can be added later based on demand.

### Phase 2: Expand Revenue
- Add cosmetic themes/avatars
- Implement rewarded video ads for hints

### Phase 3: Recurring Revenue
- Consider subscription for premium features
- Daily challenges with exclusive rewards

## Technical Implementation Notes

### AdMob Integration (Capacitor)
- Use `@capacitor-community/admob` plugin
- Ad Unit IDs needed: banner, interstitial, rewarded
- Test with test ad IDs during development

### In-App Purchases
- iOS: StoreKit via Capacitor plugin
- Android: Google Play Billing via Capacitor plugin
- Consider using RevenueCat for cross-platform IAP management

## Revenue Expectations (Rough Estimates)
- Banner ads: $0.10-0.50 eCPM
- Interstitial ads: $1-5 eCPM
- Rewarded video: $5-15 eCPM
- IAP conversion rate: 2-5% of active users

## How to Collect Ad Revenue

### Step 1: Create AdMob Account
1. Go to [admob.google.com](https://admob.google.com)
2. Sign up with your Google account
3. Register your app (iOS and Android separately)
4. Complete payment info setup

### Step 2: Create Ad Units
Create Ad Unit IDs for each ad type in AdMob dashboard:
- **Banner** - small ads on lobby/menu screens
- **Interstitial** - full-screen ads between games
- **Rewarded Video** - optional ads users watch for benefits

### Step 3: Install Capacitor AdMob Plugin
```bash
npm install @capacitor-community/admob
npx cap sync
```

### Step 4: Configure the Plugin
- iOS: Add `GADApplicationIdentifier` to Info.plist
- Android: Add `APPLICATION_ID` to AndroidManifest.xml
- Use test Ad Unit IDs during development

### Step 5: Integrate Ads in App
- Show banner ads on GameLobby/menu screens
- Show interstitial ads after a game ends (not during gameplay)
- Optionally offer rewarded videos for hints/undo

### Step 6: Receive Payment
- AdMob pays via wire transfer or check
- Minimum payout threshold: $100
- Payment issued around 21st of each month
