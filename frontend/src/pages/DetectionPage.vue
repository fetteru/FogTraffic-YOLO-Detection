<script setup>
import { computed, onBeforeUnmount, onMounted, ref } from 'vue';
import { Play, Upload } from 'lucide-vue-next';
import DetectionResult from '../components/DetectionResult.vue';
import { detectFiles, fileItems, normalizeDetection } from '../utils/detection';
import { state, toast } from '../state';

const CAMERA_CAPTURE_SIZE = 416;
const CAMERA_FRAME_DELAY = 300;

const fileInput = ref(null);
const videoRef = ref(null);
const canvasRef = ref(null);
let stream = null;
let socket = null;
let frameTimer = null;
let frameInFlight = false;
let cameraRunId = 0;
let captureCanvas = null;
let lastCaptureMeta = null;

const selectedResult = computed(() => state.detection.results[state.detection.selected] || null);
const isCameraMode = computed(() => state.detection.mode === 'camera');
const uploadedFiles = computed(() => state.detection.files || []);
const firstUploadedFile = computed(() => uploadedFiles.value[0] || null);
const cameraStatus = computed(() => {
  const camera = state.detection.camera;
  if (camera.error) return camera.error;
  if (camera.connecting) return '正在连接摄像头与后端检测服务';
  if (!camera.active) return '未连接';
  if (camera.paused) return '已暂停';
  if (camera.connected) return '实时检测中';
  return '摄像头已打开，等待后端连接';
});
const primaryButtonText = computed(() => {
  if (!isCameraMode.value) return state.detection.running ? '检测中...' : '开始检测';
  if (state.detection.camera.connecting) return '连接中...';
  return state.detection.camera.active ? '重新连接检测' : '开始摄像头检测';
});

function rangeProgress(value, min, max) {
  const percent = ((Number(value) - min) / (max - min)) * 100;
  return `${Math.min(100, Math.max(0, percent))}%`;
}

function chooseFiles() {
  fileInput.value.accept = state.detection.mode === 'zip' ? '.zip,application/zip' : state.detection.mode === 'video' ? 'video/*' : 'image/*';
  fileInput.value.multiple = state.detection.mode === 'batch';
  fileInput.value.click();
}

function setDetectionMode(mode) {
  const changed = state.detection.mode !== mode;
  if (state.detection.mode === 'camera' && mode !== 'camera') stopCamera();
  state.detection.mode = mode;
  state.detection.files = [];
  if (changed) {
    state.detection.results = [];
    state.detection.selected = 0;
  }
}

function onFiles(event) {
  const items = fileItems(event.target.files);
  event.target.value = '';
  state.detection.files = state.detection.mode === 'batch' ? items.slice(0, 30) : items.slice(0, 1);
  state.detection.results = [];
}

function isImageFile(item) {
  return item?.type?.startsWith('image/');
}

function isVideoFile(item) {
  return item?.type?.startsWith('video/');
}

function uploadSummary() {
  if (!uploadedFiles.value.length) return '';
  if (state.detection.mode === 'batch') return `${uploadedFiles.value.length} 张图片待检测`;
  return firstUploadedFile.value?.name || '';
}

async function runDetection() {
  if (isCameraMode.value) {
    await startCamera();
    return;
  }
  if (!state.detection.files.length) return toast('请先选择文件', 'warning');
  state.detection.running = true;
  try {
    const results = await detectFiles(state.detection.mode, state.detection.files, state.settings);
    state.detection.results = results;
    state.detection.selected = 0;
    toast(`检测完成，共 ${results.reduce((sum, item) => sum + Number(item.total || 0), 0)} 个目标`);
  } catch (error) {
    toast(error.message, 'error');
  } finally {
    state.detection.running = false;
  }
}

function resetCameraSession() {
  state.detection.camera.error = '';
  state.detection.camera.status = '未连接';
  state.detection.camera.connected = false;
  state.detection.camera.sending = false;
  state.detection.camera.paused = false;
  state.detection.camera.startedAt = Date.now();
  state.detection.camera.detections = [];
  state.detection.camera.samples = [];
  state.detection.camera.stats = { fps: 0, frames: 0, objects: 0, inference: 0 };
}

function makeCameraSocketUrl() {
  const base = state.settings.apiBase || window.location.origin;
  const wsBase = base.replace(/^https?:/i, match => (match.toLowerCase() === 'https:' ? 'wss:' : 'ws:'));
  return new URL('/api/detection/camera', wsBase).toString();
}

async function ensureCameraStream(runId) {
  if (!navigator.mediaDevices?.getUserMedia) throw new Error('浏览器不支持摄像头');
  if (stream?.active) return stream;
  const mediaStream = await navigator.mediaDevices.getUserMedia({
    video: {
      width: { ideal: 1280 },
      height: { ideal: 720 },
      facingMode: { ideal: 'environment' },
    },
    audio: false,
  });
  if (runId !== cameraRunId) {
    mediaStream.getTracks().forEach(track => track.stop());
    throw new Error('摄像头连接已取消');
  }
  stream = mediaStream;
  if (!videoRef.value) throw new Error('摄像头预览初始化失败');
  videoRef.value.srcObject = stream;
  videoRef.value.style.transform = 'none';
  await videoRef.value.play();
  return stream;
}

function containedRect(containerWidth, containerHeight, sourceWidth, sourceHeight) {
  const scale = Math.min(containerWidth / sourceWidth, containerHeight / sourceHeight);
  const drawWidth = sourceWidth * scale;
  const drawHeight = sourceHeight * scale;
  return {
    scale,
    width: drawWidth,
    height: drawHeight,
    x: (containerWidth - drawWidth) / 2,
    y: (containerHeight - drawHeight) / 2,
  };
}

function drawCameraSourceFrame(video, canvas, width, height) {
  const ctx = canvas.getContext('2d');
  const sourceWidth = video.videoWidth;
  const sourceHeight = video.videoHeight;
  if (!ctx || !sourceWidth || !sourceHeight) return null;
  const rect = containedRect(width, height, sourceWidth, sourceHeight);
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.clearRect(0, 0, width, height);
  ctx.fillStyle = '#020617';
  ctx.fillRect(0, 0, width, height);
  ctx.drawImage(video, rect.x, rect.y, rect.width, rect.height);
  return {
    sourceWidth,
    sourceHeight,
    captureScale: rect.scale,
    captureX: rect.x,
    captureY: rect.y,
  };
}

function drawDetectionOverlay(detections) {
  const canvas = canvasRef.value;
  const video = videoRef.value;
  if (!canvas || !video) return;

  const width = canvas.clientWidth || canvas.parentElement?.clientWidth || 1;
  const height = canvas.clientHeight || canvas.parentElement?.clientHeight || 1;
  const ratio = window.devicePixelRatio || 1;
  canvas.width = Math.max(1, Math.round(width * ratio));
  canvas.height = Math.max(1, Math.round(height * ratio));

  const ctx = canvas.getContext('2d');
  if (!ctx) return;
  ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
  ctx.clearRect(0, 0, width, height);
  if (!lastCaptureMeta || !video.videoWidth || !video.videoHeight) return;

  const displayRect = containedRect(width, height, video.videoWidth, video.videoHeight);
  for (const item of detections || []) {
    const bbox = item.bbox || [];
    if (bbox.length < 4) continue;
    const [x1, y1, x2, y2] = bbox.map(Number);
    const sourceX1 = (x1 - lastCaptureMeta.captureX) / lastCaptureMeta.captureScale;
    const sourceY1 = (y1 - lastCaptureMeta.captureY) / lastCaptureMeta.captureScale;
    const sourceX2 = (x2 - lastCaptureMeta.captureX) / lastCaptureMeta.captureScale;
    const sourceY2 = (y2 - lastCaptureMeta.captureY) / lastCaptureMeta.captureScale;
    const clampedX1 = Math.max(0, Math.min(video.videoWidth, sourceX1));
    const clampedY1 = Math.max(0, Math.min(video.videoHeight, sourceY1));
    const clampedX2 = Math.max(0, Math.min(video.videoWidth, sourceX2));
    const clampedY2 = Math.max(0, Math.min(video.videoHeight, sourceY2));
    if (clampedX2 <= clampedX1 || clampedY2 <= clampedY1) continue;
    const drawX = displayRect.x + clampedX1 * displayRect.scale;
    const drawY = displayRect.y + clampedY1 * displayRect.scale;
    const drawW = Math.max(2, (clampedX2 - clampedX1) * displayRect.scale);
    const drawH = Math.max(2, (clampedY2 - clampedY1) * displayRect.scale);
    const label = `${item.class_name || 'object'} ${Math.round(Number(item.confidence || 0) * 100)}%`;

    ctx.lineWidth = 2;
    ctx.strokeStyle = '#22c55e';
    ctx.fillStyle = 'rgba(34, 197, 94, 0.14)';
    ctx.strokeRect(drawX, drawY, drawW, drawH);
    ctx.fillRect(drawX, drawY, drawW, drawH);

    ctx.font = '700 12px Inter, system-ui, sans-serif';
    const labelWidth = Math.max(28, Math.min(ctx.measureText(label).width + 12, width - drawX - 4));
    const labelY = Math.max(2, drawY - 22);
    ctx.fillStyle = 'rgba(15, 23, 42, 0.84)';
    ctx.fillRect(drawX, labelY, labelWidth, 20);
    ctx.fillStyle = '#bbf7d0';
    ctx.fillText(label, drawX + 6, labelY + 14);
  }
}

async function startCamera() {
  stopCamera({ silent: true, keepMessage: true });
  const runId = ++cameraRunId;
  resetCameraSession();
  state.detection.camera.connecting = true;
  state.detection.camera.active = true;

  try {
    await ensureCameraStream(runId);
    if (runId !== cameraRunId) return;
    state.detection.camera.status = '摄像头已打开，正在连接后端检测服务';

    socket = new WebSocket(makeCameraSocketUrl());
    socket.onopen = () => {
      if (runId !== cameraRunId || !socket) return;
      socket.send(JSON.stringify({
        type: 'config',
        mode: 'cpu',
        conf: state.settings.confidence,
        iou: state.settings.iou,
      }));
    };
    socket.onmessage = event => handleCameraMessage(event, runId);
    socket.onerror = () => {
      if (runId !== cameraRunId) return;
      clearTimeout(frameTimer);
      frameInFlight = false;
      state.detection.camera.connecting = false;
      state.detection.camera.connected = false;
      state.detection.camera.sending = false;
      state.detection.camera.error = '摄像头检测 WebSocket 连接失败';
      toast(state.detection.camera.error, 'error');
    };
    socket.onclose = () => {
      if (runId !== cameraRunId) return;
      state.detection.camera.connecting = false;
      state.detection.camera.connected = false;
      state.detection.camera.sending = false;
      frameInFlight = false;
    };
  } catch (error) {
    if (error.message !== '摄像头连接已取消') {
      state.detection.camera.error = error.message;
      toast(error.message, 'error');
    }
    stopCamera({ silent: true, keepMessage: true });
  }
}

function handleCameraMessage(event, runId) {
  if (runId !== cameraRunId) return;
  let payload;
  try {
    payload = JSON.parse(event.data);
  } catch {
    return;
  }

  if (payload.type === 'config_ok') {
    state.detection.camera.error = '';
    state.detection.camera.connecting = false;
    state.detection.camera.connected = true;
    state.detection.camera.status = '实时检测中';
    scheduleCameraFrame(0);
    return;
  }

  frameInFlight = false;
  state.detection.camera.sending = false;

  if (payload.type === 'error') {
    state.detection.camera.error = payload.message || '摄像头检测失败';
    toast(state.detection.camera.error, 'error');
    scheduleCameraFrame(CAMERA_FRAME_DELAY);
    return;
  }

  if (payload.type !== 'result') return;
  state.detection.camera.error = '';
  const detections = payload.detections || [];
  const frames = state.detection.camera.stats.frames + 1;
  state.detection.camera.stats = {
    fps: Number(payload.fps || state.detection.camera.stats.fps || 0),
    frames,
    objects: Number(payload.total_objects ?? detections.length),
    inference: Number(payload.inference_time || 0).toFixed(1),
  };
  state.detection.camera.detections = detections.slice(0, 20);
  drawDetectionOverlay(detections);

  const row = {
    frame_number: frames,
    frame_time: ((Date.now() - (state.detection.camera.startedAt || Date.now())) / 1000).toFixed(2),
    total_objects: detections.length,
    class_counts: payload.class_counts || detections.reduce((acc, item) => {
      const name = item.class_name || 'object';
      acc[name] = (acc[name] || 0) + 1;
      return acc;
    }, {}),
  };
  state.detection.camera.samples.unshift(row);
  state.detection.camera.samples.length = Math.min(state.detection.camera.samples.length, 80);

  if (!state.detection.camera.paused) scheduleCameraFrame(CAMERA_FRAME_DELAY);
}

function scheduleCameraFrame(delay = CAMERA_FRAME_DELAY) {
  clearTimeout(frameTimer);
  if (!state.detection.camera.active || !state.detection.camera.connected || state.detection.camera.paused) return;
  frameTimer = setTimeout(sendFrame, delay);
}

function sendFrame() {
  if (
    frameInFlight ||
    !socket ||
    socket.readyState !== WebSocket.OPEN ||
    !state.detection.camera.active ||
    !state.detection.camera.connected ||
    state.detection.camera.paused
  ) return;
  const video = videoRef.value;
  if (!video?.videoWidth) {
    scheduleCameraFrame(200);
    return;
  }
  captureCanvas ||= document.createElement('canvas');
  captureCanvas.width = CAMERA_CAPTURE_SIZE;
  captureCanvas.height = CAMERA_CAPTURE_SIZE;
  const captureMeta = drawCameraSourceFrame(video, captureCanvas, CAMERA_CAPTURE_SIZE, CAMERA_CAPTURE_SIZE);
  if (!captureMeta) {
    scheduleCameraFrame(200);
    return;
  }
  lastCaptureMeta = captureMeta;
  const data = captureCanvas.toDataURL('image/jpeg', 0.55).split(',', 2)[1];
  frameInFlight = true;
  state.detection.camera.sending = true;
  try {
    socket.send(JSON.stringify({ type: 'frame', data }));
  } catch {
    frameInFlight = false;
    state.detection.camera.sending = false;
    state.detection.camera.connected = false;
    state.detection.camera.error = '摄像头检测连接已断开，请重新连接';
  }
}

function toggleCameraPause() {
  if (!state.detection.camera.active) return;
  state.detection.camera.paused = !state.detection.camera.paused;
  if (state.detection.camera.paused) {
    clearTimeout(frameTimer);
    state.detection.camera.sending = false;
    frameInFlight = false;
  } else {
    scheduleCameraFrame(0);
  }
}

function clearCameraCanvas() {
  const canvas = canvasRef.value;
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  if (ctx) ctx.clearRect(0, 0, canvas.width || 1, canvas.height || 1);
  canvas.width = 0;
  canvas.height = 0;
}

function stopCamera(options = {}) {
  cameraRunId += 1;
  clearTimeout(frameTimer);
  frameTimer = null;
  frameInFlight = false;

  const currentSocket = socket;
  socket = null;
  if (currentSocket) {
    currentSocket.onopen = null;
    currentSocket.onmessage = null;
    currentSocket.onerror = null;
    currentSocket.onclose = null;
    try {
      if (currentSocket.readyState === WebSocket.OPEN) currentSocket.send(JSON.stringify({ type: 'close' }));
      if (currentSocket.readyState === WebSocket.OPEN || currentSocket.readyState === WebSocket.CONNECTING) currentSocket.close();
    } catch {
      // Closing should be best-effort; browser may already be tearing the socket down.
    }
  }

  if (stream) {
    stream.getTracks().forEach(track => track.stop());
    stream = null;
  }
  if (videoRef.value) {
    videoRef.value.pause();
    videoRef.value.srcObject = null;
    videoRef.value.removeAttribute('src');
  }
  captureCanvas = null;
  lastCaptureMeta = null;
  clearCameraCanvas();

  state.detection.camera.active = false;
  state.detection.camera.connecting = false;
  state.detection.camera.connected = false;
  state.detection.camera.sending = false;
  state.detection.camera.paused = false;
  state.detection.camera.status = options.keepMessage ? state.detection.camera.status : '已关闭';
  if (!options.keepMessage) state.detection.camera.startedAt = 0;
  if (!options.keepMessage) state.detection.camera.error = '';
  if (!options.silent) toast('摄像头已关闭');
}

function saveCameraResult() {
  const counts = {};
  for (const row of state.detection.camera.samples) {
    for (const [name, count] of Object.entries(row.class_counts || {})) counts[name] = (counts[name] || 0) + count;
  }
  state.detection.results.unshift(normalizeDetection({
    task_id: `camera_${Date.now()}`,
    filename: 'camera-session',
    class_counts: counts,
    total_objects: Object.values(counts).reduce((a, b) => a + b, 0),
    frame_stats: state.detection.camera.samples,
  }, {}, 'camera', 0));
  state.detection.selected = 0;
  toast('摄像头过程统计已保存');
}

onMounted(() => {
  if (state.detection.mode === 'camera') {
    state.detection.results = state.detection.results.filter(result => result.mode === 'camera');
    state.detection.selected = 0;
  }
});

onBeforeUnmount(() => stopCamera({ silent: true }));
</script>

<template>
  <section class="workspace-page">
    <div class="page-title">
      <div><h1>交通检测工作台</h1><p>图片、批量、ZIP、视频和摄像头检测</p></div>
      <button
        class="btn btn-primary"
        :disabled="state.detection.running || state.detection.camera.connecting || (!isCameraMode && !state.detection.files.length)"
        @click="runDetection"
      >
        <Play :size="16" />{{ primaryButtonText }}
      </button>
    </div>
    <div class="workbench-grid">
      <section class="panel control-panel">
        <div class="segmented-tabs">
          <button
            v-for="mode in ['single','batch','zip','video','camera']"
            :key="mode"
            :class="{ active: state.detection.mode === mode }"
            @click="setDetectionMode(mode)"
          >{{ { single: '单图', batch: '批量', zip: 'ZIP', video: '视频', camera: '摄像头' }[mode] }}</button>
        </div>
        <div v-if="state.detection.mode !== 'camera'" class="drop-zone" :class="{ 'has-files': state.detection.files.length }" @click="chooseFiles">
          <template v-if="!uploadedFiles.length">
            <span class="upload-mark" aria-hidden="true"><Upload :size="76" /></span>
            <strong>点击选择文件</strong>
            <p>使用后端真实 YOLO 接口检测</p>
          </template>
          <template v-else>
            <div class="upload-preview-head">
              <div>
                <strong>待检测文件</strong>
                <p>{{ uploadSummary() }}</p>
              </div>
              <span>点击可重新选择</span>
            </div>
            <div v-if="state.detection.mode === 'batch'" class="upload-preview-grid">
              <figure v-for="item in uploadedFiles" :key="item.name">
                <img v-if="isImageFile(item) && item.preview" :src="item.preview" :alt="item.name" />
                <span v-else class="upload-file-icon">IMG</span>
                <figcaption>{{ item.name }}</figcaption>
              </figure>
            </div>
            <figure v-else-if="isImageFile(firstUploadedFile) && firstUploadedFile.preview" class="upload-preview-single">
              <img :src="firstUploadedFile.preview" :alt="firstUploadedFile.name" />
              <figcaption>{{ firstUploadedFile.name }}</figcaption>
            </figure>
            <figure v-else-if="isVideoFile(firstUploadedFile) && firstUploadedFile.preview" class="upload-preview-single video-upload-preview" @click.stop>
              <video :src="firstUploadedFile.preview" muted controls preload="metadata"></video>
              <figcaption>{{ firstUploadedFile.name }}</figcaption>
            </figure>
            <div v-else class="upload-file-card">
              <span class="upload-file-icon">{{ state.detection.mode === 'zip' ? 'ZIP' : 'FILE' }}</span>
              <div><strong>{{ firstUploadedFile.name }}</strong><p>已选择，点击此区域可重新选择文件</p></div>
            </div>
          </template>
        </div>
        <div v-else class="camera-box">
          <div class="camera-stage">
            <video ref="videoRef" autoplay muted playsinline></video>
            <canvas ref="canvasRef"></canvas>
            <div class="camera-status">{{ cameraStatus }}</div>
          </div>
          <div class="camera-actions">
            <button class="btn btn-primary btn-sm" :disabled="state.detection.camera.connecting" @click="startCamera">
              {{ state.detection.camera.connecting ? '连接中...' : state.detection.camera.active ? '重新连接检测' : '开启摄像头检测' }}
            </button>
            <button class="btn btn-ghost btn-sm" :disabled="!state.detection.camera.active || state.detection.camera.connecting" @click="toggleCameraPause">
              {{ state.detection.camera.paused ? '继续检测' : '暂停检测' }}
            </button>
            <button class="btn btn-ghost btn-sm" :disabled="!state.detection.camera.active && !state.detection.camera.connecting" @click="stopCamera()">关闭摄像头</button>
            <button class="btn btn-ghost btn-sm" :disabled="!state.detection.camera.samples.length" @click="saveCameraResult">保存过程统计</button>
          </div>
          <div class="camera-stats">
            <div><strong>{{ state.detection.camera.stats.fps }}</strong><span>FPS</span></div>
            <div><strong>{{ state.detection.camera.stats.frames }}</strong><span>帧数</span></div>
            <div><strong>{{ state.detection.camera.stats.objects }}</strong><span>目标</span></div>
            <div><strong>{{ state.detection.camera.stats.inference }}ms</strong><span>耗时</span></div>
          </div>
          <div class="camera-detections">
            <span v-for="item in state.detection.camera.detections" :key="`${item.class_name}-${item.confidence}-${item.bbox?.join('-')}`">
              {{ item.class_name || 'object' }} {{ Math.round(Number(item.confidence || 0) * 100) }}%
            </span>
            <small v-if="!state.detection.camera.detections.length">暂无检测目标</small>
          </div>
        </div>
        <div class="form-grid one-col">
          <label><span>置信度阈值 {{ state.settings.confidence.toFixed(2) }}</span><input v-model.number="state.settings.confidence" type="range" min="0.05" max="0.95" step="0.05" :style="{ '--range-progress': rangeProgress(state.settings.confidence, 0.05, 0.95) }" /></label>
          <label><span>IoU 阈值 {{ state.settings.iou.toFixed(2) }}</span><input v-model.number="state.settings.iou" type="range" min="0.1" max="0.9" step="0.05" :style="{ '--range-progress': rangeProgress(state.settings.iou, 0.1, 0.9) }" /></label>
        </div>
      </section>
      <section class="panel result-panel">
        <DetectionResult v-if="selectedResult" :result="selectedResult" />
        <div v-else class="empty-state"><strong>暂无检测结果</strong><p>选择文件或开启摄像头后开始检测。</p></div>
      </section>
      <aside class="panel result-gallery">
        <div class="panel-title"><div><strong>结果列表</strong><span>{{ state.detection.results.length }} 个结果</span></div></div>
        <div class="gallery-list">
          <div v-for="(result, index) in state.detection.results" :key="result.id" :class="['gallery-item', { active: state.detection.selected === index }]" @click="state.detection.selected = index">
            <div class="gallery-thumb">
              <span v-if="result.videoUrl" class="video-thumb">▶</span>
              <img v-else-if="result.preview" :src="result.preview" alt="" />
              <span v-else class="result-placeholder">{{ result.mode === 'camera' ? 'CAM' : 'DATA' }}</span>
            </div>
            <span><strong>{{ result.filename }}</strong><small>{{ result.total }} 目标 · {{ Number(result.inference || 0).toFixed(1) }}ms</small></span>
          </div>
        </div>
      </aside>
    </div>
    <input ref="fileInput" type="file" hidden @change="onFiles" />
  </section>
</template>
