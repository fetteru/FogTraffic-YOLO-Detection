import fs from 'node:fs';

const required = [
  'src/main.js', 'src/App.vue', 'src/router/index.js', 'src/components/layout/AppLayout.vue',
  'src/views/GesturePage.vue', 'src/views/HomeExperience.vue', 'src/views/LoginPage.vue', 'src/views/RegisterPage.vue', 'src/views/ChatPage.vue',
  'src/views/DetectionPage.vue', 'src/views/DatasetsPage.vue', 'src/views/TrainingPage.vue',
  'src/views/EvaluationPage.vue', 'src/views/DashboardPage.vue', 'src/views/HistoryPage.vue',
  'src/views/MonitoringPage.vue', 'src/views/SettingsPage.vue', 'src/components/charts/EChart.vue',
  'src/components/common/AiCoreIcon.vue', 'src/components/common/CinematicLoader.vue', 'src/components/common/MouseGlow.vue', 'src/components/gesture/ParticleCanvas.vue',
  'src/components/gesture/GlobalGestureEngine.vue', 'src/utils/cameraManager.js',
  'src/assets/styles/polish.css', 'src/assets/styles/daylight.css', 'src/assets/styles/experience.css',
  'public/mediapipe/wasm/vision_wasm_internal.wasm'
];
for (const file of required) if (!fs.existsSync(file)) throw new Error(`缺少文件：${file}`);

const router = fs.readFileSync('src/router/index.js', 'utf8');
for (const name of ['chat', 'detection', 'datasets', 'training', 'evaluation', 'dashboard', 'history', 'monitoring', 'settings']) {
  if (!router.includes(`name: '${name}'`)) throw new Error(`缺少路由：${name}`);
}
if (!router.includes("path: '/', name: 'home'")) throw new Error('缺少沉浸式首页路由');
if (!router.includes("path: '/register'")) throw new Error('缺少独立注册页面路由');

const gesture = fs.readFileSync('src/views/GesturePage.vue', 'utf8');
for (let number = 1; number <= 9; number += 1) {
  if (!gesture.includes(`number:${number}`)) throw new Error(`手势首页缺少数字模块 ${number}`);
}
for (const token of ['ParticleCanvas mode="hero"', '稳定识别数字后自动进入对应模块', 'showDigitPreview']) {
  if (!gesture.includes(token)) throw new Error(`手势首页缺少：${token}`);
}

const particle = fs.readFileSync('src/components/gesture/ParticleCanvas.vue', 'utf8');
for (const token of [
  'requestAnimationFrame', 'Float32Array', 'sphereTarget', 'buildGlyph', 'glyphTarget',
  'updateCenter', 'interactionPoint', 'pullParticlesInward', 'gesture:digit-formed',
  "gestureStore.transition.phase !== 'forming'", "props.mode === 'ambient'",
  'FORMATION_CENTER_DELAY', 'averageError'
]) {
  if (!particle.includes(token)) throw new Error(`粒子动画缺少：${token}`);
}
if (particle.includes("if (!number || props.mode === 'ambient')")) throw new Error('模块页粒子仍禁止生成数字');
if (!particle.includes("width * (props.mode === 'ambient' ? .19 : .22)")) throw new Error('数字粒子尺寸未缩小');
if (!particle.includes('rgba(174,239,255')) throw new Error('数字粒子浅色配色缺失');

const engine = fs.readFileSync('src/components/gesture/GlobalGestureEngine.vue', 'utf8');
for (const token of [
  "acquireCamera('gesture-engine')", "'/mediapipe/wasm'", "['settings', '系统设置']",
  'beginNumberTransition', 'finishNumberTransition', 'gesture:digit-formed',
  "gestureStore.setTransitionPhase('locked'", "await router.push({ name: item[0] })",
  'class="gesture-interaction-tip"', '{{ gestureStore.status }}',
  'PINCH_ENTER_RATIO', 'PINCH_EXIT_RATIO', 'PINCH_CONFIRM_MS', 'pinchAnchor', 'smoothCursor'
]) {
  if (!engine.includes(token)) throw new Error(`全局手势顺序控制缺少：${token}`);
}
if (engine.includes('gesture-global-cursor')) throw new Error('仍在渲染独立手势光标');
if (engine.includes("router.push('/login')")) throw new Error('仍存在手势自动返回登录页逻辑');
if (engine.includes('全部粒子正在凝聚') || engine.includes('数字凝聚完成') || engine.includes('正在进入模块')) {
  throw new Error('仍显示不需要的凝聚或跳转进度文案');
}
const formedHandlerStart = engine.indexOf('function onDigitFormed');
const formedHandlerEnd = engine.indexOf('function clickAtCursor');
const formedHandler = engine.slice(formedHandlerStart, formedHandlerEnd);
if (!formedHandler.includes('finishNumberTransition(number, token)')) throw new Error('数字凝聚完成回执没有触发路由流程');

const store = fs.readFileSync('src/stores/gesture.js', 'utf8');
for (const token of ['mirror: true', 'beginDigitTransition', "phase: 'forming'", 'setTransitionProgress', 'clearDigitTransition']) {
  if (!store.includes(token)) throw new Error(`手势状态机缺少：${token}`);
}

const appStore = fs.readFileSync('src/stores/app.js', 'utf8');
for (const token of ['readSavedUi', 'Ignoring invalid fogtraffic_ui cache', "theme === 'light' ? '#edf3f4'", 'try {']) {
  if (!appStore.includes(token)) throw new Error(`界面缓存容错缺少：${token}`);
}
const authStore = fs.readFileSync('src/stores/auth.js', 'utf8');
for (const token of ['safeJsonGet', 'normalizeUser', 'displayName', "localStorage.removeItem('fogtraffic_user')"]) {
  if (!authStore.includes(token)) throw new Error(`登录缓存容错缺少：${token}`);
}
const sidebar = fs.readFileSync('src/components/layout/Sidebar.vue', 'utf8');
for (const token of ['const displayName = computed', 'const avatarText = computed', '{{ avatarText }}']) {
  if (!sidebar.includes(token)) throw new Error(`侧边栏用户信息容错缺少：${token}`);
}


const app = fs.readFileSync('src/App.vue', 'utf8');
if (app.includes('WaterRipple')) throw new Error('全局水波组件仍挂载');
if (app.includes('CinematicLoader')) throw new Error('电影级开场动画仍挂载在全局 App');
if (!app.includes("import MouseGlow from './components/common/MouseGlow.vue'") || !app.includes('<MouseGlow />')) throw new Error('全局鼠标光晕未挂载在 App');

const home = fs.readFileSync('src/views/HomeExperience.vue', 'utf8');
for (const token of ['/experience/home-hero-v17.webp', 'cinematic-scroll-scene', 'cinematic-object', 'cinematic-login-portal', 'LoginPanel', 'CinematicLoader', 'requestAnimationFrame', 'smoothstep']) {
  if (!home.includes(token)) throw new Error(`滚动式车辆到登录过渡缺少：${token}`);
}
for (const removed of ['after-intro-scroll', 'cube-scroll', 'sectors-scroll', 'archive-scroll', 'experience-footer', 'experience-auth-section--terminal']) {
  if (home.includes(removed)) throw new Error(`首页下方旧模块仍未删除：${removed}`);
}

const loader = fs.readFileSync('src/components/common/CinematicLoader.vue', 'utf8');
for (const token of ['loader-mark', 'loader-curtain', 'loader-progress', 'requestAnimationFrame', 'cinematic-intro-active']) {
  if (!loader.includes(token)) throw new Error(`开场动画缺少：${token}`);
}

const mouseGlow = fs.readFileSync('src/components/common/MouseGlow.vue', 'utf8');
for (const token of ['requestAnimationFrame', 'pointermove', 'getCoalescedEvents', 'any-pointer: fine', 'mouse-glow', 'is-active', 'is-interactive', 'gestureStore.cursor', 'is-hand-source', 'gesture-pointer-active']) {
  if (!mouseGlow.includes(token)) throw new Error(`荧光鼠标光晕缺少：${token}`);
}
if (mouseGlow.includes('currentX +=') || mouseGlow.includes('currentY +=')) throw new Error('鼠标光晕仍使用滞后位置插值');
if (particle.includes('emitWave') || particle.includes('drawWaves') || particle.includes('let waves')) throw new Error('手势粒子场仍包含水波动画');
if (particle.includes("source: 'mouse'") || particle.includes("addEventListener('pointermove', pointerMove")) throw new Error('粒子场仍跟随鼠标移动');

const experience = fs.readFileSync('src/assets/styles/experience.css', 'utf8');
for (const token of ['.mouse-glow-layer', '.mouse-glow-core', '.is-interactive', 'z-index:6000', '.cinematic-loader', 'backdrop-filter']) {
  if (!experience.includes(token)) throw new Error(`登录入口或鼠标光晕样式缺少：${token}`);
}
for (const removed of ['water-ripple-layer', 'water-refraction-host', 'water-refraction-pulse', 'water-ripple-canvas']) {
  if (experience.includes(removed)) throw new Error(`水波样式仍残留：${removed}`);
}

const main = fs.readFileSync('src/main.js', 'utf8');
for (const token of ["import './assets/styles/daylight.css'", "import './assets/styles/experience.css'", 'renderStartupFallback', '重置缓存并重新加载']) {
  if (!main.includes(token)) throw new Error(`空白页兜底缺少：${token}`);
}

const layout = fs.readFileSync('src/components/layout/AppLayout.vue', 'utf8');
if (!layout.includes("v-if=\"gestureStore.transition.phase!=='idle' || gestureStore.previewNumber\"")) throw new Error('模块页粒子层未限制为手势数字凝聚时显示');
if (!layout.includes('class="app-ambient-layer is-morphing"')) throw new Error('模块页粒子凝聚覆盖层缺失');

const polish = fs.readFileSync('src/assets/styles/polish.css', 'utf8');
for (const token of ['.app-ambient-layer.is-morphing', '.is-particle-morphing .particle-hero', '.training-layout', '.task-card', '.sidebar-toggle', '.agent-side{display:flex', '--glass-blur:24px', '.auth-card{']) {
  if (!polish.includes(token)) throw new Error(`基础 UI 或毛玻璃样式缺少：${token}`);
}

const daylight = fs.readFileSync('src/assets/styles/daylight.css', 'utf8');
for (const token of [
  ':root[data-theme="light"]', '--warm: #d79a68', '.app-layout', '.sidebar', '.topbar',
  '.panel', '.auth-page', '.gesture-interaction-tip', '.el-input__wrapper', '.page-table', '--day-button-text', 'button:focus-visible'
]) {
  if (!daylight.includes(token)) throw new Error(`白昼冷暖主题缺少：${token}`);
}

const chart = fs.readFileSync('src/components/charts/EChart.vue', 'utf8');
for (const token of ['lightColorMap', 'cloneWithTheme', "watch(() => appStore.theme", "'#d29160'"]) {
  if (!chart.includes(token)) throw new Error(`图表白昼主题适配缺少：${token}`);
}

const detection = fs.readFileSync('src/views/DetectionPage.vue', 'utf8');
if (!detection.includes("acquireCamera('detection-page')")) throw new Error('检测页摄像头未实现');
if (!detection.includes('<el-slider')) throw new Error('检测参数未使用 Element Plus 滑块');

const { gestureStore } = await import('../src/stores/gesture.js');
const stateToken = gestureStore.beginDigitTransition(1, 'chat', '智能对话');
if (!stateToken || gestureStore.transition.phase !== 'forming' || gestureStore.transition.number !== 1) {
  throw new Error('数字凝聚状态机无法进入 forming');
}
gestureStore.setTransitionProgress(.75, stateToken);
if (gestureStore.transition.progress !== .75) throw new Error('数字凝聚进度无法更新');
gestureStore.setTransitionPhase('locked', stateToken);
if (gestureStore.transition.phase !== 'locked') throw new Error('数字凝聚状态机无法进入 locked');
gestureStore.clearDigitTransition(stateToken);
if (gestureStore.transition.phase !== 'idle' || gestureStore.transition.number !== 0) throw new Error('数字凝聚状态机无法复位');

console.log('FogTraffic Vue v22：统一鼠标/手势光标、稳定捏合及既有功能检查通过');
