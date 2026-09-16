# cloudiot-backend 迁移执行器（幂等：探针检测效果，已应用则跳过）
# 用法: powershell -ExecutionPolicy Bypass -File scripts/db-migrate.ps1 [-Local]
param(
  [switch]$Local,
  [string]$Database,
  [string]$PersistTo
)

$ErrorActionPreference = 'Stop'

# 默认数据库：本地（--local）用 D1 binding 名 DB；远程用数据库名
if (-not $Database) {
  if ($Local) { $Database = 'DB' } else { $Database = 'cloudiot-db' }
}

$localArg = @()
if ($Local) { $localArg = @('--local') }
# 可选：指定本地 D1 持久化目录（用于在不污染现有本地库的情况下验证全新库迁移）
if ($PersistTo) { $localArg += "--persist-to=$PersistTo" }

# 迁移定义：脚本文件名 -> 生效探针 SELECT（results[0] 各计数字段 > 0 视为已应用）
$migrations = @(
  @{
    name = '001_initial_schema.sql'
    probe = "SELECT (SELECT COUNT(*) FROM sqlite_master WHERE type='table' AND name='users') AS c"
  },
  @{
    name = '002_add_password_resets.sql'
    probe = "SELECT (SELECT COUNT(*) FROM sqlite_master WHERE type='table' AND name='password_resets') AS c"
  },
  @{
    name = '003_add_device_protocol.sql'
    probe = "SELECT (SELECT COUNT(*) FROM pragma_table_info('devices') WHERE name='protocol') AS c"
  },
  @{
    name = '004_add_gateway_id.sql'
    probe = "SELECT (SELECT COUNT(*) FROM pragma_table_info('devices') WHERE name='gateway_id') AS c"
  },
  @{
    name = '005_add_device_auth.sql'
    probe = "SELECT (SELECT COUNT(*) FROM pragma_table_info('devices') WHERE name='secret_hash') AS c1, (SELECT COUNT(*) FROM pragma_table_info('device_commands') WHERE name='acked_at') AS c2"
  }
)

function Run-D1 {
  param([string[]]$Extra)
  $out = & npx wrangler d1 execute $Database @localArg @Extra 2>&1
  if ($LASTEXITCODE -ne 0) { throw "wrangler d1 execute 失败: $($out | Out-String)" }
  return $out
}

function Get-ProbeRow {
  param([string]$Sql)
  $raw = (Run-D1 -Extra @('--json', "--command=$Sql")) | Out-String
  $parsed = $raw | ConvertFrom-Json
  if ($parsed -is [array]) { $parsed = $parsed[0] }
  return $parsed.results[0]
}

function Test-Applied {
  param([string]$Sql)
  $row = Get-ProbeRow -Sql $Sql
  $counts = @()
  foreach ($p in $row.PSObject.Properties) { $counts += [int]$p.Value }
  return ($counts.Count -gt 0) -and ($counts | Where-Object { $_ -le 0 }).Count -eq 0
}

$root = Split-Path -Parent $PSScriptRoot
$applied = 0

foreach ($m in $migrations) {
  Write-Host "[db-migrate] $($m.name) 检查中..."
  if (Test-Applied -Sql $m.probe) {
    Write-Host "[db-migrate]   已应用，跳过"
    continue
  }
  $file = Join-Path $root "migrations\$($m.name)"
  Write-Host "[db-migrate]   应用 $file"
  $null = Run-D1 -Extra @('--json', "--file=$file")
  if (-not (Test-Applied -Sql $m.probe)) {
    throw "[db-migrate] $($m.name) 应用后复核未通过，中止"
  }
  $applied++
}

Write-Host "[db-migrate] 完成，本次应用 $applied 个迁移。"
exit 0
