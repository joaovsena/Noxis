$ErrorActionPreference = 'Stop'
$ProjectRoot = Split-Path -Parent $PSScriptRoot
$env:DOCKER_CONFIG = Join-Path $ProjectRoot '.docker-local'
New-Item -ItemType Directory -Force $env:DOCKER_CONFIG | Out-Null
$configPath = Join-Path $env:DOCKER_CONFIG 'config.json'
if (-not (Test-Path $configPath)) {
    '{"auths":{},"currentContext":"desktop-linux"}' | Set-Content $configPath
}
Set-Location $ProjectRoot
