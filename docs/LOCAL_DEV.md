# DokanX Local Dev

This is the quickest way to boot the system locally and view the merchant dashboard and storefront.

## 1) Start backend

```powershell
$env:PORT="5001"
npm run dev:backend
```

## 2) Start merchant dashboard (port 3001)

```powershell
$env:PORT="3001"
$env:NEXT_PUBLIC_API_URL="http://localhost:5001/api"
npm run dev:merchant
```

Open:
- http://localhost:3001/sign-in
- or tenant subdomain: http://merchant.localhost:3001/sign-in

## 3) Start storefront (port 3000)

```powershell
$env:PORT="3000"
$env:NEXT_PUBLIC_API_URL="http://localhost:5001/api"
npm run dev:storefront
```

Open:
- http://localhost:3000
- or tenant subdomain: http://aurora.localhost:3000

## 4) Seed a demo owner + shop + product (optional)

Run the script below while the backend is running:

```powershell
.\scripts\dev-seed.ps1 -ApiBaseUrl "http://localhost:5001/api" -OwnerEmail "owner@test.com" -OwnerPassword "Secret123!" -ShopName "Demo Shop"
```

Then sign in at http://localhost:3001/sign-in using the owner credentials.
