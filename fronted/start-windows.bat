@echo off
chcp 65001 >nul
cd /d "%~dp0"
where node >nul 2>nul
if errorlevel 1 (
  echo 未检测到 Node.js，请先安装 Node.js 18 或更高版本。
  pause
  exit /b 1
)
if not exist node_modules (
  echo 首次运行，正在安装 Vue 3、Vite、Element Plus、ECharts 依赖...
  call npm install
  if errorlevel 1 (
    echo 依赖安装失败，请检查网络和 npm 配置。
    pause
    exit /b 1
  )
)
start "" http://localhost:4173
echo FogTraffic 正在启动：http://localhost:4173
call npm run dev
pause
