#!/bin/bash
set -e
cd "$(dirname "$0")"
if ! command -v node >/dev/null 2>&1; then
  echo "未检测到 Node.js，请先安装 Node.js 18 或更高版本。"
  read -n 1 -s -r -p "按任意键退出..."
  exit 1
fi
if [ ! -d node_modules ]; then
  echo "首次运行：正在安装 Vue 3、Vite、Element Plus、ECharts 依赖..."
  npm install
fi
(open http://localhost:4173 >/dev/null 2>&1 &)
echo "FogTraffic 正在启动：http://localhost:4173"
npm run dev
