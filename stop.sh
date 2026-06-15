#!/bin/bash
# HealthLink 停止スクリプト（Linux/Mac）
# 使い方: ./stop.sh

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"

echo -e "\033[36mHealthLink を停止します...\033[0m"

# プロセスグループごと終了する関数
kill_process() {
  local NAME=$1
  local PORT=$2
  local PID_FILE="$SCRIPT_DIR/.$NAME.pid"

  if [ -f "$PID_FILE" ]; then
    local PID=$(cat "$PID_FILE")
    if kill -0 "$PID" 2>/dev/null; then
      # プロセスグループIDを取得して、グループごと終了
      local PGID=$(ps -o pgid= -p "$PID" 2>/dev/null | tr -d ' ')
      if [ -n "$PGID" ] && [ "$PGID" != "0" ]; then
        kill -- -"$PGID" 2>/dev/null
      else
        kill "$PID" 2>/dev/null
      fi
      echo "  $NAME (PID: $PID) を停止しました。"
    else
      echo "  $NAME はすでに停止しています。"
    fi
    rm -f "$PID_FILE"
  fi

  # ポートが残っている場合は念のため終了
  sleep 1
  local REMAINING=$(lsof -ti:"$PORT" 2>/dev/null)
  if [ -n "$REMAINING" ]; then
    kill "$REMAINING" 2>/dev/null
    echo "  $NAME (port $PORT) の残存プロセスを終了しました。"
  fi
}

kill_process "backend"  8080
kill_process "frontend" 3000

echo ""
echo -e "\033[32m停止完了しました。\033[0m"
