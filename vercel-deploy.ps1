# Deploy Vercel
Write-Host "DEPLOY VERCEL - sebitamoficials-projects"
Write-Host "https://vercel.com/sebitamoficials-projects"

try {
    $user = npx vercel whoami 2>$null
    Write-Host "Logado como: $user"
} catch {
    Write-Host "Nao esta logado. Execute: npx vercel login"
    exit 1
}

$continue = Read-Host "Continuar deploy? (s/n)"
if ($continue -ne "s") { exit 0 }

npx vercel --prod --yes
Write-Host "Deploy concluido!"
