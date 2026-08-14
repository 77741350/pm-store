<#
  deploy-koyeb.ps1 — Deploy PM Store to Koyeb (free tier) from the local folder.
  No GitHub needed. Bundles this directory, uploads it, builds the Dockerfile
  remotely and creates/updates the `pm-store` app with service `web`.

  Usage (PowerShell):
    $env:PM_BLOBS_TOKEN  = "nfc_..."                    # Netlify account token
    $env:ADMIN_PASSWORD  = "your-strong-password"        # first admin password
    .\deploy-koyeb.ps1 -Token "YOUR_KOYEB_API_TOKEN"
#>

param(
  [Parameter(Mandatory = $true)][string]$Token,
  [string]$KoyebPath = "$env:LOCALAPPDATA\Temp\opencode\koyeb-cli\koyeb.exe",
  [string]$BlobsToken = $env:PM_BLOBS_TOKEN,
  [string]$AdminPassword = $env:ADMIN_PASSWORD
)

$ErrorActionPreference = 'Stop'
$root = $PSScriptRoot

if (-not (Test-Path -LiteralPath $KoyebPath)) { throw "koyeb CLI not found at $KoyebPath" }
if (-not $BlobsToken)  { throw 'Set $env:PM_BLOBS_TOKEN (Netlify account token) first.' }
if (-not $AdminPassword) {
  $AdminPassword = [Convert]::ToBase64String([System.Security.Cryptography.RandomNumberGenerator]::GetBytes(18)) -replace '[+/=]', ''
  Write-Host "Generated ADMIN_PASSWORD: $AdminPassword  (save it!)" -ForegroundColor Yellow
}
if (-not $Token) { throw 'Pass -Token with your Koyeb API token.' }

$common = @('--token', $Token)

Write-Host '==> Creating/updating secrets...' -ForegroundColor Cyan
foreach ($pair in @(@('pm_blobs_token', $BlobsToken), @('admin_password', $AdminPassword))) {
  $name = $pair[0]; $value = $pair[1]
  $created = & $KoyebPath @common secrets create $name -v $value 2>&1
  if ($LASTEXITCODE -ne 0) {
    & $KoyebPath @common secrets update $name -v $value 2>&1
    if ($LASTEXITCODE -ne 0) { Write-Host "WARN: could not create/update secret $name" -ForegroundColor Yellow }
  }
}

Write-Host '==> Deploying directory to Koyeb (app: pm-store / service: web)...' -ForegroundColor Cyan
& $KoyebPath @common deploy $root pm-store/web `
  --archive-builder docker `
  --archive-docker-dockerfile Dockerfile `
  --archive-ignore-dir .git `
  --archive-ignore-dir node_modules `
  --archive-ignore-dir vendor `
  --archive-ignore-dir uploads `
  --archive-ignore-dir .netlify `
  --instance-type nano `
  --min-scale 0 `
  --max-scale 1 `
  --light-sleep-delay 5m `
  --regions fra `
  --ports 8000:http `
  --routes /:8000 `
  --checks 8000:http:/api/health `
  --env NODE_ENV=production `
  --env PORT=8000 `
  --env ADMIN_EMAIL=admin@pmstore.com `
  --env NETLIFY_BLOBS_SITE_ID=7f9609ad-bb30-40bb-b546-f2da64eeeda3 `
  --env NETLIFY_BLOBS_REGION=us-east-2 `
  --env JWT_SECRET=93f7cfd62837dc28d5aa4bed17eb165bf1660ddd69c487b2580d4fe5a572804a `
  --env "PM_BLOBS_TOKEN={{secret.pm_blobs_token}}" `
  --env "ADMIN_PASSWORD={{secret.admin_password}}"

if ($LASTEXITCODE -ne 0) { throw 'koyeb deploy failed (see output above).' }

Write-Host '==> Waiting for service to become healthy...' -ForegroundColor Cyan
$deadline = (Get-Date).AddMinutes(10)
$status = ''
while ((Get-Date) -lt $deadline) {
  Start-Sleep -Seconds 15
  try {
    $svc = & $KoyebPath @common services get pm-store/web -o json 2>$null | ConvertFrom-Json
    $status = $svc.status
    Write-Host "  status: $status"
    if ($status -eq 'HEALTHY') { break }
  } catch {}
}
if ($status -ne 'HEALTHY') { Write-Host '  Service not healthy yet — check logs with: koyeb service logs pm-store/web' -ForegroundColor Yellow; exit 1 }

$svcJson = (& $KoyebPath @common services get pm-store/web -o json) -join "`n"
if ($svcJson -match 'https://([a-z0-9-]+)\.koyeb\.app') {
  $url = 'https://' + $matches[1] + '.koyeb.app'
  Write-Host "SUCCESS! App URL: $url" -ForegroundColor Green
  Write-Host "  Health:   $url/api/health" -ForegroundColor Green
  Write-Host "  Store:    $url" -ForegroundColor Green
  Write-Host "  Admin:    $url/admin" -ForegroundColor Green
}
