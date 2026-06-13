# HealthLink 起動スクリプト（Windows PowerShell）
# 使い方: .\start.ps1

$ROOT = $PSScriptRoot

Write-Host "HealthLink を起動します..." -ForegroundColor Cyan

# バックエンド起動（別ウィンドウ）
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$ROOT\backend'; npm run dev" -WindowStyle Normal

Start-Sleep -Seconds 2

# フロントエンド起動（別ウィンドウ）
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$ROOT\frontend'; npm run dev" -WindowStyle Normal

Write-Host ""
Write-Host "起動しました。" -ForegroundColor Green
Write-Host "  アプリ     : http://localhost:3000" -ForegroundColor White
Write-Host "  Swagger UI : http://localhost:8080/api-docs" -ForegroundColor White
Write-Host ""
Write-Host "停止するには stop.ps1 を実行してください。" -ForegroundColor Yellow
