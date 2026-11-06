# Deploys the "recipes" Edge Function to the pantry-chef Supabase project.
# Asks for a Supabase access token (hidden input), uses it only for this run, then removes it.
# Run from anywhere:  powershell -ExecutionPolicy Bypass -File scripts\deploy-function.ps1
$ErrorActionPreference = "Stop"
Set-Location (Join-Path $PSScriptRoot "..")

$secure = Read-Host "Paste the Supabase access token" -AsSecureString
$bstr = [Runtime.InteropServices.Marshal]::SecureStringToBSTR($secure)
try {
  $env:SUPABASE_ACCESS_TOKEN = [Runtime.InteropServices.Marshal]::PtrToStringBSTR($bstr)
  supabase functions deploy recipes --project-ref ymogmyxmlomjvsqspzzu --use-api
  if ($LASTEXITCODE -ne 0) { throw "Deploy failed (exit code $LASTEXITCODE)." }
  Write-Host "Deployed: recipes" -ForegroundColor Green
}
finally {
  [Runtime.InteropServices.Marshal]::ZeroFreeBSTR($bstr)
  Remove-Item Env:SUPABASE_ACCESS_TOKEN -ErrorAction SilentlyContinue
}
