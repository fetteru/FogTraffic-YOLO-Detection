# FogTraffic-YOLO-Detection Frontend

当前前端已经迁移为 Vue 3 + Vite，默认连接本地 FastAPI 后端，不再保留旧版原生 JavaScript 单页应用和 Node demo API。

## 启动

```bash
npm install
npm run dev
```

浏览器打开：

```text
http://localhost:5174
```

后端默认地址为：

```text
http://localhost:8000
```

## 常用命令

```bash
npm run dev      # 开发启动，自动打开浏览器
npm run build    # 打包检查
npm run preview  # 预览 dist
```

## 目录说明

```text
frontend/
├── index.html          # Vite 页面入口
├── src/                # Vue 页面、组件、API 客户端与状态逻辑
├── styles.css          # 仍在使用的全局基础样式
├── vite.config.js      # Vite 配置
└── package.json
```

`app.js` 和 `server.mjs` 属于旧前端/demo 服务，已经移除。现在所有页面都从 `src/main.js` 挂载 Vue 应用。

## frontend_new 视觉与手势模块移植说明

本版本仅优化 `frontend`，未修改 `backend`、API 路径、检测/训练/数据集/权限等业务组件。

新增内容：

- frontend_new 电影式开场动画；
- frontend_new 登录/注册双栏视觉界面，仍调用原 `/api/auth/login` 与 `/api/auth/register`；
- frontend_new 应用侧栏、顶部栏、深浅主题与响应式设计；
- MediaPipe 1–9 数字手势导航、食指光标、捏合点击、握拳取消、手掌滑动；
- 高饱和荧光蓝绿粒子，可在右下角工具栏切换关闭/轻量/增强。

数字手势映射：1 对话、2 检测、3 数据集、4 训练、5 评估、6 看板、7 历史、8 用户管理、9 系统设置。角色权限页面仍保留在原侧栏中。

手势识别模型通过 jsDelivr 与 Google Storage 动态加载，因此首次启动手势时需要联网；普通鼠标、触控和 FogTraffic 业务功能不依赖该模型。
