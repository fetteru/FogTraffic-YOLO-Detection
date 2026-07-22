@echo off
chcp 65001 >nul
cd /d "%~dp0"
echo 正在启动 YOLOv11 智能检测平台...
start "" http://localhost:5174
npm start
pause
