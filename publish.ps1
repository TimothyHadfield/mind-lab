# publish.ps1 — one-time helper to put this project on your GitHub.
#
# Usage (from this folder, in PowerShell):
#   1) gh auth login          # once — pick GitHub.com > HTTPS > login with browser
#   2) ./publish.ps1          # creates the repo and pushes
#
# Change the repo name/visibility below if you like.

param(
  [string]$Name = "mind-lab",
  [string]$Description = "Mind Lab — games where an AI learns to predict your behavior.",
  [ValidateSet("public", "private")]
  [string]$Visibility = "public"
)

$ErrorActionPreference = "Stop"
$env:PATH = "$env:ProgramFiles\GitHub CLI;$env:ProgramFiles\nodejs;$env:PATH"
Set-Location $PSScriptRoot

# Make sure you're authenticated first.
gh auth status
if ($LASTEXITCODE -ne 0) {
  Write-Host "`nYou're not logged in. Run 'gh auth login' first, then re-run ./publish.ps1" -ForegroundColor Yellow
  exit 1
}

# Create the repo from this folder and push the existing 'main' commit.
gh repo create $Name --source "." --$Visibility --description $Description --push

Write-Host "`nDone. Your repo:" -ForegroundColor Green
gh repo view --web
