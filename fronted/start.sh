#!/usr/bin/env sh
set -e
cd "$(dirname "$0")"
if [ ! -d node_modules ]; then
  echo "首次运行：正在安装 Vue 3 / Vite / Element Plus / ECharts 依赖..."
  npm install
fi
echo "FogTraffic 正在启动：http://localhost:4173"
npm run dev
