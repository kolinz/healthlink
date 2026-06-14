#!/bin/bash
# HealthLink 初回セットアップスクリプト
# 使い方: ./setupdb.sh
# 初回セットアップ時のみ実行すること

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
ENV_FILE="$SCRIPT_DIR/.env"

echo -e "\033[36mHealthLink 初回セットアップを開始します...\033[0m"

# バックエンド npm install
echo ""
echo "  [1/4] バックエンドの依存パッケージをインストールします..."
cd "$SCRIPT_DIR/backend"
npm install
if [ $? -ne 0 ]; then
  echo -e "\033[31m[ERROR] バックエンドの npm install に失敗しました。\033[0m"
  exit 1
fi
echo "  バックエンド npm install 完了"

# フロントエンド npm install
echo ""
echo "  [2/4] フロントエンドの依存パッケージをインストールします..."
cd "$SCRIPT_DIR/frontend"
npm install
if [ $? -ne 0 ]; then
  echo -e "\033[31m[ERROR] フロントエンドの npm install に失敗しました。\033[0m"
  exit 1
fi
echo "  フロントエンド npm install 完了"

# マイグレーション実行
echo ""
echo "  [3/4] マイグレーションを実行します..."
cd "$SCRIPT_DIR/backend"
npm run migrate
if [ $? -ne 0 ]; then
  echo -e "\033[31m[ERROR] マイグレーションに失敗しました。\033[0m"
  exit 1
fi
echo "  マイグレーション完了"

# シードデータ投入
echo ""
echo "  [4/4] シードデータを投入します..."
sed -i 's/^LOAD_SEED_DATA=.*/LOAD_SEED_DATA=true/' "$ENV_FILE"
npm run seed
SEED_RESULT=$?
sed -i 's/^LOAD_SEED_DATA=.*/LOAD_SEED_DATA=false/' "$ENV_FILE"
if [ $SEED_RESULT -ne 0 ]; then
  echo -e "\033[31m[ERROR] シードデータの投入に失敗しました。\033[0m"
  exit 1
fi
echo "  シードデータ投入完了"

echo ""
echo -e "\033[32mセットアップが完了しました。\033[0m"
echo "  ./start.sh で起動してください。"
