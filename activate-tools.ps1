$Root = Split-Path -Parent $MyInvocation.MyCommand.Path
$Tools = Join-Path $Root ".tools"

$env:Path = @(
  (Join-Path $Tools "bin"),
  (Join-Path $Tools "node"),
  (Join-Path $Tools "npm-global"),
  (Join-Path $Tools "pnpm-home"),
  (Join-Path $Tools "python"),
  (Join-Path $Tools "python\Scripts"),
  (Join-Path $Tools "foundry\bin"),
  (Join-Path $Tools "gh\bin"),
  $env:Path
) -join ";"

$env:NPM_CONFIG_PREFIX = Join-Path $Tools "npm-global"
$env:NPM_CONFIG_CACHE = Join-Path $Tools "npm-cache"
$env:PNPM_HOME = Join-Path $Tools "pnpm-home"
$env:PNPM_STORE_DIR = Join-Path $Tools "pnpm-store"
$env:CODEX_HOME = Join-Path $Root ".codex"
$env:GIT_CONFIG_GLOBAL = Join-Path $Root ".gitconfig"
$env:PHAROS_RPC_URL = "https://atlantic.dplabs-internal.com"
