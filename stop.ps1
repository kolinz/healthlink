# HealthLink 停止スクリプト（Windows PowerShell）
# 使い方: .\stop.ps1

Write-Host "HealthLink を停止します..." -ForegroundColor Cyan

# ポート 8080（バックエンド）を使用しているプロセスを終了
$backend = Get-NetTCPConnection -LocalPort 8080 -ErrorAction SilentlyContinue
if ($backend) {
    $pid8080 = $backend.OwningProcess | Select-Object -Unique
    foreach ($p in $pid8080) {
        Stop-Process -Id $p -Force -ErrorAction SilentlyContinue
    }
    Write-Host "  バックエンド (port 8080) を停止しました。" -ForegroundColor Green
} else {
    Write-Host "  バックエンド (port 8080) は起動していません。" -ForegroundColor Gray
}

# ポート 3000（フロントエンド）を使用しているプロセスを終了
$frontend = Get-NetTCPConnection -LocalPort 3000 -ErrorAction SilentlyContinue
if ($frontend) {
    $pid3000 = $frontend.OwningProcess | Select-Object -Unique
    foreach ($p in $pid3000) {
        Stop-Process -Id $p -Force -ErrorAction SilentlyContinue
    }
    Write-Host "  フロントエンド (port 3000) を停止しました。" -ForegroundColor Green
} else {
    Write-Host "  フロントエンド (port 3000) は起動していません。" -ForegroundColor Gray
}

Write-Host ""
Write-Host "停止完了しました。" -ForegroundColor Green
