param(
  [Parameter(Mandatory = $true)]
  [ValidateSet("customer", "merchant")]
  [string]$App,

  [string]$DeviceId,

  [switch]$StartMetro
)

$ErrorActionPreference = "Stop"

$scriptsDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$mobileRoot = Split-Path -Parent $scriptsDir
$repoRoot = Resolve-Path (Join-Path $mobileRoot "..\..\..")

$env:ANDROID_HOME = if ($env:ANDROID_HOME) { $env:ANDROID_HOME } else { "C:\Android" }
$env:ANDROID_SDK_ROOT = $env:ANDROID_HOME
$env:ANDROID_USER_HOME = Join-Path $repoRoot ".android"
$env:HOME = $repoRoot
$env:USERPROFILE = $repoRoot

if (-not (Test-Path $env:ANDROID_USER_HOME)) {
  New-Item -ItemType Directory -Path $env:ANDROID_USER_HOME | Out-Null
}

$adb = Join-Path $env:ANDROID_HOME "platform-tools\adb.exe"
if (-not (Test-Path $adb)) {
  throw "adb.exe not found under $($env:ANDROID_HOME)\platform-tools"
}

$appDir = switch ($App) {
  "customer" { Join-Path $mobileRoot "customer" }
  "merchant" { Join-Path $mobileRoot "merchent" }
}

$packageName = switch ($App) {
  "customer" { "com.dokanx.customer" }
  "merchant" { "com.dokanx.merchant" }
}

if ($StartMetro) {
  Start-Process powershell -ArgumentList @(
    "-NoExit",
    "-ExecutionPolicy", "Bypass",
    "-Command",
    "`$env:HOME='$repoRoot'; `$env:USERPROFILE='$repoRoot'; cd '$appDir'; cmd /c npm.cmd run dev"
  ) | Out-Null
}

if ($App -eq "customer") {
  Push-Location $appDir
  try {
    $assetsDir = Join-Path $appDir "android\app\src\main\assets"
    if (-not (Test-Path $assetsDir)) {
      New-Item -ItemType Directory -Path $assetsDir | Out-Null
    }

    cmd /c npx.cmd react-native bundle --platform android --dev false --entry-file index.js --bundle-output android/app/src/main/assets/index.android.bundle --assets-dest android/app/src/main/res/
  }
  finally {
    Pop-Location
  }
}

$devicesOutput = & $adb devices
$onlineDevices = @(
  $devicesOutput |
    Select-Object -Skip 1 |
    Where-Object { $_ -match "\tdevice$" } |
    ForEach-Object { ($_ -split "\t")[0] }
)

if (-not $onlineDevices.Count) {
  throw "No authorized Android device detected. Check USB debugging, cable mode, and authorization prompt."
}

$targetDevice = if ($DeviceId) { $DeviceId } else { $onlineDevices[0] }

& $adb -s $targetDevice reverse tcp:8081 tcp:8081 | Out-Null
& $adb -s $targetDevice reverse tcp:5001 tcp:5001 | Out-Null

Push-Location (Join-Path $appDir "android")
try {
  cmd /c gradlew.bat installDebug
}
finally {
  Pop-Location
}

& $adb -s $targetDevice shell monkey -p $packageName -c android.intent.category.LAUNCHER 1 | Out-Null
Write-Host "Installed $App app on device $targetDevice"