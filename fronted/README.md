# FogTraffic Vue 3 沉浸交互版 v22

FogTraffic-YOLO-Detection 是一个可直接运行的 Vue 3 演示项目，包含沉浸式首页、登录注册、智能对话、车辆检测、数据集、训练评估、数据看板、任务历史、系统监控、系统设置和手势导航。

## v22 手势交互优化

### 鼠标与手势共用同一个光标

- 全站只保留一个 `MouseGlow` 光标实例，删除原先单独渲染的手势圆形光标。
- 手势接管时，系统鼠标不会停留在另一个位置形成“双光标”；移动真实鼠标可立即切回鼠标控制。
- 鼠标停止操作后，手势会自然重新接管，两个输入源不会同时争抢光标。

### 更稳定的捏合点击

- 使用进入 / 释放双阈值、确认防抖和释放防抖，减少误触与连续触发。
- 捏合过程中锁定点击位置，解决拇指靠近食指时光标突然偏移的问题。
- 对 Element Plus 滑块补充带坐标的点击事件。
- 光标使用自适应平滑，小抖动更稳，大范围移动仍保持响应速度。

## 启动方法

Windows 可双击：

```text
start-windows.bat
```

macOS 可双击：

```text
start-macos.command
```

也可以在项目目录运行：

```bash
npm install
npm run dev
```

浏览器访问：

```text
http://localhost:4173
```

演示账号：

```text
admin / 123456
```

## 构建与检查

```bash
npm test
npm run build
```

## v22 主要修改文件

```text
src/components/common/MouseGlow.vue
src/components/gesture/GlobalGestureEngine.vue
src/stores/gesture.js
src/assets/styles/experience.css
src/assets/styles/vue-app.css
src/assets/styles/polish.css
src/assets/styles/daylight.css
tests/smoke-test.mjs
CHANGES_v22.md
```
