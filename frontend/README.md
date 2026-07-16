# RSOD Agent · YOLOv11 目标检测智能体平台

这是根据实训文档 Day 2–Day 8 整理并重新设计的最终可运行前端。项目使用原生 HTML、CSS、JavaScript，零前端依赖；同时附带一个 Node.js 演示 API/SSE 服务，启动后可以完整体验登录、智能对话、检测、训练、评估、导出、历史记录和系统监控流程。

## 已实现

- 雨雾/暗光/逆光图像增强：暗通道去雾、Retinex 光照补偿、CLAHE 对比度增强、双边滤波降噪
- 🚗 轻量化车辆目标检测：识别轿车、货车、大巴、摩托车与应急特种车辆
- 🔍 ByteTrack 多目标跟踪：跨帧唯一 ID 绑定、车辆去重计数与噪点/假目标过滤
- 🛣️ ROI 车道自定义划分：限定检测区域，排除护栏与场外干扰
- 🚦 车速计算与车流量统计：单位时段车流、车型占比与瞬时密度统计
- ⚠️ 四级拥堵自动判别预警：畅通 / 缓行 / 拥堵 / 严重拥堵，本地日志与云端上报告警
- 📹 多源输入支持：本地视频、图片、USB 摄像头与 RTSP 网络监控流
- 保持原有 UX 与管理功能：登录、智能对话、任务管理、训练/评估/导出与系统监控（演示数据模拟）

## 运行

需要 Node.js 18 或更高版本。

```bash
npm run dev
```

浏览器打开：

```text
http://localhost:4173
```

演示账号：

```text
用户名：admin
密码：123456
```

可直接进入后台预览：

```text
http://localhost:4173/?demo=1#/dashboard
```

## 自动测试

```bash
npm test
```

测试会启动临时服务并验证首页、健康检查、登录、训练任务列表、检测接口和 SSE 对话接口。

## 对接真实后端

登录后进入“系统设置”，将 `API Base URL` 设置为 FastAPI 服务地址，例如：

```text
http://localhost:8000
```

前端会调用以下核心接口：

```text
POST /api/auth/login
POST /api/auth/register
GET  /api/health/detail
POST /api/chat/stream
POST /api/detection/single
POST /api/detection/batch
POST /api/detection/zip
GET  /api/training/tasks
POST /api/training/start
GET  /api/training/status/:id
GET  /api/training/metrics/:id
POST /api/training/validate/:id
POST /api/training/export/:id
GET  /api/training/download/:id
POST /api/training/predict
GET  /api/logs
```

演示服务返回模拟的 YOLO 检测、训练和评估数据，用于保证项目拿到后立即可运行。真正的模型推理、训练、MinIO、PostgreSQL 和 Redis 能力需要连接课程中的 FastAPI 后端。

## 项目文件

```text
.
├── index.html          # 页面入口
├── styles.css          # 全部 UI 与响应式样式
├── app.js              # SPA、页面、交互、API 与 SSE 客户端
├── server.mjs          # 静态服务器 + 演示 API/SSE
├── smoke-test.mjs      # 自动化冒烟测试
├── package.json
└── README.md
```
