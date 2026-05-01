[CmdletBinding()]
param(
    [string]$Namespace = "dokanx",
    [string]$ApiBaseUrl = "https://api.dokanx.com",
    [string]$Kubeconfig = "",
    [string]$ContextName = "",
    [switch]$SkipKubernetes,
    [switch]$SkipHttp
)

$ErrorActionPreference = "Stop"

function Write-Section {
    param([string]$Title)
    Write-Host ""
    Write-Host "== $Title ==" -ForegroundColor Cyan
}

function Require-Command {
    param([string]$Name)
    if (-not (Get-Command $Name -ErrorAction SilentlyContinue)) {
        throw "Required command not found: $Name"
    }
}

function Invoke-JsonOrText {
    param([string]$Url)
    try {
        $response = Invoke-WebRequest -Uri $Url -UseBasicParsing -TimeoutSec 20
        [pscustomobject]@{
            Url        = $Url
            StatusCode = [int]$response.StatusCode
            Preview    = (($response.Content | Out-String).Trim() -split "`n" | Select-Object -First 8) -join "`n"
        }
    }
    catch {
        [pscustomobject]@{
            Url        = $Url
            StatusCode = 0
            Preview    = $_.Exception.Message
        }
    }
}

function Run-Kubectl {
    param([string[]]$KubectlArgs)
    $prefix = @()
    if ($script:KubeconfigPath) {
        $prefix += @("--kubeconfig", $script:KubeconfigPath)
    }
    if ($script:KubectlContextName) {
        $prefix += @("--context", $script:KubectlContextName)
    }
    & kubectl @prefix @KubectlArgs
}

function Test-KubernetesAccess {
    $previousEap = $ErrorActionPreference
    try {
        $ErrorActionPreference = "Continue"
        $prefix = @()
        if ($script:KubeconfigPath) {
            $prefix += @("--kubeconfig", $script:KubeconfigPath)
        }
        if ($script:KubectlContextName) {
            $prefix += @("--context", $script:KubectlContextName)
        }
        $output = & kubectl @prefix cluster-info 2>&1
        return ($LASTEXITCODE -eq 0)
    }
    finally {
        $ErrorActionPreference = $previousEap
    }
}

$script:KubeconfigPath = ""
$script:KubectlContextName = ""

if ($Kubeconfig) {
    $resolvedKubeconfig = Resolve-Path -LiteralPath $Kubeconfig -ErrorAction Stop
    $script:KubeconfigPath = $resolvedKubeconfig.Path
}

if ($ContextName) {
    $script:KubectlContextName = $ContextName
}

Write-Host "DokanX scaling baseline verification starting..." -ForegroundColor Green
Write-Host "Namespace: $Namespace"
Write-Host "API Base URL: $ApiBaseUrl"
if ($script:KubeconfigPath) {
    Write-Host "Kubeconfig: $($script:KubeconfigPath)"
}
if ($script:KubectlContextName) {
    Write-Host "Kubectl Context: $($script:KubectlContextName)"
}

if (-not $SkipKubernetes) {
    Require-Command "kubectl"
    if (-not (Test-KubernetesAccess)) {
        Write-Section "Kubernetes"
        Write-Warning "kubectl is installed, but no reachable cluster context is configured."
        Write-Host "Run 'kubectl config get-contexts' and select a valid cluster before retrying."
        Write-Host "Or pass -Kubeconfig <path> and optionally -ContextName <name> to this script."
    }
    else {
        Write-Section "Kubernetes Workloads"
        Run-Kubectl -KubectlArgs @("get", "deploy", "-n", $Namespace)

        Write-Section "Pods"
        Run-Kubectl -KubectlArgs @("get", "pods", "-n", $Namespace, "-o", "wide")

        Write-Section "Autoscaling And Disruption"
        Run-Kubectl -KubectlArgs @("get", "hpa,pdb", "-n", $Namespace)

        Write-Section "Recent Worker Logs"
        try {
            Run-Kubectl -KubectlArgs @("logs", "deployment/dokanx-backend-worker", "-n", $Namespace, "--tail=60")
        }
        catch {
            Write-Warning "Could not fetch worker logs: $($_.Exception.Message)"
        }

        Write-Section "Recent Scheduler Logs"
        try {
            Run-Kubectl -KubectlArgs @("logs", "deployment/dokanx-backend-scheduler", "-n", $Namespace, "--tail=40")
        }
        catch {
            Write-Warning "Could not fetch scheduler logs: $($_.Exception.Message)"
        }
    }
}

if (-not $SkipHttp) {
    Write-Section "HTTP Checks"
    $checks = @(
        "$ApiBaseUrl/health",
        "$ApiBaseUrl/health/readiness",
        "$ApiBaseUrl/metrics?format=prometheus",
        "$ApiBaseUrl/api/admin/metrics"
    )

    foreach ($url in $checks) {
        $result = Invoke-JsonOrText -Url $url
        $color = if ($result.StatusCode -ge 200 -and $result.StatusCode -lt 400) { "Green" } else { "Yellow" }
        Write-Host ""
        Write-Host $result.Url -ForegroundColor $color
        Write-Host "Status: $($result.StatusCode)"
        Write-Host $result.Preview
    }
}

Write-Section "Suggested Next Commands"
Write-Host "Smoke load: npm run test:load:smoke"
Write-Host "Mixed load: npm run test:load:mixed"
Write-Host "Checklist: docs/SCALING_BASELINE_CHECKLIST.md"
Write-Host "Runbook: docs/STAGING_ROLLOUT_RUNBOOK.md"
