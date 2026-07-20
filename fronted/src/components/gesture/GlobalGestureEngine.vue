<script setup>
import { nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { VideoCamera, Hide, View, Refresh, Switch } from '@element-plus/icons-vue';
import { gestureStore } from '../../stores/gesture.js';
import { acquireCamera, releaseCamera } from '../../utils/cameraManager.js';

const route = useRoute();
const router = useRouter();
const video = ref(null);

let stream = null;
let recognizer = null;
let raf = 0;
let lastVideoTime = -1;
let lastSeen = 0;
let pinchDown = false;
let pinchCandidateSince = 0;
let pinchReleaseSince = 0;
let pinchAnchor = null;
let cursorInitialized = false;
let filteredCursorX = .5;
let filteredCursorY = .5;
let lastCursorSampleAt = 0;
let lastAction = 0;
let stopWatch = null;
let loadingModel = null;
let candidateNumber = 0;
let candidateSince = 0;
let candidateOrigin = null;
let transitionArmed = true;
let releasedSince = 0;
let routeTimer = 0;
let resetTimer = 0;

const modules = [
  ['chat', '智能对话'],
  ['detection', '交通检测工作台'],
  ['datasets', '数据集管理'],
  ['training', '模型训练'],
  ['evaluation', '模型评估'],
  ['dashboard', '数据看板'],
  ['history', '任务历史'],
  ['monitoring', '系统监控'],
  ['settings', '系统设置']
];

const dist = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);
const clamp = (value, min, max) => Math.max(min, Math.min(max, value));
const calibrateAxis = (value, edge = .1) => clamp((value - edge) / Math.max(.001, 1 - edge * 2), 0, 1);
const PINCH_ENTER_RATIO = .31;
const PINCH_EXIT_RATIO = .48;
const PINCH_CONFIRM_MS = 72;
const PINCH_RELEASE_MS = 92;

function resetPinchState() {
  pinchDown = false;
  pinchCandidateSince = 0;
  pinchReleaseSince = 0;
  pinchAnchor = null;
  gestureStore.cursor.pinching = false;
}

function smoothCursor(targetX, targetY, now) {
  if (!cursorInitialized) {
    filteredCursorX = targetX;
    filteredCursorY = targetY;
    cursorInitialized = true;
    lastCursorSampleAt = now;
    return { x: targetX, y: targetY };
  }

  const elapsed = clamp((now - lastCursorSampleAt) / 16.667, .55, 3.2);
  const deltaX = targetX - filteredCursorX;
  const deltaY = targetY - filteredCursorY;
  const movement = Math.hypot(deltaX, deltaY);
  const base = movement > .09 ? .64 : movement > .035 ? .46 : movement > .012 ? .32 : .22;
  const amount = 1 - Math.pow(1 - base, elapsed);
  if (movement > .0012) {
    filteredCursorX += deltaX * amount;
    filteredCursorY += deltaY * amount;
  }
  lastCursorSampleAt = now;
  return { x: filteredCursorX, y: filteredCursorY };
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

function displayX(raw) {
  return gestureStore.mirror ? 1 - raw : raw;
}

function fingerExtended(landmarks, tip, pip, mcp, palmScale) {
  const vertical = landmarks[tip].y < landmarks[pip].y - palmScale * .035;
  const radial = dist(landmarks[tip], landmarks[0]) > dist(landmarks[pip], landmarks[0]) * 1.035;
  const jointOpen = dist(landmarks[tip], landmarks[mcp]) > dist(landmarks[pip], landmarks[mcp]) * 1.05;
  return vertical && radial && jointOpen;
}

function classifyHandNumber(landmarks, category = 'None') {
  if (category === 'Pointing_Up') return 1;
  if (category === 'Victory') return 2;
  if (category === 'Open_Palm') return 5;
  if (category === 'Closed_Fist' || category === 'Thumb_Up' || category === 'Thumb_Down' || category === 'ILoveYou') return 0;

  const palmScale = Math.max(.045, dist(landmarks[0], landmarks[9]));
  const index = fingerExtended(landmarks, 8, 6, 5, palmScale);
  const middle = fingerExtended(landmarks, 12, 10, 9, palmScale);
  const ring = fingerExtended(landmarks, 16, 14, 13, palmScale);
  const pinky = fingerExtended(landmarks, 20, 18, 17, palmScale);
  const thumbTip = landmarks[4];
  const thumbIp = landmarks[3];
  const thumbMcp = landmarks[2];
  const thumbSpread = Math.abs(thumbTip.x - thumbMcp.x) > palmScale * .44;
  const thumbRadial = dist(thumbTip, landmarks[5]) > palmScale * .78
    && dist(thumbTip, landmarks[0]) > dist(thumbIp, landmarks[0]) * 1.02;
  const thumb = thumbSpread && thumbRadial;

  if (index && !middle && !ring && !pinky) return 1;
  if (index && middle && !ring && !pinky) return thumb ? 3 : 2;
  if (index && middle && ring && !pinky) return thumb ? 4 : 3;
  if (index && middle && ring && pinky) return thumb ? 5 : 4;
  return 0;
}


function resetCandidate() {
  candidateNumber = 0;
  candidateSince = 0;
  candidateOrigin = null;
}

function beginNumberTransition(number) {
  const item = modules[number - 1];
  if (!item || gestureStore.transition.phase !== 'idle') return;
  const token = gestureStore.beginDigitTransition(number, item[0], item[1]);
  if (!token) return;
  transitionArmed = false;
  resetCandidate();
  gestureStore.status = '手势跟踪中';
}

function updateNumberCandidate(number, palmX, palmY, now) {
  if (gestureStore.transition.phase !== 'idle') return;

  if (!number) {
    resetCandidate();
    if (!transitionArmed) {
      if (!releasedSince) releasedSince = now;
      if (now - releasedSince > 520) transitionArmed = true;
    }
    return;
  }

  releasedSince = 0;
  if (!transitionArmed) return;
  const moved = candidateOrigin ? Math.hypot(palmX - candidateOrigin.x, palmY - candidateOrigin.y) : 0;
  if (candidateNumber !== number || moved > .075) {
    candidateNumber = number;
    candidateSince = now;
    candidateOrigin = { x: palmX, y: palmY };
    return;
  }

  const stableFor = now - candidateSince;
  const threshold = number === 1 ? 520 : 420;
  if (stableFor >= threshold) beginNumberTransition(number);
}

async function finishNumberTransition(number, token) {
  const transition = gestureStore.transition;
  if (transition.token !== token || transition.phase !== 'forming' || transition.number !== number) return;
  const item = modules[number - 1];
  if (!item) return;

  gestureStore.setTransitionPhase('locked', token);
  gestureStore.setTransitionProgress(1, token);

  clearTimeout(routeTimer);
  clearTimeout(resetTimer);
  routeTimer = setTimeout(async () => {
    if (gestureStore.transition.token !== token) return;
    gestureStore.setTransitionPhase('routing', token);
    try {
      await router.push({ name: item[0] });
      gestureStore.pulse();
    } catch (error) {
      console.warn('gesture route failed', error);
      gestureStore.error = `无法进入${item[1]}，请重试`;
    }
    resetTimer = setTimeout(() => {
      gestureStore.clearDigitTransition(token);
      gestureStore.status = gestureStore.active ? '手势跟踪中' : '鼠标 / 触控模式';
    }, 680);
  }, 760);
}

function onDigitFormed(event) {
  const number = Number(event.detail?.number || 0);
  const token = Number(event.detail?.token || 0);
  if (!number || !token) return;
  finishNumberTransition(number, token);
}

function clickAtCursor() {
  const now = performance.now();
  if (now - lastAction < 520 || gestureStore.transition.phase !== 'idle') return;
  lastAction = now;
  const x = gestureStore.cursor.x * innerWidth;
  const y = gestureStore.cursor.y * innerHeight;
  const hit = document.elementFromPoint(x, y);
  const element = hit?.closest?.('button,a,input,textarea,select,label,[role="button"],[tabindex]:not([tabindex="-1"]),.el-slider');
  if (!element) return;

  element.focus?.({ preventScroll: true });
  const sliderRunway = hit.closest?.('.el-slider__runway') || element.querySelector?.('.el-slider__runway');
  if (sliderRunway) {
    sliderRunway.dispatchEvent(new MouseEvent('click', {
      bubbles: true,
      cancelable: true,
      clientX: x,
      clientY: y,
      view: window
    }));
  } else {
    element.click?.();
  }
  gestureStore.pulse();
}

function cancelAction() {
  const now = performance.now();
  if (now - lastAction < 1100 || gestureStore.transition.phase !== 'idle') return;
  lastAction = now;
  document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
  document.querySelector('.el-dialog__headerbtn,.el-drawer__close-btn')?.click?.();
}

function process(result, now) {
  if (!result?.landmarks?.length) {
    gestureStore.cursor.visible = false;
    gestureStore.confidence = 0;
    resetPinchState();
    cursorInitialized = false;
    if (gestureStore.transition.phase === 'idle') {
      gestureStore.number = 0;
      resetCandidate();
      if (!transitionArmed) {
        if (!releasedSince) releasedSince = now;
        if (now - releasedSince > 520) transitionArmed = true;
      }
    }
    return;
  }

  lastSeen = now;
  const hands = result.landmarks;
  const categories = hands.map((_, index) => result.gestures?.[index]?.[0]?.categoryName || 'None');
  const scores = hands.map((_, index) => result.gestures?.[index]?.[0]?.score || .55);
  const handNumbers = hands.map((landmarks, index) => classifyHandNumber(landmarks, categories[index]));
  const total = handNumbers.reduce((sum, value) => sum + value, 0);
  const number = total >= 1 && total <= 9 ? total : 0;

  const handData = hands.map((landmarks, index) => {
    const palmScale = Math.max(.045, (dist(landmarks[0], landmarks[9]) + dist(landmarks[5], landmarks[17])) / 2);
    const x = calibrateAxis(displayX(landmarks[8].x), .11);
    const y = calibrateAxis(landmarks[8].y, .08);
    return {
      index,
      landmarks,
      category: categories[index],
      score: scores[index],
      palmScale,
      pinchRatio: dist(landmarks[4], landmarks[8]) / palmScale,
      x,
      y
    };
  });

  // Keep the pointer on the same physical hand. A strongly pinching hand gets
  // priority; otherwise choose the hand nearest the currently rendered cursor.
  const pinchingHand = handData
    .filter(hand => hand.category !== 'Closed_Fist' && hand.pinchRatio < PINCH_EXIT_RATIO)
    .sort((a, b) => a.pinchRatio - b.pinchRatio)[0];
  const pointerHand = pinchingHand || handData
    .slice()
    .sort((a, b) => {
      const da = Math.hypot(a.x - filteredCursorX, a.y - filteredCursorY);
      const db = Math.hypot(b.x - filteredCursorX, b.y - filteredCursorY);
      return da - db;
    })[0];

  const firstHand = hands[0];
  const category = pointerHand.category;
  const score = pointerHand.score;
  const rawPalmX = (firstHand[0].x + firstHand[5].x + firstHand[9].x + firstHand[13].x + firstHand[17].x) / 5;
  const palmX = displayX(rawPalmX);
  const palmY = (firstHand[0].y + firstHand[5].y + firstHand[9].y + firstHand[13].y + firstHand[17].y) / 5;

  const priorPoint = cursorInitialized
    ? { x: filteredCursorX, y: filteredCursorY }
    : { x: pointerHand.x, y: pointerHand.y };
  const smoothedPoint = smoothCursor(pointerHand.x, pointerHand.y, now);
  const pinchAllowed = gestureStore.transition.phase === 'idle' && pointerHand.category !== 'Closed_Fist';
  const pinchEvent = updatePinchState(pointerHand.pinchRatio, pinchAllowed, priorPoint, now);
  const cursorPoint = (pinchDown || pinchCandidateSince) && pinchAnchor ? pinchAnchor : smoothedPoint;

  gestureStore.cursor = {
    visible: true,
    x: clamp(cursorPoint.x, .001, .999),
    y: clamp(cursorPoint.y, .001, .999),
    pinching: pinchDown,
    source: 'hand',
    pinchRatio: pointerHand.pinchRatio
  };
  gestureStore.confidence = Math.min(...scores);
  const interactionNumber = pinchDown || pinchCandidateSince ? 0 : number;

  if (gestureStore.transition.phase === 'idle') {
    gestureStore.showDigitPreview(interactionNumber);
    const labels = {
      Open_Palm: '张开手掌',
      Closed_Fist: '握拳',
      Pointing_Up: '食指指向',
      Thumb_Up: '点赞确认',
      Thumb_Down: '拇指向下',
      Victory: '胜利手势',
      ILoveYou: '特殊手势',
      None: '手势跟踪中'
    };
    gestureStore.status = pinchDown
      ? '捏合已确认 · 松开后可再次点击'
      : pinchCandidateSince
        ? '保持捏合…'
        : interactionNumber
          ? `数字 ${interactionNumber}${interactionNumber > 5 ? '（双手合计）' : ''} · 稳定识别中`
          : (labels[category] || category);
  } else {
    gestureStore.status = '手势跟踪中';
  }

  updateNumberCandidate(interactionNumber, palmX, palmY, now);
  if (pinchEvent === 'pressed') clickAtCursor();
  if (category === 'Closed_Fist' && score > .62) cancelAction();
}

async function loadRecognizer() {
  if (recognizer) return recognizer;
  if (loadingModel) return loadingModel;
  loadingModel = (async () => {
    try {
      gestureStore.systemStatus = '摄像头已开启，正在加载手势模型…';
      const { FilesetResolver, GestureRecognizer } = await import('@mediapipe/tasks-vision');
      const wasmSources = [
        '/mediapipe/wasm',
        'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.22-rc.20250304/wasm'
      ];
      let vision = null;
      let lastError = null;
      for (const source of wasmSources) {
        try {
          vision = await FilesetResolver.forVisionTasks(source);
          break;
        } catch (error) {
          lastError = error;
        }
      }
      if (!vision) throw lastError || new Error('WASM 运行时加载失败');
      const options = {
        baseOptions: {
          modelAssetPath: 'https://storage.googleapis.com/mediapipe-tasks/gesture_recognizer/gesture_recognizer.task',
          delegate: 'GPU'
        },
        runningMode: 'VIDEO',
        numHands: 2,
        minHandDetectionConfidence: .48,
        minHandPresenceConfidence: .45,
        minTrackingConfidence: .45
      };
      try {
        recognizer = await GestureRecognizer.createFromOptions(vision, options);
      } catch {
        options.baseOptions.delegate = 'CPU';
        recognizer = await GestureRecognizer.createFromOptions(vision, options);
      }
      gestureStore.modelReady = true;
      gestureStore.error = '';
      gestureStore.systemStatus = '摄像头与手势识别均已就绪';
      return recognizer;
    } catch (error) {
      gestureStore.modelReady = false;
      gestureStore.error = `摄像头已开启，但手势模型加载失败：${error?.message || '网络资源不可用'}`;
      gestureStore.systemStatus = '摄像头运行中 · 可重试手势模型';
      return null;
    } finally {
      loadingModel = null;
    }
  })();
  return loadingModel;
}

function cameraErrorMessage(error) {
  if (!window.isSecureContext) return '浏览器只允许在 localhost 或 HTTPS 页面访问摄像头';
  if (error?.name === 'NotAllowedError') return '摄像头权限被拒绝，请在地址栏的网站权限中选择“允许”';
  if (error?.name === 'NotFoundError') return '未检测到可用摄像头';
  if (error?.name === 'NotReadableError') return '摄像头正被其他程序占用';
  return error?.message || '无法打开摄像头';
}

async function start() {
  if (gestureStore.active && stream) {
    if (!gestureStore.modelReady) loadRecognizer();
    return;
  }
  try {
    if (!navigator.mediaDevices?.getUserMedia) throw new Error('当前浏览器不支持摄像头 API');
    gestureStore.error = '';
    gestureStore.systemStatus = '正在请求摄像头权限…';
    stream = await acquireCamera('gesture-engine');
    await nextTick();
    if (!video.value) throw new Error('摄像头预览组件尚未就绪');
    video.value.srcObject = stream;
    await video.value.play();
    gestureStore.active = true;
    gestureStore.systemStatus = '摄像头已开启 · 正在初始化手势模型';
    loop();
    loadRecognizer();
  } catch (error) {
    gestureStore.error = `摄像头启动失败：${cameraErrorMessage(error)}`;
    gestureStore.systemStatus = '摄像头不可用 · 可继续使用鼠标与键盘';
    gestureStore.requested = false;
    stop(false);
  }
}

function loop() {
  cancelAnimationFrame(raf);
  const tick = () => {
    if (!gestureStore.active) return;
    const now = performance.now();
    if (recognizer && video.value?.readyState >= 2 && video.value.currentTime !== lastVideoTime) {
      lastVideoTime = video.value.currentTime;
      try {
        process(recognizer.recognizeForVideo(video.value, now), now);
      } catch (error) {
        console.warn('gesture frame failed', error);
      }
    }
    if (now - lastSeen > 700) {
      gestureStore.cursor.visible = false;
      resetPinchState();
      cursorInitialized = false;
    }
    raf = requestAnimationFrame(tick);
  };
  raf = requestAnimationFrame(tick);
}

function stop(updateStore = true) {
  cancelAnimationFrame(raf);
  releaseCamera('gesture-engine');
  stream = null;
  if (video.value) video.value.srcObject = null;
  gestureStore.cursor.visible = false;
  resetPinchState();
  cursorInitialized = false;
  gestureStore.number = 0;
  resetCandidate();
  transitionArmed = true;
  releasedSince = 0;
  if (updateStore) {
    gestureStore.active = false;
    gestureStore.modelReady = false;
    gestureStore.clearDigitTransition();
  }
}

async function retryModel() {
  gestureStore.error = '';
  recognizer = null;
  await loadRecognizer();
}

onMounted(() => {
  stopWatch = watch(() => gestureStore.requested, value => value ? start() : stop(), { flush: 'post' });
  addEventListener('gesture:digit-formed', onDigitFormed);
  if (gestureStore.requested) start();
});

onBeforeUnmount(() => {
  stopWatch?.();
  removeEventListener('gesture:digit-formed', onDigitFormed);
  clearTimeout(routeTimer);
  clearTimeout(resetTimer);
  stop();
});
</script>

<template>
  <video
    ref="video"
    :class="[
      gestureStore.preview && gestureStore.active ? 'gesture-camera-float' : 'gesture-hidden-video',
      { mirrored: gestureStore.mirror, 'on-gesture': route.name === 'gesture' }
    ]"
    playsinline
    muted
  ></video>


  <div v-if="route.path.startsWith('/app') && gestureStore.active" class="gesture-interaction-tip">
    <span class="tip-dot"></span>
    {{ gestureStore.status }}
  </div>

  <div v-if="route.path.startsWith('/app')" class="gesture-mini-toolbar">
    <button :class="{ active: gestureStore.active }" @click="gestureStore.active ? gestureStore.stop() : gestureStore.start()">
      <el-icon><VideoCamera /></el-icon>{{ gestureStore.active ? '关闭手势' : '启动手势' }}
    </button>
    <button v-if="gestureStore.active" @click="gestureStore.togglePreview()">
      <el-icon><Hide v-if="gestureStore.preview" /><View v-else /></el-icon>{{ gestureStore.preview ? '隐藏预览' : '显示预览' }}
    </button>
    <button v-if="gestureStore.active" :class="{ active: gestureStore.mirror }" @click="gestureStore.toggleMirror()">
      <el-icon><Switch /></el-icon>{{ gestureStore.mirror ? '镜像方向' : '原始方向' }}
    </button>
    <button v-if="gestureStore.active && !gestureStore.modelReady" @click="retryModel">
      <el-icon><Refresh /></el-icon>重试识别
    </button>
  </div>
</template>
