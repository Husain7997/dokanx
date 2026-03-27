# DokanX Mobile Release Notes

## Android signing

Generate the keystore locally or in CI:

```powershell
keytool -genkeypair -v -keystore dokanx.keystore -alias dokanx -keyalg RSA -keysize 2048 -validity 10000
```

Set these values before a release build:

- `DOKANX_UPLOAD_STORE_FILE`
- `DOKANX_UPLOAD_KEY_ALIAS`
- `DOKANX_UPLOAD_STORE_PASSWORD`
- `DOKANX_UPLOAD_KEY_PASSWORD`

## Build commands

Customer:

```powershell
cd apps/frontend/mobile-app/customer/android
gradlew.bat assembleRelease
gradlew.bat bundleRelease
```

Merchant:

```powershell
cd apps/frontend/mobile-app/merchent/android
gradlew.bat assembleRelease
gradlew.bat bundleRelease
```

## Manual test checklist

- Login and logout
- Browse and search products
- Add to cart and edit quantities
- Checkout flow
- Payment callback and order status
- Map discovery and location permissions
- Order tracking
- Merchant dashboard landing
- Merchant orders, wallet, customers
- Update prompt against version API
- Crash reporting in Sentry

## Play Store assets

- Final app name
- 512x512 icon
- Feature graphic
- Phone screenshots
- 7-inch tablet screenshots if targeted
- Short description
- Full description
- Privacy policy URL
