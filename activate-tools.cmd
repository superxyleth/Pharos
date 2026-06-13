@echo off
set "ROOT=%~dp0"
set "ROOT=%ROOT:~0,-1%"
set "TOOLS=%ROOT%\.tools"

set "PATH=%TOOLS%\bin;%TOOLS%\node;%TOOLS%\npm-global;%TOOLS%\pnpm-home;%TOOLS%\python;%TOOLS%\python\Scripts;%TOOLS%\foundry\bin;%TOOLS%\gh\bin;%PATH%"
set "NPM_CONFIG_PREFIX=%TOOLS%\npm-global"
set "NPM_CONFIG_CACHE=%TOOLS%\npm-cache"
set "PNPM_HOME=%TOOLS%\pnpm-home"
set "PNPM_STORE_DIR=%TOOLS%\pnpm-store"
set "CODEX_HOME=%ROOT%\.codex"
set "GIT_CONFIG_GLOBAL=%ROOT%\.gitconfig"
set "PHAROS_RPC_URL=https://atlantic.dplabs-internal.com"

echo Pharos local tools activated.
echo Workspace: %ROOT%
cmd /k
