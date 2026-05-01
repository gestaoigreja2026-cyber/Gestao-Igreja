<#
add-secrets.ps1
Automates installation of GitHub CLI (via winget), interactive auth, and adding repository secrets.
Run in PowerShell (Administrator recommended).

Usage:
  Save as add-secrets.ps1 and run:
    powershell -ExecutionPolicy Bypass -File .\add-secrets.ps1
#>

Param()

$repo = "gestaoigreja2026-cyber/gestao.igreja"

function ConvertTo-PlainText($ss) {
    $bstr = [Runtime.InteropServices.Marshal]::SecureStringToBSTR($ss)
    try { [Runtime.InteropServices.Marshal]::PtrToStringAuto($bstr) }
    finally { [Runtime.InteropServices.Marshal]::ZeroFreeBSTR($bstr) }
}

Write-Host "Repository: $repo"

if (-not (Get-Command gh -ErrorAction SilentlyContinue)) {
    Write-Host "GitHub CLI not found. Installing via winget..."
    try {
        winget install --id GitHub.cli -e --silent
    } catch {
        Write-Warning "winget install failed. Please install GitHub CLI manually from https://github.com/cli/cli/releases"
        exit 1
    }
}

Write-Host "Authenticating with GitHub (interactive)..."
gh auth login

Write-Host "Enter secrets (will not be echoed where appropriate). Leave blank to skip a secret."
$VERCEL_TOKEN = ConvertTo-PlainText (Read-Host -AsSecureString "VERCEL_TOKEN (paste token)")
$SUPABASE_DB_URL = ConvertTo-PlainText (Read-Host -AsSecureString "SUPABASE_DB_URL (postgres connection string)")
$SUPABASE_SERVICE_ROLE_KEY = ConvertTo-PlainText (Read-Host -AsSecureString "SUPABASE_SERVICE_ROLE_KEY (optional)")
$VITE_SUPABASE_URL = Read-Host "VITE_SUPABASE_URL (public, e.g. https://xxxx.supabase.co)"
$VITE_SUPABASE_ANON_KEY = ConvertTo-PlainText (Read-Host -AsSecureString "VITE_SUPABASE_ANON_KEY (public)")

Write-Host "Adding secrets to repository $repo..."
if ($VERCEL_TOKEN) { gh secret set VERCEL_TOKEN --repo $repo --body $VERCEL_TOKEN }
if ($SUPABASE_DB_URL) { gh secret set SUPABASE_DB_URL --repo $repo --body $SUPABASE_DB_URL }
if ($SUPABASE_SERVICE_ROLE_KEY) { gh secret set SUPABASE_SERVICE_ROLE_KEY --repo $repo --body $SUPABASE_SERVICE_ROLE_KEY }
if ($VITE_SUPABASE_URL) { gh secret set VITE_SUPABASE_URL --repo $repo --body $VITE_SUPABASE_URL }
if ($VITE_SUPABASE_ANON_KEY) { gh secret set VITE_SUPABASE_ANON_KEY --repo $repo --body $VITE_SUPABASE_ANON_KEY }

Write-Host "Secrets set. To trigger workflows manually, run:"
Write-Host "  gh workflow run ci.yml --repo $repo"
Write-Host "  gh workflow run supabase_db.yml --repo $repo"

Write-Host "Done."
