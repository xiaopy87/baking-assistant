#!/bin/bash
set -e

# 从 .env 读取环境变量
if [ -f .env ]; then
  export $(grep -v '^#' .env | xargs)
fi

if [ -z "$DASHSCOPE_API_KEY" ]; then
  echo "❌ 请在 .env 文件中设置 DASHSCOPE_API_KEY"
  exit 1
fi

echo "✅ 启动后端..."
node server.js &
BACKEND_PID=$!

echo "✅ 启动前端..."
npm run dev -- --host &
FRONTEND_PID=$!

# Ctrl+C 时同时关闭前后端
trap "kill $BACKEND_PID $FRONTEND_PID 2>/dev/null; exit" INT TERM

wait
