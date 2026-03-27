$ErrorActionPreference = "Stop"

$repoRoot = Resolve-Path (Join-Path $PSScriptRoot "..\..\..")
$env:ANDROID_HOME = if ($env:ANDROID_HOME) { $env:ANDROID_HOME } else { "C:\Android" }
$env:ANDROID_SDK_ROOT = $env:ANDROID_HOME
$env:ANDROID_USER_HOME = Join-Path $repoRoot ".android"
$env:HOME = $repoRoot
$env:USERPROFILE = $repoRoot

if (-not (Test-Path $env:ANDROID_USER_HOME)) {
  New-Item -ItemType Directory -Path $env:ANDROID_USER_HOME | Out-Null
}

$adb = Join-Path $env:ANDROID_HOME "platform-tools\adb.exe"
& $adb devices
