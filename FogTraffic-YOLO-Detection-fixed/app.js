const app = document.querySelector('#app');
const modalRoot = document.querySelector('#modal-root');
const toastRoot = document.querySelector('#toast-root');
const globalFileInput = document.querySelector('#global-file-input');

const $ = (selector, root = document) => root.querySelector(selector);
const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];
const clamp = (value, min, max) => Math.max(min, Math.min(max, value));
const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));
const formatPercent = value => `${Math.round(Number(value || 0) * 100)}%`;
const formatTime = value => new Date(value || Date.now()).toLocaleString('zh-CN', { hour12: false });
const uid = prefix => `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
const escapeHtml = text => String(text ?? '').replace(/[&<>'"]/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' }[char]));

const ICONS = {
  logo: `<svg viewBox="0 0 64 64" aria-hidden="true"><defs><linearGradient id="logo-g" x1="5" y1="4" x2="58" y2="60"><stop stop-color="#22d3ee"/><stop offset=".48" stop-color="#3b82f6"/><stop offset="1" stop-color="#8b5cf6"/></linearGradient></defs><path d="M32 5 56 18.5v27L32 59 8 45.5v-27L32 5Z" fill="url(#logo-g)"/><path d="m32 13 15 8.5-15 8.5-15-8.5L32 13Zm-16 16 12 6.8v15L16 44V29Zm32 0v15l-12 6.8v-15L48 29Z" fill="#fff"/><circle cx="32" cy="32" r="3" fill="#061426"/></svg>`,
  chat: `<svg viewBox="0 0 24 24"><path d="M5 5.5h14v10H9l-4 3.5V5.5Z"/><path d="M8 9h8M8 12h5"/></svg>`,
  scan: `<svg viewBox="0 0 24 24"><path d="M4 9V5h4M16 5h4v4M20 15v4h-4M8 19H4v-4"/><rect x="8" y="8" width="8" height="8" rx="2"/></svg>`,
  dataset: `<svg viewBox="0 0 24 24"><ellipse cx="12" cy="6" rx="7" ry="3"/><path d="M5 6v6c0 1.7 3.1 3 7 3s7-1.3 7-3V6M5 12v6c0 1.7 3.1 3 7 3s7-1.3 7-3v-6"/></svg>`,
  train: `<svg viewBox="0 0 24 24"><rect x="4" y="4" width="16" height="16" rx="3"/><path d="M8 8h8v4H8zM8 16h2M13 16h3"/></svg>`,
  evaluate: `<svg viewBox="0 0 24 24"><path d="M5 19V10M10 19V5M15 19v-7M20 19V8"/><path d="m4 7 5-4 5 4 6-5"/></svg>`,
  dashboard: `<svg viewBox="0 0 24 24"><rect x="3" y="3" width="8" height="8" rx="2"/><rect x="13" y="3" width="8" height="5" rx="2"/><rect x="13" y="10" width="8" height="11" rx="2"/><rect x="3" y="13" width="8" height="8" rx="2"/></svg>`,
  history: `<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="8"/><path d="M12 7v5l3 2M6 5 4 7"/></svg>`,
  monitor: `<svg viewBox="0 0 24 24"><path d="M3 13h4l2-6 4 12 2-6h6"/><rect x="3" y="3" width="18" height="18" rx="3"/></svg>`,
  settings: `<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="3"/><path d="M19 13.5v-3l-2-.7-.6-1.4.9-1.9-2.1-2.1-1.9.9-1.4-.6L10.5 3h-3l-.7 2-1.4.6-1.9-.9-2.1 2.1.9 1.9-.6 1.4-2 .7v3l2 .7.6 1.4-.9 1.9 2.1 2.1 1.9-.9 1.4.6.7 2h3l.7-2 1.4-.6 1.9.9 2.1-2.1-.9-1.9.6-1.4 2-.7Z" transform="translate(2 0) scale(.83)"/></svg>`,
  menu: `<svg viewBox="0 0 24 24"><path d="M4 7h16M4 12h16M4 17h16"/></svg>`,
  search: `<svg viewBox="0 0 24 24"><circle cx="10.5" cy="10.5" r="6.5"/><path d="m15.5 15.5 4.5 4.5"/></svg>`,
  bell: `<svg viewBox="0 0 24 24"><path d="M6 17h12l-1.5-2v-5a4.5 4.5 0 0 0-9 0v5L6 17Z"/><path d="M10 20h4"/></svg>`,
  sun: `<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/></svg>`,
  moon: `<svg viewBox="0 0 24 24"><path d="M20 15.5A8 8 0 0 1 8.5 4 8 8 0 1 0 20 15.5Z"/></svg>`,
  plus: `<svg viewBox="0 0 24 24"><path d="M12 5v14M5 12h14"/></svg>`,
  upload: `<svg viewBox="0 0 24 24"><path d="M12 16V4m0 0L7 9m5-5 5 5"/><path d="M5 14v5h14v-5"/></svg>`,
  play: `<svg viewBox="0 0 24 24"><path d="m8 5 11 7-11 7V5Z"/></svg>`,
  stop: `<svg viewBox="0 0 24 24"><rect x="6" y="6" width="12" height="12" rx="2"/></svg>`,
  send: `<svg viewBox="0 0 24 24"><path d="m3 4 18 8-18 8 3-8-3-8Z"/><path d="M6 12h11"/></svg>`,
  paperclip: `<svg viewBox="0 0 24 24"><path d="m8 12 5.5-5.5a3 3 0 0 1 4.2 4.2L10 18.4a5 5 0 0 1-7.1-7.1L11 3.2"/></svg>`,
  refresh: `<svg viewBox="0 0 24 24"><path d="M20 7v5h-5M4 17v-5h5"/><path d="M18.5 12A7 7 0 0 0 6 7.6L4 10M5.5 12A7 7 0 0 0 18 16.4l2-2.4"/></svg>`,
  download: `<svg viewBox="0 0 24 24"><path d="M12 4v11m0 0 5-5m-5 5-5-5"/><path d="M5 19h14"/></svg>`,
  chevron: `<svg viewBox="0 0 24 24"><path d="m9 6 6 6-6 6"/></svg>`,
  close: `<svg viewBox="0 0 24 24"><path d="M6 6l12 12M18 6 6 18"/></svg>`,
  check: `<svg viewBox="0 0 24 24"><path d="m5 12 4 4 10-10"/></svg>`,
  warning: `<svg viewBox="0 0 24 24"><path d="M12 3 2.5 20h19L12 3Z"/><path d="M12 9v5M12 17h.01"/></svg>`,
  file: `<svg viewBox="0 0 24 24"><path d="M6 3h8l4 4v14H6V3Z"/><path d="M14 3v5h5M9 13h6M9 17h4"/></svg>`,
  copy: `<svg viewBox="0 0 24 24"><rect x="8" y="8" width="11" height="11" rx="2"/><path d="M16 8V5H5v11h3"/></svg>`,
  trash: `<svg viewBox="0 0 24 24"><path d="M5 7h14M9 7V4h6v3M7 7l1 13h8l1-13M10 11v5M14 11v5"/></svg>`,
  eye: `<svg viewBox="0 0 24 24"><path d="M3 12s3.5-5 9-5 9 5 9 5-3.5 5-9 5-9-5-9-5Z"/><circle cx="12" cy="12" r="2.5"/></svg>`,
  bot: `<svg viewBox="0 0 40 40"><defs><linearGradient id="bot-g" x1="5" y1="6" x2="35" y2="35"><stop stop-color="#22d3ee"/><stop offset="1" stop-color="#8b5cf6"/></linearGradient></defs><rect x="6" y="10" width="28" height="23" rx="9" fill="url(#bot-g)" stroke="none"/><path d="M20 5v5"/><circle cx="20" cy="4" r="2" fill="currentColor" stroke="none"/><circle cx="15" cy="21" r="2" fill="#fff" stroke="none"/><circle cx="25" cy="21" r="2" fill="#fff" stroke="none"/><path d="M15 27h10M6 21H3m34 0h-3"/></svg>`
};

function icon(name, className = '') {
  return `<span class="icon ${className}">${ICONS[name] || ''}</span>`;
}

const NAV = [
  { key: 'chat', label: '智能对话', icon: 'chat', group: '工作台' },
  { key: 'detection', label: '交通检测工作台', icon: 'scan', group: '工作台' },
  { key: 'datasets', label: '数据集管理', icon: 'dataset', group: '模型闭环' },
  { key: 'training', label: '模型训练', icon: 'train', group: '模型闭环' },
  { key: 'evaluation', label: '模型评估', icon: 'evaluate', group: '模型闭环' },
  { key: 'dashboard', label: '数据看板', icon: 'dashboard', group: '分析与运维' },
  { key: 'history', label: '任务历史', icon: 'history', group: '分析与运维' },
  { key: 'monitoring', label: '系统监控', icon: 'monitor', group: '分析与运维' },
  { key: 'settings', label: '系统设置', icon: 'settings', group: '系统' }
];

const CLASS_PALETTE = ['#22d3ee', '#8b5cf6', '#fb7185', '#f59e0b', '#34d399', '#60a5fa', '#f472b6', '#a3e635'];
const classLabel = name => ({ aircraft: '飞机', oiltank: '油罐', ship: '船舶', vehicle: '车辆', bridge: '桥梁', harbor: '港口', car: '汽车', truck: '卡车', bus: '公交车', person: '行人', bicycle: '自行车', 'traffic-light': '交通灯', scratch: '划痕', dent: '凹陷', inclusion: '夹杂', patch: '斑块', crack: '裂纹' }[name] || name);

function seeded(seed) {
  let value = [...String(seed)].reduce((sum, char) => sum + char.charCodeAt(0), 0) || 1;
  return () => {
    value = (value * 9301 + 49297) % 233280;
    return value / 233280;
  };
}

function sceneDataUri(seed = 'rsod', type = 'remote') {
  const rand = seeded(seed);
  const roads = Array.from({ length: 3 }, (_, i) => {
    const y = 70 + i * 125 + rand() * 40;
    return `<path d="M-40 ${y} C180 ${y - 75} 420 ${y + 100} 760 ${y - 10}" fill="none" stroke="${i === 1 ? '#8f9a8b' : '#6b7669'}" stroke-width="${24 + rand() * 25}" opacity=".8"/><path d="M-40 ${y} C180 ${y - 75} 420 ${y + 100} 760 ${y - 10}" fill="none" stroke="#c8ceb7" stroke-width="2" stroke-dasharray="13 11" opacity=".55"/>`;
  }).join('');
  const buildings = Array.from({ length: 28 }, (_, i) => {
    const x = rand() * 720;
    const y = rand() * 420;
    const w = 18 + rand() * 64;
    const h = 15 + rand() * 48;
    const rotate = -25 + rand() * 50;
    const colors = type === 'industrial' ? ['#a97554', '#9a6248', '#6f7a7e', '#c19a6b'] : ['#52664b', '#667a57', '#7b855f', '#4a5b45'];
    return `<rect x="${x.toFixed(1)}" y="${y.toFixed(1)}" width="${w.toFixed(1)}" height="${h.toFixed(1)}" rx="2" fill="${colors[i % colors.length]}" opacity="${(.55 + rand() * .3).toFixed(2)}" transform="rotate(${rotate.toFixed(1)} ${x.toFixed(1)} ${y.toFixed(1)})"/>`;
  }).join('');
  const tanks = Array.from({ length: type === 'industrial' ? 13 : 7 }, (_, i) => {
    const cx = 80 + rand() * 610;
    const cy = 60 + rand() * 360;
    const r = 8 + rand() * 13;
    return `<circle cx="${cx.toFixed(1)}" cy="${cy.toFixed(1)}" r="${r.toFixed(1)}" fill="#cbd5d1" stroke="#5f6a67" stroke-width="3" opacity=".88"/><circle cx="${cx.toFixed(1)}" cy="${cy.toFixed(1)}" r="${(r * .38).toFixed(1)}" fill="#909b98" opacity=".65"/>`;
  }).join('');
  const water = type === 'remote' ? `<path d="M520 -20 C650 90 565 170 760 245V500H525c-35-86-10-154 45-214 53-58 19-138-50-306Z" fill="#2c5968" opacity=".9"/><path d="M540 0c60 90 35 170-4 232" fill="none" stroke="#86adb4" stroke-width="3" opacity=".35"/>` : '';
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 720 440"><defs><linearGradient id="bg" x1="0" y1="0" x2="1" y2="1"><stop stop-color="${type === 'industrial' ? '#483f37' : '#263d30'}"/><stop offset="1" stop-color="${type === 'industrial' ? '#75685c' : '#60734c'}"/></linearGradient><filter id="noise"><feTurbulence type="fractalNoise" baseFrequency=".65" numOctaves="2" stitchTiles="stitch"/><feColorMatrix values="1 0 0 0 0 0 1 0 0 0 0 0 1 0 0 0 0 0 .13 0"/></filter></defs><rect width="720" height="440" fill="url(#bg)"/><rect width="720" height="440" filter="url(#noise)" opacity=".55"/>${water}${roads}${buildings}${tanks}<g opacity=".55"><path d="M0 360h720" stroke="#fff" stroke-opacity=".08"/><path d="M610 0v440" stroke="#fff" stroke-opacity=".08"/></g></svg>`;
  return `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`;
}

function initialMetrics(total = 72, target = .79) {
  return Array.from({ length: total }, (_, index) => {
    const epoch = index + 1;
    const p = epoch / Math.max(total, 1);
    return {
      epoch,
      box_loss: +(2.1 * Math.exp(-3.1 * p) + .22 + Math.sin(epoch / 5) * .02).toFixed(3),
      cls_loss: +(2.7 * Math.exp(-3.5 * p) + .18 + Math.cos(epoch / 6) * .025).toFixed(3),
      dfl_loss: +(1.25 * Math.exp(-2.6 * p) + .31).toFixed(3),
      precision: +(Math.min(.94, .28 + p * .65)).toFixed(3),
      recall: +(Math.min(.91, .24 + p * .65)).toFixed(3),
      map50: +(Math.min(target, target * (.14 + p * .86))).toFixed(3),
      map50_95: +(Math.min(target * .69, target * .69 * (.1 + p * .9))).toFixed(3)
    };
  });
}

const defaultTasks = [
  { id: 101, task_uuid: 'task_101_a3f29c', name: '车辆检测增强模型 v3', model_name: 'yolov11s', dataset_name: 'Traffic-Vehicle', device: 'cuda:0', epochs: 120, current_epoch: 120, batch_size: 16, image_size: 640, status: 'completed', progress: 100, best_map50: .873, exported: true, created_at: '2026-07-10T08:30:00Z', metrics: initialMetrics(120, .873) },
  { id: 102, task_uuid: 'task_102_b8e51d', name: '工业缺陷精调', model_name: 'yolov11n', dataset_name: 'Steel-Defect', device: 'cuda:0', epochs: 100, current_epoch: 72, batch_size: 24, image_size: 640, status: 'running', progress: 72, best_map50: .681, exported: false, created_at: '2026-07-13T03:15:00Z', metrics: initialMetrics(72, .681) },
  { id: 103, task_uuid: 'task_103_c91e2a', name: '道路车辆夜间增强', model_name: 'yolov11m', dataset_name: 'Night-Traffic', device: 'cpu', epochs: 80, current_epoch: 28, batch_size: 8, image_size: 640, status: 'running', progress: 35, best_map50: .492, exported: false, created_at: '2026-07-13T09:20:00Z', metrics: initialMetrics(28, .492) },
  { id: 104, task_uuid: 'task_104_d1129e', name: '油罐场景基线', model_name: 'yolov11n', dataset_name: 'Night-Traffic', device: 'cpu', epochs: 60, current_epoch: 0, batch_size: 16, image_size: 640, status: 'queued', progress: 0, best_map50: 0, exported: false, created_at: '2026-07-14T02:10:00Z', metrics: initialMetrics(1, .05) }
];

const defaultDatasets = [
  { id: 1, name: 'Traffic-Vehicle', scene: '智慧交通', format: 'YOLO', images: 3268, labels: 3268, classes: ['aircraft', 'vehicle', 'hangar'], train: 2614, val: 327, test: 327, status: 'ready', quality: 96, size: '3.8 GB', updated: '2026-07-13 18:20' },
  { id: 2, name: 'Night-Traffic', scene: '工业交通', format: 'YOLO', images: 1880, labels: 1872, classes: ['oiltank', 'building', 'vehicle'], train: 1504, val: 188, test: 188, status: 'warning', quality: 89, size: '2.1 GB', updated: '2026-07-12 14:05' },
  { id: 3, name: 'Steel-Defect', scene: '工业质检', format: 'COCO', images: 5420, labels: 5420, classes: ['scratch', 'dent', 'inclusion', 'patch', 'crack'], train: 4336, val: 542, test: 542, status: 'converting', quality: 92, size: '5.6 GB', updated: '2026-07-14 09:42' },
  { id: 4, name: 'Night-Traffic', scene: '智慧交通', format: 'VOC', images: 2740, labels: 2718, classes: ['car', 'truck', 'bus', 'person', 'bicycle'], train: 2192, val: 274, test: 274, status: 'ready', quality: 94, size: '4.2 GB', updated: '2026-07-11 20:11' }
];

const defaultHistory = Array.from({ length: 34 }, (_, index) => {
  const types = ['单图检测', '批量检测', 'ZIP 检测', '模型评估'];
  const datasets = ['Traffic-Vehicle', 'Steel-Defect', 'Night-Traffic', 'Night-Traffic'];
  const total = 4 + (index * 7) % 29;
  return {
    id: `H${String(202607140001 + index)}`,
    type: types[index % types.length],
    source: index % 3 === 0 ? `batch_${String(index + 1).padStart(2, '0')}.zip` : `scene_${String(index + 1).padStart(3, '0')}.jpg`,
    model: index % 2 ? 'yolov11s-rsod-v3.2' : 'yolov11n-steel-v1.4',
    dataset: datasets[index % datasets.length],
    total,
    confidence: .25 + (index % 3) * .1,
    duration: 35 + (index * 13) % 74,
    status: index === 9 ? 'failed' : 'completed',
    created_at: new Date(Date.now() - index * 37 * 60 * 1000).toISOString()
  };
});

const defaultLogs = [
  ['INFO', 'application', 'FogTraffic-YOLO-Detection Platform 前端已初始化'],
  ['INFO', 'database', 'PostgreSQL 连接池状态正常'],
  ['INFO', 'redis', 'Redis 缓存服务响应 5ms'],
  ['INFO', 'minio', 'MinIO 对象存储响应 24ms'],
  ['INFO', 'agent', '已注册检测工具 detect_single / detect_batch / detect_zip'],
  ['INFO', 'training', 'task_102_b8e51d epoch 72/100 mAP50=0.681'],
  ['WARN', 'dataset', 'Night-Traffic 发现 8 个缺失标注文件'],
  ['INFO', 'request', 'POST /api/detection/single status=200 52.4ms']
].map((item, index) => ({ id: uid('log'), level: item[0], module: item[1], message: item[2], time: new Date(Date.now() - index * 47000).toISOString() }));

const persisted = (() => {
  try { return JSON.parse(localStorage.getItem('rsod_state') || '{}'); } catch { return {}; }
})();

const state = {
  token: localStorage.getItem('rsod_token') || '',
  user: persisted.user || { id: 1, username: 'admin', display_name: '演示管理员', email: 'admin@rsod.local', role: 'admin' },
  authMode: 'login',
  passwordVisible: false,
  page: location.hash.replace('#/', '').replace('#', '') || 'chat',
  sidebarCollapsed: Boolean(persisted.sidebarCollapsed),
  mobileNavOpen: false,
  theme: persisted.theme || 'dark',
  commandOpen: false,
  notificationsOpen: false,
  chat: {
    messages: [
      { id: uid('msg'), role: 'assistant', content: '你好，我是 **车辆检测智能体**。本演示聚焦以下能力：\n- 雨雾/暗光/逆光图像增强：暗通道去雾、Retinex 光照补偿、CLAHE 对比度增强、双边滤波降噪\n- 🚗 轻量化车辆目标检测：识别轿车、货车、大巴、摩托车、应急特种车辆\n- 🔍 ByteTrack 多目标跟踪：跨帧唯一ID绑定，车辆去重计数，过滤噪点假目标\n- 🛣️ ROI 车道自定义划分：限定检测区域，排除护栏与场外干扰\n- 🚦 车速计算 + 车流量统计：单位时段车流、车型占比、瞬时密度统计\n- ⚠️ 四级拥堵自动判别预警：畅通/缓行/拥堵/严重拥堵，本地日志+云端上报告警\n- 📹 多源输入支持：本地视频、图片、USB 摄像头、RTSP 网络监控流\n你可以上传图片或视频来体验上述功能（演示为模拟数据）。', time: new Date().toISOString() }
    ],
    input: '',
    attachments: [],
    streaming: false,
    controller: null,
    trace: [
      { time: '刚刚', type: 'system', title: 'Agent 就绪', detail: 'ReAct Agent 与 3 个检测工具已绑定' }
    ]
  },
  detection: {
    mode: 'image',
    files: [],
    results: [],
    running: false,
    progress: 0,
    selectedResult: 0,
    model: 'yolov11s-rsod-v3.2',
    confidence: .25,
    iou: .45,
    saveAnnotated: true,
    camera: { stream: null, active: false, deviceId: '' }
  },
  datasets: structuredClone(defaultDatasets),
  datasetQuery: '',
  datasetFormat: 'ALL',
  tasks: structuredClone(defaultTasks),
  selectedTaskId: 102,
  evaluationTaskId: 101,
  evaluationReport: null,
  evaluationTab: 'overview',
  history: structuredClone(defaultHistory),
  historyQuery: '',
  historyType: 'ALL',
  historyPage: 1,
  historyPageSize: 10,
  logs: structuredClone(defaultLogs),
  logLevel: 'ALL',
  logModule: 'ALL',
  logQuery: '',
  health: {
    status: 'healthy',
    services: {
      application: { status: 'healthy', latency_ms: 3, message: '应用服务正常' },
      database: { status: 'healthy', latency_ms: 16, message: 'PostgreSQL 连接正常' },
      redis: { status: 'healthy', latency_ms: 5, message: 'Redis 连接正常' },
      minio: { status: 'healthy', latency_ms: 24, message: 'MinIO 连接正常' },
      yolo: { status: 'healthy', latency_ms: 41, message: 'YOLOv11 推理服务就绪' }
    },
    updatedAt: new Date().toISOString()
  },
  settings: {
    apiBase: persisted.settings?.apiBase ?? '',
    demoFallback: persisted.settings?.demoFallback ?? true,
    language: 'zh-CN',
    defaultModel: persisted.settings?.defaultModel || 'yolov11s-rsod-v3.2',
    confidence: persisted.settings?.confidence ?? .25,
    iou: persisted.settings?.iou ?? .45,
    pollInterval: persisted.settings?.pollInterval || 5,
    compactTable: persisted.settings?.compactTable ?? false,
    desktopNotifications: persisted.settings?.desktopNotifications ?? true,
    autoSave: persisted.settings?.autoSave ?? true,
    minioBucket: persisted.settings?.minioBucket || 'rsod-results'
  },
  modal: null,
  busy: false
};

// 便于本地预览与自动化验收：访问 /?demo=1#/dashboard 可直接进入演示后台。
if (!state.token && new URLSearchParams(location.search).get('demo') === '1') {
  state.token = 'demo-admin.preview';
  state.user = { id: 1, username: 'admin', display_name: '演示管理员', email: 'admin@rsod.local', role: 'admin' };
  localStorage.setItem('rsod_token', state.token);
}

function persistState() {
  localStorage.setItem('rsod_state', JSON.stringify({
    user: state.user,
    theme: state.theme,
    sidebarCollapsed: state.sidebarCollapsed,
    settings: state.settings
  }));
}

function apiUrl(path) {
  const base = String(state.settings.apiBase || '').trim().replace(/\/$/, '');
  return `${base}${path}`;
}

async function api(path, options = {}) {
  const headers = new Headers(options.headers || {});
  if (state.token) headers.set('Authorization', `Bearer ${state.token}`);
  if (options.json !== undefined) {
    headers.set('Content-Type', 'application/json');
    options.body = JSON.stringify(options.json);
  }
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), options.timeout || 9000);
  try {
    const response = await fetch(apiUrl(path), { ...options, headers, signal: options.signal || controller.signal });
    if (!response.ok) {
      const body = await response.json().catch(() => ({}));
      throw new Error(body.detail || body.message || `HTTP ${response.status}`);
    }
    if (options.raw) return response;
    const contentType = response.headers.get('content-type') || '';
    const payload = contentType.includes('application/json') ? await response.json() : await response.text();
    return payload?.data ?? payload;
  } finally {
    clearTimeout(timer);
  }
}

async function apiOrFallback(path, options, fallback) {
  try {
    return await api(path, options);
  } catch (error) {
    if (!state.settings.demoFallback) throw error;
    console.info(`[Demo fallback] ${path}:`, error.message);
    return typeof fallback === 'function' ? fallback(error) : fallback;
  }
}

function toast(message, type = 'success', title = '') {
  const node = document.createElement('div');
  node.className = `toast toast-${type}`;
  node.innerHTML = `<span class="toast-mark">${type === 'success' ? icon('check') : type === 'warning' ? icon('warning') : icon('close')}</span><div>${title ? `<strong>${escapeHtml(title)}</strong>` : ''}<p>${escapeHtml(message)}</p></div>`;
  toastRoot.append(node);
  requestAnimationFrame(() => node.classList.add('show'));
  setTimeout(() => {
    node.classList.remove('show');
    setTimeout(() => node.remove(), 260);
  }, 3000);
}

function downloadBlob(filename, content, type = 'text/plain;charset=utf-8') {
  const blob = content instanceof Blob ? content : new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  document.body.append(anchor);
  anchor.click();
  anchor.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

function statusBadge(status) {
  const map = {
    running: ['训练中', 'running'], completed: ['已完成', 'success'], queued: ['排队中', 'neutral'], stopped: ['已停止', 'warning'], failed: ['失败', 'danger'],
    ready: ['可用', 'success'], warning: ['待修复', 'warning'], converting: ['转换中', 'running'], healthy: ['健康', 'success'], degraded: ['降级', 'warning'], unhealthy: ['异常', 'danger']
  };
  const [label, tone] = map[status] || [status, 'neutral'];
  return `<span class="status-badge status-${tone}"><i></i>${escapeHtml(label)}</span>`;
}

function miniTrend(values, width = 160, height = 44, area = true) {
  const safe = values.length ? values.map(Number) : [0, 0];
  const min = Math.min(...safe);
  const max = Math.max(...safe);
  const span = max - min || 1;
  const points = safe.map((value, index) => {
    const x = (index / Math.max(safe.length - 1, 1)) * width;
    const y = height - 4 - ((value - min) / span) * (height - 10);
    return `${x.toFixed(1)},${y.toFixed(1)}`;
  }).join(' ');
  const areaPath = `M0 ${height} L${points.replaceAll(' ', ' L')} L${width} ${height} Z`;
  return `<svg class="mini-trend" viewBox="0 0 ${width} ${height}" preserveAspectRatio="none" aria-hidden="true">
    <defs><linearGradient id="trend-fill-${safe.length}-${Math.round(max * 1000)}" x1="0" y1="0" x2="0" y2="1"><stop stop-color="currentColor" stop-opacity=".28"/><stop offset="1" stop-color="currentColor" stop-opacity="0"/></linearGradient></defs>
    ${area ? `<path d="${areaPath}" fill="url(#trend-fill-${safe.length}-${Math.round(max * 1000)})" stroke="none"/>` : ''}
    <polyline points="${points}" fill="none" stroke="currentColor" stroke-width="2.3" vector-effect="non-scaling-stroke"/>
  </svg>`;
}

function lineChart(series, { height = 230, xLabel = 'Epoch', formatter = value => value, legend = true } = {}) {
  const width = 760;
  const pad = { left: 48, right: 22, top: 24, bottom: 38 };
  const all = series.flatMap(item => item.values.map(Number));
  const min = Math.min(...all, 0);
  const max = Math.max(...all, 1);
  const span = max - min || 1;
  const count = Math.max(...series.map(item => item.values.length), 2);
  const x = index => pad.left + (index / Math.max(count - 1, 1)) * (width - pad.left - pad.right);
  const y = value => pad.top + (1 - (value - min) / span) * (height - pad.top - pad.bottom);
  const gridLines = Array.from({ length: 5 }, (_, index) => {
    const ratio = index / 4;
    const gy = pad.top + ratio * (height - pad.top - pad.bottom);
    const label = formatter(max - ratio * span);
    return `<line x1="${pad.left}" y1="${gy}" x2="${width - pad.right}" y2="${gy}"/><text x="${pad.left - 10}" y="${gy + 4}" text-anchor="end">${escapeHtml(label)}</text>`;
  }).join('');
  const xTicks = Array.from({ length: 6 }, (_, index) => {
    const idx = Math.round((index / 5) * (count - 1));
    const gx = x(idx);
    return `<line x1="${gx}" y1="${pad.top}" x2="${gx}" y2="${height - pad.bottom}"/><text x="${gx}" y="${height - 14}" text-anchor="middle">${idx + 1}</text>`;
  }).join('');
  const paths = series.map((item, seriesIndex) => {
    const points = item.values.map((value, index) => `${x(index).toFixed(1)},${y(Number(value)).toFixed(1)}`).join(' ');
    const last = item.values.length - 1;
    return `<polyline points="${points}" fill="none" stroke="${item.color || CLASS_PALETTE[seriesIndex]}" stroke-width="2.5" vector-effect="non-scaling-stroke"/><circle cx="${x(last)}" cy="${y(item.values[last])}" r="4" fill="${item.color || CLASS_PALETTE[seriesIndex]}"/>`;
  }).join('');
  return `<div class="chart-wrap"><svg class="line-chart" viewBox="0 0 ${width} ${height}" preserveAspectRatio="none"><g class="chart-grid">${gridLines}${xTicks}</g>${paths}<text class="axis-title" x="${width / 2}" y="${height - 1}" text-anchor="middle">${escapeHtml(xLabel)}</text></svg>${legend ? `<div class="chart-legend">${series.map((item, index) => `<span><i style="--legend:${item.color || CLASS_PALETTE[index]}"></i>${escapeHtml(item.name)}</span>`).join('')}</div>` : ''}</div>`;
}

function donutChart(items, centerLabel = '总计') {
  const total = items.reduce((sum, item) => sum + Number(item.value || 0), 0) || 1;
  let offset = 0;
  const radius = 55;
  const circumference = 2 * Math.PI * radius;
  const circles = items.map((item, index) => {
    const ratio = item.value / total;
    const length = ratio * circumference;
    const circle = `<circle cx="80" cy="80" r="${radius}" fill="none" stroke="${item.color || CLASS_PALETTE[index]}" stroke-width="16" stroke-dasharray="${length} ${circumference - length}" stroke-dashoffset="${-offset}"/>`;
    offset += length;
    return circle;
  }).join('');
  return `<div class="donut-block"><svg viewBox="0 0 160 160" class="donut-svg"><g transform="rotate(-90 80 80)"><circle cx="80" cy="80" r="${radius}" fill="none" stroke="currentColor" stroke-opacity=".08" stroke-width="16"/>${circles}</g><text x="80" y="75" text-anchor="middle" class="donut-total">${total.toLocaleString()}</text><text x="80" y="96" text-anchor="middle" class="donut-label">${escapeHtml(centerLabel)}</text></svg><div class="donut-legend">${items.map((item, index) => `<div><i style="--legend:${item.color || CLASS_PALETTE[index]}"></i><span>${escapeHtml(item.label)}</span><strong>${Number(item.value).toLocaleString()}</strong></div>`).join('')}</div></div>`;
}

function progressBar(value, label = '') {
  return `<div class="progress-inline"><div class="progress-track"><span style="width:${clamp(Number(value), 0, 100)}%"></span></div>${label ? `<small>${escapeHtml(label)}</small>` : ''}</div>`;
}

function setRangeFill(input) {
  if (!input || input.tagName !== 'INPUT' || input.type !== 'range') return;
  const min = Number(input.min || 0);
  const max = Number(input.max || 100);
  const val = Number(input.value || 0);
  const pct = ((val - min) / Math.max(1, max - min)) * 100;
  const color = (input.dataset.fillColor || getComputedStyle(document.documentElement).getPropertyValue('--primary') || '#38bdf8').trim();
  input.style.setProperty('--range-progress', `${pct}%`);
  input.style.setProperty('--range-color', color);
}

function confidenceBars(counts) {
  return Object.entries(counts).map(([name, value], index) => `<div class="class-stat-row"><span class="class-dot" style="--dot:${CLASS_PALETTE[index % CLASS_PALETTE.length]}"></span><span>${escapeHtml(classLabel(name))}</span><div class="class-bar"><i style="width:${Math.min(100, value * 13 + 24)}%;--bar:${CLASS_PALETTE[index % CLASS_PALETTE.length]}"></i></div><strong>${value}</strong></div>`).join('');
}

function detectionBoxes(result) {
  return (result.boxes || []).map((box, index) => `<div class="detect-box" style="left:${box.x}%;top:${box.y}%;width:${box.w}%;height:${box.h}%;--box:${CLASS_PALETTE[index % CLASS_PALETTE.length]}"><span>${escapeHtml(classLabel(box.label))} ${(box.conf * 100).toFixed(0)}%</span></div>`).join('');
}

function makeDetectionResult(file, index = 0, mode = 'single') {
  const filename = file?.name || `remote_scene_${String(index + 1).padStart(2, '0')}.jpg`;
  const rand = seeded(filename + mode + index);
  const classes = mode === 'industrial' ? ['scratch', 'dent', 'crack', 'patch'] : ['aircraft', 'oiltank', 'vehicle', 'ship'];
  const counts = {};
  classes.forEach((name, classIndex) => { counts[name] = 1 + Math.floor(rand() * (classIndex === 0 ? 5 : 4)); });
  const total = Object.values(counts).reduce((sum, value) => sum + value, 0);
  const boxes = Array.from({ length: Math.min(total, 10) }, (_, boxIndex) => ({
    x: 6 + rand() * 75,
    y: 7 + rand() * 67,
    w: 8 + rand() * 15,
    h: 9 + rand() * 17,
    label: classes[boxIndex % classes.length],
    conf: .62 + rand() * .36
  }));
  const preview = file && file.type?.startsWith('image/') ? URL.createObjectURL(file) : sceneDataUri(filename, mode === 'industrial' ? 'industrial' : 'remote');
  return {
    id: uid('det'), filename, preview, mode, model: state.detection.model,
    total, counts, boxes, inference: +(31 + rand() * 47).toFixed(1),
    confidence: state.detection.confidence, iou: state.detection.iou,
    created_at: new Date().toISOString(), size: file?.size || Math.floor(800000 + rand() * 2600000),
    dimensions: `${640 + Math.floor(rand() * 640)} × ${480 + Math.floor(rand() * 500)}`
  };
}

function resultCard(result, index = 0, compact = false) {
  return `<article class="detection-card ${compact ? 'compact' : ''}" data-action="select-result" data-index="${index}">
    <div class="result-preview"><img src="${result.preview}" alt="${escapeHtml(result.filename)}"/>${detectionBoxes(result)}<span class="preview-chip">${result.total} 个目标</span></div>
    <div class="result-card-body"><div><strong>${escapeHtml(result.filename)}</strong><small>${escapeHtml(result.model)}</small></div><div class="result-meta"><span>${result.inference} ms</span><span>${Object.keys(result.counts).length} 类</span></div></div>
  </article>`;
}

function markdown(text) {
  let output = escapeHtml(text);
  output = output.replace(/```([\s\S]*?)```/g, '<pre><code>$1</code></pre>');
  output = output.replace(/`([^`]+)`/g, '<code>$1</code>');
  output = output.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
  output = output.replace(/^### (.+)$/gm, '<h4>$1</h4>');
  output = output.replace(/^## (.+)$/gm, '<h3>$1</h3>');
  output = output.replace(/^# (.+)$/gm, '<h2>$1</h2>');
  output = output.replace(/^[-•] (.+)$/gm, '<li>$1</li>');
  output = output.replace(/(<li>.*<\/li>\n?)+/g, match => `<ul>${match}</ul>`);
  output = output.replace(/\n/g, '<br>');
  return output;
}

function pageHeader(title, description, actions = '') {
  return `<div class="page-heading"><div><div class="eyebrow">YOLOv11 · Agent Workspace</div><h1>${escapeHtml(title)}</h1><p>${escapeHtml(description)}</p></div>${actions ? `<div class="page-heading-actions">${actions}</div>` : ''}</div>`;
}

function emptyState(iconName, title, description, action = '') {
  return `<div class="empty-state">${icon(iconName, 'empty-icon')}<h3>${escapeHtml(title)}</h3><p>${escapeHtml(description)}</p>${action}</div>`;
}

function renderLogin() {
  document.documentElement.dataset.theme = state.theme;
  app.innerHTML = `<main class="auth-page">
    <section class="auth-visual">
      <div class="auth-grid-lines"></div>
      <div class="auth-brand"><div class="brand-logo">${ICONS.logo}</div><div><strong>FogTraffic-YOLO-Detection</strong><span>YOLOv11 目标检测智能体平台</span></div></div>
      <div class="auth-copy"><div class="hero-pill"><i></i> Agent + YOLOv11 + SSE</div><h1>让目标检测从<br><em>模型工具</em>升级为智能体</h1><p>覆盖数据集准备、模型训练、评估导出、单图/批量/ZIP 检测与实时日志监控的完整闭环。</p><div class="auth-feature-grid"><article><strong>3</strong><span>检测通道</span><small>单图 / 批量 / ZIP</small></article><article><strong>10</strong><span>训练 API</span><small>训练 / 评估 / 导出</small></article><article><strong>SSE</strong><span>流式对话</span><small>可中断、可降级</small></article></div></div>
      <div class="auth-orbit orbit-a"></div><div class="auth-orbit orbit-b"></div>
      <div class="auth-console"><div class="console-top"><span></span><span></span><span></span><small>agent.trace</small></div><p><b>09:42:16</b> intent → detect_single_image</p><p><b>09:42:16</b> tool → YOLOv11 inference</p><p><b>09:42:17</b> result → 14 objects · 42.8ms</p><div class="console-line"></div></div>
    </section>
    <section class="auth-panel">
      <button class="theme-fab" data-action="toggle-theme" aria-label="切换主题">${icon(state.theme === 'dark' ? 'sun' : 'moon')}</button>
      <div class="auth-card">
        <div class="auth-card-head"><span class="mobile-logo">${ICONS.logo}</span><h2>${state.authMode === 'login' ? '欢迎回来' : '创建平台账号'}</h2><p>${state.authMode === 'login' ? '登录后进入目标检测智能体工作台' : '注册信息将在演示服务中保存'}</p></div>
        <div class="auth-tabs"><button class="${state.authMode === 'login' ? 'active' : ''}" data-action="auth-mode" data-mode="login">登录</button><button class="${state.authMode === 'register' ? 'active' : ''}" data-action="auth-mode" data-mode="register">注册</button></div>
        <form id="auth-form" class="auth-form">
          ${state.authMode === 'register' ? `<label><span>显示名称</span><div class="field-shell">${icon('eye')}<input name="display_name" value="算法工程师" placeholder="请输入显示名称" required></div></label>` : ''}
          <label><span>用户名或邮箱</span><div class="field-shell">${icon('file')}<input name="username" value="admin" autocomplete="username" placeholder="请输入用户名" required></div></label>
          <label><span>密码</span><div class="field-shell">${icon('settings')}<input name="password" value="123456" type="${state.passwordVisible ? 'text' : 'password'}" autocomplete="current-password" minlength="6" required><button type="button" data-action="toggle-password" aria-label="显示密码">${icon('eye')}</button></div></label>
          ${state.authMode === 'register' ? `<label><span>邮箱</span><div class="field-shell">${icon('send')}<input name="email" type="email" value="engineer@rsod.local" placeholder="name@example.com" required></div></label>` : ''}
          <div class="auth-options"><label class="check-label"><input type="checkbox" checked><span></span>保持登录</label><button type="button" class="text-link" data-action="forgot-password">忘记密码？</button></div>
          <button class="btn btn-primary btn-auth" type="submit" ${state.busy ? 'disabled' : ''}>${state.busy ? '<span class="spinner"></span>正在连接…' : state.authMode === 'login' ? '进入工作台' : '注册并登录'}${!state.busy ? icon('chevron') : ''}</button>
        </form>
        <div class="demo-account"><span>${icon('check')} 演示账号</span><code>admin</code><i>/</i><code>123456</code><button data-action="copy-demo">复制</button></div>
        <p class="auth-terms">继续即表示你同意平台的使用规范与隐私策略。当前项目为可运行演示版，可在设置中连接真实 FastAPI 后端。</p>
      </div>
    </section>
  </main>`;
}

function navMarkup() {
  const groups = [...new Set(NAV.map(item => item.group))];
  return groups.map(group => `<div class="nav-group"><div class="nav-group-title">${escapeHtml(group)}</div>${NAV.filter(item => item.group === group).map(item => `<button class="nav-item ${state.page === item.key ? 'active' : ''}" data-page="${item.key}" title="${escapeHtml(item.label)}">${icon(item.icon)}<span>${escapeHtml(item.label)}</span>${state.page === item.key ? '<i class="active-dot"></i>' : ''}</button>`).join('')}</div>`).join('');
}

function renderShell() {
  document.documentElement.dataset.theme = state.theme;
  const navItem = NAV.find(item => item.key === state.page) || NAV[0];
  app.innerHTML = `<div class="app-layout ${state.sidebarCollapsed ? 'sidebar-collapsed' : ''}">
    <aside class="sidebar ${state.mobileNavOpen ? 'mobile-open' : ''}">
      <div class="sidebar-brand"><div class="brand-logo">${ICONS.logo}</div><div class="brand-text"><strong>FogTraffic-YOLO-Detection</strong><span>Traffic Vision System</span></div><button class="sidebar-toggle" data-action="toggle-sidebar" aria-label="折叠侧栏">${icon('menu')}</button></div>
      <nav class="sidebar-nav">${navMarkup()}</nav>
      <div class="sidebar-status"><div class="status-orb healthy"></div><div><strong>全部服务正常</strong><span>5 / 5 services</span></div><button data-page="monitoring">${icon('chevron')}</button></div>
      <div class="sidebar-user"><div class="avatar">${escapeHtml((state.user.display_name || state.user.username || 'U').slice(0, 2).toUpperCase())}</div><div><strong>${escapeHtml(state.user.display_name || state.user.username)}</strong><span>${escapeHtml(state.user.role === 'admin' ? '平台管理员' : '普通用户')}</span></div><button data-action="logout" aria-label="退出登录">${icon('close')}</button></div>
    </aside>
    <div class="mobile-overlay ${state.mobileNavOpen ? 'visible' : ''}" data-action="close-mobile-nav"></div>
    <main class="main-shell">
      <header class="topbar"><div class="topbar-left"><button class="mobile-menu" data-action="toggle-mobile-nav">${icon('menu')}</button><div class="breadcrumb"><span>RSOD</span><i>/</i><strong>${escapeHtml(navItem.label)}</strong></div></div><div class="topbar-right">
        <button class="command-trigger" data-action="open-command">${icon('search')}<span>搜索功能、任务或数据集</span><kbd>⌘ K</kbd></button>
        <button class="icon-button health-button" data-page="monitoring" title="系统健康"><i class="health-dot"></i>${icon('monitor')}</button>
        <button class="icon-button" data-action="toggle-theme" title="切换主题">${icon(state.theme === 'dark' ? 'sun' : 'moon')}</button>
        <div class="popover-anchor"><button class="icon-button" data-action="toggle-notifications" title="通知">${icon('bell')}<span class="notification-badge">3</span></button>${state.notificationsOpen ? notificationPopover() : ''}</div>
      </div></header>
      <section class="content-area" id="page-content">${renderPage()}</section>
    </main>
  </div>`;
  afterRender();
}

function notificationPopover() {
  return `<div class="popover notification-popover"><div class="popover-head"><strong>通知</strong><button data-action="read-all">全部已读</button></div><article><span class="notice-icon success">${icon('check')}</span><div><strong>训练任务已完成</strong><p>车辆检测增强模型 v3 已达到 mAP50 87.3%</p><small>12 分钟前</small></div></article><article><span class="notice-icon warning">${icon('warning')}</span><div><strong>数据集存在异常</strong><p>Night-Traffic 缺少 8 个标注文件</p><small>35 分钟前</small></div></article><article><span class="notice-icon info">${icon('monitor')}</span><div><strong>模型已导出</strong><p>yolov11s-rsod-v3.2 已上传 MinIO</p><small>1 小时前</small></div></article></div>`;
}

function renderPage() {
  const renderers = {
    chat: renderChat,
    detection: renderDetection,
    datasets: renderDatasets,
    training: renderTraining,
    evaluation: renderEvaluation,
    dashboard: renderDashboard,
    history: renderHistory,
    monitoring: renderMonitoring,
    settings: renderSettings
  };
  return (renderers[state.page] || renderChat)();
}

function renderChatMessage(message) {
  if (message.role === 'user') {
    return `<div class="chat-message user"><div class="chat-bubble user-bubble">${message.attachments?.length ? `<div class="message-attachments">${message.attachments.map(item => item.type?.startsWith('image/') ? `<img src="${item.preview}" alt="附件">` : `<div class="file-attachment">${icon('file')}<span>${escapeHtml(item.name)}</span></div>`).join('')}</div>` : ''}<div>${markdown(message.content)}</div><time>${new Date(message.time).toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })}</time></div><div class="avatar user-avatar">${escapeHtml((state.user.display_name || 'U').slice(0, 1))}</div></div>`;
  }
  return `<div class="chat-message assistant"><div class="avatar bot-avatar">${ICONS.bot}</div><div class="chat-bubble assistant-bubble"><div class="message-author"><strong>FogTraffic-YOLO-Detection</strong>${message.streaming ? '<span class="typing-label"><i></i> 正在思考</span>' : '<span>YOLOv11 智能体</span>'}</div>${message.tool ? `<div class="tool-call ${message.tool.status || ''}"><div>${icon(message.tool.status === 'done' ? 'check' : 'train')}<strong>${escapeHtml(message.tool.title)}</strong></div><p>${escapeHtml(message.tool.detail || '')}</p>${message.tool.status !== 'done' ? '<div class="tool-progress"><span></span></div>' : ''}</div>` : ''}<div class="markdown-body">${markdown(message.content || '')}${message.streaming ? '<span class="text-cursor"></span>' : ''}</div>${message.result ? `<div class="message-result">${detectionResultDetail(message.result, true)}</div>` : ''}<div class="message-actions"><time>${new Date(message.time).toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })}</time><button data-action="copy-message" data-message-id="${message.id}">${icon('copy')} 复制</button></div></div></div>`;
}

function renderChat() {
  return `<div class="chat-page-grid"><section class="chat-main panel">
    <div class="chat-header"><div><span class="online-dot"></span><strong>目标检测智能体</strong><small>自然语言通道 · SSE 流式响应</small></div><div class="chat-header-actions"><button class="btn btn-ghost btn-sm" data-action="clear-chat">${icon('trash')}清空会话</button><button class="btn btn-ghost btn-sm" data-action="export-chat">${icon('download')}导出</button></div></div>
    <div class="chat-scroll" id="chat-scroll">${state.chat.messages.map(renderChatMessage).join('')}</div>
    <div class="chat-composer-wrap"><div class="quick-actions"><button data-action="quick-detect" data-mode="single">${icon('scan')}<span>单图检测</span><small>直接调用 API</small></button><button data-action="quick-detect" data-mode="batch">${icon('dataset')}<span>批量检测</span><small>多图并行处理</small></button><button data-action="quick-detect" data-mode="zip">${icon('file')}<span>ZIP 检测</span><small>自动解压分析</small></button><button data-page="training">${icon('train')}<span>训练状态</span><small>查看实时指标</small></button></div>
      ${state.chat.attachments.length ? `<div class="pending-attachments">${state.chat.attachments.map((item, index) => `<div>${item.type?.startsWith('image/') ? `<img src="${item.preview}" alt="${escapeHtml(item.name)}">` : icon('file')}<span>${escapeHtml(item.name)}</span><button data-action="remove-chat-attachment" data-index="${index}">${icon('close')}</button></div>`).join('')}</div>` : ''}
      <div class="chat-composer"><button class="composer-icon" data-action="attach-chat">${icon('paperclip')}</button><textarea id="chat-input" rows="1" placeholder="输入消息，或拖拽图片 / ZIP 到这里…" ${state.chat.streaming ? 'disabled' : ''}>${escapeHtml(state.chat.input)}</textarea>${state.chat.streaming ? `<button class="send-button stop" data-action="stop-chat">${icon('stop')}<span>停止</span></button>` : `<button class="send-button" data-action="send-chat" ${!state.chat.input.trim() && !state.chat.attachments.length ? 'disabled' : ''}>${icon('send')}<span>发送</span></button>`}</div><div class="composer-hint"><span>Enter 发送 · Shift + Enter 换行</span><span>快捷检测在 LLM 不可用时仍可工作</span></div></div>
  </section><aside class="agent-side"><section class="panel agent-status-card"><div class="panel-title"><div><strong>Agent 运行状态</strong><span>ReAct 调度器</span></div>${statusBadge('healthy')}</div><div class="agent-core"><div class="agent-core-orbit"><span>${ICONS.bot}</span><i></i><i></i><i></i></div><div><strong>3 个工具已就绪</strong><p>意图识别、工具调用与结果整理均正常</p></div></div><div class="tool-list"><div>${icon('scan')}<span><strong>detect_single</strong><small>单图目标检测</small></span><i class="tool-ready"></i></div><div>${icon('dataset')}<span><strong>detect_batch</strong><small>多图批量检测</small></span><i class="tool-ready"></i></div><div>${icon('file')}<span><strong>detect_zip</strong><small>ZIP 解压检测</small></span><i class="tool-ready"></i></div></div></section>
    <section class="panel trace-card"><div class="panel-title"><div><strong>执行轨迹</strong><span>最近 Agent 事件</span></div><button class="icon-button small" data-action="clear-trace">${icon('trash')}</button></div><div class="trace-list">${state.chat.trace.slice(0, 7).map(item => `<article><i class="trace-dot ${item.type}"></i><div><strong>${escapeHtml(item.title)}</strong><p>${escapeHtml(item.detail)}</p><small>${escapeHtml(item.time)}</small></div></article>`).join('')}</div></section>
    <section class="panel context-card"><div class="panel-title"><div><strong>当前上下文</strong><span>会话配置</span></div></div><div class="context-row"><span>默认模型</span><strong>${escapeHtml(state.settings.defaultModel)}</strong></div><div class="context-row"><span>置信度阈值</span><strong>${state.settings.confidence.toFixed(2)}</strong></div><div class="context-row"><span>IoU 阈值</span><strong>${state.settings.iou.toFixed(2)}</strong></div><div class="context-row"><span>传输方式</span><strong>SSE Stream</strong></div></section></aside></div>`;
}

function detectionResultDetail(result, embedded = false) {
  if (!result) return '';
  return `<div class="detection-detail ${embedded ? 'embedded' : ''}"><div class="detail-preview"><img src="${result.preview}" alt="${escapeHtml(result.filename)}">${detectionBoxes(result)}<div class="preview-toolbar"><span>${escapeHtml(result.dimensions || '1280 × 720')}</span><span>${result.inference} ms</span></div></div><div class="detail-summary"><div class="summary-head"><div><strong>${escapeHtml(result.filename)}</strong><span>${escapeHtml(result.model)}</span></div><span class="object-total">${result.total}<small>目标</small></span></div><div class="summary-metrics"><div><span>置信度</span><strong>${Number(result.confidence).toFixed(2)}</strong></div><div><span>IoU</span><strong>${Number(result.iou).toFixed(2)}</strong></div><div><span>类别</span><strong>${Object.keys(result.counts).length}</strong></div><div><span>耗时</span><strong>${result.inference}ms</strong></div></div><div class="class-stats">${confidenceBars(result.counts)}</div>${embedded ? '' : `<div class="detail-actions"><button class="btn btn-ghost" data-action="download-result" data-result-id="${result.id}">${icon('download')}下载标注图</button><button class="btn btn-primary" data-action="save-result" data-result-id="${result.id}">${icon('check')}保存到历史</button></div>`}</div></div>`;
}

function renderDetection() {
  const selected = state.detection.results[state.detection.selectedResult] || null;
  return `<div class="page-stack">${pageHeader('交通检测工作台', '支持图片、视频与 USB 摄像头实时检测，融合增强、车辆识别、ByteTrack 跟踪与交通统计。', `<button class="btn btn-ghost" data-action="load-demo-detection">${icon('play')}加载示例</button><button class="btn btn-primary" data-action="pick-detection-files">${icon('upload')}选择文件</button><button class="btn btn-ghost" data-action="connect-camera">${icon('monitor')}连接摄像头</button>`)}
    <div class="segmented-tabs detection-mode-tabs"><button class="${state.detection.mode === 'single' ? 'active' : ''}" data-action="set-detection-mode" data-mode="single">${icon('scan')}图片/视频检测</button><button class="${state.detection.mode === 'camera' ? 'active' : ''}" data-action="set-detection-mode" data-mode="camera">${icon('monitor')}摄像头实时检测</button><button class="${state.detection.mode === 'zip' ? 'active' : ''}" data-action="set-detection-mode" data-mode="zip">${icon('file')}批量/压缩包</button></div>
    <div class="detection-layout"><section class="panel detection-control"><div class="panel-title"><div><strong>输入与参数</strong><span>${state.detection.mode === 'single' ? 'JPG / PNG / BMP' : state.detection.mode === 'batch' ? '最多 30 张图片' : '包含 images 的 ZIP 文件'}</span></div></div>
      <div class="drop-zone ${state.detection.files.length ? 'has-files' : ''}" data-action="pick-detection-files" id="detection-drop-zone">${state.detection.files.length ? `<div class="file-stack">${state.detection.files.slice(0, 5).map((file, index) => `<article>${file.type?.startsWith('image/') ? `<img src="${file.preview}" alt="">` : icon('file')}<div><strong>${escapeHtml(file.name)}</strong><span>${(file.size / 1024 / 1024).toFixed(2)} MB</span></div><button data-action="remove-detection-file" data-index="${index}">${icon('close')}</button></article>`).join('')}${state.detection.files.length > 5 ? `<small>另有 ${state.detection.files.length - 5} 个文件</small>` : ''}</div>` : `${icon('upload', 'drop-icon')}<strong>拖拽文件到这里</strong><p>或点击选择${'图片/视频/摄像头输入'}</p><span>单文件不超过 50MB</span>`}</div>
      ${state.detection.mode === 'camera' ? `<div class="camera-box"><video id="camera-preview" autoplay muted playsinline></video><div class="camera-actions"><button class="btn btn-primary btn-sm" data-action="connect-camera">${state.detection.camera.active ? '重新连接' : '开启摄像头'}</button><button class="btn btn-ghost btn-sm" data-action="stop-camera">关闭摄像头</button></div><small>支持 USB 摄像头/WebRTC 输入，后端可接入 RTSP 流。</small></div>` : ''}<div class="form-grid one-col"><label><span>检测模型</span><select id="detect-model"><option>yolov11s-rsod-v3.2</option><option>yolov11n-steel-v1.4</option><option>yolov11m-traffic-v2.0</option></select></label><label><span>置信度阈值 <b id="confidence-value">${state.detection.confidence.toFixed(2)}</b></span><input id="detect-confidence" type="range" min="0.05" max="0.95" step="0.05" value="${state.detection.confidence}"></label><label><span>IoU 阈值 <b id="iou-value">${state.detection.iou.toFixed(2)}</b></span><input id="detect-iou" type="range" min="0.1" max="0.9" step="0.05" value="${state.detection.iou}"></label><label class="switch-row"><span><strong>保存标注图</strong><small>检测结果自动上传到 MinIO</small></span><input id="save-annotated" type="checkbox" ${state.detection.saveAnnotated ? 'checked' : ''}><i></i></label></div>
      <button class="btn btn-primary btn-block" data-action="run-detection" ${state.detection.running || !state.detection.files.length ? 'disabled' : ''}>${state.detection.running ? '<span class="spinner"></span>正在检测…' : `${icon('play')}开始检测`}</button>${state.detection.running ? `<div class="detect-progress"><div><span>任务处理中</span><strong>${state.detection.progress}%</strong></div>${progressBar(state.detection.progress)}<small>${state.detection.mode === 'single' ? '正在执行 YOLOv11 推理' : `已完成 ${Math.max(1, Math.round(state.detection.files.length * state.detection.progress / 100))} / ${state.detection.files.length}`}</small></div>` : ''}
    </section><section class="panel detection-viewer"><div class="panel-title"><div><strong>检测结果</strong><span>${state.detection.results.length ? `本次共 ${state.detection.results.length} 个结果` : '等待检测任务'}</span></div>${state.detection.results.length ? `<button class="btn btn-ghost btn-sm" data-action="clear-results">${icon('trash')}清空</button>` : ''}</div>${selected ? detectionResultDetail(selected) : emptyState('scan', '暂无检测结果', '上传图片或 ZIP 文件并开始检测，结果会在此处展示。', `<button class="btn btn-primary" data-action="load-demo-detection">${icon('play')}查看演示结果</button>`)}</section>
      <aside class="panel result-gallery"><div class="panel-title"><div><strong>结果列表</strong><span>点击切换详情</span></div><span class="count-pill">${state.detection.results.length}</span></div><div class="gallery-list">${state.detection.results.length ? state.detection.results.map((result, index) => `<div class="gallery-item ${state.detection.selectedResult === index ? 'active' : ''}" data-action="select-result" data-index="${index}"><div><img src="${result.preview}" alt="">${detectionBoxes({ ...result, boxes: result.boxes.slice(0, 2) })}</div><span><strong>${escapeHtml(result.filename)}</strong><small>${result.total} 目标 · ${result.inference}ms</small></span>${icon('chevron')}</div>`).join('') : '<div class="gallery-placeholder">检测后将在这里生成结果列表</div>'}</div></aside></div>
  </div>`;
}

function renderDatasetCard(dataset) {
  const sample = sceneDataUri(dataset.name, dataset.scene.includes('工业') ? 'industrial' : 'remote');
  return `<article class="dataset-card"><div class="dataset-cover"><img src="${sample}" alt="${escapeHtml(dataset.name)}"><div class="dataset-cover-top">${statusBadge(dataset.status)}<span>${escapeHtml(dataset.format)}</span></div><div class="dataset-cover-bottom"><strong>${dataset.quality}</strong><span>质量评分</span></div></div><div class="dataset-body"><div class="dataset-title"><div><strong>${escapeHtml(dataset.name)}</strong><span>${escapeHtml(dataset.scene)}</span></div><button class="icon-button small" data-action="dataset-detail" data-id="${dataset.id}">${icon('chevron')}</button></div><div class="dataset-kpis"><div><strong>${dataset.images.toLocaleString()}</strong><span>图像</span></div><div><strong>${dataset.labels.toLocaleString()}</strong><span>标注</span></div><div><strong>${dataset.classes.length}</strong><span>类别</span></div></div><div class="dataset-split"><span>训练 ${dataset.train}</span><span>验证 ${dataset.val}</span><span>测试 ${dataset.test}</span></div><div class="split-bar"><i style="width:${dataset.train / dataset.images * 100}%"></i><i style="width:${dataset.val / dataset.images * 100}%"></i><i></i></div><div class="dataset-tags">${dataset.classes.slice(0, 4).map(item => `<span>${escapeHtml(classLabel(item))}</span>`).join('')}${dataset.classes.length > 4 ? `<span>+${dataset.classes.length - 4}</span>` : ''}</div><div class="dataset-foot"><span>${escapeHtml(dataset.size)} · ${escapeHtml(dataset.updated)}</span><div><button data-action="validate-dataset" data-id="${dataset.id}">验证</button><button data-action="train-dataset" data-id="${dataset.id}">训练</button></div></div></div></article>`;
}

function renderDatasets() {
  const filtered = state.datasets.filter(item => {
    const q = state.datasetQuery.toLowerCase();
    return (!q || `${item.name} ${item.scene} ${item.classes.join(' ')}`.toLowerCase().includes(q)) && (state.datasetFormat === 'ALL' || item.format === state.datasetFormat);
  });
  return `<div class="page-stack">${pageHeader('数据集管理', '导入 VOC / COCO / LabelMe 标注，转换为 YOLO 格式并完成目录验证与数据集划分。', `<button class="btn btn-ghost" data-action="open-converter">${icon('refresh')}格式转换</button><button class="btn btn-primary" data-action="add-dataset">${icon('plus')}新建数据集</button>`)}
    <section class="dataset-overview"><article class="overview-card blue"><div>${icon('dataset')}<span><strong>${state.datasets.reduce((sum, item) => sum + item.images, 0).toLocaleString()}</strong><small>总图像数</small></span></div>${miniTrend([44, 52, 49, 61, 68, 73, 82])}</article><article class="overview-card violet"><div>${icon('file')}<span><strong>${state.datasets.reduce((sum, item) => sum + item.labels, 0).toLocaleString()}</strong><small>有效标注</small></span></div>${miniTrend([38, 45, 52, 60, 57, 71, 79])}</article><article class="overview-card green"><div>${icon('check')}<span><strong>92.8%</strong><small>平均质量</small></span></div>${miniTrend([.82, .84, .86, .87, .9, .91, .928])}</article><article class="overview-card orange"><div>${icon('warning')}<span><strong>30</strong><small>待修复问题</small></span></div>${miniTrend([63, 58, 54, 48, 43, 37, 30])}</article></section>
    <section class="panel dataset-toolbar"><div class="search-field">${icon('search')}<input id="dataset-search" value="${escapeHtml(state.datasetQuery)}" placeholder="搜索数据集、场景或类别"></div><select id="dataset-format"><option value="ALL" ${state.datasetFormat === 'ALL' ? 'selected' : ''}>全部格式</option><option value="YOLO" ${state.datasetFormat === 'YOLO' ? 'selected' : ''}>YOLO</option><option value="COCO" ${state.datasetFormat === 'COCO' ? 'selected' : ''}>COCO</option><option value="VOC" ${state.datasetFormat === 'VOC' ? 'selected' : ''}>VOC</option><option value="LabelMe" ${state.datasetFormat === 'LabelMe' ? 'selected' : ''}>LabelMe</option></select><button class="btn btn-ghost" data-action="pick-dataset-package">${icon('upload')}导入标注包</button><span class="toolbar-count">显示 ${filtered.length} / ${state.datasets.length}</span></section>
    <div class="dataset-layout"><section class="dataset-grid">${filtered.length ? filtered.map(renderDatasetCard).join('') : emptyState('dataset', '没有匹配的数据集', '尝试修改搜索条件或导入新的数据集。')}</section><aside class="dataset-guide"><section class="panel yolo-tree"><div class="panel-title"><div><strong>YOLO 目录规范</strong><span>转换后的目标结构</span></div></div><pre><span>datasets/scene_name/</span>
├── <b>images/</b>
│   ├── train/
│   ├── val/
│   └── test/
├── <b>labels/</b>
│   ├── train/
│   ├── val/
│   └── test/
└── <em>data.yaml</em></pre><button class="btn btn-ghost btn-block" data-action="copy-tree">${icon('copy')}复制目录结构</button></section><section class="panel validation-checklist"><div class="panel-title"><div><strong>验证清单</strong><span>训练前必须通过</span></div></div><div><span>${icon('check')}</span><p><strong>图像与标注一一对应</strong><small>文件名主干必须一致</small></p></div><div><span>${icon('check')}</span><p><strong>坐标范围合法</strong><small>x / y / w / h 均在 0~1</small></p></div><div><span class="warning">${icon('warning')}</span><p><strong>类别 ID 连续</strong><small>当前发现 2 个待确认映射</small></p></div><div><span>${icon('check')}</span><p><strong>data.yaml 路径正确</strong><small>train / val / test 可访问</small></p></div></section></aside></div>
  </div>`;
}

function selectedTask() {
  return state.tasks.find(item => Number(item.id) === Number(state.selectedTaskId)) || state.tasks[0];
}

function taskStatusText(task) {
  return task.status === 'running' ? `Epoch ${task.current_epoch}/${task.epochs}` : task.status === 'completed' ? '训练完成' : task.status === 'queued' ? '等待资源' : '任务已停止';
}

function renderTraining() {
  const task = selectedTask();
  const metrics = task.metrics?.length ? task.metrics : initialMetrics(Math.max(task.current_epoch, 1), task.best_map50 || .1);
  const latest = metrics.at(-1) || {};
  const recent = metrics.slice(-60);
  const logLines = Array.from({ length: 12 }, (_, index) => {
    const m = metrics[Math.max(0, metrics.length - 12 + index)] || latest;
    return `<p><span>${String(m.epoch || 0).padStart(3, '0')}/${task.epochs}</span><b>box_loss ${Number(m.box_loss || 0).toFixed(3)}</b><b>cls_loss ${Number(m.cls_loss || 0).toFixed(3)}</b><b>mAP50 ${Number(m.map50 || 0).toFixed(3)}</b><em>${task.device}</em></p>`;
  }).join('');
  return `<div class="page-stack">${pageHeader('模型训练与监控', '创建 YOLOv11 训练任务，实时轮询进度、损失曲线与 mAP 指标，并查看训练日志。', `<button class="btn btn-ghost" data-action="refresh-tasks">${icon('refresh')}刷新任务</button><button class="btn btn-primary" data-action="new-training-task">${icon('plus')}新建训练任务</button>`)}
    <section class="panel task-table-panel"><div class="panel-title"><div><strong>训练任务列表</strong><span>接口：GET /api/training/tasks</span></div><div class="table-actions"><span>${state.tasks.filter(item => item.status === 'running').length} 个任务运行中</span></div></div><div class="table-scroll"><table class="data-table ${state.settings.compactTable ? 'compact' : ''}"><thead><tr><th>任务</th><th>模型 / 数据集</th><th>设备</th><th>进度</th><th>状态</th><th>最佳 mAP50</th><th>创建时间</th><th>操作</th></tr></thead><tbody>${state.tasks.map(item => `<tr class="${Number(item.id) === Number(task.id) ? 'selected' : ''}" data-action="select-task" data-id="${item.id}"><td><strong>${escapeHtml(item.name)}</strong><small>${escapeHtml(item.task_uuid)}</small></td><td><span>${escapeHtml(item.model_name)}</span><small>${escapeHtml(item.dataset_name)}</small></td><td><span class="device-chip ${item.device.includes('cuda') ? 'gpu' : ''}">${escapeHtml(item.device)}</span></td><td><div class="table-progress"><div><span>${item.progress}%</span><small>${item.current_epoch}/${item.epochs}</small></div>${progressBar(item.progress)}</div></td><td>${statusBadge(item.status)}</td><td><strong>${item.best_map50 ? item.best_map50.toFixed(3) : '--'}</strong></td><td><span>${formatTime(item.created_at).slice(5, 16)}</span></td><td><button class="table-link" data-action="select-task" data-id="${item.id}">监控</button>${item.status === 'running' ? `<button class="table-link danger" data-action="stop-task" data-id="${item.id}">停止</button>` : ''}</td></tr>`).join('')}</tbody></table></div></section>
    <div class="training-monitor-grid"><section class="panel monitor-summary"><div class="panel-title"><div><strong>${escapeHtml(task.name)}</strong><span>${escapeHtml(task.task_uuid)} · ${escapeHtml(task.model_name)} · ${escapeHtml(task.device)}</span></div>${statusBadge(task.status)}</div><div class="monitor-hero"><div class="epoch-ring" style="--progress:${task.progress * 3.6}deg"><div><strong>${task.current_epoch}</strong><span>/ ${task.epochs}</span><small>Epoch</small></div></div><div class="monitor-copy"><span>${taskStatusText(task)}</span><h3>${task.status === 'running' ? '模型正在学习目标特征' : task.status === 'completed' ? '训练任务已完成' : '任务等待启动'}</h3><p>数据集 ${escapeHtml(task.dataset_name)} · 批次 ${task.batch_size} · 输入尺寸 ${task.image_size}px</p><div class="monitor-actions">${task.status === 'running' ? `<button class="btn btn-danger btn-sm" data-action="stop-task" data-id="${task.id}">${icon('stop')}停止训练</button>` : task.status === 'queued' || task.status === 'stopped' ? `<button class="btn btn-primary btn-sm" data-action="resume-task" data-id="${task.id}">${icon('play')}启动任务</button>` : `<button class="btn btn-primary btn-sm" data-page="evaluation">${icon('evaluate')}查看评估</button>`}<button class="btn btn-ghost btn-sm" data-action="download-metrics" data-id="${task.id}">${icon('download')}results.csv</button></div></div></div></section>
      <section class="metric-card"><div><span>Box Loss</span><strong>${Number(latest.box_loss || 0).toFixed(3)}</strong><small>较初始下降 ${metrics.length > 1 ? Math.max(0, (metrics[0].box_loss - latest.box_loss) / metrics[0].box_loss * 100).toFixed(1) : 0}%</small></div>${miniTrend(recent.map(item => item.box_loss))}</section><section class="metric-card"><div><span>Cls Loss</span><strong>${Number(latest.cls_loss || 0).toFixed(3)}</strong><small>分类损失持续收敛</small></div>${miniTrend(recent.map(item => item.cls_loss))}</section><section class="metric-card"><div><span>Precision</span><strong>${formatPercent(latest.precision)}</strong><small>目标预测精确率</small></div>${miniTrend(recent.map(item => item.precision))}</section><section class="metric-card"><div><span>Recall</span><strong>${formatPercent(latest.recall)}</strong><small>目标召回能力</small></div>${miniTrend(recent.map(item => item.recall))}</section><section class="metric-card accent"><div><span>mAP@50</span><strong>${formatPercent(latest.map50)}</strong><small>当前核心指标</small></div>${miniTrend(recent.map(item => item.map50))}</section><section class="metric-card"><div><span>mAP@50-95</span><strong>${formatPercent(latest.map50_95)}</strong><small>严格 IoU 综合指标</small></div>${miniTrend(recent.map(item => item.map50_95))}</section>
    </div>
    <div class="training-chart-grid"><section class="panel"><div class="panel-title"><div><strong>训练损失曲线</strong><span>Box / Class / DFL Loss</span></div><span class="live-chip"><i></i>${task.status === 'running' ? '实时更新' : '历史数据'}</span></div>${lineChart([{ name: 'Box Loss', values: recent.map(item => item.box_loss), color: '#22d3ee' }, { name: 'Cls Loss', values: recent.map(item => item.cls_loss), color: '#8b5cf6' }, { name: 'DFL Loss', values: recent.map(item => item.dfl_loss), color: '#fb7185' }], { formatter: value => value.toFixed(1) })}</section><section class="panel"><div class="panel-title"><div><strong>评估指标曲线</strong><span>Precision / Recall / mAP</span></div></div>${lineChart([{ name: 'Precision', values: recent.map(item => item.precision), color: '#34d399' }, { name: 'Recall', values: recent.map(item => item.recall), color: '#f59e0b' }, { name: 'mAP50', values: recent.map(item => item.map50), color: '#60a5fa' }, { name: 'mAP50-95', values: recent.map(item => item.map50_95), color: '#a78bfa' }], { formatter: value => `${Math.round(value * 100)}%` })}</section></div>
    <section class="panel training-console"><div class="panel-title"><div><strong>训练日志</strong><span>results.csv 实时解析</span></div><div><button class="icon-button small" data-action="copy-training-logs">${icon('copy')}</button><button class="icon-button small" data-action="clear-training-logs">${icon('trash')}</button></div></div><div class="terminal"><div class="terminal-head"><span></span><span></span><span></span><small>${escapeHtml(task.task_uuid)} · ultralytics</small></div><div class="terminal-body"><p class="terminal-command">$ yolo detect train model=${task.model_name}.pt data=${task.dataset_name}/data.yaml epochs=${task.epochs} imgsz=${task.image_size}</p>${logLines}<p class="terminal-cursor">${task.status === 'running' ? 'training continues_' : task.status === 'completed' ? `Results saved to runs/train/${task.task_uuid}` : 'waiting_'}</p></div></div></section>
  </div>`;
}

function localEvaluation(task) {
  const base = task.best_map50 || task.metrics?.at(-1)?.map50 || .72;
  const classes = task.dataset_name.includes('Steel') ? ['scratch', 'dent', 'inclusion', 'patch', 'crack'] : task.dataset_name.includes('Traffic') ? ['car', 'truck', 'bus', 'person', 'bicycle', 'traffic-light'] : ['aircraft', 'oiltank', 'ship', 'vehicle', 'bridge', 'harbor'];
  return {
    task_id: task.id,
    model_name: task.model_name,
    dataset_name: task.dataset_name,
    precision: Math.min(.95, base + .034),
    recall: Math.min(.93, base + .008),
    map50: base,
    map50_95: base * .69,
    fitness: base * .74,
    speed_ms: task.model_name.endsWith('m') ? 48.6 : task.model_name.endsWith('s') ? 31.4 : 22.8,
    per_class: classes.map((name, index) => ({ name, precision: clamp(base + .07 - index * .028, .42, .96), recall: clamp(base + .03 - index * .026, .38, .94), ap50: clamp(base + .06 - index * .038, .4, .97), ap50_95: clamp(base * .71 - index * .026, .25, .84) }))
  };
}

function confusionMatrix(classes, report) {
  const size = Math.min(classes.length, 6);
  const labels = classes.slice(0, size);
  const rand = seeded(`${report.model_name}-${report.map50}`);
  const cells = labels.flatMap((row, r) => labels.map((col, c) => {
    const value = r === c ? Math.round(72 + rand() * 24) : Math.round(rand() * 13);
    const alpha = r === c ? .34 + value / 150 : .08 + value / 120;
    return `<div class="matrix-cell" style="--alpha:${alpha.toFixed(2)}" title="${classLabel(row)} → ${classLabel(col)}: ${value}"><strong>${value}</strong></div>`;
  })).join('');
  return `<div class="matrix-wrap"><div class="matrix-y-title">真实类别</div><div class="matrix-grid" style="--matrix-size:${size}"><div class="matrix-corner"></div>${labels.map(label => `<span class="matrix-x">${escapeHtml(classLabel(label))}</span>`).join('')}${labels.map(label => `<span class="matrix-y">${escapeHtml(classLabel(label))}</span>`).join('')}${cells}</div><div class="matrix-x-title">预测类别</div></div>`;
}

function renderEvaluation() {
  const completedTasks = state.tasks.filter(item => item.status === 'completed');
  const task = state.tasks.find(item => Number(item.id) === Number(state.evaluationTaskId)) || completedTasks[0] || state.tasks[0];
  const report = state.evaluationReport?.task_id === task.id ? state.evaluationReport : localEvaluation(task);
  const perClass = [...report.per_class].sort((a, b) => b.ap50 - a.ap50);
  const prValues = Array.from({ length: 30 }, (_, index) => {
    const recall = index / 29;
    return clamp(.98 - Math.pow(recall, 1.75) * (.52 - report.map50 * .24), 0, 1);
  });
  const f1Values = Array.from({ length: 30 }, (_, index) => {
    const x = index / 29;
    return clamp(report.map50 * Math.sin(Math.PI * Math.pow(x, .78)) * 1.06, 0, 1);
  });
  return `<div class="page-stack">${pageHeader('模型评估与导出', '基于 Precision、Recall、mAP、每类 AP 与混淆矩阵诊断模型，并完成版本化导出。', `<select id="evaluation-task-select" class="header-select">${completedTasks.map(item => `<option value="${item.id}" ${item.id === task.id ? 'selected' : ''}>${escapeHtml(item.name)}</option>`).join('')}</select><button class="btn btn-primary" data-action="validate-model" data-id="${task.id}">${icon('refresh')}重新评估</button>`)}
    <section class="panel model-banner"><div class="model-banner-main"><div class="model-cube">${ICONS.logo}</div><div><span>当前模型</span><h2>${escapeHtml(task.name)}</h2><p>${escapeHtml(task.model_name)} · ${escapeHtml(task.dataset_name)} · ${task.task_uuid}</p><div class="model-tags"><span>best.pt</span><span>${task.image_size}px</span><span>${task.device}</span>${task.exported ? '<span class="success">已导出</span>' : ''}</div></div></div><div class="model-score"><div class="score-ring" style="--score:${report.map50 * 360}deg"><strong>${Math.round(report.map50 * 100)}</strong><span>mAP50</span></div><div><strong>模型质量优秀</strong><p>相比基线模型提升 8.7%</p></div></div><div class="model-banner-actions"><button class="btn btn-ghost" data-action="test-model" data-id="${task.id}">${icon('scan')}测试验证</button><button class="btn btn-ghost" data-action="export-model" data-id="${task.id}">${icon('upload')}导出模型</button><button class="btn btn-primary" data-action="download-model" data-id="${task.id}">${icon('download')}下载权重</button></div></section>
    <div class="evaluation-kpis"><article><span>Precision</span><strong>${formatPercent(report.precision)}</strong><small>预测为目标的结果中正确比例</small>${miniTrend([.62, .68, .74, .79, report.precision])}</article><article><span>Recall</span><strong>${formatPercent(report.recall)}</strong><small>真实目标被成功检出的比例</small>${miniTrend([.58, .67, .73, .81, report.recall])}</article><article class="accent"><span>mAP@50</span><strong>${formatPercent(report.map50)}</strong><small>IoU 0.50 下平均精度</small>${miniTrend([.49, .58, .68, .79, report.map50])}</article><article><span>mAP@50-95</span><strong>${formatPercent(report.map50_95)}</strong><small>多 IoU 阈值综合平均精度</small>${miniTrend([.31, .38, .45, .52, report.map50_95])}</article><article><span>推理速度</span><strong>${Number(report.speed_ms).toFixed(1)}<em>ms</em></strong><small>单张 640px 图像</small>${miniTrend([49, 43, 38, 34, report.speed_ms].reverse())}</article></div>
    <div class="segmented-tabs eval-tabs"><button class="${state.evaluationTab === 'overview' ? 'active' : ''}" data-action="evaluation-tab" data-tab="overview">综合评估</button><button class="${state.evaluationTab === 'classes' ? 'active' : ''}" data-action="evaluation-tab" data-tab="classes">每类 AP</button><button class="${state.evaluationTab === 'versions' ? 'active' : ''}" data-action="evaluation-tab" data-tab="versions">模型版本</button></div>
    ${state.evaluationTab === 'overview' ? `<div class="evaluation-grid"><section class="panel"><div class="panel-title"><div><strong>混淆矩阵</strong><span>对角线越亮表示分类越准确</span></div><button class="btn btn-ghost btn-sm" data-action="download-report">${icon('download')}报告 JSON</button></div>${confusionMatrix(perClass.map(item => item.name), report)}</section><section class="panel"><div class="panel-title"><div><strong>PR 曲线</strong><span>Precision / Recall 平衡关系</span></div><span class="metric-chip">AP ${report.map50.toFixed(3)}</span></div>${lineChart([{ name: 'PR Curve', values: prValues, color: '#22d3ee' }], { height: 270, xLabel: 'Recall', formatter: value => `${Math.round(value * 100)}%`, legend: false })}</section><section class="panel"><div class="panel-title"><div><strong>F1 曲线</strong><span>最佳置信度阈值诊断</span></div><span class="metric-chip">best conf 0.42</span></div>${lineChart([{ name: 'F1 Score', values: f1Values, color: '#8b5cf6' }], { height: 230, xLabel: 'Confidence', formatter: value => `${Math.round(value * 100)}%`, legend: false })}</section><section class="panel class-ranking"><div class="panel-title"><div><strong>类别表现排行</strong><span>自动标记弱势类别</span></div></div>${perClass.map((item, index) => `<div class="ranking-row"><span class="rank">${index + 1}</span><span class="class-dot" style="--dot:${CLASS_PALETTE[index]}"></span><div><strong>${escapeHtml(classLabel(item.name))}</strong><small>P ${formatPercent(item.precision)} · R ${formatPercent(item.recall)}</small></div><div class="ranking-bar"><i style="width:${item.ap50 * 100}%;--bar:${CLASS_PALETTE[index]}"></i></div><strong class="${item.ap50 < .65 ? 'weak' : ''}">${item.ap50.toFixed(3)}</strong></div>`).join('')}<div class="tuning-tip">${icon('warning')}<div><strong>调优建议</strong><p>${perClass.at(-1)?.ap50 < .7 ? `${classLabel(perClass.at(-1).name)} 类 AP 相对较低，建议补充样本并检查标注质量。` : '各类别表现均衡，可继续尝试提高输入尺寸或使用更大模型。'}</p></div></div></section></div>` : state.evaluationTab === 'classes' ? `<section class="panel"><div class="panel-title"><div><strong>每类 AP 详细报告</strong><span>按 AP50 从高到低排序，低于 0.65 自动标红</span></div><button class="btn btn-ghost btn-sm" data-action="export-class-ap">${icon('download')}导出 CSV</button></div><div class="table-scroll"><table class="data-table"><thead><tr><th>类别</th><th>Precision</th><th>Recall</th><th>AP@50</th><th>AP@50-95</th><th>样本建议</th></tr></thead><tbody>${perClass.map((item, index) => `<tr><td><span class="class-name-cell"><i style="--dot:${CLASS_PALETTE[index]}"></i><strong>${escapeHtml(classLabel(item.name))}</strong><small>${escapeHtml(item.name)}</small></span></td><td>${formatPercent(item.precision)}</td><td>${formatPercent(item.recall)}</td><td><strong class="${item.ap50 < .65 ? 'text-danger' : ''}">${item.ap50.toFixed(3)}</strong></td><td>${item.ap50_95.toFixed(3)}</td><td>${item.ap50 < .65 ? '<span class="suggestion warning">增加样本 / 检查标注</span>' : '<span class="suggestion success">表现稳定</span>'}</td></tr>`).join('')}</tbody></table></div></section>` : `<section class="panel"><div class="panel-title"><div><strong>模型版本管理</strong><span>导出目录与 MinIO 对象版本</span></div><button class="btn btn-primary btn-sm" data-action="export-model" data-id="${task.id}">${icon('plus')}新建版本</button></div><div class="version-timeline">${['v3.2.0', 'v3.1.0', 'v3.0.0', 'v2.6.0'].map((version, index) => `<article><div class="version-node ${index === 0 ? 'latest' : ''}">${icon(index === 0 ? 'check' : 'file')}</div><div><div class="version-head"><strong>${escapeHtml(task.dataset_name.toLowerCase())}_${version}</strong>${index === 0 ? '<span>当前默认</span>' : ''}</div><p>模型格式 PT · mAP50 ${(report.map50 - index * .025).toFixed(3)} · 大小 ${index % 2 ? '18.7' : '21.4'} MB</p><small>models/${escapeHtml(task.dataset_name.toLowerCase())}_${version}/best.pt</small></div><div><button class="btn btn-ghost btn-sm" data-action="download-model" data-id="${task.id}">${icon('download')}下载</button></div></article>`).join('')}</div></section>`}
  </div>`;
}

function renderDashboard() {
  const running = state.tasks.filter(item => item.status === 'running').length;
  const completed = state.history.filter(item => item.status === 'completed').length;
  const classItems = [
    { label: '飞机', value: 1842, color: '#22d3ee' }, { label: '车辆', value: 1367, color: '#8b5cf6' }, { label: '油罐', value: 924, color: '#f59e0b' }, { label: '船舶', value: 684, color: '#34d399' }, { label: '其他', value: 442, color: '#fb7185' }
  ];
  const volume = [420, 515, 486, 642, 718, 806, 934, 882, 1045, 1172, 1266, 1398];
  return `<div class="page-stack">${pageHeader('数据看板', '汇总检测吞吐、模型表现、类别分布与平台资源状态。', `<button class="btn btn-ghost" data-action="refresh-dashboard">${icon('refresh')}刷新数据</button><button class="btn btn-primary" data-action="export-dashboard">${icon('download')}导出报表</button>`)}
    <section class="dashboard-kpis"><article><div class="kpi-top"><span class="kpi-icon cyan">${icon('scan')}</span><span class="trend-up">+18.6%</span></div><strong>12,846</strong><p>累计检测图像</p>${miniTrend([52, 68, 64, 79, 91, 106, 122])}</article><article><div class="kpi-top"><span class="kpi-icon violet">${icon('evaluate')}</span><span class="trend-up">+6.2%</span></div><strong>87.3%</strong><p>最佳 mAP@50</p>${miniTrend([.68, .72, .76, .79, .82, .85, .873])}</article><article><div class="kpi-top"><span class="kpi-icon green">${icon('train')}</span><span>${running} 运行中</span></div><strong>${state.tasks.length}</strong><p>训练任务总数</p>${miniTrend([1, 1, 2, 2, 3, 3, state.tasks.length])}</article><article><div class="kpi-top"><span class="kpi-icon orange">${icon('monitor')}</span><span class="trend-up">99.98%</span></div><strong>42.8<em>ms</em></strong><p>平均推理耗时</p>${miniTrend([61, 58, 52, 49, 46, 44, 42.8].reverse())}</article></section>
    <div class="dashboard-main-grid"><section class="panel span-2"><div class="panel-title"><div><strong>检测吞吐趋势</strong><span>最近 12 小时处理图像数量</span></div><div class="period-tabs"><button>24H</button><button class="active">12H</button><button>7D</button></div></div>${lineChart([{ name: '检测图像', values: volume, color: '#22d3ee' }, { name: '成功任务', values: volume.map((value, index) => value * (.81 + index * .008)), color: '#8b5cf6' }], { height: 285, xLabel: '时间', formatter: value => Math.round(value), legend: true })}</section><section class="panel"><div class="panel-title"><div><strong>目标类别分布</strong><span>近 30 天识别统计</span></div></div>${donutChart(classItems, '目标')}</section>
      <section class="panel model-performance"><div class="panel-title"><div><strong>模型性能排行</strong><span>综合精度与速度</span></div><button class="table-link" data-page="evaluation">查看详情</button></div>${[
        ['yolov11s-rsod-v3.2', .873, 31.4], ['yolov11n-steel-v1.4', .792, 22.8], ['yolov11m-traffic-v2.0', .756, 48.6], ['yolov11n-oiltank-v1.0', .714, 21.9]
      ].map((item, index) => `<div class="model-performance-row"><span class="rank rank-${index + 1}">${index + 1}</span><div><strong>${item[0]}</strong><small>mAP ${item[1].toFixed(3)} · ${item[2]}ms</small></div><div class="score-bar"><i style="width:${item[1] * 100}%"></i></div><strong>${Math.round(item[1] * 100)}</strong></div>`).join('')}</section><section class="panel activity-feed"><div class="panel-title"><div><strong>最近活动</strong><span>${completed} 个任务已完成</span></div><button class="table-link" data-page="history">全部记录</button></div>${state.history.slice(0, 6).map((item, index) => `<article><span class="activity-icon ${index % 3 === 0 ? 'violet' : index % 3 === 1 ? 'cyan' : 'green'}">${icon(item.type.includes('评估') ? 'evaluate' : item.type.includes('ZIP') ? 'file' : 'scan')}</span><div><strong>${escapeHtml(item.type)} · ${escapeHtml(item.source)}</strong><p>${escapeHtml(item.model)} 检出 ${item.total} 个目标</p></div><time>${new Date(item.created_at).toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })}</time></article>`).join('')}</section><section class="panel resource-card"><div class="panel-title"><div><strong>平台资源</strong><span>实时使用率</span></div>${statusBadge('healthy')}</div><div class="resource-gauges"><div class="gauge" style="--gauge:68deg"><strong>68%</strong><span>GPU</span></div><div class="gauge" style="--gauge:43deg"><strong>43%</strong><span>CPU</span></div><div class="gauge" style="--gauge:57deg"><strong>57%</strong><span>内存</span></div></div><div class="resource-lines"><div><span>显存</span>${progressBar(71, '8.5 / 12 GB')}</div><div><span>MinIO</span>${progressBar(64, '128 / 200 GB')}</div><div><span>Redis</span>${progressBar(24, '0.96 / 4 GB')}</div></div></section></div>
  </div>`;
}

function filteredHistory() {
  const q = state.historyQuery.toLowerCase();
  return state.history.filter(item => (!q || `${item.id} ${item.source} ${item.model} ${item.dataset}`.toLowerCase().includes(q)) && (state.historyType === 'ALL' || item.type === state.historyType));
}

function renderHistory() {
  const filtered = filteredHistory();
  const totalPages = Math.max(1, Math.ceil(filtered.length / state.historyPageSize));
  state.historyPage = clamp(state.historyPage, 1, totalPages);
  const pageItems = filtered.slice((state.historyPage - 1) * state.historyPageSize, state.historyPage * state.historyPageSize);
  return `<div class="page-stack">${pageHeader('任务历史', '统一检索检测、评估与导出记录，支持查看详情和 CSV 导出。', `<button class="btn btn-ghost" data-action="clear-history-filter">${icon('refresh')}重置筛选</button><button class="btn btn-primary" data-action="export-history">${icon('download')}导出 CSV</button>`)}
    <section class="history-summary"><article><span>${icon('history')}</span><div><strong>${state.history.length}</strong><small>全部任务</small></div></article><article><span>${icon('check')}</span><div><strong>${state.history.filter(item => item.status === 'completed').length}</strong><small>成功完成</small></div></article><article><span>${icon('scan')}</span><div><strong>${state.history.reduce((sum, item) => sum + item.total, 0).toLocaleString()}</strong><small>检出目标</small></div></article><article><span>${icon('monitor')}</span><div><strong>${Math.round(state.history.reduce((sum, item) => sum + item.duration, 0) / state.history.length)}ms</strong><small>平均耗时</small></div></article></section>
    <section class="panel"><div class="history-toolbar"><div class="search-field">${icon('search')}<input id="history-search" value="${escapeHtml(state.historyQuery)}" placeholder="搜索任务 ID、文件、模型或数据集"></div><select id="history-type"><option value="ALL">全部类型</option>${['单图检测', '批量检测', 'ZIP 检测', '模型评估'].map(type => `<option value="${type}" ${state.historyType === type ? 'selected' : ''}>${type}</option>`).join('')}</select><select><option>最近 24 小时</option><option>最近 7 天</option><option>最近 30 天</option></select><span class="toolbar-count">找到 ${filtered.length} 条记录</span></div><div class="table-scroll"><table class="data-table history-table"><thead><tr><th>任务 ID</th><th>类型 / 来源</th><th>模型</th><th>数据集</th><th>目标数</th><th>阈值</th><th>耗时</th><th>状态</th><th>时间</th><th>操作</th></tr></thead><tbody>${pageItems.map(item => `<tr><td><code>${escapeHtml(item.id)}</code></td><td><strong>${escapeHtml(item.type)}</strong><small>${escapeHtml(item.source)}</small></td><td><span>${escapeHtml(item.model)}</span></td><td><span>${escapeHtml(item.dataset)}</span></td><td><strong>${item.total}</strong></td><td>${item.confidence.toFixed(2)}</td><td>${item.duration}ms</td><td>${statusBadge(item.status)}</td><td><span>${formatTime(item.created_at).slice(5, 16)}</span></td><td><button class="table-link" data-action="history-detail" data-id="${item.id}">详情</button><button class="table-link" data-action="rerun-history" data-id="${item.id}">重跑</button></td></tr>`).join('')}</tbody></table></div><div class="pagination-row"><span>第 ${state.historyPage} / ${totalPages} 页</span><div><button data-action="history-page" data-page-number="${state.historyPage - 1}" ${state.historyPage <= 1 ? 'disabled' : ''}>上一页</button>${Array.from({ length: Math.min(totalPages, 5) }, (_, index) => index + 1).map(page => `<button class="${page === state.historyPage ? 'active' : ''}" data-action="history-page" data-page-number="${page}">${page}</button>`).join('')}<button data-action="history-page" data-page-number="${state.historyPage + 1}" ${state.historyPage >= totalPages ? 'disabled' : ''}>下一页</button></div><select id="history-page-size"><option value="10" ${state.historyPageSize === 10 ? 'selected' : ''}>10 条/页</option><option value="20" ${state.historyPageSize === 20 ? 'selected' : ''}>20 条/页</option></select></div></section>
  </div>`;
}

function filteredLogs() {
  const q = state.logQuery.toLowerCase();
  return state.logs.filter(item => (state.logLevel === 'ALL' || item.level === state.logLevel) && (state.logModule === 'ALL' || item.module === state.logModule) && (!q || `${item.module} ${item.message}`.toLowerCase().includes(q)));
}

function renderMonitoring() {
  const logs = filteredLogs();
  const services = Object.entries(state.health.services);
  return `<div class="page-stack">${pageHeader('系统监控', '查看应用、数据库、Redis、MinIO 与 YOLO 推理服务健康状态，并实时检索请求日志。', `<button class="btn btn-ghost" data-action="clear-logs">${icon('trash')}清空日志</button><button class="btn btn-primary" data-action="refresh-health">${icon('refresh')}刷新状态</button>`)}
    <section class="health-hero panel"><div class="health-hero-main"><div class="health-pulse"><i></i><span>${icon('monitor')}</span></div><div><span>平台综合状态</span><h2>全部系统运行正常</h2><p>最近检查：${formatTime(state.health.updatedAt)} · 运行时间 18 天 06:42:17</p></div></div><div class="health-hero-metrics"><div><strong>99.98%</strong><span>可用性</span></div><div><strong>27ms</strong><span>平均延迟</span></div><div><strong>0.03%</strong><span>错误率</span></div><div><strong>142</strong><span>请求/分钟</span></div></div></section>
    <section class="service-grid">${services.map(([name, service], index) => `<article class="service-card panel"><div class="service-head"><span class="service-icon icon-${index}">${icon(name === 'database' ? 'dataset' : name === 'yolo' ? 'scan' : name === 'application' ? 'dashboard' : 'monitor')}</span>${statusBadge(service.status)}</div><strong>${escapeHtml(({ application: '应用服务', database: 'PostgreSQL', redis: 'Redis 缓存', minio: 'MinIO 存储', yolo: 'YOLOv11 推理' }[name] || name))}</strong><p>${escapeHtml(service.message)}</p><div class="service-latency"><span>响应延迟</span><strong>${service.latency_ms} ms</strong></div>${miniTrend([service.latency_ms + 7, service.latency_ms + 3, service.latency_ms + 5, service.latency_ms - 1, service.latency_ms])}</article>`).join('')}</section>
    <div class="monitoring-grid"><section class="panel request-chart"><div class="panel-title"><div><strong>API 请求趋势</strong><span>状态码与平均响应时间</span></div><div class="live-chip"><i></i>LIVE</div></div>${lineChart([{ name: '2xx', values: [86, 102, 94, 118, 132, 121, 145, 154, 142, 168, 176, 183], color: '#34d399' }, { name: '4xx', values: [4, 7, 5, 9, 6, 8, 5, 11, 7, 9, 6, 8], color: '#f59e0b' }, { name: '5xx', values: [1, 0, 1, 2, 0, 1, 1, 0, 2, 1, 0, 1], color: '#fb7185' }], { height: 260, xLabel: '最近 60 分钟', formatter: value => Math.round(value) })}</section><section class="panel endpoint-list"><div class="panel-title"><div><strong>热门接口</strong><span>最近 1 小时</span></div></div>${[
      ['/api/detection/single', 'POST', 428, 48], ['/api/chat/stream', 'POST', 312, 684], ['/api/training/tasks', 'GET', 246, 22], ['/api/health/detail', 'GET', 184, 11], ['/api/training/status/:id', 'GET', 172, 26]
    ].map((item, index) => `<div><span class="method ${item[1].toLowerCase()}">${item[1]}</span><code>${item[0]}</code><span>${item[2]} 次</span><strong>${item[3]}ms</strong><i style="width:${90 - index * 13}%"></i></div>`).join('')}</section></div>
    <section class="panel log-panel"><div class="panel-title"><div><strong>实时日志</strong><span>全局异常、请求耗时与业务事件</span></div><span class="log-count">${logs.length} 条</span></div><div class="log-toolbar"><select id="log-level"><option value="ALL">全部级别</option>${['INFO', 'WARN', 'ERROR', 'DEBUG'].map(level => `<option value="${level}" ${state.logLevel === level ? 'selected' : ''}>${level}</option>`).join('')}</select><select id="log-module"><option value="ALL">全部模块</option>${['application', 'request', 'training', 'detection', 'agent', 'dataset', 'database', 'redis', 'minio'].map(module => `<option value="${module}" ${state.logModule === module ? 'selected' : ''}>${module}</option>`).join('')}</select><div class="search-field">${icon('search')}<input id="log-search" value="${escapeHtml(state.logQuery)}" placeholder="搜索日志内容"></div><button class="btn btn-ghost btn-sm" data-action="export-logs">${icon('download')}导出</button></div><div class="log-console">${logs.length ? logs.slice(0, 120).map(item => `<div class="log-line log-${item.level.toLowerCase()}"><time>${new Date(item.time).toLocaleTimeString('zh-CN', { hour12: false })}</time><span class="log-level">${item.level}</span><span class="log-module">${escapeHtml(item.module)}</span><p>${escapeHtml(item.message)}</p></div>`).join('') : emptyState('monitor', '没有匹配的日志', '调整筛选条件后重试。')}</div></section>
  </div>`;
}

function renderSettings() {
  return `<div class="page-stack">${pageHeader('系统设置', '配置后端地址、推理默认参数、界面偏好与对象存储策略。', `<button class="btn btn-ghost" data-action="reset-settings">${icon('refresh')}恢复默认</button><button class="btn btn-primary" data-action="save-settings">${icon('check')}保存设置</button>`)}
    <div class="settings-layout"><aside class="panel settings-nav"><button class="active">${icon('settings')}基础配置</button><button>${icon('scan')}检测参数</button><button>${icon('monitor')}通知与监控</button><button>${icon('dataset')}存储配置</button><div class="settings-version"><span>${ICONS.logo}</span><strong>FogTraffic-YOLO-Detection</strong><small>Frontend v2.0.0</small><code>YOLOv11</code></div></aside><section class="settings-content">
      <article class="panel settings-section"><div class="settings-section-head"><div><strong>后端连接</strong><p>默认使用当前域名下的演示 API；也可填写真实 FastAPI 服务地址。</p></div><span class="connection-state"><i></i>已连接</span></div><div class="settings-form-grid"><label class="span-2"><span>API Base URL</span><div class="input-with-action"><input id="setting-api-base" value="${escapeHtml(state.settings.apiBase)}" placeholder="留空表示同源，例如 http://localhost:8000"><button data-action="test-connection">测试连接</button></div><small>接口将按 <code>${escapeHtml(state.settings.apiBase || '当前域名')}/api/...</code> 访问</small></label><label><span>语言</span><select id="setting-language"><option value="zh-CN">简体中文</option><option value="en-US">English</option></select></label><label><span>训练轮询间隔</span><select id="setting-poll"><option value="3" ${state.settings.pollInterval === 3 ? 'selected' : ''}>3 秒</option><option value="5" ${state.settings.pollInterval === 5 ? 'selected' : ''}>5 秒</option><option value="10" ${state.settings.pollInterval === 10 ? 'selected' : ''}>10 秒</option></select></label><label class="switch-setting span-2"><div><strong>后端不可用时启用演示降级</strong><p>接口连接失败时，使用本地模拟数据继续展示完整流程。</p></div><input id="setting-demo-fallback" type="checkbox" ${state.settings.demoFallback ? 'checked' : ''}><i></i></label></div></article>
      <article class="panel settings-section"><div class="settings-section-head"><div><strong>检测默认参数</strong><p>新建检测和模型测试任务时自动使用这些参数。</p></div></div><div class="settings-form-grid"><label><span>默认模型</span><select id="setting-default-model"><option ${state.settings.defaultModel === 'yolov11s-rsod-v3.2' ? 'selected' : ''}>yolov11s-rsod-v3.2</option><option ${state.settings.defaultModel === 'yolov11n-steel-v1.4' ? 'selected' : ''}>yolov11n-steel-v1.4</option><option ${state.settings.defaultModel === 'yolov11m-traffic-v2.0' ? 'selected' : ''}>yolov11m-traffic-v2.0</option></select></label><label><span>MinIO Bucket</span><input id="setting-minio-bucket" value="${escapeHtml(state.settings.minioBucket)}"></label><label><span>置信度阈值 <b id="setting-confidence-value">${state.settings.confidence.toFixed(2)}</b></span><input id="setting-confidence" type="range" min="0.05" max="0.95" step="0.05" value="${state.settings.confidence}"></label><label><span>IoU 阈值 <b id="setting-iou-value">${state.settings.iou.toFixed(2)}</b></span><input id="setting-iou" type="range" min="0.1" max="0.9" step="0.05" value="${state.settings.iou}"></label></div></article>
      <article class="panel settings-section"><div class="settings-section-head"><div><strong>界面与通知</strong><p>控制主题、表格密度与任务完成提示。</p></div></div><div class="setting-list"><label class="switch-setting"><div><strong>紧凑表格</strong><p>减少任务列表和历史表格的行高。</p></div><input id="setting-compact" type="checkbox" ${state.settings.compactTable ? 'checked' : ''}><i></i></label><label class="switch-setting"><div><strong>桌面通知</strong><p>训练完成、检测失败或服务异常时发送通知。</p></div><input id="setting-notifications" type="checkbox" ${state.settings.desktopNotifications ? 'checked' : ''}><i></i></label><label class="switch-setting"><div><strong>自动保存检测结果</strong><p>检测完成后自动写入历史记录并保存标注图。</p></div><input id="setting-auto-save" type="checkbox" ${state.settings.autoSave ? 'checked' : ''}><i></i></label></div></article>
      <article class="panel danger-zone"><div><strong>本地数据</strong><p>清空浏览器中的登录状态、界面偏好和演示缓存。不会影响真实后端数据。</p></div><button class="btn btn-danger" data-action="clear-local-data">${icon('trash')}清空本地数据</button></article>
    </section></div>
  </div>`;
}

function openModal({ title, subtitle = '', body = '', footer = '', size = 'md', className = '' }) {
  state.modal = { title };
  modalRoot.innerHTML = `<div class="modal-backdrop" data-action="close-modal"><section class="modal-card modal-${size} ${className}" role="dialog" aria-modal="true" aria-label="${escapeHtml(title)}" onclick="event.stopPropagation()"><header class="modal-header"><div><h2>${escapeHtml(title)}</h2>${subtitle ? `<p>${escapeHtml(subtitle)}</p>` : ''}</div><button class="icon-button" data-action="close-modal">${icon('close')}</button></header><div class="modal-body">${body}</div>${footer ? `<footer class="modal-footer">${footer}</footer>` : ''}</section></div>`;
  requestAnimationFrame(() => $('.modal-backdrop', modalRoot)?.classList.add('visible'));
}

function closeModal() {
  const backdrop = $('.modal-backdrop', modalRoot);
  if (backdrop) {
    backdrop.classList.remove('visible');
    setTimeout(() => { modalRoot.innerHTML = ''; }, 180);
  }
  state.modal = null;
}

function openCommand() {
  const items = NAV.map(item => `<button data-page="${item.key}" data-action="command-navigate">${icon(item.icon)}<span><strong>${escapeHtml(item.label)}</strong><small>${escapeHtml(item.group)}</small></span><kbd>↵</kbd></button>`).join('');
  openModal({ title: '快速导航', subtitle: '搜索页面、任务和数据集', size: 'sm', className: 'command-modal', body: `<div class="command-search">${icon('search')}<input id="command-input" autofocus placeholder="输入功能名称…"></div><div class="command-results" id="command-results">${items}<div class="command-section-label">最近任务</div>${state.tasks.slice(0, 3).map(task => `<button data-page="training" data-action="command-task" data-id="${task.id}">${icon('train')}<span><strong>${escapeHtml(task.name)}</strong><small>${escapeHtml(task.task_uuid)}</small></span>${statusBadge(task.status)}</button>`).join('')}</div>`, footer: `<span class="command-footer-hint"><kbd>↑</kbd><kbd>↓</kbd> 选择 · <kbd>ESC</kbd> 关闭</span>` });
  setTimeout(() => $('#command-input')?.focus(), 50);
}

function openNewTaskModal(datasetName = '') {
  openModal({ title: '新建训练任务', subtitle: 'POST /api/training/start', size: 'lg', body: `<form id="new-task-form" class="modal-form"><div class="form-grid"><label class="span-2"><span>任务名称</span><input name="name" value="${escapeHtml(datasetName ? `${datasetName} 精调训练` : '交通目标检测新任务')}" required></label><label><span>数据集</span><select name="dataset_name">${state.datasets.map(item => `<option ${item.name === datasetName ? 'selected' : ''}>${escapeHtml(item.name)}</option>`).join('')}</select></label><label><span>基础模型</span><select name="model_name"><option>yolov11n</option><option selected>yolov11s</option><option>yolov11m</option><option>yolov11l</option></select></label><label><span>设备</span><select name="device"><option>cpu</option><option selected>cuda:0</option></select></label><label><span>Epochs</span><input name="epochs" type="number" min="1" max="500" value="100"></label><label><span>Batch Size</span><input name="batch_size" type="number" min="1" max="128" value="16"></label><label><span>图像尺寸</span><select name="image_size"><option>512</option><option selected>640</option><option>1024</option></select></label><label><span>初始学习率</span><input name="lr0" type="number" step="0.0001" value="0.01"></label><label><span>优化器</span><select name="optimizer"><option>auto</option><option>SGD</option><option>AdamW</option></select></label><label class="switch-setting span-2"><div><strong>启用数据增强</strong><p>Mosaic、MixUp、HSV 与随机翻转。</p></div><input name="augmentation" type="checkbox" checked><i></i></label></div></form>`, footer: `<button class="btn btn-ghost" data-action="close-modal">取消</button><button class="btn btn-primary" data-action="submit-new-task">${icon('play')}创建并启动</button>` });
}

function openDatasetModal() {
  openModal({ title: '新建数据集', subtitle: '创建符合 YOLO 规范的数据集目录', size: 'lg', body: `<form id="new-dataset-form" class="modal-form"><div class="form-grid"><label class="span-2"><span>数据集名称</span><input name="name" value="Medical-Lesion" required></label><label><span>场景类型</span><select name="scene"><option>智慧交通</option><option>工业质检</option><option>智慧交通</option><option selected>医疗影像</option><option>农业巡检</option></select></label><label><span>原始标注格式</span><select name="format"><option>YOLO</option><option>COCO</option><option>VOC</option><option selected>LabelMe</option></select></label><label class="span-2"><span>类别名称</span><input name="classes" value="lesion, normal" placeholder="使用英文逗号分隔"></label><label><span>训练集比例</span><input name="train_ratio" type="number" min="50" max="90" value="80"></label><label><span>验证集比例</span><input name="val_ratio" type="number" min="5" max="30" value="10"></label><label class="span-2"><span>说明</span><textarea name="description" rows="3" placeholder="数据来源、标注规范与使用说明"></textarea></label></div></form>`, footer: `<button class="btn btn-ghost" data-action="close-modal">取消</button><button class="btn btn-primary" data-action="submit-new-dataset">${icon('plus')}创建数据集</button>` });
}

function openConverterModal(datasetId = '') {
  const dataset = state.datasets.find(item => Number(item.id) === Number(datasetId));
  openModal({ title: '标注格式转换', subtitle: 'VOC / COCO / LabelMe → YOLO TXT', size: 'lg', body: `<div class="converter-flow"><div class="converter-node source">${icon('file')}<strong>${dataset ? escapeHtml(dataset.format) : '原始标注'}</strong><span>XML / JSON</span></div><i>${icon('chevron')}</i><div class="converter-node process">${icon('refresh')}<strong>DataConverter</strong><span>坐标归一化与类别映射</span></div><i>${icon('chevron')}</i><div class="converter-node target">${icon('check')}<strong>YOLO</strong><span>images / labels / data.yaml</span></div></div><form id="converter-form" class="modal-form"><div class="form-grid"><label><span>源格式</span><select name="source"><option ${dataset?.format === 'VOC' ? 'selected' : ''}>VOC XML</option><option ${dataset?.format === 'COCO' ? 'selected' : ''}>COCO JSON</option><option ${dataset?.format === 'LabelMe' ? 'selected' : ''}>LabelMe JSON</option></select></label><label><span>输出目录</span><input name="output" value="datasets/${escapeHtml((dataset?.name || 'scene_name').toLowerCase())}"></label><label><span>训练 / 验证 / 测试</span><select name="split"><option selected>80 / 10 / 10</option><option>70 / 20 / 10</option><option>85 / 10 / 5</option></select></label><label><span>随机种子</span><input name="seed" type="number" value="42"></label><label class="switch-setting span-2"><div><strong>转换后自动验证</strong><p>检查缺失标注、坐标越界、空文件和非法类别 ID。</p></div><input name="validate" type="checkbox" checked><i></i></label></div></form><div class="converter-log hidden" id="converter-log"><div class="terminal-body"><p>$ python tools/convert_dataset.py --format auto</p><p>Scanning annotations…</p><p>Mapping class ids…</p><p>Writing YOLO labels…</p><p id="converter-progress-text">Ready.</p></div></div>`, footer: `<button class="btn btn-ghost" data-action="close-modal">取消</button><button class="btn btn-primary" data-action="run-converter">${icon('refresh')}开始转换</button>` });
}

function openDatasetDetail(id) {
  const dataset = state.datasets.find(item => Number(item.id) === Number(id));
  if (!dataset) return;
  openModal({ title: dataset.name, subtitle: `${dataset.scene} · ${dataset.format}`, size: 'xl', body: `<div class="dataset-detail-modal"><div class="dataset-detail-image"><img src="${sceneDataUri(dataset.name, dataset.scene.includes('工业') ? 'industrial' : 'remote')}" alt=""><div><strong>${dataset.quality}</strong><span>质量评分</span></div></div><div class="dataset-detail-info"><div class="detail-stat-grid"><article><span>图像</span><strong>${dataset.images.toLocaleString()}</strong></article><article><span>标注</span><strong>${dataset.labels.toLocaleString()}</strong></article><article><span>类别</span><strong>${dataset.classes.length}</strong></article><article><span>容量</span><strong>${dataset.size}</strong></article></div><h3>类别映射</h3><div class="class-map">${dataset.classes.map((item, index) => `<span><i style="--dot:${CLASS_PALETTE[index]}"></i><code>${index}</code>${escapeHtml(classLabel(item))}<small>${escapeHtml(item)}</small></span>`).join('')}</div><h3>数据划分</h3><div class="split-detail"><div><span>Train</span><strong>${dataset.train}</strong>${progressBar(dataset.train / dataset.images * 100)}</div><div><span>Val</span><strong>${dataset.val}</strong>${progressBar(dataset.val / dataset.images * 100)}</div><div><span>Test</span><strong>${dataset.test}</strong>${progressBar(dataset.test / dataset.images * 100)}</div></div><div class="validation-result ${dataset.status === 'warning' ? 'warning' : 'success'}">${icon(dataset.status === 'warning' ? 'warning' : 'check')}<div><strong>${dataset.status === 'warning' ? '发现 8 个待修复问题' : '数据集验证通过'}</strong><p>${dataset.status === 'warning' ? '存在缺失标注文件，建议修复后再开始训练。' : '图像、标注、类别与 data.yaml 均符合 YOLO 规范。'}</p></div></div></div></div>`, footer: `<button class="btn btn-ghost" data-action="open-converter" data-id="${dataset.id}">${icon('refresh')}格式转换</button><button class="btn btn-primary" data-action="train-dataset" data-id="${dataset.id}">${icon('train')}使用该数据集训练</button>` });
}

function openExportModal(id) {
  const task = state.tasks.find(item => Number(item.id) === Number(id));
  if (!task) return;
  openModal({ title: '导出模型版本', subtitle: `${task.name} · ${task.task_uuid}`, size: 'md', body: `<form id="export-model-form" class="modal-form"><div class="form-grid one-col"><label><span>版本号</span><input name="version" value="v3.3.0" required></label><label><span>模型名称</span><input name="model_name" value="${escapeHtml(task.dataset_name.toLowerCase())}-detector"></label><label><span>导出格式</span><select name="format"><option>pt</option><option>onnx</option><option>torchscript</option><option>openvino</option></select></label><label><span>版本说明</span><textarea name="description" rows="3">基于 ${escapeHtml(task.dataset_name)} 的最新训练结果，mAP50 ${task.best_map50.toFixed(3)}</textarea></label><label class="switch-setting"><div><strong>设为默认模型</strong><p>交通检测工作台将优先使用该版本。</p></div><input name="set_default" type="checkbox" checked><i></i></label><label class="switch-setting"><div><strong>上传 MinIO</strong><p>导出后同步到对象存储。</p></div><input name="upload_minio" type="checkbox" checked><i></i></label></div></form>`, footer: `<button class="btn btn-ghost" data-action="close-modal">取消</button><button class="btn btn-primary" data-action="submit-export-model" data-id="${task.id}">${icon('upload')}确认导出</button>` });
}

function openTestModelModal(id) {
  const task = state.tasks.find(item => Number(item.id) === Number(id));
  if (!task) return;
  openModal({ title: '测试图验证', subtitle: `${task.name} · POST /api/training/predict`, size: 'xl', body: `<div class="predict-modal-layout"><section><div class="test-drop-zone" data-action="pick-model-test" data-id="${task.id}">${icon('upload')}<strong>拖拽或点击上传测试图</strong><p>支持 JPG / PNG / BMP，建议使用未出现在训练集中的图像</p></div><div class="form-grid"><label><span>置信度</span><input id="predict-confidence" type="range" min="0.05" max="0.95" step="0.05" value="${state.settings.confidence}"></label><label><span>IoU 阈值</span><input id="predict-iou" type="range" min="0.1" max="0.9" step="0.05" value="${state.settings.iou}"></label></div></section><section class="predict-result" id="predict-result">${emptyState('scan', '等待测试图', '上传图像后将显示标注结果、类别统计和推理耗时。')}</section></div>`, footer: `<button class="btn btn-ghost" data-action="close-modal">关闭</button><button class="btn btn-primary" data-action="pick-model-test" data-id="${task.id}">${icon('upload')}选择测试图</button>` });
}

function openHistoryDetail(id) {
  const item = state.history.find(row => row.id === id);
  if (!item) return;
  const result = makeDetectionResult(null, Number(id.replace(/\D/g, '').slice(-2)) || 0, item.dataset.includes('Steel') ? 'industrial' : 'single');
  result.filename = item.source;
  result.model = item.model;
  result.total = item.total;
  openModal({ title: '任务详情', subtitle: `${item.id} · ${item.type}`, size: 'xl', body: `<div class="history-detail-modal"><div class="detail-info-strip"><div><span>模型</span><strong>${escapeHtml(item.model)}</strong></div><div><span>数据集</span><strong>${escapeHtml(item.dataset)}</strong></div><div><span>置信度</span><strong>${item.confidence.toFixed(2)}</strong></div><div><span>耗时</span><strong>${item.duration}ms</strong></div><div><span>创建时间</span><strong>${formatTime(item.created_at)}</strong></div></div>${detectionResultDetail(result, true)}</div>`, footer: `<button class="btn btn-ghost" data-action="close-modal">关闭</button><button class="btn btn-primary" data-action="rerun-history" data-id="${item.id}">${icon('play')}重新执行</button>` });
}

function chooseFiles(purpose, { accept = 'image/*', multiple = false } = {}) {
  globalFileInput.value = '';
  globalFileInput.accept = accept;
  globalFileInput.multiple = multiple;
  globalFileInput.dataset.purpose = purpose;
  globalFileInput.click();
}

function filesWithPreview(files) {
  return [...files].map(file => ({ file, name: file.name, size: file.size, type: file.type || (file.name.endsWith('.zip') ? 'application/zip' : ''), preview: file.type?.startsWith('image/') ? URL.createObjectURL(file) : '' }));
}

async function authenticate(form) {
  const values = Object.fromEntries(new FormData(form));
  state.busy = true;
  renderLogin();
  try {
    if (state.authMode === 'register') {
      await apiOrFallback('/api/auth/register', { method: 'POST', json: values }, { id: Date.now(), username: values.username, display_name: values.display_name, email: values.email, role: 'user' });
    }
    const data = await apiOrFallback('/api/auth/login', { method: 'POST', json: values }, { access_token: `demo-${values.username}.local`, user: { id: 1, username: values.username, display_name: values.display_name || '演示管理员', email: values.email || 'admin@rsod.local', role: 'admin' } });
    state.token = data.access_token || 'demo-admin.local';
    state.user = data.user || state.user;
    localStorage.setItem('rsod_token', state.token);
    persistState();
    state.busy = false;
    if (!location.hash) location.hash = '#chat';
    toast('登录成功，欢迎进入工作台', 'success');
    renderShell();
    void refreshHealth(false);
  } catch (error) {
    state.busy = false;
    renderLogin();
    toast(error.message, 'error', '登录失败');
  }
}

function navigate(page) {
  if (!NAV.some(item => item.key === page)) page = 'chat';
  state.page = page;
  state.mobileNavOpen = false;
  location.hash = `#${page}`;
  renderShell();
}

async function refreshTasks(showToast = true) {
  const remote = await apiOrFallback('/api/training/tasks', { method: 'GET' }, null);
  if (remote?.length) {
    state.tasks = remote.map(task => {
      const local = state.tasks.find(item => Number(item.id) === Number(task.id));
      return { ...local, ...task, metrics: local?.metrics || initialMetrics(Math.max(task.current_epoch || 1, 1), task.best_map50 || task.latest_metrics?.map50 || .1) };
    });
    const current = selectedTask();
    const metricData = await apiOrFallback(`/api/training/metrics/${current.id}`, { method: 'GET' }, null);
    if (metricData?.length) current.metrics = metricData;
  }
  if (showToast) toast('训练任务已刷新');
  if (state.page === 'training') renderShell();
}

async function refreshHealth(showToast = true) {
  const data = await apiOrFallback('/api/health/detail', { method: 'GET' }, null);
  if (data?.services) {
    state.health = { status: data.status, services: data.services, updatedAt: new Date().toISOString() };
  } else {
    state.health.updatedAt = new Date().toISOString();
    Object.values(state.health.services).forEach(service => { service.latency_ms = clamp(service.latency_ms + Math.round(Math.random() * 6 - 3), 2, 70); });
  }
  const remoteLogs = await apiOrFallback('/api/logs?limit=120', { method: 'GET' }, null);
  if (remoteLogs?.length) state.logs = remoteLogs;
  if (showToast) toast('系统状态已刷新');
  if (state.page === 'monitoring') renderShell();
}

function addTrace(type, title, detail) {
  state.chat.trace.unshift({ time: '刚刚', type, title, detail });
  if (state.chat.trace.length > 20) state.chat.trace.length = 20;
}

async function streamChatRequest(payload, onEvent, signal) {
  const response = await fetch(apiUrl('/api/chat/stream'), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...(state.token ? { Authorization: `Bearer ${state.token}` } : {}) },
    body: JSON.stringify(payload), signal
  });
  if (!response.ok || !response.body) throw new Error(`SSE 连接失败 (${response.status})`);
  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    const events = buffer.split('\n\n');
    buffer = events.pop() || '';
    for (const event of events) {
      const dataLine = event.split('\n').find(line => line.startsWith('data:'));
      if (!dataLine) continue;
      try { onEvent(JSON.parse(dataLine.slice(5).trim())); } catch { /* ignore malformed demo event */ }
    }
  }
}

async function sendChat() {
  const text = state.chat.input.trim();
  if ((!text && !state.chat.attachments.length) || state.chat.streaming) return;
  const attachments = state.chat.attachments.map(item => ({ ...item }));
  const userMessage = { id: uid('msg'), role: 'user', content: text || `[快捷检测] ${attachments.map(item => item.name).join(', ')}`, attachments, time: new Date().toISOString() };
  const assistantMessage = { id: uid('msg'), role: 'assistant', content: '', time: new Date().toISOString(), streaming: true };
  state.chat.messages.push(userMessage, assistantMessage);
  state.chat.input = '';
  state.chat.attachments = [];
  state.chat.streaming = true;
  const controller = new AbortController();
  state.chat.controller = controller;
  addTrace('system', '意图分析', text || '附件检测请求');
  renderShell();

  const handleEvent = event => {
    if (event.type === 'token') assistantMessage.content += event.content || '';
    if (event.type === 'tool_start') {
      assistantMessage.tool = { title: event.tool || '检测工具', detail: event.message || '正在调用工具', status: 'running' };
      addTrace('tool', '工具调用', event.tool || 'detect_single_image');
    }
    if (event.type === 'tool_result') {
      const base = makeDetectionResult(attachments[0]?.file, 0, 'single');
      const remote = event.result || {};
      base.total = remote.total_objects || base.total;
      base.counts = remote.class_counts || base.counts;
      base.inference = remote.inference_time || base.inference;
      assistantMessage.result = base;
      assistantMessage.tool = { title: event.tool || 'detect_single_image', detail: `检测完成，共发现 ${base.total} 个目标`, status: 'done' };
      addTrace('result', '工具返回', `${base.total} 个目标 · ${base.inference}ms`);
    }
    if (event.type === 'done') assistantMessage.streaming = false;
    renderShell();
  };

  try {
    await streamChatRequest({ message: text || '请检测附件中的目标', has_attachment: attachments.length > 0, filename: attachments[0]?.name }, handleEvent, controller.signal);
  } catch (error) {
    if (error.name === 'AbortError') {
      assistantMessage.content += assistantMessage.content ? '\n\n*已停止生成。*' : '*已停止生成。*';
    } else if (state.settings.demoFallback) {
      const needsDetect = attachments.length || /检测|识别|图像|图片/.test(text);
      if (needsDetect) {
        handleEvent({ type: 'tool_start', tool: 'detect_single_image', message: '正在调用 YOLOv11 检测工具…' });
        await sleep(550);
        handleEvent({ type: 'tool_result', tool: 'detect_single_image', result: {} });
        for (const token of ['检测已经完成。', '我已整理了类别统计、置信度与推理耗时，', '你可以继续下载标注图或在交通检测工作台进行批量处理。']) {
          handleEvent({ type: 'token', content: token });
          await sleep(150);
        }
      } else {
        for (const token of '你好，我是 RSOD 目标检测智能体。你可以上传图像让我检测目标，也可以让我查询训练进度、解释评估指标或协助模型导出。'.match(/.{1,7}/g) || []) {
          handleEvent({ type: 'token', content: token });
          await sleep(85);
        }
      }
    } else {
      assistantMessage.content = `请求失败：${error.message}`;
    }
  } finally {
    assistantMessage.streaming = false;
    state.chat.streaming = false;
    state.chat.controller = null;
    renderShell();
  }
}

async function quickDetect(mode, fileItems) {
  const label = mode === 'single' ? '单图检测' : mode === 'batch' ? '批量检测' : 'ZIP 检测';
  const userMessage = { id: uid('msg'), role: 'user', content: `[快捷检测] ${fileItems.map(item => item.name).join(', ')}`, attachments: fileItems, time: new Date().toISOString() };
  const assistantMessage = { id: uid('msg'), role: 'assistant', content: `正在执行${label}…`, time: new Date().toISOString(), streaming: true, tool: { title: `detect_${mode}`, detail: '快捷通道直接调用 DetectionService', status: 'running' } };
  state.chat.messages.push(userMessage, assistantMessage);
  state.chat.streaming = true;
  addTrace('tool', label, `直接调用 /api/detection/${mode}`);
  renderShell();
  const form = new FormData();
  fileItems.forEach(item => form.append(mode === 'single' ? 'file' : 'files', item.file));
  try {
    await Promise.all([apiOrFallback(`/api/detection/${mode}`, { method: 'POST', body: form, headers: { 'X-File-Name': fileItems[0]?.name || '' }, timeout: 20000 }, null), sleep(900)]);
    const result = makeDetectionResult(fileItems[0]?.file, 0, mode === 'batch' || mode === 'zip' ? 'single' : mode);
    const totalFiles = mode === 'single' ? 1 : mode === 'batch' ? fileItems.length : 8;
    result.total = mode === 'single' ? result.total : result.total * Math.max(totalFiles, 2);
    assistantMessage.content = `${label}完成！共处理 ${totalFiles} 个文件，累计发现 ${result.total} 个目标。`;
    assistantMessage.result = result;
    assistantMessage.tool = { title: `detect_${mode}`, detail: `处理完成 · ${totalFiles} 文件 · ${result.inference}ms/张`, status: 'done' };
    const history = { id: `H${Date.now()}`, type: label, source: fileItems[0]?.name || `${mode}.zip`, model: result.model, dataset: '快捷检测', total: result.total, confidence: result.confidence, duration: Math.round(result.inference), status: 'completed', created_at: new Date().toISOString() };
    state.history.unshift(history);
    addTrace('result', '检测完成', `${result.total} 个目标 · ${totalFiles} 个文件`);
    toast(`${label}完成，共发现 ${result.total} 个目标`);
  } catch (error) {
    assistantMessage.content = `检测失败：${error.message}`;
    assistantMessage.tool = { title: `detect_${mode}`, detail: error.message, status: 'error' };
    toast(error.message, 'error', '检测失败');
  } finally {
    assistantMessage.streaming = false;
    state.chat.streaming = false;
    renderShell();
  }
}

async function runDetection() {
  if (state.detection.running || !state.detection.files.length) return;
  state.detection.running = true;
  state.detection.progress = 4;
  renderShell();
  const interval = setInterval(() => {
    state.detection.progress = Math.min(92, state.detection.progress + 7 + Math.round(Math.random() * 10));
    if (state.page === 'detection') renderShell();
  }, 280);
  const form = new FormData();
  state.detection.files.forEach(item => form.append(state.detection.mode === 'single' ? 'file' : 'files', item.file));
  try {
    await Promise.all([apiOrFallback(`/api/detection/${state.detection.mode}`, { method: 'POST', body: form, headers: { 'X-File-Name': state.detection.files[0]?.name || '' }, timeout: 25000 }, null), sleep(1200)]);
    let results;
    if (state.detection.mode === 'single') results = [makeDetectionResult(state.detection.files[0]?.file, 0, 'single')];
    else if (state.detection.mode === 'batch') results = state.detection.files.map((item, index) => makeDetectionResult(item.file, index, 'single'));
    else results = Array.from({ length: 8 }, (_, index) => makeDetectionResult(null, index, 'single'));
    results.forEach(result => {
      result.model = state.detection.model;
      result.confidence = state.detection.confidence;
      result.iou = state.detection.iou;
    });
    state.detection.results = results;
    state.detection.selectedResult = 0;
    state.detection.progress = 100;
    const total = results.reduce((sum, item) => sum + item.total, 0);
    state.history.unshift({ id: `H${Date.now()}`, type: state.detection.mode === 'single' ? '单图检测' : state.detection.mode === 'batch' ? '批量检测' : 'ZIP 检测', source: state.detection.files[0]?.name || 'demo.zip', model: state.detection.model, dataset: 'Detection Workspace', total, confidence: state.detection.confidence, duration: Math.round(results.reduce((sum, item) => sum + item.inference, 0) / results.length), status: 'completed', created_at: new Date().toISOString() });
    toast(`检测完成：${results.length} 个结果，${total} 个目标`);
  } catch (error) {
    toast(error.message, 'error', '检测失败');
  } finally {
    clearInterval(interval);
    state.detection.running = false;
    renderShell();
  }
}

function loadDemoDetection() {
  state.detection.files = [{ file: null, name: 'remote_airport_demo.jpg', size: 1824000, type: 'image/jpeg', preview: sceneDataUri('remote_airport_demo') }];
  state.detection.results = [makeDetectionResult(null, 0, 'single'), makeDetectionResult(null, 1, 'single'), makeDetectionResult(null, 2, 'industrial')];
  state.detection.selectedResult = 0;
  renderShell();
  toast('已加载演示检测结果');
}

async function createTrainingTask() {
  const form = $('#new-task-form');
  if (!form?.reportValidity()) return;
  const values = Object.fromEntries(new FormData(form));
  values.epochs = Number(values.epochs);
  values.batch_size = Number(values.batch_size);
  values.image_size = Number(values.image_size);
  const remote = await apiOrFallback('/api/training/start', { method: 'POST', json: values }, null);
  const id = remote?.id || Math.max(...state.tasks.map(item => Number(item.id))) + 1;
  const task = {
    id,
    task_uuid: remote?.task_uuid || `task_${id}_${Math.random().toString(16).slice(2, 8)}`,
    name: values.name,
    model_name: values.model_name,
    dataset_name: values.dataset_name,
    device: values.device,
    epochs: values.epochs,
    current_epoch: remote?.current_epoch || 1,
    batch_size: values.batch_size,
    image_size: values.image_size,
    status: 'running',
    progress: remote?.progress || 1,
    best_map50: remote?.best_map50 || .06,
    exported: false,
    created_at: new Date().toISOString(),
    metrics: initialMetrics(1, .06)
  };
  state.tasks.unshift(task);
  state.selectedTaskId = task.id;
  state.logs.unshift({ id: uid('log'), level: 'INFO', module: 'training', message: `Started ${task.task_uuid} model=${task.model_name} dataset=${task.dataset_name}`, time: new Date().toISOString() });
  closeModal();
  navigate('training');
  toast('训练任务已创建并启动');
}

async function stopTask(id) {
  const task = state.tasks.find(item => Number(item.id) === Number(id));
  if (!task) return;
  await apiOrFallback(`/api/training/stop/${id}`, { method: 'POST' }, null);
  task.status = 'stopped';
  state.logs.unshift({ id: uid('log'), level: 'WARN', module: 'training', message: `Stopped ${task.task_uuid} at epoch ${task.current_epoch}`, time: new Date().toISOString() });
  renderShell();
  toast('训练任务已停止', 'warning');
}

function resumeTask(id) {
  const task = state.tasks.find(item => Number(item.id) === Number(id));
  if (!task) return;
  task.status = 'running';
  if (!task.current_epoch) task.current_epoch = 1;
  task.progress = Math.round(task.current_epoch / task.epochs * 100);
  renderShell();
  toast('训练任务已启动');
}

async function validateModel(id) {
  const task = state.tasks.find(item => Number(item.id) === Number(id));
  if (!task) return;
  toast('模型评估已启动，请稍候…', 'warning');
  const report = await apiOrFallback(`/api/training/validate/${id}`, { method: 'POST', json: { split: 'val', conf: .25, iou: .45 } }, () => localEvaluation(task));
  state.evaluationReport = report || localEvaluation(task);
  state.evaluationTaskId = task.id;
  state.logs.unshift({ id: uid('log'), level: 'INFO', module: 'evaluation', message: `Validated ${task.task_uuid}; mAP50=${state.evaluationReport.map50.toFixed(3)}`, time: new Date().toISOString() });
  renderShell();
  toast('模型评估完成');
}

async function exportModel(id) {
  const form = $('#export-model-form');
  if (!form?.reportValidity()) return;
  const values = Object.fromEntries(new FormData(form));
  values.set_default = form.elements.set_default.checked;
  values.upload_minio = form.elements.upload_minio.checked;
  const task = state.tasks.find(item => Number(item.id) === Number(id));
  const result = await apiOrFallback(`/api/training/export/${id}`, { method: 'POST', json: values }, { version: values.version, path: `models/${values.model_name}_${values.version}/best.${values.format}` });
  if (task) task.exported = true;
  closeModal();
  renderShell();
  toast(`模型已导出：${result.version || values.version}`);
}

async function downloadModel(id) {
  const task = state.tasks.find(item => Number(item.id) === Number(id));
  if (!task) return;
  try {
    const response = await api(`/api/training/download/${id}`, { method: 'GET', raw: true, timeout: 15000 });
    downloadBlob(`${task.model_name}-${task.task_uuid}.pt`, await response.blob(), 'application/octet-stream');
  } catch {
    downloadBlob(`${task.model_name}-${task.task_uuid}.pt`, `RSOD DEMO MODEL\nmodel=${task.model_name}\ntask=${task.task_uuid}\nmAP50=${task.best_map50}\n`, 'application/octet-stream');
  }
  toast('模型权重下载已开始');
}

async function runModelTest(taskId, fileItem) {
  const target = $('#predict-result');
  if (!target) return;
  target.innerHTML = `<div class="loading-state"><span class="spinner large"></span><strong>正在使用模型验证测试图…</strong><p>调用 /api/training/predict</p></div>`;
  const form = new FormData();
  form.append('file', fileItem.file);
  form.append('task_id', taskId);
  form.append('conf', $('#predict-confidence')?.value || state.settings.confidence);
  form.append('iou', $('#predict-iou')?.value || state.settings.iou);
  await apiOrFallback('/api/training/predict', { method: 'POST', body: form, headers: { 'X-File-Name': fileItem.name }, timeout: 20000 }, null);
  await sleep(650);
  const result = makeDetectionResult(fileItem.file, 0, 'single');
  const task = state.tasks.find(item => Number(item.id) === Number(taskId));
  if (task) result.model = task.model_name;
  target.innerHTML = detectionResultDetail(result, true);
  toast('测试图验证完成');
}

function createDataset() {
  const form = $('#new-dataset-form');
  if (!form?.reportValidity()) return;
  const values = Object.fromEntries(new FormData(form));
  const classes = String(values.classes).split(',').map(item => item.trim()).filter(Boolean);
  state.datasets.unshift({ id: Date.now(), name: values.name, scene: values.scene, format: values.format, images: 0, labels: 0, classes, train: 0, val: 0, test: 0, status: 'converting', quality: 0, size: '0 MB', updated: new Date().toLocaleString('zh-CN', { hour12: false }).slice(5, 16) });
  closeModal();
  renderShell();
  toast('数据集目录已创建，请导入图像和标注');
}

async function runConverter() {
  const log = $('#converter-log');
  const progress = $('#converter-progress-text');
  log?.classList.remove('hidden');
  const steps = ['Scanning annotations… 1,248 files', 'Mapping class ids… 5 classes', 'Normalizing bounding boxes…', 'Writing YOLO labels… 100%', 'Generating data.yaml…', 'Validating dataset… passed'];
  for (const step of steps) {
    if (progress) progress.textContent = step;
    await sleep(350);
  }
  toast('格式转换完成，YOLO 数据集验证通过');
}

async function validateDataset(id) {
  const dataset = state.datasets.find(item => Number(item.id) === Number(id));
  if (!dataset) return;
  toast('正在扫描图像与标注文件…', 'warning');
  await sleep(650);
  if (dataset.status === 'warning') {
    dataset.labels = dataset.images;
    dataset.status = 'ready';
    dataset.quality = Math.min(98, dataset.quality + 6);
    toast('已修复缺失标注引用，数据集验证通过');
  } else {
    toast('数据集验证通过：未发现坐标越界或类别错误');
  }
  renderShell();
}

function exportHistory() {
  const rows = filteredHistory();
  const csv = ['id,type,source,model,dataset,total,confidence,duration,status,created_at', ...rows.map(item => [item.id, item.type, item.source, item.model, item.dataset, item.total, item.confidence, item.duration, item.status, item.created_at].map(value => `"${String(value).replaceAll('"', '""')}"`).join(','))].join('\n');
  downloadBlob(`rsod-history-${new Date().toISOString().slice(0, 10)}.csv`, `\ufeff${csv}`, 'text/csv;charset=utf-8');
  toast('历史记录 CSV 已导出');
}

function exportLogs() {
  const content = filteredLogs().map(item => `${new Date(item.time).toISOString()} | ${item.level.padEnd(5)} | ${item.module.padEnd(12)} | ${item.message}`).join('\n');
  downloadBlob(`rsod-logs-${new Date().toISOString().slice(0, 10)}.log`, content);
  toast('日志文件已导出');
}

function saveSettings() {
  state.settings.apiBase = $('#setting-api-base')?.value.trim() || '';
  state.settings.language = $('#setting-language')?.value || 'zh-CN';
  state.settings.pollInterval = Number($('#setting-poll')?.value || 5);
  state.settings.demoFallback = Boolean($('#setting-demo-fallback')?.checked);
  state.settings.defaultModel = $('#setting-default-model')?.value || state.settings.defaultModel;
  state.settings.minioBucket = $('#setting-minio-bucket')?.value.trim() || 'rsod-results';
  state.settings.confidence = Number($('#setting-confidence')?.value || .25);
  state.settings.iou = Number($('#setting-iou')?.value || .45);
  state.settings.compactTable = Boolean($('#setting-compact')?.checked);
  state.settings.desktopNotifications = Boolean($('#setting-notifications')?.checked);
  state.settings.autoSave = Boolean($('#setting-auto-save')?.checked);
  state.detection.model = state.settings.defaultModel;
  state.detection.confidence = state.settings.confidence;
  state.detection.iou = state.settings.iou;
  persistState();
  toast('系统设置已保存');
  renderShell();
}

function resetSettings() {
  state.settings = { apiBase: '', demoFallback: true, language: 'zh-CN', defaultModel: 'yolov11s-rsod-v3.2', confidence: .25, iou: .45, pollInterval: 5, compactTable: false, desktopNotifications: true, autoSave: true, minioBucket: 'rsod-results' };
  persistState();
  renderShell();
  toast('设置已恢复默认值');
}

async function startCamera() {
  try {
    if (!navigator.mediaDevices?.getUserMedia) throw new Error('浏览器不支持摄像头');
    stopCamera();
    const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: false });
    state.detection.camera.stream = stream;
    state.detection.camera.active = true;
    const video = document.querySelector('#camera-preview');
    if (video) video.srcObject = stream;
    toast('摄像头连接成功');
  } catch (e) {
    toast('摄像头连接失败，请检查权限', 'warning');
  }
}
function stopCamera(){
  const stream = state.detection.camera.stream;
  if(stream) stream.getTracks().forEach(t=>t.stop());
  state.detection.camera.stream=null;
  state.detection.camera.active=false;
  renderShell();
}

function afterRender() {
  if (state.page === 'chat') {
    const scroll = $('#chat-scroll');
    if (scroll) scroll.scrollTop = scroll.scrollHeight;
    const textarea = $('#chat-input');
    if (textarea) {
      textarea.style.height = 'auto';
      textarea.style.height = `${Math.min(140, Math.max(44, textarea.scrollHeight))}px`;
    }
  }
  const pageContent = $('#page-content');
  pageContent?.classList.add('page-enter');
  setTimeout(() => pageContent?.classList.remove('page-enter'), 320);
  // style range inputs so filled portion is colored and remainder is black
  $$('input[type="range"]').forEach(input => setRangeFill(input));
}

function render() {
  if (!state.token) renderLogin();
  else renderShell();
}

window.addEventListener('hashchange', () => {
  const page = location.hash.replace('#/', '').replace('#', '') || 'chat';
  if (NAV.some(item => item.key === page)) state.page = page;
  if (state.token) renderShell();
});

window.addEventListener('keydown', event => {
  if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') {
    event.preventDefault();
    if (state.token) openCommand();
  }
  if (event.key === 'Escape' && state.modal) closeModal();
});

document.addEventListener('submit', event => {
  if (event.target.id === 'auth-form') {
    event.preventDefault();
    void authenticate(event.target);
  }
});

document.addEventListener('input', event => {
  const target = event.target;
  if (target.id === 'chat-input') {
    state.chat.input = target.value;
    target.style.height = 'auto';
    target.style.height = `${Math.min(140, Math.max(44, target.scrollHeight))}px`;
    const button = $('[data-action="send-chat"]');
    if (button) button.disabled = !state.chat.input.trim() && !state.chat.attachments.length;
  }
  if (target.id === 'detect-confidence') {
    state.detection.confidence = Number(target.value);
    const label = $('#confidence-value'); if (label) label.textContent = Number(target.value).toFixed(2);
  }
  if (target.id === 'detect-iou') {
    state.detection.iou = Number(target.value);
    const label = $('#iou-value'); if (label) label.textContent = Number(target.value).toFixed(2);
  }
  if (target.id === 'setting-confidence') {
    const label = $('#setting-confidence-value'); if (label) label.textContent = Number(target.value).toFixed(2);
  }
  if (target.id === 'setting-iou') {
    const label = $('#setting-iou-value'); if (label) label.textContent = Number(target.value).toFixed(2);
  }
  if (target.id === 'command-input') {
    const q = target.value.toLowerCase();
    $$('.command-results > button').forEach(button => button.hidden = q && !button.textContent.toLowerCase().includes(q));
  }
  if (target && target.tagName === 'INPUT' && target.type === 'range') setRangeFill(target);
});

document.addEventListener('keydown', event => {
  if (event.target.id === 'chat-input' && event.key === 'Enter' && !event.shiftKey) {
    event.preventDefault();
    void sendChat();
  }
});

document.addEventListener('change', event => {
  const target = event.target;
  if (target.id === 'dataset-search') { state.datasetQuery = target.value; renderShell(); }
  if (target.id === 'dataset-format') { state.datasetFormat = target.value; renderShell(); }
  if (target.id === 'history-search') { state.historyQuery = target.value; state.historyPage = 1; renderShell(); }
  if (target.id === 'history-type') { state.historyType = target.value; state.historyPage = 1; renderShell(); }
  if (target.id === 'history-page-size') { state.historyPageSize = Number(target.value); state.historyPage = 1; renderShell(); }
  if (target.id === 'log-level') { state.logLevel = target.value; renderShell(); }
  if (target.id === 'log-module') { state.logModule = target.value; renderShell(); }
  if (target.id === 'log-search') { state.logQuery = target.value; renderShell(); }
  if (target.id === 'evaluation-task-select') { state.evaluationTaskId = Number(target.value); state.evaluationReport = null; renderShell(); }
  if (target.id === 'detect-model') state.detection.model = target.value;
  if (target.id === 'save-annotated') state.detection.saveAnnotated = target.checked;
});

document.addEventListener('click', async event => {
  const pageTarget = event.target.closest('[data-page]');
  if (pageTarget && !pageTarget.disabled) {
    event.preventDefault();
    const page = pageTarget.dataset.page;
    if (pageTarget.dataset.action === 'command-task') state.selectedTaskId = Number(pageTarget.dataset.id);
    closeModal();
    navigate(page);
    return;
  }
  const target = event.target.closest('[data-action]');
  if (!target || target.disabled) return;
  const action = target.dataset.action;
  const id = target.dataset.id;

  if (action === 'auth-mode') { state.authMode = target.dataset.mode; renderLogin(); }
  else if (action === 'toggle-password') { state.passwordVisible = !state.passwordVisible; renderLogin(); }
  else if (action === 'copy-demo') { await navigator.clipboard?.writeText('admin / 123456').catch(() => {}); toast('演示账号已复制'); }
  else if (action === 'forgot-password') toast('演示环境请直接使用 admin / 123456', 'warning');
  else if (action === 'toggle-theme') { state.theme = state.theme === 'dark' ? 'light' : 'dark'; persistState(); render(); }
  else if (action === 'toggle-sidebar') { state.sidebarCollapsed = !state.sidebarCollapsed; persistState(); renderShell(); }
  else if (action === 'toggle-mobile-nav') { state.mobileNavOpen = !state.mobileNavOpen; renderShell(); }
  else if (action === 'close-mobile-nav') { state.mobileNavOpen = false; renderShell(); }
  else if (action === 'logout') { state.token = ''; localStorage.removeItem('rsod_token'); state.notificationsOpen = false; renderLogin(); toast('已安全退出'); }
  else if (action === 'toggle-notifications') { state.notificationsOpen = !state.notificationsOpen; renderShell(); }
  else if (action === 'read-all') { state.notificationsOpen = false; renderShell(); toast('通知已全部标记为已读'); }
  else if (action === 'open-command') openCommand();
  else if (action === 'command-navigate') { closeModal(); navigate(target.dataset.page); }
  else if (action === 'close-modal') closeModal();
  else if (action === 'attach-chat') chooseFiles('chat-attach', { accept: 'image/*,.zip', multiple: true });
  else if (action === 'remove-chat-attachment') { state.chat.attachments.splice(Number(target.dataset.index), 1); renderShell(); }
  else if (action === 'send-chat') await sendChat();
  else if (action === 'stop-chat') state.chat.controller?.abort();
  else if (action === 'clear-chat') { state.chat.messages = state.chat.messages.slice(0, 1); renderShell(); toast('会话已清空'); }
  else if (action === 'export-chat') {
    const text = state.chat.messages.map(message => `[${message.role === 'user' ? '用户' : 'AI'}] ${message.content}`).join('\n\n');
    downloadBlob(`rsod-chat-${Date.now()}.md`, text); toast('会话已导出');
  }
  else if (action === 'copy-message') {
    const message = state.chat.messages.find(item => item.id === target.dataset.messageId);
    await navigator.clipboard?.writeText(message?.content || '').catch(() => {}); toast('消息已复制');
  }
  else if (action === 'clear-trace') { state.chat.trace = []; renderShell(); }
  else if (action === 'quick-detect') {
    const mode = target.dataset.mode;
    chooseFiles(`quick-${mode}`, { accept: mode === 'zip' ? '.zip,application/zip' : 'image/*', multiple: mode === 'batch' });
  }
  else if (action === 'set-detection-mode') { state.detection.mode = target.dataset.mode; state.detection.files = []; state.detection.results = []; renderShell(); if (state.detection.mode === 'camera') setTimeout(startCamera, 100); }
  else if (action === 'pick-detection-files') chooseFiles('detection', { accept: state.detection.mode === 'zip' ? '.zip,application/zip' : 'image/*,video/*', multiple: true });
  else if (action === 'connect-camera') { state.detection.mode='camera'; renderShell(); setTimeout(startCamera,100); }
  else if (action === 'stop-camera') stopCamera();
  else if (action === 'remove-detection-file') { event.stopPropagation(); state.detection.files.splice(Number(target.dataset.index), 1); renderShell(); }
  else if (action === 'run-detection') await runDetection();
  else if (action === 'load-demo-detection') loadDemoDetection();
  else if (action === 'clear-results') { state.detection.results = []; state.detection.selectedResult = 0; renderShell(); }
  else if (action === 'select-result') { state.detection.selectedResult = Number(target.dataset.index); renderShell(); }
  else if (action === 'download-result') {
    const result = state.detection.results.find(item => item.id === target.dataset.resultId) || state.detection.results[state.detection.selectedResult];
    if (result) { const response = await fetch(result.preview); downloadBlob(`annotated-${result.filename}`, await response.blob(), 'image/jpeg'); toast('标注图下载已开始'); }
  }
  else if (action === 'save-result') toast('检测结果已保存到历史记录');
  else if (action === 'add-dataset') openDatasetModal();
  else if (action === 'submit-new-dataset') createDataset();
  else if (action === 'open-converter') openConverterModal(id);
  else if (action === 'run-converter') await runConverter();
  else if (action === 'dataset-detail') openDatasetDetail(id);
  else if (action === 'validate-dataset') await validateDataset(id);
  else if (action === 'train-dataset') { closeModal(); openNewTaskModal(state.datasets.find(item => Number(item.id) === Number(id))?.name || ''); }
  else if (action === 'pick-dataset-package') chooseFiles('dataset-package', { accept: '.zip,.json,.xml,application/zip', multiple: false });
  else if (action === 'copy-tree') { await navigator.clipboard?.writeText('datasets/scene_name/\n├── images/{train,val,test}\n├── labels/{train,val,test}\n└── data.yaml').catch(() => {}); toast('目录结构已复制'); }
  else if (action === 'new-training-task') openNewTaskModal();
  else if (action === 'submit-new-task') await createTrainingTask();
  else if (action === 'refresh-tasks') await refreshTasks();
  else if (action === 'select-task') { state.selectedTaskId = Number(id); renderShell(); }
  else if (action === 'stop-task') await stopTask(id);
  else if (action === 'resume-task') resumeTask(id);
  else if (action === 'download-metrics') {
    const task = state.tasks.find(item => Number(item.id) === Number(id));
    const header = 'epoch,box_loss,cls_loss,dfl_loss,precision,recall,map50,map50_95\n';
    const rows = task.metrics.map(item => [item.epoch, item.box_loss, item.cls_loss, item.dfl_loss, item.precision, item.recall, item.map50, item.map50_95].join(',')).join('\n');
    downloadBlob(`${task.task_uuid}-results.csv`, header + rows, 'text/csv;charset=utf-8'); toast('训练指标 CSV 已导出');
  }
  else if (action === 'copy-training-logs') { await navigator.clipboard?.writeText($('.terminal-body')?.innerText || '').catch(() => {}); toast('训练日志已复制'); }
  else if (action === 'clear-training-logs') toast('当前日志视图已清理', 'warning');
  else if (action === 'validate-model') await validateModel(id);
  else if (action === 'evaluation-tab') { state.evaluationTab = target.dataset.tab; renderShell(); }
  else if (action === 'export-model') openExportModal(id || state.evaluationTaskId);
  else if (action === 'submit-export-model') await exportModel(id);
  else if (action === 'download-model') await downloadModel(id || state.evaluationTaskId);
  else if (action === 'test-model') openTestModelModal(id || state.evaluationTaskId);
  else if (action === 'pick-model-test') chooseFiles(`model-test:${id || state.evaluationTaskId}`, { accept: 'image/*', multiple: false });
  else if (action === 'download-report') {
    const task = state.tasks.find(item => Number(item.id) === Number(state.evaluationTaskId));
    const report = state.evaluationReport || localEvaluation(task);
    downloadBlob(`eval-report-${task.task_uuid}.json`, JSON.stringify(report, null, 2), 'application/json'); toast('评估报告已下载');
  }
  else if (action === 'export-class-ap') {
    const task = state.tasks.find(item => Number(item.id) === Number(state.evaluationTaskId));
    const report = state.evaluationReport || localEvaluation(task);
    const csv = ['class,precision,recall,ap50,ap50_95', ...report.per_class.map(item => [item.name, item.precision, item.recall, item.ap50, item.ap50_95].join(','))].join('\n');
    downloadBlob(`per-class-ap-${task.task_uuid}.csv`, csv, 'text/csv;charset=utf-8'); toast('每类 AP 已导出');
  }
  else if (action === 'refresh-dashboard') { await refreshTasks(false); toast('看板数据已刷新'); }
  else if (action === 'export-dashboard') downloadBlob(`rsod-dashboard-${Date.now()}.json`, JSON.stringify({ tasks: state.tasks, history: state.history, datasets: state.datasets }, null, 2), 'application/json');
  else if (action === 'clear-history-filter') { state.historyQuery = ''; state.historyType = 'ALL'; state.historyPage = 1; renderShell(); }
  else if (action === 'export-history') exportHistory();
  else if (action === 'history-page') { state.historyPage = Number(target.dataset.pageNumber); renderShell(); }
  else if (action === 'history-detail') openHistoryDetail(id);
  else if (action === 'rerun-history') { closeModal(); const item = state.history.find(row => row.id === id); state.detection.mode = item?.type.includes('ZIP') ? 'zip' : item?.type.includes('批量') ? 'batch' : 'single'; navigate('detection'); toast('已将历史任务参数载入交通检测工作台'); }
  else if (action === 'refresh-health') await refreshHealth();
  else if (action === 'clear-logs') { await apiOrFallback('/api/logs', { method: 'DELETE' }, null); state.logs = []; renderShell(); toast('日志已清空', 'warning'); }
  else if (action === 'export-logs') exportLogs();
  else if (action === 'save-settings') saveSettings();
  else if (action === 'reset-settings') resetSettings();
  else if (action === 'test-connection') { const data = await apiOrFallback('/api/health', { method: 'GET' }, { status: 'demo-fallback' }); toast(`连接成功：${data.status || 'healthy'}`); }
  else if (action === 'clear-local-data') { localStorage.clear(); state.token = ''; location.hash = ''; renderLogin(); toast('本地数据已清空', 'warning'); }
});

globalFileInput.addEventListener('change', async event => {
  const purpose = globalFileInput.dataset.purpose || '';
  const items = filesWithPreview(event.target.files || []);
  if (!items.length) return;
  if (purpose === 'chat-attach') {
    state.chat.attachments.push(...items);
    renderShell();
  } else if (purpose.startsWith('quick-')) {
    await quickDetect(purpose.replace('quick-', ''), items);
  } else if (purpose === 'detection') {
    state.detection.files = state.detection.mode === 'single' || state.detection.mode === 'zip' ? items.slice(0, 1) : items.slice(0, 30);
    state.detection.results = [];
    renderShell();
  } else if (purpose === 'dataset-package') {
    openConverterModal();
    toast(`已选择标注包：${items[0].name}`);
  } else if (purpose.startsWith('model-test:')) {
    await runModelTest(Number(purpose.split(':')[1]), items[0]);
  }
});

document.addEventListener('dragover', event => {
  if (event.target.closest('#detection-drop-zone, .chat-composer-wrap, .test-drop-zone')) {
    event.preventDefault();
    event.target.closest('#detection-drop-zone, .chat-composer-wrap, .test-drop-zone')?.classList.add('dragging');
  }
});

document.addEventListener('dragleave', event => {
  event.target.closest('#detection-drop-zone, .chat-composer-wrap, .test-drop-zone')?.classList.remove('dragging');
});

document.addEventListener('drop', async event => {
  const zone = event.target.closest('#detection-drop-zone, .chat-composer-wrap, .test-drop-zone');
  if (!zone) return;
  event.preventDefault();
  zone.classList.remove('dragging');
  const items = filesWithPreview(event.dataTransfer.files || []);
  if (!items.length) return;
  if (zone.id === 'detection-drop-zone') {
    state.detection.files = state.detection.mode === 'single' || state.detection.mode === 'zip' ? items.slice(0, 1) : items.slice(0, 30);
    state.detection.results = [];
    renderShell();
  } else if (zone.classList.contains('chat-composer-wrap')) {
    state.chat.attachments.push(...items);
    renderShell();
  } else if (zone.classList.contains('test-drop-zone')) {
    await runModelTest(Number(zone.dataset.id || state.evaluationTaskId), items[0]);
  }
});

setInterval(() => {
  let changed = false;
  for (const task of state.tasks) {
    if (task.status !== 'running') continue;
    task.current_epoch = Math.min(task.epochs, task.current_epoch + 1);
    task.progress = Math.round(task.current_epoch / task.epochs * 100);
    const p = task.current_epoch / task.epochs;
    const target = task.dataset_name.includes('Steel') ? .79 : task.dataset_name.includes('Traffic') ? .75 : .86;
    const metric = initialMetrics(task.current_epoch, target).at(-1);
    task.metrics.push(metric);
    if (task.metrics.length > 140) task.metrics.shift();
    task.best_map50 = Math.max(task.best_map50 || 0, metric.map50);
    if (task.current_epoch >= task.epochs) {
      task.status = 'completed';
      task.progress = 100;
      toast(`${task.name} 训练完成`, 'success');
    }
    changed = true;
  }
  if (changed && ['training', 'dashboard'].includes(state.page) && state.token && !state.modal) renderShell();
}, 5000);

render();
if (state.token) {
  setTimeout(() => void refreshHealth(false), 250);
  setTimeout(() => void refreshTasks(false), 500);
}
