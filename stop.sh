#!/bin/bash
# HealthLink 停止スクリプト（Linux/Mac）
# 使い方: ./stop.sh

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"

echo -e "\033[36mHealthLink を停止します...\033[0m"

# PIDファイルからバックエンドを停止
if [ -f "$SCRIPT_DIR/.backend.pid" ]; then
    BACKEND_PID=$(cat "$SCRIPT_DIR/.backend.pid")
    if kill -0 "$BACKEND_PID" 2>/dev/null; then
        kill "$BACKEND_PID"
        echo "  バックエンド (PID: $BACKEND_PID) を停止しました。"
    else
        echo "  バックエンドはすでに停止しています。"
    fi
    rm -f "$SCRIPT_DIR/.backend.pid"
else
    BACKEND_PID=$(lsof -ti:8080 2>/dev/null)
    if [ -n "$BACKEND_PID" ]; then
        kill "$BACKEND_PID"
        echo "  バックエンド (port 8080) を停止しました。"
    else
        echo "  バックエンド (port 8080) は起動していません。"
    fi
fi

# PIDファイルからフロントエンドを停止
if [ -f "$SCRIPT_DIR/.frontend.pid" ]; then
    FRONTEND_PID=$(cat "$SCRIPT_DIR/.frontend.pid")
    if kill -0 "$FRONTEND_PID" 2>/dev/null; then
        kill "$FRONTEND_PID"
        echo "  フロントエンド (PID: $FRONTEND_PID) を停止しました。"
    else
        echo "  フロントエンドはすでに停止しています。"
    fi
    rm -f "$SCRIPT_DIR/.frontend.pid"
else
    FRONTEND_PID=$(lsof -ti:3000 2>/dev/null)
    if [ -n "$FRONTEND_PID" ]; then
        kill "$FRONTEND_PID"
        echo "  フロントエンド (port 3000) を停止しました。"
    else
        echo "  フロントエンド (port 3000) は起動していません。"
    fi
fi

echo ""
echo -e "\033[32m停止完了しました。\033[0m"
