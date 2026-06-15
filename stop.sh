#!/bin/bash
# HealthLink 停止スクリプト（Linux/Mac）
# 使い方: ./stop.sh

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"

echo -e "\033[36mHealthLink を停止します...\033[0m"

kill_process() {
  local NAME=$1
  local PORT=$2
  local PID_FILE="$SCRIPT_DIR/.$NAME.pid"

  if [ -f "$PID_FILE" ]; then
    local PID=$(cat "$PID_FILE")
    if kill -0 "$PID" 2>/dev/null; then
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
  else
    # PIDファイルがない場合はポートで検索（タイムアウト3秒）
    local REMAINING=$(timeout 3 lsof -ti:"$PORT" 2>/dev/null)
    if [ -n "$REMAINING" ]; then
      kill "$REMAINING" 2>/dev/null
      echo "  $NAME (port $PORT) を停止しました。"
    else
      echo "  $NAME (port $PORT) は起動していません。"
    fi
  fi
}

kill_process "backend"  8080
kill_process "frontend" 3000

echo ""
echo -e "\033[32m停止完了しました。\033[0m"

# ターミナルの設定をリセット
stty sane
