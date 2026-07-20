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
