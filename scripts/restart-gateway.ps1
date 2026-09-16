<#
  重启 cloudiot-local-gateway 开发服务
  用法: pwsh scripts/restart-gateway.ps1   （从仓库根目录执行）

  安全原则（防止误杀 MCP / 关键进程）:
  1. 只按命令行匹配 cloudiot-local-gateway 的 node 进程，绝不使用固定 PID 列表
     （PID 会被系统复用，上次的 PID 下次可能指向 playwright MCP 等关键进程）
  2. 杀掉 gateway 进程后等待端口 8080/1883 释放，确认空闲才启动新实例
  3. 后台启动使用 Start-Process 隐藏窗口 + 日志重定向，避免阻塞调用方
#>

$ErrorActionPreference = 'Stop'

$repoRoot = Split-Path -Parent $PSScriptRoot
$gwDir    = Join-Path $repoRoot 'cloudiot-local-gateway'
$log      = 'C:\Users\22696\AppData\Local\Temp\opencode\gw.log'
$err      = 'C:\Users\22696\AppData\Local\Temp\opencode\gw.err.log'

if (-not (Test-Path $gwDir)) {
    Write-Error "找不到 gateway 目录: $gwDir"
}

# ---------- 1. 按命令行精确杀掉 gateway 进程树 ----------
$targets = Get-CimInstance Win32_Process | Where-Object {
    $_.Name -eq 'node.exe' -and $_.CommandLine -match 'cloudiot-local-gateway'
}
foreach ($t in $targets) {
    Stop-Process -Id $t.ProcessId -Force -ErrorAction SilentlyContinue
    Write-Host "killed gateway node $($t.ProcessId)"
}
if (-not $targets) { Write-Host '没有运行中的 gateway node 进程' }

# npm/cmd 包装进程在 node 子进程退出后会自动退出，无需单独处理。

# ---------- 2. 等待端口释放（最多 10 秒） ----------
$deadline = (Get-Date).AddSeconds(10)
do {
    $busy = netstat -ano | Select-String ':8080\s.*LISTENING|:1883\s.*LISTENING'
    if (-not $busy) { break }
    Start-Sleep -Milliseconds 500
} while ((Get-Date) -lt $deadline)

if (netstat -ano | Select-String ':8080\s.*LISTENING|:1883\s.*LISTENING') {
    Write-Host '端口 8080/1883 仍被占用（非 gateway 进程持有），先排查:'
    netstat -ano | Select-String ':8080\s.*LISTENING|:1883\s.*LISTENING'
    Write-Host '按命令行确认后可手动处置，例如:'
    Write-Host '  Get-CimInstance Win32_Process | Where-Object { $_.ProcessId -eq <PID> } | Select-Object CommandLine'
    exit 1
}

# ---------- 3. 清理日志并完全脱离启动新实例 ----------
Remove-Item $log, $err -ErrorAction SilentlyContinue
# 从 opencode 会话里启动长驻服务必须完全脱离：
# 直接 Start-Process 会让子进程进入 opencode 的作业对象/控制台，阻塞会话。
# 方案：Win32_Process.Create 拉起一个隐藏 powershell（不在 opencode 作业内，
# 父进程为 WmiPrvSE），再由它 Start-Process 长驻服务。
$inner = "Start-Process -FilePath 'cmd.exe' -ArgumentList '/c','npm run dev' -WorkingDirectory '$gwDir' -WindowStyle Hidden -RedirectStandardOutput '$log' -RedirectStandardError '$err'"
$cmdLine = "powershell.exe -NoProfile -WindowStyle Hidden -Command `"$inner`""
$created = Invoke-CimMethod -ClassName Win32_Process -MethodName Create -Arguments @{ CommandLine = $cmdLine }
if ($created.ReturnValue -ne 0) {
    Write-Error "脱离启动失败 ReturnValue=$($created.ReturnValue)"
}
Write-Host "launcher detached, pid $($created.ProcessId)"

# ---------- 4. 等待就绪并验证 ----------
$deadline = (Get-Date).AddSeconds(20)
$ready    = $false
do {
    Start-Sleep -Seconds 1
    if ((Test-Path $log) -and ((Get-Content $log -Raw -ErrorAction SilentlyContinue) -match 'Gateway ready')) {
        $ready = $true
        break
    }
    if ((Test-Path $err) -and (Get-Item $err).Length -gt 0) { break }
} while ((Get-Date) -lt $deadline)

if ($ready) {
    Write-Host '=== 启动成功 ==='
    Get-Content $log -Tail 6
    Write-Host '=== 端口确认 ==='
    netstat -ano | Select-String ':8080\s.*LISTENING|:1883\s.*LISTENING'
} else {
    Write-Host '=== 启动可能失败, 日志 ==='
    Get-Content $log, $err -ErrorAction SilentlyContinue | Select-Object -Last 10
    exit 1
}