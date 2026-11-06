# Builds the static site and publishes it to the gh-pages branch (GitHub Pages goes live ~1 min later).
# Run:  powershell -ExecutionPolicy Bypass -File scripts\publish-pages.ps1
$ErrorActionPreference = "Stop"
Set-Location (Join-Path $PSScriptRoot "..")
$repo = "https://github.com/lebmojica-byte/pantry-chef.git"

npm run build
if ($LASTEXITCODE -ne 0) { throw "Build failed, nothing published." }
$main = (git rev-parse --short HEAD).Trim()

Push-Location out
try {
  git init -q -b gh-pages
  git fetch -q $repo gh-pages
  if ($LASTEXITCODE -ne 0) { throw "Could not fetch gh-pages." }
  git reset -q --soft FETCH_HEAD   # continue the branch history, so no force push is needed
  git add -A
  git commit -q -m "site: build from main $main"
  if ($LASTEXITCODE -ne 0) { throw "Nothing new to publish (or commit failed)." }
  git push -q $repo HEAD:gh-pages
  if ($LASTEXITCODE -ne 0) { throw "Push failed, the live site is unchanged." }
  Write-Host "Published build of main $main. Live in about a minute: https://lebmojica-byte.github.io/pantry-chef/" -ForegroundColor Green
}
finally {
  Pop-Location
}
