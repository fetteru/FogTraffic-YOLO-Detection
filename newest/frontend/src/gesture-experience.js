const root = document.querySelector('#gesture-experience');
const canvas = document.querySelector('#gesture-stage');
const ctx = canvas.getContext('2d', { alpha: true });
const video = document.querySelector('#gesture-camera');
const controlButton = document.querySelector('#gesture-control-toggle');
const previewButton = document.querySelector('#gesture-preview-toggle');
const mirrorButton = document.querySelector('#gesture-mirror-toggle');
const particlesButton = document.querySelector('#gesture-particles-toggle');
const statusCard = document.querySelector('#gesture-status-card');
const systemStatus = document.querySelector('#gesture-system-status');
const currentGesture = document.querySelector('#gesture-current');
const confidenceFill = document.querySelector('#gesture-confidence-fill');
const cursor = document.querySelector('#gesture-cursor');
const routeFlash = document.querySelector('#gesture-route-flash');
const errorBox = document.querySelector('#gesture-error');

const TAU = Math.PI * 2;
const IS_MOBILE = matchMedia('(max-width: 780px)').matches;
const REDUCED_MOTION = matchMedia('(prefers-reduced-motion: reduce)').matches;
const MEDIAPIPE_VERSION = '0.10.35';
const PINCH_ENTER_RATIO = 0.31;
const PINCH_EXIT_RATIO = 0.48;
const PINCH_CONFIRM_MS = 72;
const PINCH_RELEASE_MS = 92;
const MAX_GESTURE_NUMBER = 9;

// 高饱和荧光青蓝 / 薄荷绿。颜色预先分配给粒子，避免动画帧内反复计算 HSL。
const PARTICLE_COLORS = ['#eaffff', '#48f5ff', '#00dfff', '#00ffc8', '#65ffad'];
const PARTICLE_GLOW_COLORS = ['#bfffff', '#1cecff', '#00cfff', '#00f5b8', '#39ff8f'];

const ROUTES = [
  { number: 1, page: 'chat', label: '智能对话' },
  { number: 2, page: 'detection', label: '交通检测工作台' },
  { number: 3, page: 'datasets', label: '数据集管理' },
  { number: 4, page: 'training', label: '模型训练' },
  { number: 5, page: 'evaluation', label: '模型评估' },
  { number: 6, page: 'dashboard', label: '数据看板' },
  { number: 7, page: 'history', label: '任务历史' },
  { number: 8, page: 'users', label: '用户管理' },
  { number: 9, page: 'settings', label: '系统设置' }
];

const NUMBER_ROUTES = Object.fromEntries(ROUTES.map(route => [route.number, route]));
const CANNED_LABELS = {
  None: '手势跟踪中',
  Closed_Fist: '握拳 · 取消',
  Open_Palm: '张开手掌',
  Pointing_Up: '食指指向 · 移动光标',
  Victory: '数字 2',
  Thumb_Up: '点赞 · 确认主操作',
  Thumb_Down: '拇指向下 · 取消',
  ILoveYou: '特殊手势',
  Pinch: '捏合 · 点击'
};

let recognizer = null;
let recognizerLoading = null;
let stream = null;
let cameraActive = false;
let modelReady = false;
let previewVisible = false;
let mirrorEnabled = localStorage.getItem('fogtraffic_gesture_mirror') !== 'false';
let particleLevel = Number(localStorage.getItem('fogtraffic_gesture_particles') || 1);
let lastVideoTime = -1;
let lastInferenceAt = 0;
let lastGestureSeenAt = 0;
let lastClickAt = 0;
let lastCancelAt = 0;
let lastConfirmAt = 0;
let lastSwipeAt = 0;
let confirmCandidateAt = 0;
let cancelCandidateAt = 0;
let pinchDown = false;
let pinchCandidateSince = 0;
let pinchReleaseSince = 0;
let pinchAnchor = null;
let candidateNumber = 0;
let candidateSince = 0;
let candidateOrigin = null;
let routeLocked = false;
let releasedSince = 0;
let palmSwipe = null;
let currentPage = location.hash.replace('#/', '').replace('#', '') || 'chat';
let routeFlashTimer = 0;
let errorTimer = 0;
let animationFrame = 0;
let lastFrameAt = performance.now();
let width = 1;
let height = 1;
let dpr = 1;
let digitMorph = 0;
let targetDigitMorph = 0;
let digitPoints = [];
let particlePulse = 0;

const pointer = {
  x: 0.5,
  y: 0.5,
  tx: 0.5,
  ty: 0.5,
  vx: 0,
  vy: 0,
  visible: false,
  handVisible: false,
  initialized: false,
  lastSampleAt: 0
};

const MAX_PARTICLES = REDUCED_MOTION ? 320 : (IS_MOBILE ? 920 : 1680);
const particles = Array.from({ length: MAX_PARTICLES }, () => ({
  angle: Math.random() * TAU,
  radius: 28 + Math.pow(Math.random(), 0.6) * 230,
  depth: Math.random(),
  speed: 0.18 + Math.random() * 0.58,
  phase: Math.random() * TAU,
  size: 0.5 + Math.random() * 1.8,
  drift: 8 + Math.random() * 28,
  colorIndex: Math.floor(Math.random() * PARTICLE_COLORS.length),
  sparkle: Math.random() > 0.82,
  glyphIndex: 0
}));

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function lerp(a, b, amount) {
  return a + (b - a) * amount;
}

function dist(a, b) {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

function isAuthenticated() {
  return document.body.classList.contains('app-authenticated');
}

function visibleElement(element) {
  if (!element) return false;
  const style = getComputedStyle(element);
  const rect = element.getBoundingClientRect();
  return style.display !== 'none'
    && style.visibility !== 'hidden'
    && Number(style.opacity) > 0.04
    && rect.width > 2
    && rect.height > 2;
}

function setToolbarLabel(button, label) {
  button.querySelector('.gesture-toolbar-label').textContent = label;
}

function setSystemStatus(text, state = 'idle') {
  systemStatus.textContent = text;
  const dot = statusCard.querySelector('.gesture-status-dot');
  dot.classList.toggle('is-live', state === 'live');
  dot.classList.toggle('is-error', state === 'error');
}

function setGestureStatus(text, score = 0) {
  currentGesture.textContent = text;
  confidenceFill.style.width = `${Math.round(clamp(score, 0, 1) * 100)}%`;
}

function showError(message) {
  errorBox.textContent = message;
  errorBox.hidden = false;
  clearTimeout(errorTimer);
  errorTimer = setTimeout(() => { errorBox.hidden = true; }, 7600);
}

function showRouteFlash(title, subtitle = '手势指令已执行') {
  clearTimeout(routeFlashTimer);
  routeFlash.innerHTML = `${title}<small>${subtitle}</small>`;
  routeFlash.classList.add('is-visible');
  routeFlashTimer = setTimeout(() => routeFlash.classList.remove('is-visible'), 1300);
}

function cameraErrorMessage(error) {
  if (!window.isSecureContext) return '浏览器只允许在 localhost 或 HTTPS 页面访问摄像头';
  if (error?.name === 'NotAllowedError') return '摄像头权限被拒绝，请在地址栏的网站权限中选择“允许”';
  if (error?.name === 'NotFoundError') return '未检测到可用摄像头';
  if (error?.name === 'NotReadableError') return '摄像头正被其他程序占用';
  return error?.message || '无法打开摄像头';
}

function routeForPage(page) {
  return ROUTES.find(route => route.page === page);
}

function navigateByNumber(number) {
  const route = NUMBER_ROUTES[number];
  if (!route || !isAuthenticated()) return;
  currentPage = route.page;
  window.dispatchEvent(new CustomEvent('gesture:navigate', { detail: { page: route.page, source: 'number', number } }));
  showRouteFlash(`${number} · ${route.label}`, number > 5 ? '双手数字手势导航' : '数字手势导航');
}

function cycleRoute(direction) {
  const now = performance.now();
  if (now - lastSwipeAt < 1000 || !isAuthenticated()) return;
  lastSwipeAt = now;
  const currentIndex = Math.max(0, ROUTES.findIndex(route => route.page === currentPage));
  const nextIndex = (currentIndex + direction + ROUTES.length) % ROUTES.length;
  const route = ROUTES[nextIndex];
  currentPage = route.page;
  window.dispatchEvent(new CustomEvent('gesture:navigate', { detail: { page: route.page, source: direction > 0 ? 'swipe-right' : 'swipe-left' } }));
  showRouteFlash(route.label, direction > 0 ? '张开手掌向右滑动' : '张开手掌向左滑动');
}

function closestInteractive(element) {
  if (!element) return null;
  if (element.closest?.('#gesture-experience')) {
    return element.closest('.gesture-mini-toolbar button');
  }
  return element.closest('button:not(:disabled), a[href], input:not(:disabled), select:not(:disabled), textarea:not(:disabled), [data-action], [data-page], [role="button"]');
}

function elementAtCursor() {
  const candidates = document.elementsFromPoint(pointer.x * width, pointer.y * height);
  for (const candidate of candidates) {
    if (candidate === cursor || candidate.closest?.('#gesture-cursor')) continue;
    const interactive = closestInteractive(candidate);
    if (interactive && visibleElement(interactive)) return interactive;
  }
  return null;
}

function makeRipple(x, y) {
  const ripple = document.createElement('i');
  ripple.className = 'gesture-click-ripple';
  ripple.style.left = `${x}px`;
  ripple.style.top = `${y}px`;
  document.body.append(ripple);
  ripple.addEventListener('animationend', () => ripple.remove(), { once: true });
}

function clickAtCursor() {
  const now = performance.now();
  if (now - lastClickAt < 620) return;
  const target = elementAtCursor();
  if (!target) {
    showRouteFlash('没有可点击控件', '请将食指移到按钮或输入框上');
    return;
  }
  lastClickAt = now;
  particlePulse = 1;
  makeRipple(pointer.x * width, pointer.y * height);
  target.focus?.({ preventScroll: true });
  target.click?.();
  showRouteFlash('点击已执行', `捏合 · ${target.textContent?.trim().slice(0, 24) || target.tagName}`);
}

function clickPrimaryAction() {
  const now = performance.now();
  if (now - lastConfirmAt < 1100) return;
  lastConfirmAt = now;
  const selectors = [
    '#modal-root .btn-primary:not(:disabled)',
    '#page-content .btn-primary:not(:disabled)',
    '.page-content .btn-primary:not(:disabled)',
    '.auth-card .btn-primary:not(:disabled)'
  ];
  const candidates = selectors.flatMap(selector => [...document.querySelectorAll(selector)]).filter(visibleElement);
  if (!candidates.length) {
    showRouteFlash('没有可确认的主操作', '请将食指移到具体按钮后捏合点击');
    return;
  }
  const px = pointer.x * width;
  const py = pointer.y * height;
  const target = candidates.sort((a, b) => {
    const ar = a.getBoundingClientRect();
    const br = b.getBoundingClientRect();
    return Math.hypot(ar.left + ar.width / 2 - px, ar.top + ar.height / 2 - py)
      - Math.hypot(br.left + br.width / 2 - px, br.top + br.height / 2 - py);
  })[0];
  target.click();
  particlePulse = 1;
  showRouteFlash('主操作已确认', target.textContent?.trim().slice(0, 28) || 'Primary action');
}

function cancelCurrentAction(source = 'fist') {
  const now = performance.now();
  if (now - lastCancelAt < 1000) return;
  lastCancelAt = now;
  const closeTarget = [...document.querySelectorAll('[data-action="close-modal"], [data-action="close-mobile-nav"]')].find(visibleElement);
  if (closeTarget) {
    closeTarget.click();
    showRouteFlash('已取消当前操作', source === 'fist' ? '握拳取消' : '拇指向下取消');
    return;
  }
  window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
  showRouteFlash('取消指令已发送', '当前页面没有打开的弹窗');
}

async function createRecognizer() {
  if (recognizer) return recognizer;
  if (recognizerLoading) return recognizerLoading;

  recognizerLoading = (async () => {
    setSystemStatus('摄像头已开启，正在加载手势模型…');
    const visionModule = await import(/* @vite-ignore */ `https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@${MEDIAPIPE_VERSION}/+esm`);
    const vision = await visionModule.FilesetResolver.forVisionTasks(
      `https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@${MEDIAPIPE_VERSION}/wasm`
    );
    const options = {
      baseOptions: {
        modelAssetPath: 'https://storage.googleapis.com/mediapipe-tasks/gesture_recognizer/gesture_recognizer.task',
        delegate: 'GPU'
      },
      runningMode: 'VIDEO',
      numHands: 2,
      minHandDetectionConfidence: 0.48,
      minHandPresenceConfidence: 0.45,
      minTrackingConfidence: 0.45,
      cannedGesturesClassifierOptions: { scoreThreshold: 0.48, maxResults: 1 }
    };
    try {
      recognizer = await visionModule.GestureRecognizer.createFromOptions(vision, options);
    } catch {
      options.baseOptions.delegate = 'CPU';
      recognizer = await visionModule.GestureRecognizer.createFromOptions(vision, options);
    }
    modelReady = true;
    return recognizer;
  })().finally(() => { recognizerLoading = null; });

  return recognizerLoading;
}

function resetPointer() {
  pointer.handVisible = false;
  pointer.visible = false;
  pointer.initialized = false;
  cursor.classList.remove('is-visible', 'is-hovering', 'is-pinching', 'is-holding');
}

function resetPinchState() {
  pinchDown = false;
  pinchCandidateSince = 0;
  pinchReleaseSince = 0;
  pinchAnchor = null;
  cursor.classList.remove('is-pinching');
}

function resetNumberCandidate() {
  candidateNumber = 0;
  candidateSince = 0;
  candidateOrigin = null;
  targetDigitMorph = 0;
  digitPoints = [];
  cursor.classList.remove('is-holding');
}

async function startGesture() {
  if (!isAuthenticated()) {
    showError('请先登录工作台，再启动手势控制。');
    return;
  }
  if (cameraActive) return;
  if (!navigator.mediaDevices?.getUserMedia) {
    showError('当前浏览器不支持摄像头 API。');
    return;
  }

  controlButton.disabled = true;
  setToolbarLabel(controlButton, '请求摄像头…');
  errorBox.hidden = true;

  try {
    setSystemStatus('正在请求摄像头权限…');
    stream = await navigator.mediaDevices.getUserMedia({
      video: {
        facingMode: 'user',
        width: { ideal: 960 },
        height: { ideal: 720 },
        frameRate: { ideal: 30, max: 60 }
      },
      audio: false
    });
    video.srcObject = stream;
    await video.play();
    cameraActive = true;
    root.classList.add('is-active');
    controlButton.classList.add('active');
    previewButton.disabled = false;
    mirrorButton.disabled = false;
    particlesButton.disabled = false;
    setToolbarLabel(controlButton, '关闭手势');
    setSystemStatus('摄像头已开启，正在初始化手势模型…', 'live');
    setGestureStatus('请将手掌放入摄像头画面', 0);
    resumeAnimation();

    try {
      await createRecognizer();
      setSystemStatus('摄像头与手势识别均已就绪', 'live');
      showRouteFlash('手势控制已启动', '数字 1–9 可跳转模块，6–9 使用双手相加');
    } catch (error) {
      modelReady = false;
      setSystemStatus('摄像头运行中 · 手势模型加载失败', 'error');
      showError(`手势模型加载失败：${error?.message || '网络资源不可用'}。关闭后重新启动可再次尝试。`);
    }
  } catch (error) {
    stopGesture(false);
    setSystemStatus('手势控制启动失败', 'error');
    showError(`摄像头启动失败：${cameraErrorMessage(error)}`);
  } finally {
    controlButton.disabled = false;
  }
}

function stopGesture(showNotice = true) {
  cancelAnimationFrame(animationFrame);
  animationFrame = 0;
  stream?.getTracks().forEach(track => track.stop());
  stream = null;
  cameraActive = false;
  previewVisible = false;
  lastVideoTime = -1;
  video.pause?.();
  video.srcObject = null;
  video.classList.remove('is-visible');
  root.classList.remove('is-active');
  controlButton.classList.remove('active');
  previewButton.disabled = true;
  mirrorButton.disabled = true;
  particlesButton.disabled = true;
  setToolbarLabel(controlButton, '启动手势');
  setToolbarLabel(previewButton, '显示预览');
  setSystemStatus('手势控制未启动');
  setGestureStatus('鼠标 / 触控模式', 0);
  resetPointer();
  resetPinchState();
  resetNumberCandidate();
  routeLocked = false;
  releasedSince = 0;
  palmSwipe = null;
  ctx.clearRect(0, 0, width, height);
  if (showNotice && isAuthenticated()) showRouteFlash('手势控制已关闭', '摄像头资源已释放');
}

function fingerExtended(landmarks, tip, pip, mcp, palmScale) {
  const vertical = landmarks[tip].y < landmarks[pip].y - palmScale * 0.035;
  const radial = dist(landmarks[tip], landmarks[0]) > dist(landmarks[pip], landmarks[0]) * 1.035;
  const jointOpen = dist(landmarks[tip], landmarks[mcp]) > dist(landmarks[pip], landmarks[mcp]) * 1.05;
  return vertical && radial && jointOpen;
}

function classifyHandNumber(landmarks, category = 'None') {
  if (['Closed_Fist', 'Thumb_Up', 'Thumb_Down', 'ILoveYou'].includes(category)) return 0;

  const palmScale = Math.max(0.045, dist(landmarks[0], landmarks[9]));
  const index = fingerExtended(landmarks, 8, 6, 5, palmScale);
  const middle = fingerExtended(landmarks, 12, 10, 9, palmScale);
  const ring = fingerExtended(landmarks, 16, 14, 13, palmScale);
  const pinky = fingerExtended(landmarks, 20, 18, 17, palmScale);
  const thumbTip = landmarks[4];
  const thumbIp = landmarks[3];
  const thumbMcp = landmarks[2];
  const thumbSpread = Math.abs(thumbTip.x - thumbMcp.x) > palmScale * 0.44;
  const thumbRadial = dist(thumbTip, landmarks[5]) > palmScale * 0.78
    && dist(thumbTip, landmarks[0]) > dist(thumbIp, landmarks[0]) * 1.02;
  const thumb = thumbSpread && thumbRadial;

  if (index && !middle && !ring && !pinky) return 1;
  if (index && middle && !ring && !pinky) return thumb ? 3 : 2;
  if (index && middle && ring && !pinky) return thumb ? 4 : 3;
  if (index && middle && ring && pinky) return thumb ? 5 : 4;

  // MediaPipe 的类别只作为几何判断失败时的兜底，避免四指手势被误标为 Open_Palm，
  // 从而提升 4、8、9 等组合数字的稳定性。
  if (category === 'Pointing_Up') return 1;
  if (category === 'Victory') return 2;
  if (category === 'Open_Palm') return 5;
  return 0;
}

function displayX(raw) {
  return mirrorEnabled ? 1 - raw : raw;
}

function calibrateAxis(value, edge = 0.1) {
  return clamp((value - edge) / Math.max(0.001, 1 - edge * 2), 0, 1);
}

function smoothCursor(targetX, targetY, now) {
  if (!pointer.initialized) {
    pointer.x = targetX;
    pointer.y = targetY;
    pointer.initialized = true;
    pointer.lastSampleAt = now;
    return { x: targetX, y: targetY };
  }

  const elapsed = clamp((now - pointer.lastSampleAt) / 16.667, 0.55, 3.2);
  const deltaX = targetX - pointer.x;
  const deltaY = targetY - pointer.y;
  const movement = Math.hypot(deltaX, deltaY);
  const base = movement > 0.09 ? 0.64 : movement > 0.035 ? 0.46 : movement > 0.012 ? 0.32 : 0.22;
  const amount = 1 - Math.pow(1 - base, elapsed);
  pointer.x += deltaX * amount;
  pointer.y += deltaY * amount;
  pointer.lastSampleAt = now;
  return { x: pointer.x, y: pointer.y };
}

function updatePinchState(pinchRatio, allowed, cursorPoint, now) {
  if (!pinchDown) {
    pinchReleaseSince = 0;
    if (allowed && pinchRatio <= PINCH_ENTER_RATIO) {
      if (!pinchCandidateSince) {
        pinchCandidateSince = now;
        pinchAnchor = { ...cursorPoint };
      }
      if (now - pinchCandidateSince >= PINCH_CONFIRM_MS) {
        pinchDown = true;
        pinchCandidateSince = 0;
        return 'pressed';
      }
    } else {
      pinchCandidateSince = 0;
      pinchAnchor = null;
    }
    return 'idle';
  }

  if (!allowed || pinchRatio >= PINCH_EXIT_RATIO) {
    if (!pinchReleaseSince) pinchReleaseSince = now;
    if (now - pinchReleaseSince >= PINCH_RELEASE_MS) {
      pinchDown = false;
      pinchReleaseSince = 0;
      pinchAnchor = null;
      return 'released';
    }
  } else {
    pinchReleaseSince = 0;
  }
  return 'held';
}

function buildDigitPoints(number) {
  const side = Math.max(220, Math.min(420, Math.round(Math.min(width, height) * 0.46)));
  const offscreen = document.createElement('canvas');
  offscreen.width = side;
  offscreen.height = side;
  const offctx = offscreen.getContext('2d');
  offctx.clearRect(0, 0, side, side);
  offctx.fillStyle = '#fff';
  offctx.textAlign = 'center';
  offctx.textBaseline = 'middle';
  offctx.font = `900 ${Math.round(side * 0.78)}px Inter, Arial, sans-serif`;
  offctx.fillText(String(number), side * 0.5, side * 0.52);
  const data = offctx.getImageData(0, 0, side, side).data;
  const step = IS_MOBILE ? 5 : 4;
  const points = [];
  for (let y = 0; y < side; y += step) {
    for (let x = 0; x < side; x += step) {
      if (data[(y * side + x) * 4 + 3] > 90) points.push({ x: x / side - 0.5, y: y / side - 0.5 });
    }
  }
  digitPoints = points;
  particles.forEach((particle, index) => {
    particle.glyphIndex = points.length ? (index * 17 + Math.floor(particle.phase * 101)) % points.length : 0;
  });
}

function updateNumberCandidate(number, palmX, palmY, now) {
  if (!number) {
    resetNumberCandidate();
    if (routeLocked) {
      if (!releasedSince) releasedSince = now;
      if (now - releasedSince > 520) routeLocked = false;
    }
    return;
  }

  releasedSince = 0;
  if (routeLocked || pinchDown || pinchCandidateSince) return;
  const hoveredControl = elementAtCursor();
  if (hoveredControl) {
    candidateNumber = number;
    candidateSince = now;
    candidateOrigin = { x: palmX, y: palmY };
    targetDigitMorph = 0;
    cursor.classList.remove('is-holding');
    return;
  }

  const moved = candidateOrigin ? Math.hypot(palmX - candidateOrigin.x, palmY - candidateOrigin.y) : 0;
  if (candidateNumber !== number || moved > 0.075) {
    candidateNumber = number;
    candidateSince = now;
    candidateOrigin = { x: palmX, y: palmY };
    buildDigitPoints(number);
  }

  const held = now - candidateSince;
  const threshold = number === 1 ? 680 : number > 5 ? 760 : 620;
  targetDigitMorph = held > 150 ? 0.92 : 0;
  cursor.classList.toggle('is-holding', held > 220);
  if (held >= threshold) {
    routeLocked = true;
    cursor.classList.remove('is-holding');
    particlePulse = 1;
    navigateByNumber(number);
  }
}

function updateConfirmCancelHolds(category, now) {
  if (category === 'Thumb_Up') {
    if (!confirmCandidateAt) confirmCandidateAt = now;
    if (now - confirmCandidateAt > 650) {
      clickPrimaryAction();
      confirmCandidateAt = now + 1000;
    }
  } else {
    confirmCandidateAt = 0;
  }

  if (category === 'Closed_Fist' || category === 'Thumb_Down') {
    if (!cancelCandidateAt) cancelCandidateAt = now;
    if (now - cancelCandidateAt > 580) {
      cancelCurrentAction(category === 'Closed_Fist' ? 'fist' : 'thumb-down');
      cancelCandidateAt = now + 1000;
    }
  } else {
    cancelCandidateAt = 0;
  }
}

function updateSwipeDetection(category, number, palmX, palmY, now) {
  // 双手组合数字（6–9）中通常包含一只张开的手，不能把它误判为滑动指令。
  const openPalm = number <= 5 && (category === 'Open_Palm' || number === 5);
  if (!openPalm || pinchDown || routeLocked) {
    palmSwipe = null;
    return;
  }
  if (!palmSwipe) palmSwipe = { x: palmX, y: palmY, at: now };
  const age = now - palmSwipe.at;
  const dx = palmX - palmSwipe.x;
  const dy = Math.abs(palmY - palmSwipe.y);
  if (age < 900 && Math.abs(dx) > 0.31 && dy < 0.24) {
    resetNumberCandidate();
    routeLocked = true;
    releasedSince = now;
    cycleRoute(dx > 0 ? 1 : -1);
    palmSwipe = null;
  } else if (age > 1000) {
    palmSwipe = { x: palmX, y: palmY, at: now };
  }
}

function processRecognition(result, now) {
  if (!result?.landmarks?.length) {
    resetPointer();
    resetPinchState();
    updateNumberCandidate(0, 0.5, 0.5, now);
    updateConfirmCancelHolds('None', now);
    if (now - lastGestureSeenAt > 500) setGestureStatus(modelReady ? '未检测到手' : '手势模型未就绪', 0);
    return;
  }

  lastGestureSeenAt = now;
  const hands = result.landmarks;
  const categories = hands.map((_, index) => result.gestures?.[index]?.[0]?.categoryName || 'None');
  const scores = hands.map((_, index) => result.gestures?.[index]?.[0]?.score || 0.55);
  const handNumbers = hands.map((landmarks, index) => classifyHandNumber(landmarks, categories[index]));
  const total = handNumbers.reduce((sum, value) => sum + value, 0);
  const number = total >= 1 && total <= MAX_GESTURE_NUMBER ? total : 0;

  const handData = hands.map((landmarks, index) => {
    const palmScale = Math.max(0.045, (dist(landmarks[0], landmarks[9]) + dist(landmarks[5], landmarks[17])) / 2);
    return {
      landmarks,
      category: categories[index],
      score: scores[index],
      palmScale,
      pinchRatio: dist(landmarks[4], landmarks[8]) / palmScale,
      x: calibrateAxis(displayX(landmarks[8].x), 0.11),
      y: calibrateAxis(landmarks[8].y, 0.08),
      palmX: displayX((landmarks[0].x + landmarks[5].x + landmarks[9].x + landmarks[13].x + landmarks[17].x) / 5),
      palmY: (landmarks[0].y + landmarks[5].y + landmarks[9].y + landmarks[13].y + landmarks[17].y) / 5
    };
  });

  const pinchingHand = handData
    .filter(hand => hand.category !== 'Closed_Fist' && hand.pinchRatio < PINCH_EXIT_RATIO)
    .sort((a, b) => a.pinchRatio - b.pinchRatio)[0];
  const pointerHand = pinchingHand || handData
    .slice()
    .sort((a, b) => Math.hypot(a.x - pointer.x, a.y - pointer.y) - Math.hypot(b.x - pointer.x, b.y - pointer.y))[0];

  const averagePalmX = handData.reduce((sum, hand) => sum + hand.palmX, 0) / handData.length;
  const averagePalmY = handData.reduce((sum, hand) => sum + hand.palmY, 0) / handData.length;
  const priorPoint = pointer.initialized ? { x: pointer.x, y: pointer.y } : { x: pointerHand.x, y: pointerHand.y };
  const smoothedPoint = smoothCursor(pointerHand.x, pointerHand.y, now);
  const pinchAllowed = pointerHand.category !== 'Closed_Fist';
  const pinchEvent = updatePinchState(pointerHand.pinchRatio, pinchAllowed, priorPoint, now);
  const cursorPoint = (pinchDown || pinchCandidateSince) && pinchAnchor ? pinchAnchor : smoothedPoint;

  pointer.handVisible = true;
  pointer.visible = true;
  pointer.x = clamp(cursorPoint.x, 0.001, 0.999);
  pointer.y = clamp(cursorPoint.y, 0.001, 0.999);
  cursor.style.transform = `translate3d(${pointer.x * width}px, ${pointer.y * height}px, 0)`;
  cursor.classList.add('is-visible');
  cursor.classList.toggle('is-hovering', Boolean(elementAtCursor()));
  cursor.classList.toggle('is-pinching', pinchDown);

  const interactionNumber = pinchDown || pinchCandidateSince ? 0 : number;
  const route = NUMBER_ROUTES[interactionNumber];
  const category = pointerHand.category;
  const label = route
    ? `数字 ${interactionNumber}${interactionNumber > 5 ? '（双手合计）' : ''} · ${route.label}`
    : pinchDown
      ? '捏合已确认 · 松开后可再次点击'
      : pinchCandidateSince
        ? '保持捏合…'
        : (CANNED_LABELS[category] || category);
  setGestureStatus(label, Math.min(...scores));

  updateNumberCandidate(interactionNumber, averagePalmX, averagePalmY, now);
  updateSwipeDetection(category, interactionNumber, averagePalmX, averagePalmY, now);
  updateConfirmCancelHolds(category, now);
  if (pinchEvent === 'pressed') clickAtCursor();
}

function updateRecognition(now) {
  if (!cameraActive || !recognizer || video.readyState < 2) return;
  if (now - lastInferenceAt < 42 || video.currentTime === lastVideoTime) return;
  lastInferenceAt = now;
  lastVideoTime = video.currentTime;
  try {
    processRecognition(recognizer.recognizeForVideo(video, now), now);
  } catch (error) {
    console.warn('Gesture recognition frame failed:', error);
  }
}

function resize() {
  width = innerWidth;
  height = innerHeight;
  dpr = Math.min(devicePixelRatio || 1, 1.55);
  canvas.width = Math.round(width * dpr);
  canvas.height = Math.round(height * dpr);
  canvas.style.width = `${width}px`;
  canvas.style.height = `${height}px`;
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  if (candidateNumber) buildDigitPoints(candidateNumber);
}

function activeParticleCount() {
  if (particleLevel <= 0) return 0;
  return particleLevel === 1 ? Math.min(MAX_PARTICLES, IS_MOBILE ? 520 : 860) : MAX_PARTICLES;
}

function drawParticles(time, delta) {
  ctx.clearRect(0, 0, width, height);
  const count = activeParticleCount();
  if (!count) return;

  digitMorph = lerp(digitMorph, targetDigitMorph, 1 - Math.pow(0.001, delta));
  particlePulse = Math.max(0, particlePulse - delta * 1.9);
  const centerX = pointer.handVisible ? pointer.x * width : width * 0.5;
  const centerY = pointer.handVisible ? pointer.y * height : height * 0.5;
  const glyphScale = Math.min(width, height) * 0.58;

  ctx.save();
  ctx.globalCompositeOperation = 'lighter';

  // 每帧只绘制一次柔和光晕，比给每个粒子设置 shadowBlur 更省性能。
  const auraRadius = Math.min(width, height) * (0.13 + particlePulse * 0.035);
  const aura = ctx.createRadialGradient(centerX, centerY, 0, centerX, centerY, auraRadius);
  aura.addColorStop(0, `rgba(0, 255, 211, ${0.075 + particlePulse * 0.055})`);
  aura.addColorStop(0.42, `rgba(0, 221, 255, ${0.04 + particlePulse * 0.03})`);
  aura.addColorStop(1, 'rgba(0, 180, 255, 0)');
  ctx.globalAlpha = particleLevel === 2 ? 1 : 0.72;
  ctx.fillStyle = aura;
  ctx.fillRect(centerX - auraRadius, centerY - auraRadius, auraRadius * 2, auraRadius * 2);

  for (let index = 0; index < count; index += 1) {
    const particle = particles[index];
    const angle = particle.angle + time * particle.speed;
    const pulse = 1 + particlePulse * (0.1 + particle.depth * 0.28);
    let x = centerX + Math.cos(angle) * particle.radius * pulse + Math.sin(time * 1.3 + particle.phase) * particle.drift;
    let y = centerY + Math.sin(angle * 0.72 + particle.phase) * particle.radius * 0.46 * pulse + Math.cos(time * 1.05 + particle.phase) * particle.drift * 0.5;

    if (digitMorph > 0.01 && digitPoints.length) {
      const point = digitPoints[particle.glyphIndex % digitPoints.length];
      x = lerp(x, width * 0.5 + point.x * glyphScale, digitMorph);
      y = lerp(y, height * 0.47 + point.y * glyphScale, digitMorph);
    }

    const twinkle = particle.sparkle ? 0.76 + Math.sin(time * 4.8 + particle.phase) * 0.24 : 1;
    const alpha = ((0.075 + particle.depth * 0.24) * (particleLevel === 2 ? 1 : 0.78) + digitMorph * 0.23) * twinkle;
    const size = particle.size * (0.78 + particle.depth * 0.82 + digitMorph * 0.48);
    const colorIndex = particle.colorIndex;
    ctx.globalAlpha = clamp(alpha, 0, 0.82);
    ctx.fillStyle = PARTICLE_COLORS[colorIndex];
    if (particle.depth > 0.86) ctx.fillRect(x - size / 2, y - size / 2, size, size);
    else {
      ctx.beginPath();
      ctx.arc(x, y, size / 2, 0, TAU);
      ctx.fill();
    }

    // 仅给少量近景粒子补一层小光核，获得鲜艳荧光感，避免全量阴影带来的卡顿。
    if (particle.depth > 0.76 && (index & 3) === 0) {
      ctx.globalAlpha = clamp(alpha * 0.46, 0, 0.38);
      ctx.fillStyle = PARTICLE_GLOW_COLORS[colorIndex];
      ctx.beginPath();
      ctx.arc(x, y, size * 1.45, 0, TAU);
      ctx.fill();
    }
  }
  ctx.restore();
}

function animate(now) {
  if (!cameraActive) {
    animationFrame = 0;
    return;
  }
  const delta = clamp((now - lastFrameAt) / 1000, 0.001, 0.04);
  lastFrameAt = now;
  updateRecognition(now);
  drawParticles(now / 1000, delta);
  animationFrame = requestAnimationFrame(animate);
}

function resumeAnimation() {
  lastFrameAt = performance.now();
  if (!animationFrame) animationFrame = requestAnimationFrame(animate);
}

controlButton.addEventListener('click', () => {
  if (cameraActive) stopGesture();
  else void startGesture();
});

previewButton.addEventListener('click', () => {
  previewVisible = !previewVisible;
  video.classList.toggle('is-visible', previewVisible);
  setToolbarLabel(previewButton, previewVisible ? '隐藏预览' : '显示预览');
});

mirrorButton.addEventListener('click', () => {
  mirrorEnabled = !mirrorEnabled;
  localStorage.setItem('fogtraffic_gesture_mirror', String(mirrorEnabled));
  video.classList.toggle('is-mirrored', mirrorEnabled);
  mirrorButton.classList.toggle('active', mirrorEnabled);
  setToolbarLabel(mirrorButton, mirrorEnabled ? '镜像方向' : '原始方向');
  showRouteFlash(mirrorEnabled ? '已切换为镜像方向' : '已切换为原始方向', '光标方向与摄像头预览保持一致');
});

particlesButton.addEventListener('click', () => {
  particleLevel = (particleLevel + 1) % 3;
  localStorage.setItem('fogtraffic_gesture_particles', String(particleLevel));
  root.classList.toggle('particles-off', particleLevel === 0);
  setToolbarLabel(particlesButton, ['粒子：关闭', '粒子：轻量', '粒子：增强'][particleLevel]);
  showRouteFlash(['粒子叠加已关闭', '粒子叠加：轻量', '粒子叠加：增强'][particleLevel], '手势识别功能不受影响');
});

window.addEventListener('hashchange', () => {
  const page = location.hash.replace('#/', '').replace('#', '') || 'chat';
  if (routeForPage(page)) currentPage = page;
});

window.addEventListener('app:auth-change', event => {
  if (!event.detail?.authenticated && cameraActive) stopGesture(false);
});

window.addEventListener('keydown', event => {
  if (!cameraActive || !isAuthenticated()) return;
  if (event.target instanceof HTMLInputElement || event.target instanceof HTMLTextAreaElement || event.target instanceof HTMLSelectElement) return;
  if (/^[1-9]$/.test(event.key)) navigateByNumber(Number(event.key));
  if (event.key.toLowerCase() === 'p') particlesButton.click();
});

window.addEventListener('resize', resize, { passive: true });
document.addEventListener('visibilitychange', () => {
  if (document.hidden) {
    cancelAnimationFrame(animationFrame);
    animationFrame = 0;
  } else if (cameraActive) {
    resumeAnimation();
  }
});
window.addEventListener('beforeunload', () => stopGesture(false));

video.classList.toggle('is-mirrored', mirrorEnabled);
mirrorButton.classList.toggle('active', mirrorEnabled);
root.classList.toggle('particles-off', particleLevel === 0);
setToolbarLabel(mirrorButton, mirrorEnabled ? '镜像方向' : '原始方向');
setToolbarLabel(particlesButton, ['粒子：关闭', '粒子：轻量', '粒子：增强'][particleLevel]);
resize();
