#!/bin/bash
# HealthLink 起動スクリプト（Linux/Mac）
# 使い方: ./start.sh

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"

echo -e "\033[36mHealthLink を起動します...\033[0m"

# バックエンド起動（バックグラウンド）
cd "$SCRIPT_DIR/backend"
npm run dev &
BACKEND_PID=$!
echo $BACKEND_PID > "$SCRIPT_DIR/.backend.pid"
echo "  バックエンド起動 (PID: $BACKEND_PID)"

sleep 2

# フロントエンド起動（バックグラウンド）
cd "$SCRIPT_DIR/frontend"
npm run dev &
FRONTEND_PID=$!
echo $FRONTEND_PID > "$SCRIPT_DIR/.frontend.pid"
echo "  フロントエンド起動 (PID: $FRONTEND_PID)"

echo ""
echo -e "\033[32m起動しました。\033[0m"
echo "  アプリ     : http://localhost:3000"
echo "  Swagger UI : http://localhost:8080/api-docs"
echo ""
echo -e "\033[33m停止するには ./stop.sh を実行してください。\033[0m"
