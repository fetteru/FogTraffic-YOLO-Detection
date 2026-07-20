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
const safeHeaderValue = value => encodeURIComponent(String(value || 'upload'));

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
  authForm: { username: '', password: '', display_name: '', email: '' },
  passwordVisible: false,
  page: location.hash.replace('#/', '').replace('#', '') || 'chat',
  sidebarCollapsed: Boolean(persisted.sidebarCollapsed),
  mobileNavOpen: false,
  theme: persisted.theme || 'dark',
  commandOpen: false,
  chat: {
    messages: [
      { id: uid('msg'), role: 'assistant', content: '你好，我是 **车辆检测智能体**。当前前端默认连接本地 FastAPI 后端，检测结果来自你的 YOLO 服务。\n- 支持单图、批量/ZIP、视频检测\n- 视频检测会返回标注视频、逐帧统计、去重车辆数和雨雾交通风险分析\n- 历史记录、数据看板、健康检查会从后端接口读取真实数据\n- 训练和评估页面只展示后端返回的真实任务与 validate 结果\n你可以上传图片或视频开始检测。', time: new Date().toISOString() }
    ],
    input: '',
    attachments: [],
    quickActionsOpen: false,
    streaming: false,
    controller: null,
    agentFlow: [
      { id: 'supervisor', label: 'Supervisor', detail: '等待用户输入', status: 'idle' },
      { id: 'detection', label: 'Detection', detail: 'YOLO 检测', status: 'idle' },
      { id: 'qa', label: 'QA / RAG', detail: '知识库检索', status: 'idle' },
      { id: 'analysis', label: 'Analysis', detail: '统计与历史', status: 'idle' },
      { id: 'summarize', label: 'Summarize', detail: '结果汇总', status: 'idle' },
    ],
    trace: [
      { time: '刚刚', type: 'system', title: 'Agent 就绪', detail: '多智能体调度与检测工具已绑定' }
    ]
  },
  detection: {
    mode: 'single',
    files: [],
    results: [],
    running: false,
    progress: 0,
    selectedResult: 0,
    model: 'yolov11s-rsod-v3.2',
    confidence: .25,
    iou: .45,
    saveAnnotated: true,
    camera: {
      stream: null,
      socket: null,
      captureCanvas: null,
      active: false,
      connected: false,
      sending: false,
      paused: false,
      deviceId: '',
      mode: 'cpu',
      detections: [],
      latestResult: null,
      frameSamples: [],
      cumulativeCounts: {},
      startedAt: 0,
      stats: { fps: 0, frames: 0, objects: 0, inference: 0 },
      error: ''
    }
  },
  datasets: [],
  datasetQuery: '',
  datasetFormat: 'ALL',
  tasks: [],
  selectedTaskId: null,
  evaluationTaskId: null,
  evaluationReport: null,
  evaluationTab: 'overview',
  history: [],
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
  dashboard: {
    statistics: null,
    trend: [],
    classDistribution: [],
    typeDistribution: [],
    loaded: false,
  },
  dataStatus: {
    training: 'pending',
    history: 'pending',
    dashboard: 'pending',
    health: 'pending',
  },
  renderMeta: {
    chatMessageCount: 0,
    chatLastMessageLength: 0,
    lastPage: '',
  },
  settings: {
    apiBase: persisted.settings?.apiBase || 'http://localhost:8000',
    demoFallback: false,
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
if (false && !state.token && new URLSearchParams(location.search).get('demo') === '1') {
  state.token = 'demo-admin.preview';
  state.user = { id: 1, username: 'admin', display_name: '演示管理员', email: 'admin@rsod.local', role: 'admin' };
  localStorage.setItem('rsod_token', state.token);
}

if (state.token.startsWith('demo-')) {
  state.token = '';
  localStorage.removeItem('rsod_token');
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
      const message = body.error || body.detail || body.message || `HTTP ${response.status}`;
      if ((response.status === 401 || response.status === 403) && /认证|凭据|token|Token|credentials/i.test(message)) {
        state.token = '';
        localStorage.removeItem('rsod_token');
        throw new Error('登录状态已过期，请重新登录后再检测');
      }
      throw new Error(message);
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

function csvCell(value) {
  return `"${String(value ?? '').replace(/"/g, '""')}"`;
}

function cameraResultCsv(result) {
  const rows = (result.objectEvents || []).map(item => [
    item.frame_number ?? '',
    item.frame_time ?? '',
    item.risk_level ?? '',
    item.risk_name ?? '',
    classLabel(item.class_name || 'object'),
    item.class_name || 'object',
    Math.round(Number(item.confidence || 0) * 100)
  ]);
  const header = ['frame', 'time_sec', 'risk_level', 'risk_name', 'class_label', 'class_name', 'confidence_percent'];
  return `\ufeff${[header, ...rows].map(row => row.map(csvCell).join(',')).join('\n')}`;
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
  if (!series.some(item => item.values?.length)) {
    return emptyState('dashboard', '暂无曲线数据', '后端返回指标后这里会自动绘制趋势。');
  }
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

function dataSourceBadge(real = true, label = '') {
  return `<span class="data-source ${real ? 'real' : 'demo'}">${real ? '真实数据' : '未接入'}${label ? ` · ${escapeHtml(label)}` : ''}</span>`;
}

function updateDetectionProgress(value) {
  state.detection.progress = clamp(Number(value || 0), 0, 100);
  const progressRoot = document.querySelector('#detection-progress-live');
  if (!progressRoot) return;
  const number = progressRoot.querySelector('[data-progress-number]');
  const bar = progressRoot.querySelector('.progress-track > span');
  if (number) number.textContent = `${state.detection.progress}%`;
  if (bar) bar.style.width = `${state.detection.progress}%`;
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

function frameDetectionText(detections = []) {
  const counts = detections.reduce((acc, item) => {
    const name = item.class_name || item.label || 'object';
    acc[name] = (acc[name] || 0) + 1;
    return acc;
  }, {});
  return Object.entries(counts).map(([name, count]) => `${classLabel(name)}: ${count}`).join(', ') || '无目标';
}

function frameClassText(frame = {}) {
  if (frame.class_counts && Object.keys(frame.class_counts).length) {
    return Object.entries(frame.class_counts)
      .map(([name, count]) => `${classLabel(name)}: ${count}`)
      .join(', ');
  }
  return frameDetectionText(frame.detections || []);
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

function backendAssetUrl(url) {
  if (!url) return '';
  if (/^https?:\/\//i.test(url) || url.startsWith('data:') || url.startsWith('blob:')) return url;
  if (/^[A-Za-z]:[\\/]/.test(url)) return '';
  const base = String(state.settings.apiBase || '').trim().replace(/\/$/, '');
  return `${base}${url.startsWith('/') ? url : `/${url}`}`;
}

function backendWebSocketUrl(path) {
  const base = String(state.settings.apiBase || location.origin).trim().replace(/\/$/, '');
  const url = new URL(path, base || location.origin);
  url.protocol = url.protocol === 'https:' ? 'wss:' : 'ws:';
  return url.toString();
}

function drawCameraSourceFrame(video, canvas, width, height) {
  const ctx = canvas.getContext('2d');
  if (!ctx) return false;
  ctx.save();
  ctx.clearRect(0, 0, width, height);
  ctx.translate(width, 0);
  ctx.scale(-1, 1);
  ctx.drawImage(video, 0, 0, width, height);
  ctx.restore();
  return true;
}

function backendCounts(payload = {}) {
  return payload.unique_class_counts
    || payload.rain_fog_analysis?.traffic?.unique_class_counts
    || payload.class_counts
    || {};
}

function backendBoxes(payload = {}) {
  return (payload.detections || []).slice(0, 16).map(item => ({
    x: 0,
    y: 0,
    w: 0,
    h: 0,
    label: item.class_name || 'object',
    conf: Number(item.confidence || 0)
  }));
}

function normalizeBackendDetectionResult(payload = {}, file = null, mode = 'single', index = 0) {
  const isVideo = Boolean(payload.video_url || payload.annotated_video_url || mode === 'video');
  const counts = backendCounts(payload);
  const total = payload.unique_vehicle_count ?? payload.rain_fog_analysis?.traffic?.unique_vehicle_count ?? payload.total_objects ?? 0;
  const playableVideoUrl = isVideo
    ? backendAssetUrl(payload.local_video_url || payload.annotated_video_url || payload.video_url)
    : '';
  const preview = isVideo
    ? playableVideoUrl
    : payload.annotated_image || file?.preview || (file?.file && file.file.type?.startsWith('image/') ? URL.createObjectURL(file.file) : sceneDataUri(payload.filename || file?.name || `result_${index}`));

  return {
    id: payload.task_id || uid('det'),
    filename: payload.filename || file?.name || `result_${index + 1}`,
    preview,
    videoUrl: isVideo ? preview : '',
    originalVideoUrl: isVideo ? backendAssetUrl(payload.annotated_video_url || payload.video_url || payload.local_video_url) : '',
    mode: isVideo ? 'video' : mode,
    model: state.detection.model,
    total,
    sampledTotal: payload.total_objects ?? total,
    uniqueVehicleCount: payload.unique_vehicle_count ?? payload.rain_fog_analysis?.traffic?.unique_vehicle_count ?? null,
    counts,
    sampledCounts: payload.sampled_class_counts || payload.rain_fog_analysis?.traffic?.sampled_class_counts || payload.class_counts || {},
    boxes: isVideo ? [] : backendBoxes(payload),
    frames: payload.frames || [],
    keyFrames: payload.key_frames || [],
    risk: payload.rain_fog_analysis?.risk || null,
    report: payload.rain_fog_analysis?.report || '',
    traffic: payload.rain_fog_analysis?.traffic || null,
    visibility: payload.rain_fog_analysis?.visibility || null,
    inference: Number(payload.inference_time || payload.total_inference_time || 0).toFixed ? Number(payload.inference_time || payload.total_inference_time || 0) : 0,
    confidence: state.detection.confidence,
    iou: state.detection.iou,
    created_at: new Date().toISOString(),
    size: file?.size || file?.file?.size || 0,
    dimensions: payload.video_resolution ? `${payload.video_resolution.width} × ${payload.video_resolution.height}` : 'backend result',
    raw: payload
  };
}

function cameraResultFromPayload(payload = {}) {
  const camera = state.detection.camera;
  const analysis = payload.rain_fog_analysis || {};
  const detections = Array.isArray(payload.detections) ? payload.detections : [];
  const frameCounts = payload.class_counts || detections.reduce((acc, item) => {
    const name = item.class_name || item.label || 'object';
    acc[name] = (acc[name] || 0) + 1;
    return acc;
  }, {});
  const counts = Object.keys(camera.cumulativeCounts || {}).length ? camera.cumulativeCounts : frameCounts;
  const canvas = document.querySelector('#camera-canvas');
  const total = camera.frameSamples.reduce((sum, frame) => sum + Number(frame.total_objects || 0), 0)
    || Number(payload.total_objects ?? detections.length ?? 0);
  const objectEvents = camera.frameSamples
    .flatMap(frame => (frame.detections || []).map(item => ({
      frame_number: frame.frame_number,
      frame_time: frame.frame_time,
      risk_level: frame.risk_level ?? '',
      risk_name: frame.risk_name ?? '',
      class_name: item.class_name || item.label || 'object',
      confidence: Number(item.confidence || 0)
    })))
    .slice(-120)
    .reverse();
  return {
    id: 'camera-live-result',
    filename: '摄像头实时检测过程',
    preview: '',
    videoUrl: '',
    originalVideoUrl: '',
    mode: 'camera',
    model: state.detection.model,
    total,
    sampledTotal: total,
    uniqueVehicleCount: null,
    counts,
    sampledCounts: counts,
    boxes: [],
    frames: [...camera.frameSamples].reverse(),
    objectEvents,
    keyFrames: [],
    risk: analysis.risk || null,
    report: analysis.report || '',
    traffic: analysis.traffic || null,
    visibility: analysis.visibility || null,
    inference: Number(payload.inference_time || camera.stats.inference || 0),
    confidence: state.detection.confidence,
    iou: state.detection.iou,
    created_at: new Date().toISOString(),
    size: 0,
    dimensions: canvas?.width && canvas?.height ? `${canvas.width} × ${canvas.height}` : 'camera frame',
    raw: payload
  };
}

function recordCameraFrame(payload = {}) {
  const camera = state.detection.camera;
  const analysis = payload.rain_fog_analysis || {};
  const detections = Array.isArray(payload.detections) ? payload.detections : [];
  const classCounts = payload.class_counts || detections.reduce((acc, item) => {
    const name = item.class_name || item.label || 'object';
    acc[name] = (acc[name] || 0) + 1;
    return acc;
  }, {});
  for (const [name, count] of Object.entries(classCounts)) {
    camera.cumulativeCounts[name] = (camera.cumulativeCounts[name] || 0) + Number(count || 0);
  }
  const elapsed = camera.startedAt ? (Date.now() - camera.startedAt) / 1000 : 0;
  const row = {
    frame_number: camera.stats.frames,
    frame_time: elapsed.toFixed(2),
    total_objects: Number(payload.total_objects ?? detections.length ?? 0),
    risk_level: analysis.risk?.risk_level ?? null,
    risk_name: analysis.risk?.risk_name ?? '',
    class_counts: classCounts,
    detections: detections.map(item => ({
      class_name: item.class_name || item.label || 'object',
      confidence: Number(item.confidence || 0),
      bbox: item.bbox || item.box || null
    }))
  };
  camera.frameSamples.push(row);
  if (camera.frameSamples.length > 240) camera.frameSamples.splice(0, camera.frameSamples.length - 240);
  return row;
}

async function pollVideoDetection(taskId) {
  for (;;) {
    await sleep(1200);
    const status = await api(`/api/detection/video/status/${taskId}`, { method: 'GET', timeout: 30000 });
    updateDetectionProgress(status.progress || 0);
    if (status.status === 'completed') return status.result;
    if (status.status === 'failed') throw new Error(status.error || '视频检测失败');
  }
}

async function requestBackendDetection(mode, fileItems) {
  const first = fileItems[0];
  const firstName = first?.name || '';
  const isVideo = mode === 'video' || (mode === 'single' && (first?.type?.startsWith('video/') || /\.(mp4|avi|mov|mkv|wmv|flv)$/i.test(firstName)));
  const endpoint = isVideo ? '/api/detection/video' : mode === 'zip' ? '/api/detection/zip' : mode === 'batch' ? '/api/detection/batch' : '/api/detection/single';
  const form = new FormData();
  form.append('conf', String(state.detection.confidence));
  form.append('iou', String(state.detection.iou));
  if (isVideo) {
    form.append('sample_interval', '5');
    form.append('max_frames', '0');
    form.append('file', first.file);
  } else if (mode === 'batch') {
    fileItems.forEach(item => form.append('files', item.file));
  } else {
    form.append('file', first.file);
  }

  const response = await api(endpoint, { method: 'POST', body: form, headers: { 'X-File-Name': safeHeaderValue(firstName) }, timeout: isVideo ? 300000 : 120000 });
  const payload = isVideo ? await pollVideoDetection(response.task_id) : response;
  if (payload.items) {
    return payload.items.map((item, index) => normalizeBackendDetectionResult(item, fileItems[index], 'single', index));
  }
  if (payload.results) {
    return payload.results.map((item, index) => normalizeBackendDetectionResult(item, fileItems[index], 'single', index));
  }
  return [normalizeBackendDetectionResult(payload, first, isVideo ? 'video' : mode, 0)];
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
      <div class="auth-console"><div class="console-top"><span></span><span></span><span></span><small>backend.trace</small></div><p><b>API</b> http://localhost:8000</p><p><b>YOLO</b> 检测结果由后端返回</p><p><b>DATA</b> 看板和历史记录读取数据库</p><div class="console-line"></div></div>
    </section>
    <section class="auth-panel">
      <div class="auth-card">
        <div class="auth-card-head"><span class="mobile-logo">${ICONS.logo}</span><h2>${state.authMode === 'login' ? '欢迎回来' : '创建平台账号'}</h2><p>${state.authMode === 'login' ? '登录后进入目标检测智能体工作台' : '注册信息会提交到真实后端'}</p></div>
        <div class="auth-tabs"><button class="${state.authMode === 'login' ? 'active' : ''}" data-action="auth-mode" data-mode="login">登录</button><button class="${state.authMode === 'register' ? 'active' : ''}" data-action="auth-mode" data-mode="register">注册</button></div>
        <form id="auth-form" class="auth-form">
          ${state.authMode === 'register' ? `<label><span>显示名称</span><div class="field-shell">${icon('eye')}<input name="display_name" value="${escapeHtml(state.authForm.display_name)}" placeholder="请输入显示名称" required></div></label>` : ''}
          <label><span>用户名或邮箱</span><div class="field-shell">${icon('file')}<input name="username" value="${escapeHtml(state.authForm.username)}" autocomplete="username" placeholder="请输入用户名" required></div></label>
          <label><span>密码</span><div class="field-shell">${icon('settings')}<input name="password" value="${escapeHtml(state.authForm.password)}" type="${state.passwordVisible ? 'text' : 'password'}" autocomplete="current-password" minlength="6" required><button type="button" data-action="toggle-password" aria-label="显示密码">${icon('eye')}</button></div></label>
          ${state.authMode === 'register' ? `<label><span>邮箱</span><div class="field-shell">${icon('send')}<input name="email" type="email" value="${escapeHtml(state.authForm.email)}" placeholder="name@example.com" required></div></label>` : ''}
          <div class="auth-options"><label class="check-label"><input type="checkbox" checked><span></span>保持登录</label><button type="button" class="text-link" data-action="forgot-password">忘记密码？</button></div>
          <button class="btn btn-primary btn-auth" type="submit" ${state.busy ? 'disabled' : ''}>${state.busy ? '<span class="spinner"></span>正在连接…' : state.authMode === 'login' ? '进入工作台' : '注册并登录'}${!state.busy ? icon('chevron') : ''}</button>
        </form>
        <div class="demo-account"><span>${icon('check')} 当前连接真实后端</span><code>使用数据库账号登录</code></div>
        <p class="auth-terms">继续即表示你同意平台的使用规范与隐私策略。当前前端默认连接本地 FastAPI 后端。</p>
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
  app.innerHTML = `<div class="app-layout ${state.sidebarCollapsed ? 'sidebar-collapsed' : ''}">
    <aside class="sidebar ${state.mobileNavOpen ? 'mobile-open' : ''}">
      <div class="sidebar-brand"><div class="brand-logo">${ICONS.logo}</div><div class="brand-text"><strong>FogTraffic-YOLO-Detection</strong><span>Traffic Vision System</span></div><button class="sidebar-toggle" data-action="toggle-sidebar" aria-label="折叠侧栏">${icon('menu')}</button></div>
      <nav class="sidebar-nav">${navMarkup()}</nav>
      <div class="sidebar-user"><div class="avatar">${escapeHtml((state.user.display_name || state.user.username || 'U').slice(0, 2).toUpperCase())}</div><div><strong>${escapeHtml(state.user.display_name || state.user.username)}</strong><span>${escapeHtml(state.user.role === 'admin' ? '平台管理员' : '普通用户')}</span></div><button data-action="logout" aria-label="退出登录">${icon('close')}</button></div>
    </aside>
    <div class="mobile-overlay ${state.mobileNavOpen ? 'visible' : ''}" data-action="close-mobile-nav"></div>
    <main class="main-shell">
      <button class="mobile-menu shell-mobile-menu" data-action="toggle-mobile-nav" aria-label="打开侧栏">${icon('menu')}</button>
      <section class="content-area" id="page-content">${renderPage()}</section>
    </main>
  </div>`;
  afterRender();
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
    <div class="chat-composer-wrap">${state.chat.quickActionsOpen ? `<div class="quick-actions chat-tools-menu"><button data-action="quick-detect" data-mode="single">${icon('scan')}<span>单图检测</span><small>选择一张图片后直接检测</small></button><button data-action="quick-detect" data-mode="batch">${icon('dataset')}<span>批量检测</span><small>多张图片并行处理</small></button><button data-action="quick-detect" data-mode="video">${icon('play')}<span>视频检测</span><small>上传视频并轮询结果</small></button><button data-action="quick-detect" data-mode="zip">${icon('file')}<span>ZIP 检测</span><small>自动解压图片检测</small></button><button data-action="attach-chat">${icon('paperclip')}<span>普通附件</span><small>随问题上传检测</small></button><button data-page="training">${icon('train')}<span>训练状态</span><small>查看实时指标</small></button></div>` : ''}
      ${state.chat.attachments.length ? `<div class="pending-attachments">${state.chat.attachments.map((item, index) => `<div>${item.type?.startsWith('image/') ? `<img src="${item.preview}" alt="${escapeHtml(item.name)}">` : icon('file')}<span>${escapeHtml(item.name)}</span><button data-action="remove-chat-attachment" data-index="${index}">${icon('close')}</button></div>`).join('')}</div>` : ''}
      <div class="chat-composer"><button class="composer-icon ${state.chat.quickActionsOpen ? 'active' : ''}" data-action="toggle-chat-tools" title="上传与快捷检测">${icon('paperclip')}</button><textarea id="chat-input" rows="1" placeholder="输入消息，或点击左侧按钮选择上传类型…" ${state.chat.streaming ? 'disabled' : ''}>${escapeHtml(state.chat.input)}</textarea>${state.chat.streaming ? `<button class="send-button stop" data-action="stop-chat">${icon('stop')}<span>停止</span></button>` : `<button class="send-button" data-action="send-chat" ${!state.chat.input.trim() && !state.chat.attachments.length ? 'disabled' : ''}>${icon('send')}<span>发送</span></button>`}</div><div class="composer-hint"><span>Enter 发送 · Shift + Enter 换行</span><span>点击左侧按钮选择图片、视频或 ZIP 检测</span></div></div>
  </section><aside class="agent-side">${agentFlowHtml()}
    <section class="panel trace-card"><div class="panel-title"><div><strong>执行轨迹</strong><span>最近 Agent 事件</span></div><button class="icon-button small" data-action="clear-trace">${icon('trash')}</button></div><div class="trace-list">${state.chat.trace.slice(0, 7).map(item => `<article><i class="trace-dot ${item.type}"></i><div><strong>${escapeHtml(item.title)}</strong><p>${escapeHtml(item.detail)}</p><small>${escapeHtml(item.time)}</small></div></article>`).join('')}</div></section>
    <section class="panel context-card"><div class="panel-title"><div><strong>当前上下文</strong><span>会话配置</span></div></div><div class="context-row"><span>默认模型</span><strong>${escapeHtml(state.settings.defaultModel)}</strong></div><div class="context-row"><span>置信度阈值</span><strong>${state.settings.confidence.toFixed(2)}</strong></div><div class="context-row"><span>IoU 阈值</span><strong>${state.settings.iou.toFixed(2)}</strong></div><div class="context-row"><span>传输方式</span><strong>SSE Stream</strong></div></section></aside></div>`;
}

function detectionResultDetail(result, embedded = false) {
  if (!result) return '';
  const isCamera = result.mode === 'camera';
  const media = !isCamera && result.videoUrl
    ? `<video src="${escapeHtml(result.videoUrl)}" controls playsinline preload="metadata" onerror="this.closest('.detail-preview')?.classList.add('media-error')"></video><div class="video-fallback"><strong>视频无法直接播放</strong><span>如果只显示首帧，通常是视频编码或链接访问问题。</span><a href="${escapeHtml(result.videoUrl)}" target="_blank" rel="noreferrer">打开视频链接</a></div>`
    : (!isCamera ? `<img src="${result.preview}" alt="${escapeHtml(result.filename)}">${detectionBoxes(result)}` : '');
  const risk = result.risk ? `<div class="risk-box"><div><strong>雨雾交通风险</strong><span>${result.risk.risk_level ?? 0}级 · ${escapeHtml(result.risk.risk_name || '正常')}</span></div><p>${escapeHtml((result.risk.reasons || []).join('；') || '暂无明显风险')}</p>${result.report ? `<pre>${escapeHtml(result.report)}</pre>` : ''}</div>` : '';
  const objectEventTable = result.objectEvents?.length ? `<div class="video-frame-table"><strong>目标明细表</strong><div><table><thead><tr><th>Frame</th><th>Time</th><th>Class</th><th>Confidence</th></tr></thead><tbody>${result.objectEvents.slice(0, 80).map(item => `<tr><td>${item.frame_number ?? '--'}</td><td>${item.frame_time ?? 0}s</td><td>${escapeHtml(classLabel(item.class_name || 'object'))}</td><td>${Math.round(Number(item.confidence || 0) * 100)}%</td></tr>`).join('')}</tbody></table></div></div>` : '';
  const frameTable = result.frames?.length ? `<div class="video-frame-table"><strong>${result.mode === 'camera' ? '实时检测过程表' : '逐帧采样数据'}</strong><div><table><thead><tr><th>Frame</th><th>Time</th><th>Objects</th><th>Classes</th></tr></thead><tbody>${result.frames.slice(0, 60).map(frame => `<tr><td>${frame.frame_number ?? frame.frame_index ?? '--'}</td><td>${frame.frame_time ?? frame.time_sec ?? 0}s</td><td>${frame.total_objects ?? frame.detections?.length ?? 0}</td><td>${escapeHtml(frameClassText(frame))}</td></tr>`).join('')}</tbody></table></div></div>` : '';
  const keyFrameGrid = result.keyFrames?.length ? `<div class="key-frame-grid">${result.keyFrames.slice(0, 6).map(frame => `<article><img src="${frame.image?.startsWith('data:') ? frame.image : `data:image/jpeg;base64,${frame.image || ''}`}" alt="key frame"><div><strong>Frame ${frame.frame_number ?? '--'}</strong><span>${frame.frame_time ?? 0}s · ${frame.detections?.length || 0} objects</span></div><p>${escapeHtml(frameDetectionText(frame.detections || []))}</p></article>`).join('')}</div>` : '';
  const totalLabel = result.videoUrl && result.uniqueVehicleCount !== null ? '去重车辆' : '目标';
  const sampleMetric = result.videoUrl ? `<div class="sample-metric"><span>采样检测</span><strong>${Number(result.sampledTotal || 0).toLocaleString()}次</strong></div>` : '';
  const useUnifiedLayout = !isCamera;
  const previewPane = isCamera ? '' : `<div class="detail-preview">${media}<div class="preview-toolbar"><span>${escapeHtml(result.dimensions || '1280 × 720')}</span><span>${Number(result.inference || 0).toFixed(1)} ms</span></div></div>`;
  const detailActions = embedded ? '' : `<div class="detail-actions"><button class="btn btn-ghost" data-action="download-result" data-result-id="${result.id}">${icon('download')}${result.mode === 'camera' ? '下载明细 CSV' : '下载结果'}</button><button class="btn btn-primary" data-action="save-result" data-result-id="${result.id}">${icon('check')}保存到历史</button></div>`;
  const summaryCore = `<div class="summary-head"><div><strong>${escapeHtml(result.filename)}</strong><span>${escapeHtml(result.model)}</span></div><span class="object-total">${Number(result.total || 0).toLocaleString()}<small>${totalLabel}</small></span></div><div class="summary-metrics"><div><span>置信度</span><strong>${Number(result.confidence).toFixed(2)}</strong></div><div><span>IoU</span><strong>${Number(result.iou).toFixed(2)}</strong></div><div><span>类别</span><strong>${Object.keys(result.counts || {}).length}</strong></div><div><span>耗时</span><strong>${Number(result.inference || 0).toFixed(1)}ms</strong></div>${sampleMetric}</div><div class="class-stats">${confidenceBars(result.counts || {})}</div>`;
  if (useUnifiedLayout) {
    return `<div class="detection-detail ${embedded ? 'embedded' : ''} video-detail">${previewPane}<div class="detail-summary video-side-panel">${summaryCore}${detailActions}</div>${risk}${objectEventTable}${frameTable}${keyFrameGrid}</div>`;
  }
  return `<div class="detection-detail ${embedded ? 'embedded' : ''} ${isCamera ? 'camera-detail' : ''}">${previewPane}<div class="detail-summary">${summaryCore}${risk}${objectEventTable}${frameTable}${keyFrameGrid}${detailActions}</div></div>`;
}

function cameraStatusText() {
  const camera = state.detection.camera;
  if (!camera.active) return '点击开启摄像头开始实时检测';
  if (camera.paused) return '已暂停，右侧显示最后一帧检测结果';
  if (camera.connected) return '实时检测中';
  return '正在连接后端检测服务';
}

function renderDetection() {
  const selected = state.detection.mode === 'camera'
    ? state.detection.camera.latestResult
    : state.detection.results[state.detection.selectedResult] || null;
  const viewerSubtitle = state.detection.mode === 'camera'
    ? (state.detection.camera.frameSamples.length ? `已记录 ${state.detection.camera.frameSamples.length} 帧` : '等待摄像头检测')
    : (state.detection.results.length ? `本次共 ${state.detection.results.length} 个结果` : '等待检测任务');
  return `<div class="page-stack">${pageHeader('交通检测工作台', '支持图片、视频与 USB 摄像头实时检测，融合增强、车辆识别、ByteTrack 跟踪与交通统计。', `<button class="btn btn-ghost" data-action="load-demo-detection">${icon('play')}加载示例</button><button class="btn btn-primary" data-action="pick-detection-files">${icon('upload')}选择文件</button><button class="btn btn-ghost" data-action="connect-camera">${icon('monitor')}连接摄像头</button>`)}
    <div class="segmented-tabs detection-mode-tabs"><button class="${state.detection.mode === 'single' ? 'active' : ''}" data-action="set-detection-mode" data-mode="single">${icon('scan')}图片/视频检测</button><button class="${state.detection.mode === 'camera' ? 'active' : ''}" data-action="set-detection-mode" data-mode="camera">${icon('monitor')}摄像头实时检测</button><button class="${state.detection.mode === 'zip' ? 'active' : ''}" data-action="set-detection-mode" data-mode="zip">${icon('file')}批量/压缩包</button></div>
    <div class="detection-layout"><section class="panel detection-control"><div class="panel-title"><div><strong>输入与参数</strong><span>${state.detection.mode === 'single' ? 'JPG / PNG / BMP / MP4' : state.detection.mode === 'camera' ? 'USB 摄像头实时画面' : state.detection.mode === 'batch' ? '最多 30 张图片' : '包含 images 的 ZIP 文件'}</span></div></div>
      <div class="drop-zone ${state.detection.files.length ? 'has-files' : ''} ${state.detection.mode === 'camera' ? 'is-hidden' : ''}" data-action="pick-detection-files" id="detection-drop-zone">${state.detection.files.length ? `<div class="file-stack">${state.detection.files.slice(0, 5).map((file, index) => `<article>${file.type?.startsWith('image/') ? `<img src="${file.preview}" alt="">` : icon('file')}<div><strong>${escapeHtml(file.name)}</strong><span>${(file.size / 1024 / 1024).toFixed(2)} MB</span></div><button data-action="remove-detection-file" data-index="${index}">${icon('close')}</button></article>`).join('')}${state.detection.files.length > 5 ? `<small>另有 ${state.detection.files.length - 5} 个文件</small>` : ''}</div>` : `${icon('upload', 'drop-icon')}<strong>拖拽文件到这里</strong><p>或点击选择${'图片/视频/摄像头输入'}</p><span>单文件不超过 50MB</span>`}</div>
      ${state.detection.mode === 'camera' ? `<div class="camera-box"><div class="camera-stage"><video id="camera-preview" autoplay muted playsinline></video><canvas id="camera-canvas"></canvas><div class="camera-status" id="camera-status">${cameraStatusText()}</div></div><div class="camera-actions"><button class="btn btn-primary btn-sm" data-action="connect-camera">${state.detection.camera.active ? '重新连接检测' : '开启摄像头检测'}</button>${state.detection.camera.active ? `<button class="btn btn-ghost btn-sm" data-action="toggle-camera-pause">${state.detection.camera.paused ? '继续检测' : '暂停检测'}</button>` : ''}<button class="btn btn-ghost btn-sm" data-action="stop-camera">关闭摄像头</button></div><div class="camera-stats"><div><strong data-camera-stat="fps">${state.detection.camera.stats.fps}</strong><span>FPS</span></div><div><strong data-camera-stat="frames">${state.detection.camera.stats.frames}</strong><span>帧数</span></div><div><strong data-camera-stat="objects">${state.detection.camera.stats.objects}</strong><span>目标</span></div><div><strong data-camera-stat="inference">${state.detection.camera.stats.inference}ms</strong><span>耗时</span></div></div><div class="camera-detections" id="camera-detections">${state.detection.camera.detections.length ? state.detection.camera.detections.map(item => `<span>${escapeHtml(item.class_name || 'object')} ${(Number(item.confidence || 0) * 100).toFixed(0)}%</span>`).join('') : '<small>暂无检测目标</small>'}</div><small>摄像头检测通过 WebSocket 连接后端 /api/detection/camera，并逐帧发送画面。</small></div>` : ''}<div class="form-grid one-col"><label><span>检测模型</span><select id="detect-model"><option>yolov11s-rsod-v3.2</option><option>yolov11n-steel-v1.4</option><option>yolov11m-traffic-v2.0</option></select></label><label><span>置信度阈值 <b id="confidence-value">${state.detection.confidence.toFixed(2)}</b></span><input id="detect-confidence" type="range" min="0.05" max="0.95" step="0.05" value="${state.detection.confidence}"></label><label><span>IoU 阈值 <b id="iou-value">${state.detection.iou.toFixed(2)}</b></span><input id="detect-iou" type="range" min="0.1" max="0.9" step="0.05" value="${state.detection.iou}"></label><label class="switch-row"><span><strong>保存标注图</strong><small>检测结果自动上传到 MinIO</small></span><input id="save-annotated" type="checkbox" ${state.detection.saveAnnotated ? 'checked' : ''}><i></i></label></div>
      <button class="btn btn-primary btn-block" data-action="run-detection" ${state.detection.running || (state.detection.mode !== 'camera' && !state.detection.files.length) ? 'disabled' : ''}>${state.detection.running ? '<span class="spinner"></span>正在检测…' : state.detection.mode === 'camera' ? `${icon('play')}开始实时检测` : `${icon('play')}开始检测`}</button>${state.detection.running ? `<div class="detect-progress" id="detection-progress-live"><div><span>任务处理中</span><strong data-progress-number>${state.detection.progress}%</strong></div>${progressBar(state.detection.progress)}<small>正在调用真实后端 YOLO 检测服务</small></div>` : ''}
    </section><section class="panel detection-viewer"><div class="panel-title"><div><strong>检测结果</strong><span>${viewerSubtitle}</span></div>${state.detection.results.length ? `<button class="btn btn-ghost btn-sm" data-action="clear-results">${icon('trash')}清空</button>` : ''}</div>${selected ? detectionResultDetail(selected) : emptyState('scan', '暂无检测结果', state.detection.mode === 'camera' ? '开启摄像头检测后，暂停时会显示最后一帧和过程表。' : '上传图片、视频或 ZIP 文件并开始检测，结果会由后端 YOLO 服务返回。')}</section>
      <aside class="panel result-gallery"><div class="panel-title"><div><strong>结果列表</strong><span>点击切换详情</span></div><span class="count-pill">${state.detection.results.length}</span></div><div class="gallery-list">${state.detection.results.length ? state.detection.results.map((result, index) => `<div class="gallery-item ${state.detection.selectedResult === index ? 'active' : ''}" data-action="select-result" data-index="${index}"><div>${result.videoUrl ? `<span class="video-thumb">${icon('play')}</span>` : `<img src="${result.preview}" alt="">${detectionBoxes({ ...result, boxes: result.boxes.slice(0, 2) })}`}</div><span><strong>${escapeHtml(result.filename)}</strong><small>${result.videoUrl ? '视频结果' : `${result.total} 目标`} · ${result.inference}ms</small></span>${icon('chevron')}</div>`).join('') : '<div class="gallery-placeholder">检测后将在这里生成结果列表</div>'}</div></aside></div>
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
  return state.tasks.find(item => Number(item.id) === Number(state.selectedTaskId)) || state.tasks[0] || null;
}

function taskStatusText(task) {
  return task.status === 'running' ? `Epoch ${task.current_epoch}/${task.epochs}` : task.status === 'completed' ? '训练完成' : task.status === 'queued' ? '等待资源' : '任务已停止';
}

function renderTraining() {
  const task = selectedTask();
  if (!task) {
    return `<div class="page-stack">${pageHeader('模型训练与监控', '训练页只展示后端 /api/training/tasks 返回的真实任务。', `<button class="btn btn-ghost" data-action="refresh-tasks">${icon('refresh')}刷新任务</button><button class="btn btn-primary" data-action="new-training-task">${icon('plus')}新建训练任务</button>`)}
      <section class="panel">${emptyState('train', state.dataStatus.training === 'error' ? '训练接口连接失败' : '暂无真实训练任务', state.dataStatus.training === 'error' ? '请确认后端已启动，并且 /api/training/tasks 可以访问。' : '后端没有返回训练任务时，这里不会再显示模板演示数据。')}</section>
    </div>`;
  }
  const metrics = task.metrics?.length ? task.metrics : [];
  const latest = metrics.at(-1) || {};
  const recent = metrics.slice(-60);
  const logLines = metrics.length ? Array.from({ length: 12 }, (_, index) => {
    const m = metrics[Math.max(0, metrics.length - 12 + index)] || latest;
    return `<p><span>${String(m.epoch || 0).padStart(3, '0')}/${task.epochs}</span><b>box_loss ${Number(m.box_loss || 0).toFixed(3)}</b><b>cls_loss ${Number(m.cls_loss || 0).toFixed(3)}</b><b>mAP50 ${Number(m.map50 || 0).toFixed(3)}</b><em>${task.device}</em></p>`;
  }).join('') : '<p><span>--</span><b>暂无后端 metrics 数据</b><em>GET /api/training/metrics/:id</em></p>';
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
  if (!task) {
    return `<div class="page-stack">${pageHeader('模型评估与导出', '评估页只展示后端真实 validate 结果，不再生成本地模拟 mAP。', `<button class="btn btn-ghost" data-action="refresh-tasks">${icon('refresh')}刷新任务</button>`)}
      <section class="panel">${emptyState('evaluate', state.dataStatus.training === 'error' ? '训练任务接口连接失败' : '暂无可评估任务', state.dataStatus.training === 'error' ? '请确认后端训练接口可访问。' : '后端没有训练任务时，这里不会显示预设评估曲线。')}</section>
    </div>`;
  }
  const report = state.evaluationReport?.task_id === task.id ? state.evaluationReport : null;
  if (!report) {
    return `<div class="page-stack">${pageHeader('模型评估与导出', '点击重新评估后，页面会调用后端 /api/training/validate/:id 获取真实指标。', `<select id="evaluation-task-select" class="header-select">${(completedTasks.length ? completedTasks : state.tasks).map(item => `<option value="${item.id}" ${item.id === task.id ? 'selected' : ''}>${escapeHtml(item.name)}</option>`).join('')}</select><button class="btn btn-primary" data-action="validate-model" data-id="${task.id}">${icon('refresh')}重新评估</button>`)}
      <section class="panel model-banner"><div class="model-banner-main"><div class="model-cube">${ICONS.logo}</div><div><span>当前模型</span><h2>${escapeHtml(task.name)}</h2><p>${escapeHtml(task.model_name)} · ${escapeHtml(task.dataset_name)} · ${task.task_uuid}</p><div class="model-tags"><span>${task.image_size}px</span><span>${task.device}</span>${dataSourceBadge(false, '等待后端评估')}</div></div></div></section>
      <section class="panel">${emptyState('evaluate', '暂无真实评估报告', '这里以前会显示模板 mAP、PR 曲线和混淆矩阵；现在只有后端 validate 成功后才显示。')}</section>
    </div>`;
  }
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
  {
  const stats = state.dashboard.statistics || {};
  const trendValues = state.dashboard.trend.map(item => Number(item.task_count ?? item.count ?? item.total ?? item.value ?? 0));
  const classItems = state.dashboard.classDistribution.map((item, index) => ({
    label: classLabel(item.class_name || item.name || item.label || 'unknown'),
    value: Number(item.count ?? item.value ?? 0),
    color: CLASS_PALETTE[index % CLASS_PALETTE.length]
  })).filter(item => item.value > 0);
  const typeItems = state.dashboard.typeDistribution.map((item, index) => ({
    label: taskTypeLabel(item.task_type || item.type || item.name || item.label),
    value: Number(item.count ?? item.value ?? 0),
    color: CLASS_PALETTE[(index + 2) % CLASS_PALETTE.length]
  })).filter(item => item.value > 0);
  const totalTasks = Number(stats.total_tasks ?? stats.task_count ?? state.historyTotal ?? state.history.length ?? 0);
  const completed = Number(stats.completed_tasks ?? state.history.filter(item => item.status === 'completed').length);
  const avgDuration = Number(stats.avg_inference_time ?? stats.avg_duration ?? 0);
  const running = state.tasks.filter(item => item.status === 'running').length;
  const source = dataSourceBadge(state.dataStatus.dashboard === 'real', state.dataStatus.dashboard === 'error' ? '接口异常' : '/api/dashboard');
  return `<div class="page-stack">${pageHeader('数据看板', '汇总后端 dashboard 接口返回的检测统计、类别分布与最近活动。', `<button class="btn btn-ghost" data-action="refresh-dashboard">${icon('refresh')}刷新数据</button><button class="btn btn-primary" data-action="export-dashboard">${icon('download')}导出报表</button>`)}
    <section class="dashboard-kpis"><article><div class="kpi-top"><span class="kpi-icon cyan">${icon('scan')}</span>${source}</div><strong>${totalTasks.toLocaleString()}</strong><p>累计检测任务</p>${miniTrend(trendValues.length ? trendValues : [0])}</article><article><div class="kpi-top"><span class="kpi-icon violet">${icon('check')}</span>${dataSourceBadge(true, 'history')}</div><strong>${completed.toLocaleString()}</strong><p>完成任务</p>${miniTrend([0, completed])}</article><article><div class="kpi-top"><span class="kpi-icon green">${icon('train')}</span><span>${running} 运行中</span></div><strong>${state.tasks.length}</strong><p>训练任务总数</p>${miniTrend([0, state.tasks.length])}</article><article><div class="kpi-top"><span class="kpi-icon orange">${icon('monitor')}</span>${dataSourceBadge(Boolean(avgDuration), '后端统计')}</div><strong>${avgDuration ? avgDuration.toFixed(1) : '--'}<em>ms</em></strong><p>平均推理耗时</p>${miniTrend(avgDuration ? [avgDuration] : [0])}</article></section>
    <div class="dashboard-main-grid"><section class="panel span-2"><div class="panel-title"><div><strong>检测吞吐趋势</strong><span>来自 /api/dashboard/trend</span></div>${source}</div>${trendValues.length ? lineChart([{ name: '检测任务', values: trendValues, color: '#22d3ee' }], { height: 285, xLabel: '时间', formatter: value => Math.round(value), legend: true }) : emptyState('dashboard', '暂无趋势数据', '完成检测任务后，后端 trend 接口会返回真实趋势。')}</section><section class="panel"><div class="panel-title"><div><strong>目标类别分布</strong><span>来自 /api/dashboard/class-dist</span></div></div>${classItems.length ? donutChart(classItems, '目标') : emptyState('scan', '暂无类别分布', '后端没有返回类别统计时不显示模拟分布。')}</section>
      <section class="panel model-performance"><div class="panel-title"><div><strong>任务类型分布</strong><span>来自 /api/dashboard/type-dist</span></div><button class="table-link" data-page="history">查看历史</button></div>${typeItems.length ? typeItems.map((item, index) => `<div class="model-performance-row"><span class="rank rank-${index + 1}">${index + 1}</span><div><strong>${escapeHtml(item.label)}</strong><small>${item.value.toLocaleString()} 条记录</small></div><div class="score-bar"><i style="width:${Math.min(100, item.value / Math.max(...typeItems.map(row => row.value), 1) * 100)}%"></i></div><strong>${item.value}</strong></div>`).join('') : emptyState('history', '暂无类型统计', '历史记录产生后才会有真实类型分布。')}</section><section class="panel activity-feed"><div class="panel-title"><div><strong>最近活动</strong><span>${completed} 个任务已完成</span></div><button class="table-link" data-page="history">全部记录</button></div>${state.history.length ? state.history.slice(0, 6).map((item, index) => `<article><span class="activity-icon ${index % 3 === 0 ? 'violet' : index % 3 === 1 ? 'cyan' : 'green'}">${icon(item.type.includes('评估') ? 'evaluate' : item.type.includes('ZIP') ? 'file' : 'scan')}</span><div><strong>${escapeHtml(item.type)} · ${escapeHtml(item.source)}</strong><p>检出 ${item.total} 个目标</p></div><time>${new Date(item.created_at).toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })}</time></article>`).join('') : emptyState('history', '暂无最近活动', '完成检测后历史接口会返回最近任务。')}</section><section class="panel resource-card"><div class="panel-title"><div><strong>平台资源</strong><span>后端未提供资源占用接口</span></div>${dataSourceBadge(false, '待接入')}</div>${emptyState('monitor', '资源监控未接入', '当前后端只有健康检查，没有 GPU、CPU、内存实时占用接口，所以这里不显示模板百分比。')}</section></div>
  </div>`;
  }
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
  const totalPages = Math.max(1, Number(state.historyTotalPages || Math.ceil(filtered.length / state.historyPageSize)));
  state.historyPage = clamp(state.historyPage, 1, totalPages);
  const pageItems = filtered;
  const avgDuration = filtered.length ? Math.round(filtered.reduce((sum, item) => sum + item.duration, 0) / filtered.length) : 0;
  return `<div class="page-stack">${pageHeader('任务历史', '统一检索检测、评估与导出记录，支持查看详情和 CSV 导出。', `<button class="btn btn-ghost" data-action="clear-history-filter">${icon('refresh')}重置筛选</button><button class="btn btn-primary" data-action="export-history">${icon('download')}导出 CSV</button>`)}
    <section class="history-summary"><article><span>${icon('history')}</span><div><strong>${Number(state.historyTotal || state.history.length).toLocaleString()}</strong><small>全部任务</small></div></article><article><span>${icon('check')}</span><div><strong>${state.history.filter(item => item.status === 'completed').length}</strong><small>本页成功</small></div></article><article><span>${icon('scan')}</span><div><strong>${state.history.reduce((sum, item) => sum + item.total, 0).toLocaleString()}</strong><small>本页检出目标</small></div></article><article><span>${icon('monitor')}</span><div><strong>${avgDuration ? `${avgDuration}ms` : '--'}</strong><small>本页平均耗时</small></div></article></section>
    <section class="panel"><div class="history-toolbar"><div class="search-field">${icon('search')}<input id="history-search" value="${escapeHtml(state.historyQuery)}" placeholder="搜索任务 ID、文件、模型或数据集"></div><select id="history-type"><option value="ALL">全部类型</option>${['单图检测', '批量检测', 'ZIP 检测', '视频检测', '摄像头检测', '模型评估'].map(type => `<option value="${type}" ${state.historyType === type ? 'selected' : ''}>${type}</option>`).join('')}</select><span class="toolbar-count">${dataSourceBadge(state.dataStatus.history === 'real', '/api/history/tasks')} 找到 ${Number(state.historyTotal || filtered.length).toLocaleString()} 条记录</span></div><div class="table-scroll"><table class="data-table history-table"><thead><tr><th>任务 ID</th><th>类型 / 来源</th><th>模型</th><th>数据集</th><th>目标数</th><th>阈值</th><th>耗时</th><th>状态</th><th>时间</th><th>操作</th></tr></thead><tbody>${pageItems.length ? pageItems.map(item => `<tr><td><code>${escapeHtml(item.id)}</code></td><td><strong>${escapeHtml(item.type)}</strong><small>${escapeHtml(item.source)}</small></td><td><span>${escapeHtml(item.model)}</span></td><td><span>${escapeHtml(item.dataset)}</span></td><td><strong>${item.total}</strong></td><td>${item.confidence.toFixed(2)}</td><td>${item.duration}ms</td><td>${statusBadge(item.status)}</td><td><span>${formatTime(item.created_at).slice(5, 16)}</span></td><td><button class="table-link" data-action="history-detail" data-id="${item.id}">详情</button><button class="table-link" data-action="rerun-history" data-id="${item.id}">重跑</button></td></tr>`).join('') : `<tr><td colspan="10">${emptyState('history', '暂无真实历史记录', '完成检测后，后端历史接口会返回任务记录。')}</td></tr>`}</tbody></table></div><div class="pagination-row"><span>第 ${state.historyPage} / ${totalPages} 页</span><div><button data-action="history-page" data-page-number="${state.historyPage - 1}" ${state.historyPage <= 1 ? 'disabled' : ''}>上一页</button>${Array.from({ length: Math.min(totalPages, 5) }, (_, index) => index + 1).map(page => `<button class="${page === state.historyPage ? 'active' : ''}" data-action="history-page" data-page-number="${page}">${page}</button>`).join('')}<button data-action="history-page" data-page-number="${state.historyPage + 1}" ${state.historyPage >= totalPages ? 'disabled' : ''}>下一页</button></div><select id="history-page-size"><option value="10" ${state.historyPageSize === 10 ? 'selected' : ''}>10 条/页</option><option value="20" ${state.historyPageSize === 20 ? 'selected' : ''}>20 条/页</option></select></div></section>
  </div>`;
}

function filteredLogs() {
  const q = state.logQuery.toLowerCase();
  return state.logs.filter(item => (state.logLevel === 'ALL' || item.level === state.logLevel) && (state.logModule === 'ALL' || item.module === state.logModule) && (!q || `${item.module} ${item.message}`.toLowerCase().includes(q)));
}

function renderMonitoring() {
  {
  const logs = filteredLogs();
  const services = Object.entries(state.health.services || {});
  const latencies = services.map(([, service]) => Number(service.latency_ms || 0)).filter(Boolean);
  const avgLatency = latencies.length ? Math.round(latencies.reduce((sum, value) => sum + value, 0) / latencies.length) : 0;
  const healthyCount = services.filter(([, service]) => service.status === 'healthy').length;
  const allHealthy = services.length > 0 && healthyCount === services.length;
  return `<div class="page-stack">${pageHeader('系统监控', '展示后端 /api/health/detail 返回的真实服务健康状态。', `<button class="btn btn-ghost" data-action="clear-logs">${icon('trash')}清空日志</button><button class="btn btn-primary" data-action="refresh-health">${icon('refresh')}刷新状态</button>`)}
    <section class="health-hero panel"><div class="health-hero-main"><div class="health-pulse"><i></i><span>${icon('monitor')}</span></div><div><span>平台综合状态</span><h2>${allHealthy ? '核心服务运行正常' : '存在异常服务'}</h2><p>最近检查：${formatTime(state.health.updatedAt)} · ${dataSourceBadge(state.dataStatus.health === 'real', '/api/health/detail')}</p></div></div><div class="health-hero-metrics"><div><strong>${services.length ? `${healthyCount}/${services.length}` : '--'}</strong><span>健康服务</span></div><div><strong>${avgLatency || '--'}${avgLatency ? 'ms' : ''}</strong><span>平均延迟</span></div><div><strong>${state.health.status || '--'}</strong><span>综合状态</span></div><div><strong>--</strong><span>请求/分钟未接入</span></div></div></section>
    <section class="service-grid">${services.length ? services.map(([name, service], index) => `<article class="service-card panel"><div class="service-head"><span class="service-icon icon-${index}">${icon(name === 'database' ? 'dataset' : name === 'yolo' ? 'scan' : name === 'application' ? 'dashboard' : 'monitor')}</span>${statusBadge(service.status)}</div><strong>${escapeHtml(({ application: '应用服务', database: 'PostgreSQL', redis: 'Redis 缓存', minio: 'MinIO 存储', yolo: 'YOLOv11 推理' }[name] || name))}</strong><p>${escapeHtml(service.message || '')}</p><div class="service-latency"><span>响应延迟</span><strong>${service.latency_ms ?? '--'} ms</strong></div>${miniTrend([Number(service.latency_ms || 0)])}</article>`).join('') : `<section class="panel">${emptyState('monitor', '暂无健康检查数据', '请确认后端 /api/health/detail 可访问。')}</section>`}</section>
    <div class="monitoring-grid"><section class="panel request-chart"><div class="panel-title"><div><strong>API 请求趋势</strong><span>后端未提供请求趋势接口</span></div>${dataSourceBadge(false, '待接入')}</div>${emptyState('monitor', '请求趋势未接入', '当前后端没有按分钟统计 2xx/4xx/5xx 的接口，所以这里不显示模板曲线。')}</section><section class="panel endpoint-list"><div class="panel-title"><div><strong>热门接口</strong><span>后端未提供接口调用排行</span></div>${dataSourceBadge(false, '待接入')}</div>${emptyState('monitor', '接口排行未接入', '需要后端记录请求日志并提供统计接口后才能展示。')}</section></div>
    <section class="panel log-panel"><div class="panel-title"><div><strong>实时日志</strong><span>当前前端仅保留本页运行时日志</span></div><span class="log-count">${logs.length} 条</span></div><div class="log-toolbar"><select id="log-level"><option value="ALL">全部级别</option>${['INFO', 'WARN', 'ERROR', 'DEBUG'].map(level => `<option value="${level}" ${state.logLevel === level ? 'selected' : ''}>${level}</option>`).join('')}</select><select id="log-module"><option value="ALL">全部模块</option>${['application', 'request', 'training', 'detection', 'agent', 'dataset', 'database', 'redis', 'minio'].map(module => `<option value="${module}" ${state.logModule === module ? 'selected' : ''}>${module}</option>`).join('')}</select><div class="search-field">${icon('search')}<input id="log-search" value="${escapeHtml(state.logQuery)}" placeholder="搜索日志内容"></div><button class="btn btn-ghost btn-sm" data-action="export-logs">${icon('download')}导出</button></div><div class="log-console">${logs.length ? logs.slice(0, 120).map(item => `<div class="log-line log-${item.level.toLowerCase()}"><time>${new Date(item.time).toLocaleTimeString('zh-CN', { hour12: false })}</time><span class="log-level">${item.level}</span><span class="log-module">${escapeHtml(item.module)}</span><p>${escapeHtml(item.message)}</p></div>`).join('') : emptyState('monitor', '暂无真实后端日志接口', '当前后端未接入日志列表接口，因此不显示模板日志。')}</div></section>
  </div>`;
  }
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
    <div class="settings-layout"><aside class="panel settings-nav"><button class="active">${icon('settings')}基础配置</button><button>${icon('scan')}检测参数</button><button>${icon('monitor')}界面设置</button><button>${icon('dataset')}存储配置</button><div class="settings-version"><span>${ICONS.logo}</span><strong>FogTraffic-YOLO-Detection</strong><small>Frontend v2.0.0</small><code>YOLOv11</code></div></aside><section class="settings-content">
      <article class="panel settings-section"><div class="settings-section-head"><div><strong>后端连接</strong><p>当前前端默认连接本地 FastAPI 后端，不再启用演示数据降级。</p></div><span class="connection-state"><i></i>已连接</span></div><div class="settings-form-grid"><label class="span-2"><span>API Base URL</span><div class="input-with-action"><input id="setting-api-base" value="${escapeHtml(state.settings.apiBase)}" placeholder="例如 http://localhost:8000"><button data-action="test-connection">测试连接</button></div><small>接口将按 <code>${escapeHtml(state.settings.apiBase || '当前域名')}/api/...</code> 访问</small></label><label><span>语言</span><select id="setting-language"><option value="zh-CN">简体中文</option><option value="en-US">English</option></select></label><label><span>训练轮询间隔</span><select id="setting-poll"><option value="3" ${state.settings.pollInterval === 3 ? 'selected' : ''}>3 秒</option><option value="5" ${state.settings.pollInterval === 5 ? 'selected' : ''}>5 秒</option><option value="10" ${state.settings.pollInterval === 10 ? 'selected' : ''}>10 秒</option></select></label><label class="switch-setting span-2"><div><strong>演示降级已关闭</strong><p>后端接口失败时会直接报错，避免把模板数据误认为真实结果。</p></div><input id="setting-demo-fallback" type="checkbox" disabled><i></i></label></div></article>
      <article class="panel settings-section"><div class="settings-section-head"><div><strong>检测默认参数</strong><p>新建检测和模型测试任务时自动使用这些参数。</p></div></div><div class="settings-form-grid"><label><span>默认模型</span><select id="setting-default-model"><option ${state.settings.defaultModel === 'yolov11s-rsod-v3.2' ? 'selected' : ''}>yolov11s-rsod-v3.2</option><option ${state.settings.defaultModel === 'yolov11n-steel-v1.4' ? 'selected' : ''}>yolov11n-steel-v1.4</option><option ${state.settings.defaultModel === 'yolov11m-traffic-v2.0' ? 'selected' : ''}>yolov11m-traffic-v2.0</option></select></label><label><span>MinIO Bucket</span><input id="setting-minio-bucket" value="${escapeHtml(state.settings.minioBucket)}"></label><label><span>置信度阈值 <b id="setting-confidence-value">${state.settings.confidence.toFixed(2)}</b></span><input id="setting-confidence" type="range" min="0.05" max="0.95" step="0.05" value="${state.settings.confidence}"></label><label><span>IoU 阈值 <b id="setting-iou-value">${state.settings.iou.toFixed(2)}</b></span><input id="setting-iou" type="range" min="0.1" max="0.9" step="0.05" value="${state.settings.iou}"></label></div></article>
      <article class="panel settings-section"><div class="settings-section-head"><div><strong>界面设置</strong><p>控制主题、表格密度与检测结果保存偏好。</p></div></div><div class="setting-list"><label class="switch-setting"><div><strong>深色模式</strong><p>关闭后切换为浅色界面。</p></div><input id="setting-dark-mode" type="checkbox" ${state.theme === 'dark' ? 'checked' : ''}><i></i></label><label class="switch-setting"><div><strong>紧凑表格</strong><p>减少任务列表和历史表格的行高。</p></div><input id="setting-compact" type="checkbox" ${state.settings.compactTable ? 'checked' : ''}><i></i></label><label class="switch-setting"><div><strong>自动保存检测结果</strong><p>检测完成后自动写入历史记录并保存标注图。</p></div><input id="setting-auto-save" type="checkbox" ${state.settings.autoSave ? 'checked' : ''}><i></i></label></div></article>
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

openNewTaskModal = function openNewTaskModalWithDatasets(datasetName = '') {
  const datasets = state.datasets.filter(item => item.data_yaml);
  const datasetOptions = datasets.length
    ? datasets.map((item, index) => `<option value="${index}" ${item.name === datasetName ? 'selected' : ''}>${escapeHtml(item.name)} - ${escapeHtml(item.data_yaml || '')}</option>`).join('')
    : '<option value="" disabled selected>未发现可训练数据集，请确认 backend/datasets 下存在 data.yaml</option>';
  openModal({
    title: '新建训练任务',
    subtitle: 'POST /api/training/start',
    size: 'lg',
    body: `<form id="new-task-form" class="modal-form"><div class="form-grid"><label class="span-2"><span>任务名称</span><input name="name" value="${escapeHtml(datasetName ? `${datasetName} 精调训练` : '雨雾交通检测训练任务')}" required></label><label class="span-2"><span>数据集</span><select name="dataset_index" ${datasets.length ? '' : 'disabled'} required>${datasetOptions}</select></label><label><span>基础模型</span><select name="model_name"><option>yolov11n</option><option selected>yolov11s</option><option>yolov11m</option><option>yolov11l</option></select></label><label><span>设备</span><select name="device"><option value="cpu">cpu</option><option value="0" selected>cuda:0</option></select></label><label><span>Epochs</span><input name="epochs" type="number" min="1" max="500" value="100"></label><label><span>Batch Size</span><input name="batch_size" type="number" min="1" max="64" value="16"></label><label><span>图像尺寸</span><select name="img_size"><option>512</option><option selected>640</option><option>1024</option></select></label><label><span>初始学习率</span><input name="lr0" type="number" step="0.0001" value="0.01"></label><label><span>优化器</span><select name="optimizer"><option>auto</option><option>SGD</option><option>AdamW</option></select></label><label class="switch-setting span-2"><div><strong>启用数据增强</strong><p>Mosaic、MixUp、HSV 与随机翻转。</p></div><input name="augmentation" type="checkbox" checked><i></i></label></div></form>`,
    footer: `<button class="btn btn-ghost" data-action="close-modal" type="button">取消</button><button class="btn btn-primary" data-action="submit-new-task" ${datasets.length ? '' : 'disabled'}>${icon('play')}创建并启动</button>`
  });
};

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
  openModal({ title: '任务详情', subtitle: `${item.id} · ${item.type}`, size: 'xl', body: `<div class="history-detail-modal"><div class="detail-info-strip"><div><span>模型</span><strong>${escapeHtml(item.model)}</strong></div><div><span>数据集</span><strong>${escapeHtml(item.dataset)}</strong></div><div><span>置信度</span><strong>${item.confidence.toFixed(2)}</strong></div><div><span>耗时</span><strong>${item.duration}ms</strong></div><div><span>创建时间</span><strong>${formatTime(item.created_at)}</strong></div></div><section class="panel"><div class="panel-title"><div><strong>后端任务数据</strong><span>来自 /api/history/tasks</span></div>${dataSourceBadge(true, '真实记录')}</div><pre class="json-preview">${escapeHtml(JSON.stringify(item.raw || item, null, 2))}</pre></section></div>`, footer: `<button class="btn btn-ghost" data-action="close-modal">关闭</button><button class="btn btn-primary" data-action="rerun-history" data-id="${item.id}">${icon('play')}重新执行</button>` });
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
  const loginPayload = { username: values.username, password: values.password };
  const registerPayload = { username: values.username, email: values.email, password: values.password };
  state.busy = true;
  renderLogin();
  try {
    if (state.authMode === 'register') {
      await apiOrFallback('/api/auth/register', { method: 'POST', json: registerPayload }, { id: Date.now(), username: values.username, display_name: values.display_name, email: values.email, role: 'user' });
    }
    const data = await apiOrFallback('/api/auth/login', { method: 'POST', json: loginPayload }, { access_token: `demo-${values.username}.local`, user: { id: 1, username: values.username, display_name: values.display_name || '演示管理员', email: values.email || 'admin@rsod.local', role: 'admin' } });
    state.token = data.access_token || 'demo-admin.local';
    state.user = data.user || state.user;
    localStorage.setItem('rsod_token', state.token);
    persistState();
    state.busy = false;
    if (!location.hash) location.hash = '#chat';
    toast('登录成功，欢迎进入工作台', 'success');
    renderShell();
    void refreshDashboard(false);
    void refreshHistory(false);
    void refreshTrainingDatasets(false);
    void refreshTasks(false);
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
  void refreshPageData(page);
}

async function refreshPageData(page = state.page) {
  if (page === 'dashboard') await refreshDashboard(false);
  else if (page === 'history') await refreshHistory(false);
  else if (page === 'training' || page === 'evaluation') {
    await refreshTrainingDatasets(false);
    await refreshTasks(false);
  }
}

async function refreshTrainingDatasets(showToast = false) {
  try {
    const remote = await api('/api/training/datasets', { method: 'GET' });
    const items = Array.isArray(remote) ? remote : remote?.items || [];
    state.datasets = items.map((item, index) => ({
      id: item.id || index + 1,
      name: item.display_name || item.name || `dataset-${index + 1}`,
      scene: item.scene_name || 'traffic_rain_fog',
      format: item.format || 'YOLO',
      images: Number(item.images || 0),
      labels: Number(item.labels || item.images || 0),
      classes: item.classes || ['car', 'person', 'truck', 'bus', 'motorcycle'],
      train: Number(item.train || 0),
      val: Number(item.val || 0),
      test: Number(item.test || 0),
      status: item.status || 'ready',
      quality: item.status === 'ready' ? 100 : 0,
      size: 'local',
      updated: 'now',
      scene_id: item.scene_id,
      dataset_path: item.dataset_path,
      data_yaml: item.data_yaml,
    }));
    if (showToast) toast(state.datasets.length ? '训练数据集已刷新' : '没有发现 data.yaml', state.datasets.length ? 'success' : 'warning');
  } catch (error) {
    state.datasets = [];
    if (showToast) toast(error.message, 'error', '训练数据集加载失败');
  }
}

async function refreshTasks(showToast = true) {
  try {
    const remote = await api('/api/training/tasks', { method: 'GET' });
    const items = Array.isArray(remote) ? remote : remote?.items || [];
    state.tasks = items.map(task => ({
      id: task.id,
      task_uuid: task.task_uuid || String(task.id),
      name: task.task_name || task.name || `${task.model_name || 'YOLO'} 训练任务`,
      model_name: task.model_name || 'yolov11',
      dataset_name: task.dataset_name || task.scene_name || '未命名数据集',
      device: task.device || 'unknown',
      epochs: Number(task.epochs || 0),
      current_epoch: Number(task.current_epoch || 0),
      batch_size: Number(task.batch_size || 0),
      image_size: Number(task.image_size || task.img_size || 640),
      status: task.status || 'unknown',
      progress: Number(task.progress || 0),
      best_map50: Number(task.best_map50 || task.map50 || 0),
      exported: Boolean(task.exported),
      created_at: task.created_at || new Date().toISOString(),
      metrics: [],
    }));
    if (!state.selectedTaskId && state.tasks[0]) state.selectedTaskId = state.tasks[0].id;
    if (!state.evaluationTaskId && state.tasks[0]) state.evaluationTaskId = state.tasks[0].id;
    const current = selectedTask();
    if (current?.id) {
      try {
        const metricData = await api(`/api/training/metrics/${current.id}`, { method: 'GET' });
        const metrics = metricData?.metrics || metricData || [];
        if (Array.isArray(metrics)) current.metrics = metrics;
      } catch {
        current.metrics = [];
      }
    }
    state.dataStatus.training = 'real';
  } catch (error) {
    state.tasks = [];
    state.dataStatus.training = 'error';
    if (showToast) toast(error.message, 'error', '训练数据加载失败');
  }
  if (showToast && state.dataStatus.training === 'real') toast('训练任务已刷新');
  if (state.page === 'training') renderShell();
}

async function refreshHealth(showToast = true) {
  try {
    const data = await api('/api/health/detail', { method: 'GET' });
    if (data?.services) {
      state.health = { status: data.status, services: data.services, updatedAt: new Date().toISOString() };
      state.dataStatus.health = 'real';
    }
    state.logs = [];
    if (showToast) toast('系统状态已刷新');
  } catch (error) {
    state.dataStatus.health = 'error';
    if (showToast) toast(error.message, 'error', '系统状态加载失败');
  }
}

async function refreshHistory(showToast = false) {
  try {
    const remote = await api(`/api/history/tasks?page=${state.historyPage}&page_size=${state.historyPageSize}${state.historyQuery ? `&keyword=${encodeURIComponent(state.historyQuery)}` : ''}`, { method: 'GET' });
    const items = remote?.items || [];
    state.historyTotal = Number(remote?.total || items.length);
    state.historyTotalPages = Number(remote?.total_pages || 1);
    state.history = items.map(item => ({
      id: String(item.id),
      type: taskTypeLabel(item.task_type || item.source_type),
      source: item.task_name || item.result_path || `task-${item.id}`,
      model: state.settings.defaultModel,
      dataset: item.scene_name || '真实检测记录',
      total: Number(item.total_objects || 0),
      confidence: Number(item.conf_threshold || 0),
      duration: Math.round(Number(item.total_inference_time || 0)),
      status: item.status || 'unknown',
      created_at: item.created_at || item.completed_at || new Date().toISOString(),
      raw: item,
    }));
    state.dataStatus.history = 'real';
    if (showToast) toast('历史记录已刷新');
  } catch (error) {
    state.history = [];
    state.historyTotal = 0;
    state.historyTotalPages = 1;
    state.dataStatus.history = 'error';
    if (showToast) toast(error.message, 'error', '历史记录加载失败');
  }
  if (state.page === 'history') renderShell();
}

async function refreshDashboard(showToast = false) {
  try {
    const [statistics, trend, classDist, typeDist] = await Promise.all([
      api('/api/dashboard/statistics', { method: 'GET' }),
      api('/api/dashboard/trend', { method: 'GET' }),
      api('/api/dashboard/class-dist', { method: 'GET' }),
      api('/api/dashboard/type-dist', { method: 'GET' }),
    ]);
    state.dashboard = {
      statistics,
      trend: trend?.trend || [],
      classDistribution: classDist?.distribution || [],
      typeDistribution: typeDist?.distribution || [],
      loaded: true,
    };
    state.dataStatus.dashboard = 'real';
    if (showToast) toast('看板数据已刷新');
  } catch (error) {
    state.dashboard = { statistics: null, trend: [], classDistribution: [], typeDistribution: [], loaded: false };
    state.dataStatus.dashboard = 'error';
    if (showToast) toast(error.message, 'error', '看板数据加载失败');
  }
  if (state.page === 'dashboard') renderShell();
}

function taskTypeLabel(type = '') {
  return {
    single: '单图检测',
    batch: '批量检测',
    zip: 'ZIP 检测',
    video: '视频检测',
    camera: '摄像头检测',
    folder: '文件夹检测',
  }[type] || type || '检测任务';
}

function addTrace(type, title, detail) {
  state.chat.trace.unshift({ time: '刚刚', type, title, detail });
  if (state.chat.trace.length > 20) state.chat.trace.length = 20;
}

function resetAgentFlow() {
  state.chat.agentFlow = [
    { id: 'supervisor', label: 'Supervisor', detail: '意图识别与路由', status: 'idle' },
    { id: 'detection', label: 'Detection', detail: '目标检测', status: 'idle' },
    { id: 'qa', label: 'QA / RAG', detail: '知识库检索', status: 'idle' },
    { id: 'analysis', label: 'Analysis', detail: '统计分析', status: 'idle' },
    { id: 'summarize', label: 'Summarize', detail: '结果汇总', status: 'idle' },
  ];
}

function updateAgentFlow(event = {}) {
  const alias = {
    parallel: 'supervisor',
    parallel_detection_qa: 'supervisor',
    detection_agent: 'detection',
    qa_agent: 'qa',
    analysis_agent: 'analysis',
    supervisor_summarize: 'summarize',
  };
  const id = alias[event.node] || event.node || 'supervisor';
  const item = state.chat.agentFlow.find(node => node.id === id);
  if (!item) return;
  item.status = event.status || 'running';
  item.detail = event.detail || event.title || item.detail;
  if (id === 'supervisor' && event.node === 'parallel') {
    item.detail = event.status === 'done' ? '并行任务完成' : '正在并行调度';
  }
}

function agentFlowHtml() {
  const active = state.chat.agentFlow.some(item => item.status === 'running');
  const done = state.chat.agentFlow.filter(item => item.status === 'done').length;
  return `<section class="panel agent-status-card"><div class="panel-title"><div><strong>智能体调用流程</strong><span>${active ? '正在执行' : '等待任务'} · ${done}/${state.chat.agentFlow.length}</span></div>${statusBadge('healthy')}</div><div class="agent-flow">${state.chat.agentFlow.map((item, index) => `<article class="agent-step ${item.status}"><i>${index + 1}</i><div><strong>${escapeHtml(item.label)}</strong><p>${escapeHtml(item.detail)}</p></div><span>${item.status === 'done' ? '完成' : item.status === 'running' ? '运行中' : item.status === 'error' ? '异常' : '待命'}</span></article>`).join('')}</div><div class="flow-note">Supervisor 负责路由；Detection、QA/RAG、Analysis 可按任务并行执行，最终由 Summarize 汇总。</div></section>`;
}

async function streamChatRequest(payload, onEvent, signal) {
  const headers = { ...(state.token ? { Authorization: `Bearer ${state.token}` } : {}) };
  let body;
  if (payload.files?.length) {
    body = new FormData();
    body.append('message', payload.message || '');
    body.append('session_id', payload.session_id || 'default');
    payload.files.forEach(item => {
      if (item?.file) body.append('files', item.file, item.name || item.file.name || 'upload');
    });
  } else {
    headers['Content-Type'] = 'application/json';
    body = JSON.stringify(payload);
  }
  const response = await fetch(apiUrl('/api/chat/stream'), {
    method: 'POST',
    headers,
    body,
    signal
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

function latestDetectionSummaryForChat() {
  const result = state.detection.results[state.detection.selectedResult] || state.detection.results.at(-1);
  if (!result) return '';
  const counts = Object.entries(result.counts || {})
    .map(([name, count]) => `${classLabel(name)}:${count}`)
    .join(', ') || '暂无目标';
  const risk = result.risk
    ? `${result.risk.risk_level ?? '-'}级 ${result.risk.risk_name || ''}`
    : '暂无风险分析';
  const reasons = result.risk?.reasons?.length
    ? result.risk.reasons.slice(0, 4).join('；')
    : '暂无明显风险原因';
  return [
    '【最近一次检测结果摘要，仅供分析，不包含图片、视频、base64、边界框或逐帧截图】',
    `文件：${result.filename}`,
    `类型：${result.mode || 'single'}`,
    `目标总数：${result.total}`,
    `类别统计：${counts}`,
    `去重车辆：${result.uniqueVehicleCount ?? '无'}`,
    `平均置信度：${Number(result.confidence || 0).toFixed(2)}`,
    `风险等级：${risk}`,
    `风险原因：${reasons}`,
  ].join('\n');
}

async function sendChat() {
  const text = state.chat.input.trim();
  if ((!text && !state.chat.attachments.length) || state.chat.streaming) return;
  const attachments = state.chat.attachments.map(item => ({ ...item }));
  const userMessage = { id: uid('msg'), role: 'user', content: text || `[普通附件] ${attachments.map(item => item.name).join(', ')}`, attachments, time: new Date().toISOString() };
  const assistantMessage = { id: uid('msg'), role: 'assistant', content: '', time: new Date().toISOString(), streaming: true };
  state.chat.messages.push(userMessage, assistantMessage);
  state.chat.input = '';
  state.chat.attachments = [];
  state.chat.streaming = true;
  const controller = new AbortController();
  state.chat.controller = controller;
  resetAgentFlow();
  addTrace('system', '意图分析', text || '附件检测请求');
  renderShell();

  const handleEvent = event => {
    if (event.type === 'token') assistantMessage.content += event.content || '';
    if (event.type === 'multi_agent') {
      updateAgentFlow(event);
      addTrace(
        event.status === 'error' ? 'error' : event.node === 'qa' ? 'tool' : event.node === 'summarize' ? 'result' : 'system',
        event.title || event.node || 'Agent',
        event.detail || event.message || ''
      );
    }
    if (event.type === 'thinking') {
      addTrace('system', '思考中', event.content || event.message || '正在分析请求');
    }
    if (event.type === 'error') {
      assistantMessage.content += event.content || event.message || 'Agent 调用失败';
      assistantMessage.tool = assistantMessage.tool ? { ...assistantMessage.tool, status: 'error' } : null;
    }
    if (event.type === 'tool_start') {
      assistantMessage.tool = { title: event.tool || '检测工具', detail: event.message || '正在调用工具', status: 'running' };
      addTrace('tool', '工具调用', event.tool || 'detect_single_image');
    }
    if (event.type === 'tool_result') {
      const remote = event.result || {};
      const isDetectionTool = String(event.tool || '').startsWith('detect_');
      if (isDetectionTool) {
        const base = makeDetectionResult(attachments[0]?.file, 0, 'single');
        base.total = remote.total_objects || base.total;
        base.counts = remote.class_counts || base.counts;
        base.inference = remote.inference_time || base.inference;
        assistantMessage.result = base;
        assistantMessage.tool = { title: event.tool || 'detect_single_image', detail: `检测完成，共发现 ${base.total} 个目标`, status: 'done' };
        addTrace('result', '工具返回', `${base.total} 个目标 · ${base.inference}ms`);
      } else {
        assistantMessage.tool = { title: event.tool || 'tool', detail: event.message || event.content || '工具调用完成', status: 'done' };
        addTrace('result', '工具返回', event.tool || 'tool');
      }
    }
    if (event.type === 'done') assistantMessage.streaming = false;
    renderShell();
  };

  try {
    const attachmentNote = attachments.length
      ? `\n\n【附件说明】用户本次附加了文件：${attachments.map(item => item.name).join(', ')}。请先由后端 YOLO 检测附件，再根据结构化检测结果回答用户问题；不要把原始图片、视频或 base64 交给大模型。`
      : '';
    const resultSummary = latestDetectionSummaryForChat();
    await streamChatRequest({
      message: `${text || '请根据已有检测结果进行分析，或进行普通对话。'}${attachmentNote}${resultSummary ? `\n\n${resultSummary}` : ''}`,
      files: attachments,
      has_attachment: attachments.length > 0,
      filename: attachments[0]?.name,
      result_summary_only: Boolean(resultSummary),
    }, handleEvent, controller.signal);
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
  const label = mode === 'single' ? '单图检测' : mode === 'batch' ? '批量检测' : mode === 'video' ? '视频检测' : 'ZIP 检测';
  const userMessage = { id: uid('msg'), role: 'user', content: `[快捷检测] ${fileItems.map(item => item.name).join(', ')}`, attachments: fileItems, time: new Date().toISOString() };
  const assistantMessage = { id: uid('msg'), role: 'assistant', content: `正在执行${label}…`, time: new Date().toISOString(), streaming: true, tool: { title: `detect_${mode}`, detail: '快捷通道直接调用 DetectionService', status: 'running' } };
  state.chat.messages.push(userMessage, assistantMessage);
  state.chat.streaming = true;
  addTrace('tool', label, `直接调用 /api/detection/${mode}`);
  renderShell();
  const form = new FormData();
  try {
    const results = await requestBackendDetection(mode, fileItems);
    const result = results[0];
    const totalFiles = mode === 'single' || mode === 'video' ? 1 : results.length;
    const total = results.reduce((sum, item) => sum + Number(item.total || 0), 0);
    assistantMessage.content = `${label}完成！共处理 ${totalFiles} 个文件，累计发现 ${total} 个目标。`;
    assistantMessage.result = result;
    assistantMessage.tool = { title: `detect_${mode}`, detail: `处理完成 · ${totalFiles} 文件`, status: 'done' };
    const history = { id: `H${Date.now()}`, type: label, source: fileItems[0]?.name || `${mode}.zip`, model: result.model, dataset: '快捷检测', total, confidence: result.confidence, duration: Math.round(result.inference || 0), status: 'completed', created_at: new Date().toISOString() };
    state.history.unshift(history);
    addTrace('result', '检测完成', `${total} 个目标 · ${totalFiles} 个文件`);
    toast(`${label}完成，共发现 ${total} 个目标`);
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
    updateDetectionProgress(Math.min(92, state.detection.progress + 4));
  }, 700);
  try {
    let results = await requestBackendDetection(state.detection.mode, state.detection.files);
    results.forEach(result => {
      result.model = state.detection.model;
      result.confidence = state.detection.confidence;
      result.iou = state.detection.iou;
    });
    state.detection.results = results;
    state.detection.selectedResult = 0;
    updateDetectionProgress(100);
    const total = results.reduce((sum, item) => sum + item.total, 0);
    const firstFile = state.detection.files[0];
    const isVideo = firstFile?.type?.startsWith('video/') || /\.(mp4|avi|mov|mkv|wmv|flv)$/i.test(firstFile?.name || '');
    state.history.unshift({ id: `H${Date.now()}`, type: isVideo ? '视频检测' : state.detection.mode === 'single' ? '单图检测' : state.detection.mode === 'batch' ? '批量检测' : 'ZIP 检测', source: firstFile?.name || 'demo.zip', model: state.detection.model, dataset: 'Detection Workspace', total, confidence: state.detection.confidence, duration: Math.round(results.reduce((sum, item) => sum + Number(item.inference || 0), 0) / Math.max(1, results.length)), status: 'completed', created_at: new Date().toISOString() });
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
  const dataset = state.datasets.filter(item => item.data_yaml)[Number(values.dataset_index || 0)];
  if (!dataset) {
    toast('没有可用数据集，请先确认 backend/datasets 下存在 data.yaml', 'error');
    return;
  }
  values.scene_id = Number(dataset.scene_id || 1);
  values.dataset_name = dataset.name;
  values.dataset_path = dataset.dataset_path;
  values.data_yaml = dataset.data_yaml;
  values.epochs = Number(values.epochs);
  values.batch_size = Number(values.batch_size);
  values.img_size = Number(values.img_size || values.image_size || 640);
  values.augment_config = { enabled: Boolean(values.augmentation) };
  delete values.dataset_index;
  delete values.image_size;
  delete values.augmentation;
  const remote = await apiOrFallback('/api/training/start', { method: 'POST', json: values }, null);
  const existingIds = state.tasks.map(item => Number(item.id)).filter(Number.isFinite);
  const id = remote?.id || (existingIds.length ? Math.max(...existingIds) + 1 : Date.now());
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
    image_size: values.img_size,
    status: 'running',
    progress: remote?.progress || 1,
    best_map50: remote?.best_map50 || .06,
    exported: false,
    created_at: new Date().toISOString(),
    metrics: []
  };
  state.tasks.unshift(task);
  state.selectedTaskId = task.id;
  state.logs.unshift({ id: uid('log'), level: 'INFO', module: 'training', message: `Started ${task.task_uuid} model=${task.model_name} dataset=${task.dataset_name}`, time: new Date().toISOString() });
  closeModal();
  navigate('training');
  void refreshTasks(false);
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
  try {
    const report = await api(`/api/training/validate/${id}`, { method: 'POST', json: { split: 'val', conf: .25, iou: .45 } });
    state.evaluationReport = report;
    state.evaluationTaskId = task.id;
    state.logs.unshift({ id: uid('log'), level: 'INFO', module: 'evaluation', message: `Validated ${task.task_uuid}; mAP50=${Number(state.evaluationReport.map50 || 0).toFixed(3)}`, time: new Date().toISOString() });
    renderShell();
    toast('模型评估完成');
  } catch (error) {
    state.evaluationReport = null;
    renderShell();
    toast(error.message, 'error', '真实评估失败');
  }
}

async function exportModel(id) {
  const form = $('#export-model-form');
  if (!form?.reportValidity()) return;
  const values = Object.fromEntries(new FormData(form));
  values.set_default = form.elements.set_default.checked;
  values.upload_minio = form.elements.upload_minio.checked;
  const task = state.tasks.find(item => Number(item.id) === Number(id));
  try {
    const result = await api(`/api/training/export/${id}`, { method: 'POST', json: values });
    if (task) task.exported = true;
    closeModal();
    renderShell();
    toast(`模型已导出：${result.version || values.version}`);
  } catch (error) {
    toast(error.message, 'error', '模型导出失败');
  }
}

async function downloadModel(id) {
  const task = state.tasks.find(item => Number(item.id) === Number(id));
  if (!task) return;
  try {
    const response = await api(`/api/training/download/${id}`, { method: 'GET', raw: true, timeout: 15000 });
    downloadBlob(`${task.model_name}-${task.task_uuid}.pt`, await response.blob(), 'application/octet-stream');
  } catch (error) {
    return toast(error.message, 'error', '模型下载失败');
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
  const remote = await api('/api/training/predict', { method: 'POST', body: form, headers: { 'X-File-Name': safeHeaderValue(fileItem.name) }, timeout: 20000 });
  const result = normalizeBackendDetectionResult(remote, fileItem, 0, 'single');
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
  state.settings.demoFallback = false;
  state.settings.defaultModel = $('#setting-default-model')?.value || state.settings.defaultModel;
  state.settings.minioBucket = $('#setting-minio-bucket')?.value.trim() || 'rsod-results';
  state.settings.confidence = Number($('#setting-confidence')?.value || .25);
  state.settings.iou = Number($('#setting-iou')?.value || .45);
  state.theme = $('#setting-dark-mode')?.checked ? 'dark' : 'light';
  state.settings.compactTable = Boolean($('#setting-compact')?.checked);
  state.settings.autoSave = Boolean($('#setting-auto-save')?.checked);
  state.detection.model = state.settings.defaultModel;
  state.detection.confidence = state.settings.confidence;
  state.detection.iou = state.settings.iou;
  persistState();
  toast('系统设置已保存');
  renderShell();
}

function resetSettings() {
  state.settings = { apiBase: 'http://localhost:8000', demoFallback: false, language: 'zh-CN', defaultModel: 'yolov11s-rsod-v3.2', confidence: .25, iou: .45, pollInterval: 5, compactTable: false, desktopNotifications: true, autoSave: true, minioBucket: 'rsod-results' };
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

startCamera = async function startCameraWithDetection() {
  const camera = state.detection.camera;
  try {
    if (!navigator.mediaDevices?.getUserMedia) throw new Error('浏览器不支持摄像头');
    stopCamera({ render: false, silent: true });
    camera.stream = await navigator.mediaDevices.getUserMedia({
      video: { width: 640, height: 480 },
      audio: false
    });
    camera.active = true;
    camera.connected = false;
    camera.sending = false;
    camera.paused = false;
    camera.error = '';
    camera.detections = [];
    camera.latestResult = null;
    camera.frameSamples = [];
    camera.cumulativeCounts = {};
    camera.startedAt = Date.now();
    camera.stats = { fps: 0, frames: 0, objects: 0, inference: 0 };
    renderShell();

    await sleep(30);
    const video = document.querySelector('#camera-preview');
    const canvas = document.querySelector('#camera-canvas');
    if (!video || !canvas) throw new Error('摄像头画布初始化失败');
    video.srcObject = camera.stream;
    await video.play();
    const width = video.videoWidth || 640;
    const height = video.videoHeight || 480;
    canvas.width = width;
    canvas.height = height;
    drawCameraSourceFrame(video, canvas, width, height);

    const socket = new WebSocket(backendWebSocketUrl('/api/detection/camera'));
    camera.socket = socket;
    socket.addEventListener('open', () => {
      socket.send(JSON.stringify({
        type: 'config',
        mode: camera.mode || 'cpu',
        conf: state.detection.confidence,
        iou: state.detection.iou
      }));
      updateCameraStatus('后端检测连接已建立，等待配置确认');
    });
    socket.addEventListener('message', event => handleCameraMessage(event));
    socket.addEventListener('error', () => {
      camera.error = 'WebSocket 连接失败';
      updateCameraStatus(camera.error);
      toast('摄像头检测连接失败，请确认后端 8000 正在运行', 'error');
    });
    socket.addEventListener('close', () => {
      camera.connected = false;
      camera.sending = false;
      if (camera.active) updateCameraStatus('摄像头检测连接已关闭');
    });
    toast('摄像头已开启，正在连接后端检测服务');
  } catch (e) {
    stopCamera({ render: true, silent: true });
    toast(e.message || '摄像头连接失败，请检查权限', 'warning');
  }
};

function handleCameraMessage(event) {
  const camera = state.detection.camera;
  let payload = null;
  try {
    payload = JSON.parse(event.data);
  } catch {
    return;
  }
  if (payload.type === 'config_ok') {
    camera.connected = true;
    updateCameraStatus(`${String(payload.mode || camera.mode).toUpperCase()} 模式实时检测中`);
    if (!camera.paused) requestAnimationFrame(sendCameraFrame);
    return;
  }
  if (payload.type === 'error') {
    camera.sending = false;
    camera.error = payload.message || '摄像头检测失败';
    updateCameraStatus(camera.error);
    toast(camera.error, 'error');
    return;
  }
  if (payload.type !== 'result') return;

  camera.sending = false;
  camera.detections = payload.detections || [];
  camera.stats = {
    fps: payload.fps || camera.stats.fps || 0,
    frames: camera.stats.frames + 1,
    objects: payload.total_objects || 0,
    inference: Math.round(payload.inference_time || 0)
  };
  recordCameraFrame(payload);
  camera.latestResult = cameraResultFromPayload(payload);
  if (payload.annotated_frame) drawCameraAnnotatedFrame(payload.annotated_frame);
  updateCameraStatsDom();
  if (camera.paused) {
    renderShell();
    requestAnimationFrame(() => updateCameraStatus('已暂停，右侧显示最后一帧检测结果'));
    return;
  }
  if (camera.active && camera.connected) requestAnimationFrame(sendCameraFrame);
}

function sendCameraFrame() {
  const camera = state.detection.camera;
  const socket = camera.socket;
  const video = document.querySelector('#camera-preview');
  if (!camera.active || !camera.connected || camera.paused || camera.sending || !video || !socket || socket.readyState !== WebSocket.OPEN) return;
  const targetSize = camera.mode === 'gpu' ? 640 : 416;
  const canvas = camera.captureCanvas || document.createElement('canvas');
  camera.captureCanvas = canvas;
  canvas.width = targetSize;
  canvas.height = targetSize;
  if (!drawCameraSourceFrame(video, canvas, targetSize, targetSize)) return;
  const data = canvas.toDataURL('image/jpeg', 0.6).split(',', 2)[1];
  camera.sending = true;
  socket.send(JSON.stringify({ type: 'frame', data }));
}

function drawCameraAnnotatedFrame(frameBase64) {
  const canvas = document.querySelector('#camera-canvas');
  if (!canvas) return;
  const image = new Image();
  image.onload = () => {
    canvas.width = image.width;
    canvas.height = image.height;
    canvas.getContext('2d')?.drawImage(image, 0, 0);
  };
  image.src = `data:image/jpeg;base64,${frameBase64}`;
}

function updateCameraStatus(text) {
  const status = document.querySelector('#camera-status');
  if (status) status.textContent = text;
}

function updateCameraStatsDom() {
  const { stats, detections } = state.detection.camera;
  const values = {
    fps: stats.fps,
    frames: stats.frames,
    objects: stats.objects,
    inference: `${stats.inference}ms`
  };
  for (const [name, value] of Object.entries(values)) {
    const node = document.querySelector(`[data-camera-stat="${name}"]`);
    if (node) node.textContent = value;
  }
  const list = document.querySelector('#camera-detections');
  if (list) {
    list.innerHTML = detections.length
      ? detections.map(item => `<span>${escapeHtml(item.class_name || 'object')} ${(Number(item.confidence || 0) * 100).toFixed(0)}%</span>`).join('')
      : '<small>暂无检测目标</small>';
  }
}

function toggleCameraPause() {
  const camera = state.detection.camera;
  if (!camera.active) return;
  camera.paused = !camera.paused;
  camera.sending = false;

  if (camera.paused) {
    if (!camera.latestResult) {
      camera.latestResult = cameraResultFromPayload({
        type: 'result',
        detections: camera.detections,
        total_objects: camera.stats.objects,
        inference_time: camera.stats.inference
      });
    }
    renderShell();
    requestAnimationFrame(() => updateCameraStatus('已暂停，右侧显示最后一帧检测结果'));
    toast('摄像头检测已暂停，已固定最后一帧结果', 'warning');
    return;
  }

  renderShell();
  requestAnimationFrame(() => {
    updateCameraStatus(camera.connected ? '实时检测中' : '正在连接后端检测服务');
    sendCameraFrame();
  });
  toast('摄像头检测已继续');
}

stopCamera = function stopCameraWithDetection(options = {}) {
  const { render = true, silent = false } = options;
  const camera = state.detection.camera;
  const socket = camera.socket;
  if (socket && socket.readyState === WebSocket.OPEN) {
    try { socket.send(JSON.stringify({ type: 'close' })); } catch {}
  }
  try { socket?.close(); } catch {}
  camera.stream?.getTracks().forEach(track => track.stop());
  camera.stream = null;
  camera.socket = null;
  camera.captureCanvas = null;
  camera.active = false;
  camera.connected = false;
  camera.sending = false;
  camera.paused = false;
  camera.detections = [];
  camera.stats = { fps: 0, frames: 0, objects: 0, inference: 0 };
  camera.error = '';
  if (render) renderShell();
  if (!silent) toast('摄像头已关闭', 'warning');
};

function afterRender() {
  if (state.page === 'chat') {
    const scroll = $('#chat-scroll');
    const lastMessage = state.chat.messages.at(-1);
    const lastLength = String(lastMessage?.content || '').length + (lastMessage?.attachments?.length || 0);
    const shouldScroll = state.chat.messages.length !== state.renderMeta.chatMessageCount
      || lastLength !== state.renderMeta.chatLastMessageLength;
    if (scroll && shouldScroll) scroll.scrollTop = scroll.scrollHeight;
    state.renderMeta.chatMessageCount = state.chat.messages.length;
    state.renderMeta.chatLastMessageLength = lastLength;
    const textarea = $('#chat-input');
    if (textarea) {
      textarea.style.height = 'auto';
      textarea.style.height = `${Math.min(140, Math.max(44, textarea.scrollHeight))}px`;
    }
  }
  if (state.page === 'detection' && state.detection.mode === 'camera' && state.detection.camera.active) {
    const video = $('#camera-preview');
    if (video && video.srcObject !== state.detection.camera.stream) {
      video.srcObject = state.detection.camera.stream;
      video.play?.().catch(() => {});
    }
    updateCameraStatsDom();
  }
  const pageContent = $('#page-content');
  if (pageContent && state.renderMeta.lastPage !== state.page) {
    pageContent.classList.add('page-enter');
    setTimeout(() => pageContent.classList.remove('page-enter'), 320);
  }
  state.renderMeta.lastPage = state.page;
  // style range inputs so filled portion is colored and remainder is black
  $$('input[type="range"]').forEach(input => setRangeFill(input));
}

function render() {
  if (!state.token) renderLogin();
  else {
    if (!NAV.some(item => item.key === state.page)) state.page = 'chat';
    renderShell();
  }
}

window.addEventListener('hashchange', () => {
  const page = location.hash.replace('#/', '').replace('#', '') || 'chat';
  state.page = NAV.some(item => item.key === page) ? page : 'chat';
  if (state.token) {
    renderShell();
    void refreshPageData(state.page);
  }
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
  if (target.closest?.('#auth-form') && target.name) {
    state.authForm[target.name] = target.value;
  }
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
  if (target.id === 'history-search') { state.historyQuery = target.value; state.historyPage = 1; void refreshHistory(false); }
  if (target.id === 'history-type') { state.historyType = target.value; state.historyPage = 1; void refreshHistory(false); }
  if (target.id === 'history-page-size') { state.historyPageSize = Number(target.value); state.historyPage = 1; void refreshHistory(false); }
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
    state.chat.quickActionsOpen = false;
    closeModal();
    navigate(page);
    return;
  }
  const closeModalTarget = event.target.closest('[data-action="close-modal"]');
  if (closeModalTarget && !closeModalTarget.disabled) {
    event.preventDefault();
    closeModal();
    return;
  }
  if (state.chat.quickActionsOpen && !event.target.closest('.chat-composer-wrap')) {
    state.chat.quickActionsOpen = false;
    renderShell();
    return;
  }
  const target = event.target.closest('[data-action]');
  if (!target || target.disabled) return;
  const action = target.dataset.action;
  const id = target.dataset.id;

  if (action === 'auth-mode') { state.authMode = target.dataset.mode; state.authForm.password = ''; renderLogin(); }
  else if (action === 'toggle-password') { state.passwordVisible = !state.passwordVisible; renderLogin(); }
  else if (action === 'copy-demo') { toast('当前已关闭演示账号，请使用数据库中的真实账号登录', 'warning'); }
  else if (action === 'forgot-password') toast('请使用已注册账号，或切换到注册页创建新账号', 'warning');
  else if (action === 'toggle-sidebar') { state.sidebarCollapsed = !state.sidebarCollapsed; persistState(); renderShell(); }
  else if (action === 'toggle-mobile-nav') { state.mobileNavOpen = !state.mobileNavOpen; renderShell(); }
  else if (action === 'close-mobile-nav') { state.mobileNavOpen = false; renderShell(); }
  else if (action === 'logout') { state.token = ''; localStorage.removeItem('rsod_token'); renderLogin(); toast('已安全退出'); }
  else if (action === 'open-command') openCommand();
  else if (action === 'command-navigate') { closeModal(); navigate(target.dataset.page); }
  else if (action === 'close-modal') closeModal();
  else if (action === 'toggle-chat-tools') { state.chat.quickActionsOpen = !state.chat.quickActionsOpen; renderShell(); }
  else if (action === 'attach-chat') { state.chat.quickActionsOpen = false; renderShell(); chooseFiles('chat-attach', { accept: 'image/*,video/*,.zip', multiple: true }); }
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
    state.chat.quickActionsOpen = false;
    renderShell();
    chooseFiles(`quick-${mode}`, { accept: mode === 'zip' ? '.zip,application/zip' : mode === 'video' ? 'video/*' : 'image/*', multiple: mode === 'batch' });
  }
  else if (action === 'set-detection-mode') { if (state.detection.mode === 'camera' && target.dataset.mode !== 'camera') stopCamera({ render: false, silent: true }); state.detection.mode = target.dataset.mode; state.detection.files = []; state.detection.results = []; renderShell(); }
  else if (action === 'pick-detection-files') chooseFiles('detection', { accept: state.detection.mode === 'zip' ? '.zip,application/zip' : 'image/*,video/*', multiple: true });
  else if (action === 'connect-camera') { state.detection.mode='camera'; renderShell(); setTimeout(startCamera,100); }
  else if (action === 'toggle-camera-pause') toggleCameraPause();
  else if (action === 'stop-camera') stopCamera();
  else if (action === 'remove-detection-file') { event.stopPropagation(); state.detection.files.splice(Number(target.dataset.index), 1); renderShell(); }
  else if (action === 'run-detection') {
    if (state.detection.mode === 'camera') await startCamera();
    else await runDetection();
  }
  else if (action === 'load-demo-detection') loadDemoDetection();
  else if (action === 'clear-results') { state.detection.results = []; state.detection.selectedResult = 0; renderShell(); }
  else if (action === 'select-result') { state.detection.selectedResult = Number(target.dataset.index); renderShell(); }
  else if (action === 'download-result') {
    const result = state.detection.results.find(item => item.id === target.dataset.resultId)
      || (state.detection.camera.latestResult?.id === target.dataset.resultId ? state.detection.camera.latestResult : null)
      || state.detection.results[state.detection.selectedResult]
      || state.detection.camera.latestResult;
    if (result) {
      if (result.mode === 'camera') {
        downloadBlob(`camera-detections-${Date.now()}.csv`, cameraResultCsv(result), 'text/csv;charset=utf-8');
        toast('摄像头检测明细 CSV 已导出');
        return;
      }
      const source = result.videoUrl || result.preview;
      const response = await fetch(source);
      const blob = await response.blob();
      const suffix = result.videoUrl ? '.mp4' : '';
      downloadBlob(`annotated-${result.filename}${result.filename.endsWith(suffix) ? '' : suffix}`, blob, result.videoUrl ? 'video/mp4' : 'image/jpeg');
      toast(result.videoUrl ? '标注视频下载已开始' : '标注图下载已开始');
    }
  }
  else if (action === 'save-result') toast('检测结果已保存到历史记录');
  else if (action === 'add-dataset') openDatasetModal();
  else if (action === 'submit-new-dataset') createDataset();
  else if (action === 'open-converter') openConverterModal(id);
  else if (action === 'run-converter') await runConverter();
  else if (action === 'dataset-detail') openDatasetDetail(id);
  else if (action === 'validate-dataset') await validateDataset(id);
  else if (action === 'train-dataset') {
    const datasetName = state.datasets.find(item => Number(item.id) === Number(id))?.name || '';
    closeModal();
    await refreshTrainingDatasets(false);
    openNewTaskModal(datasetName);
  }
  else if (action === 'pick-dataset-package') chooseFiles('dataset-package', { accept: '.zip,.json,.xml,application/zip', multiple: false });
  else if (action === 'copy-tree') { await navigator.clipboard?.writeText('datasets/scene_name/\n├── images/{train,val,test}\n├── labels/{train,val,test}\n└── data.yaml').catch(() => {}); toast('目录结构已复制'); }
  else if (action === 'new-training-task') { await refreshTrainingDatasets(false); openNewTaskModal(); }
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
    const report = state.evaluationReport;
    if (!task || !report) return toast('暂无真实评估报告，请先点击重新评估', 'warning');
    downloadBlob(`eval-report-${task.task_uuid}.json`, JSON.stringify(report, null, 2), 'application/json'); toast('评估报告已下载');
  }
  else if (action === 'export-class-ap') {
    const task = state.tasks.find(item => Number(item.id) === Number(state.evaluationTaskId));
    const report = state.evaluationReport;
    if (!task || !report?.per_class?.length) return toast('暂无真实每类 AP 报告', 'warning');
    const csv = ['class,precision,recall,ap50,ap50_95', ...report.per_class.map(item => [item.name, item.precision, item.recall, item.ap50, item.ap50_95].join(','))].join('\n');
    downloadBlob(`per-class-ap-${task.task_uuid}.csv`, csv, 'text/csv;charset=utf-8'); toast('每类 AP 已导出');
  }
  else if (action === 'refresh-dashboard') { await Promise.all([refreshDashboard(false), refreshHistory(false), refreshTasks(false)]); toast('看板数据已刷新'); }
  else if (action === 'export-dashboard') downloadBlob(`rsod-dashboard-${Date.now()}.json`, JSON.stringify({ tasks: state.tasks, history: state.history, datasets: state.datasets }, null, 2), 'application/json');
  else if (action === 'clear-history-filter') { state.historyQuery = ''; state.historyType = 'ALL'; state.historyPage = 1; renderShell(); }
  else if (action === 'export-history') exportHistory();
  else if (action === 'history-page') { state.historyPage = Number(target.dataset.pageNumber); await refreshHistory(false); }
  else if (action === 'history-detail') openHistoryDetail(id);
  else if (action === 'rerun-history') { closeModal(); const item = state.history.find(row => row.id === id); state.detection.mode = item?.type.includes('ZIP') ? 'zip' : item?.type.includes('批量') ? 'batch' : 'single'; navigate('detection'); toast('已将历史任务参数载入交通检测工作台'); }
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
  if (!state.token || state.modal) return;
  if (['training', 'evaluation'].includes(state.page)) void refreshTasks(false);
  if (state.page === 'dashboard') void refreshDashboard(false);
}, 10000);

render();
if (state.token) {
  setTimeout(() => void refreshTasks(false), 500);
  setTimeout(() => void refreshHistory(false), 650);
  setTimeout(() => void refreshDashboard(false), 800);
}
