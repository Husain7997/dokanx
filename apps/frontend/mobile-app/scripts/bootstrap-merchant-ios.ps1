param()

$ErrorActionPreference = "Stop"

$repoRoot = Resolve-Path (Join-Path $PSScriptRoot "..\..\..\..")
$appRoot = Join-Path $repoRoot "apps\frontend\mobile-app\merchent"
$templateRoot = Join-Path $repoRoot "apps\frontend\mobile-app\_bootstrap_merchant\ios"
$targetRoot = Join-Path $appRoot "ios"

if (Test-Path $targetRoot) {
  Write-Host "merchant ios project already exists at $targetRoot"
  exit 0
}

Copy-Item -Path $templateRoot -Destination $targetRoot -Recurse
Write-Host "merchant ios template copied to $targetRoot"
Write-Host "next steps: open on macOS, run 'bundle exec pod install' inside ios, then 'npx react-native run-ios'"
