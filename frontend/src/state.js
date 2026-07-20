import { reactive } from 'vue';

const persistedSettings = (() => {
  try {
    return JSON.parse(localStorage.getItem('fogtraffic_vue_settings') || '{}');
  } catch {
    return {};
  }
})();

export const state = reactive({
  page: location.hash?.replace('#', '') || 'chat',
  token: localStorage.getItem('rsod_token') || '',
  user: null,
  sidebarCollapsed: false,
  settings: {
    apiBase: persistedSettings.apiBase || 'http://localhost:8000',
    confidence: Number(persistedSettings.confidence ?? 0.25),
    iou: Number(persistedSettings.iou ?? 0.45),
    defaultModel: persistedSettings.defaultModel || 'yolov11s-rsod-v3.2',
  },
  toast: [],
  chat: {
    messages: [
      {
        id: crypto.randomUUID(),
        role: 'assistant',
        content: '你好，我是 **FogTraffic 多智能体平台**。你可以上传图片并提问，例如“检测车辆数量，并解释 IoU”。',
        time: new Date().toISOString(),
      },
    ],
    input: '',
    attachments: [],
    streaming: false,
    quickActionsOpen: false,
    trace: [{ time: '刚刚', type: 'system', title: 'Agent 就绪', detail: 'Supervisor、Detection、QA/RAG、Analysis 已就绪' }],
    agentFlow: [],
  },
  detection: {
    mode: 'single',
    files: [],
    results: [],
    selected: 0,
    running: false,
    camera: {
      active: false,
      connecting: false,
      connected: false,
      sending: false,
      paused: false,
      error: '',
      status: '未连接',
      startedAt: 0,
      stats: { frames: 0, objects: 0, fps: 0, inference: 0 },
      detections: [],
      samples: [],
    },
  },
  tasks: [],
  datasets: [],
  history: [],
  dashboard: null,
});

export const navItems = [
  { key: 'chat', label: '智能对话', group: '工作台' },
  { key: 'detection', label: '交通检测工作台', group: '工作台' },
  { key: 'datasets', label: '数据集管理', group: '模型闭环' },
  { key: 'training', label: '模型训练', group: '模型闭环' },
  { key: 'evaluation', label: '模型评估', group: '模型闭环' },
  { key: 'dashboard', label: '数据看板', group: '分析与运维' },
  { key: 'history', label: '任务历史', group: '分析与运维' },
  { key: 'settings', label: '系统设置', group: '系统' },
];

export function resetAgentFlow() {
  state.chat.agentFlow = [
    { id: 'supervisor', label: 'Supervisor', detail: '意图识别与路由', status: 'idle' },
    { id: 'detection', label: 'Detection', detail: 'YOLO 检测', status: 'idle' },
    { id: 'qa', label: 'QA / RAG', detail: '知识库检索', status: 'idle' },
    { id: 'analysis', label: 'Analysis', detail: '统计分析', status: 'idle' },
    { id: 'summarize', label: 'Summarize', detail: '结果汇总', status: 'idle' },
  ];
}

export function addTrace(type, title, detail) {
  state.chat.trace.unshift({ time: '刚刚', type, title, detail });
  if (state.chat.trace.length > 20) state.chat.trace.length = 20;
}

export function updateAgentFlow(event) {
  const alias = { parallel: 'supervisor', detection_agent: 'detection', qa_agent: 'qa', analysis_agent: 'analysis', supervisor_summarize: 'summarize' };
  const id = alias[event.node] || event.node || 'supervisor';
  const item = state.chat.agentFlow.find(node => node.id === id);
  if (!item) return;
  item.status = event.status || 'running';
  item.detail = event.detail || event.title || item.detail;
}

export function toast(message, type = 'success') {
  const item = { id: crypto.randomUUID(), message, type };
  state.toast.push(item);
  setTimeout(() => {
    const index = state.toast.findIndex(row => row.id === item.id);
    if (index >= 0) state.toast.splice(index, 1);
  }, 2600);
}

resetAgentFlow();
