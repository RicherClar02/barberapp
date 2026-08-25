# Abre el puerto 3000 (backend Estilo) para conexiones entrantes desde la LAN.
# Sin esta regla, el Firewall de Windows bloquea al celular aunque esté en la
# misma red Wi-Fi: el backend responde en localhost pero no desde el teléfono.
#
# REQUIERE PowerShell COMO ADMINISTRADOR:
#   cd backend
#   powershell -ExecutionPolicy Bypass -File scripts/setup-firewall.ps1

$ruleName = "Estilo Backend (Node 3000)"

# Sin permisos de administrador New-NetFirewallRule falla con un error poco
# claro; mejor avisar antes.
$isAdmin = ([Security.Principal.WindowsPrincipal] [Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole(
    [Security.Principal.WindowsBuiltInRole]::Administrator)

if (-not $isAdmin) {
    Write-Host "X Este script necesita PowerShell COMO ADMINISTRADOR." -ForegroundColor Red
    Write-Host "  Clic derecho en PowerShell -> 'Ejecutar como administrador', y vuelve a intentar."
    exit 1
}

$existing = Get-NetFirewallRule -DisplayName $ruleName -ErrorAction SilentlyContinue

if ($existing) {
    Write-Host "= La regla '$ruleName' ya existe. No se hace nada." -ForegroundColor Yellow
} else {
    New-NetFirewallRule `
        -DisplayName $ruleName `
        -Direction Inbound `
        -LocalPort 3000 `
        -Protocol TCP `
        -Action Allow | Out-Null

    Write-Host "OK Puerto 3000 abierto para Estilo" -ForegroundColor Green
}

# Muestra la IP de Wi-Fi: es la que va en mobile/.env como EXPO_PUBLIC_API_URL
$wifi = Get-NetIPAddress -AddressFamily IPv4 |
    Where-Object { $_.InterfaceAlias -like "*Wi-Fi*" -and $_.PrefixOrigin -eq "Dhcp" } |
    Select-Object -First 1

if ($wifi) {
    Write-Host ""
    Write-Host "IP Wi-Fi de este PC: $($wifi.IPAddress)"
    Write-Host "Pon esto en mobile/.env:"
    Write-Host "  EXPO_PUBLIC_API_URL=http://$($wifi.IPAddress):3000"
}
