# Merchant iPhone Readiness

The merchant mobile app now has iPhone-ready JS code for:
- POS camera scanning via `react-native-camera-kit`
- QR generation in POS checkout
- live merchant dashboard, orders, wallet, credit, customers, products, notifications, marketing, and settings

## Current repo status

The live merchant app does not yet contain an `ios/` project folder, so build-side iPhone validation cannot be run from this Windows workspace.

A bootstrap iOS template is already prepared in:
- `apps/frontend/mobile-app/_bootstrap_merchant/ios`

To materialize the merchant iOS project later, run:

```powershell
powershell -ExecutionPolicy Bypass -File apps/frontend/mobile-app/scripts/bootstrap-merchant-ios.ps1
```

After that, on macOS:

1. `cd apps/frontend/mobile-app/merchent/ios`
2. `bundle exec pod install`
3. `cd ..`
4. `npx react-native run-ios`

## iPhone-specific prep already done

- `react-native.config.js` is now iOS-aware when an `ios/` folder exists.
- The bootstrap `Info.plist` already includes:
  - `NSCameraUsageDescription`
  - `NSPhotoLibraryUsageDescription`
  - `NSPhotoLibraryAddUsageDescription`
- POS scanner code already uses `react-native-camera-kit`, which supports iOS and Android.

## What still needs macOS/Xcode

- Pod install
- Xcode signing and bundle identifier validation
- iPhone simulator / device build validation
- camera permission acceptance test on device
- barcode and QR scan verification on device camera
