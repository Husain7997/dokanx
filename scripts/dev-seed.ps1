param(
  [string]$ApiBaseUrl = "http://localhost:5001",
  [string]$OwnerEmail = "owner@test.com",
  [string]$OwnerPassword = "Secret123!",
  [string]$OwnerName = "Demo Owner",
  [string]$ShopName = "Demo Shop",
  [string]$ProductName = "Demo Product",
  [int]$ProductPrice = 1200,
  [int]$ProductStock = 10
)

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

function Invoke-Json {
  param(
    [string]$Method,
    [string]$Url,
    [hashtable]$Body = $null,
    [hashtable]$Headers = $null
  )

  $payload = $null
  if ($Body) {
    $payload = $Body | ConvertTo-Json -Depth 6
  }

  return Invoke-RestMethod -Method $Method -Uri $Url -Body $payload -Headers $Headers -ContentType "application/json"
}

Write-Host "Seeding via $ApiBaseUrl"

try {
  Invoke-Json -Method "POST" -Url "$ApiBaseUrl/auth/register" -Body @{
    name = $OwnerName
    email = $OwnerEmail
    password = $OwnerPassword
    role = "OWNER"
  } | Out-Null
  Write-Host "Owner registered."
} catch {
  Write-Host "Owner register skipped (may already exist)."
}

$login = Invoke-Json -Method "POST" -Url "$ApiBaseUrl/auth/login" -Body @{
  email = $OwnerEmail
  password = $OwnerPassword
}

$token = $login.accessToken
if (-not $token) {
  throw "Login failed: missing accessToken."
}

$authHeaders = @{
  Authorization = "Bearer $token"
}

$me = Invoke-Json -Method "GET" -Url "$ApiBaseUrl/me" -Headers $authHeaders
$shopId = $me.user.shopId

if (-not $shopId) {
  Write-Host "Creating shop..."
  Invoke-Json -Method "POST" -Url "$ApiBaseUrl/shops" -Headers $authHeaders -Body @{
    name = $ShopName
  } | Out-Null

  $me = Invoke-Json -Method "GET" -Url "$ApiBaseUrl/me" -Headers $authHeaders
  $shopId = $me.user.shopId
}

if (-not $shopId) {
  throw "Shop not available for this owner."
}

Write-Host "Shop ready: $shopId"

try {
  Invoke-Json -Method "POST" -Url "$ApiBaseUrl/products" -Headers $authHeaders -Body @{
    name = $ProductName
    price = $ProductPrice
    stock = $ProductStock
    category = "Demo"
  } | Out-Null
  Write-Host "Product created."
} catch {
  Write-Host "Product create failed (check backend logs)."
}

Write-Host "Seed complete. Sign in with $OwnerEmail"
