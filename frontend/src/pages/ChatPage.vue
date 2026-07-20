<script setup>
import { nextTick, ref } from 'vue';
import { Paperclip, Send, Square, Trash2, Download } from 'lucide-vue-next';
import AgentFlow from '../components/AgentFlow.vue';
import DetectionResult from '../components/DetectionResult.vue';
import { streamChat } from '../services/api';
import { detectFiles, fileItems, normalizeDetection } from '../utils/detection';
import { markdown, formatTime } from '../utils/text';
import { addTrace, resetAgentFlow, state, toast, updateAgentFlow } from '../state';

const fileInput = ref(null);
const scrollRef = ref(null);
const quickOpen = ref(false);
let activeRunId = null;

function scrollBottom() {
  nextTick(() => {
    if (scrollRef.value) scrollRef.value.scrollTop = scrollRef.value.scrollHeight;
  });
}

function chooseFiles(mode = 'attach') {
  fileInput.value.dataset.mode = mode;
  fileInput.value.accept = mode === 'zip' ? '.zip,application/zip' : mode === 'video' ? 'video/*' : 'image/*,video/*,.zip';
  fileInput.value.multiple = mode === 'batch' || mode === 'attach';
  fileInput.value.click();
}

async function onFileChange(event) {
  const items = fileItems(event.target.files);
  const mode = event.target.dataset.mode || 'attach';
  event.target.value = '';
  quickOpen.value = false;
  if (!items.length) return;
  if (mode === 'attach') {
    state.chat.attachments.push(...items);
    return;
  }
  await quickDetect(mode, items);
}

function removeAttachment(index) {
  state.chat.attachments.splice(index, 1);
}

function handleAgentEvent(event) {
  if (event.type === 'multi_agent') {
    updateAgentFlow(event);
    addTrace(event.status === 'error' ? 'error' : event.node === 'summarize' ? 'result' : 'system', event.title || event.node, event.detail || '');
  }
}

function modeFromTool(tool = '', attachments = []) {
  if (tool.includes('video')) return 'video';
  if (tool.includes('zip')) return 'zip';
  if (tool.includes('batch')) return 'batch';
  const first = attachments[0];
  if (first?.type?.startsWith('video/')) return 'video';
  if (first?.name?.toLowerCase().endsWith('.zip')) return 'zip';
  return attachments.length > 1 ? 'batch' : 'single';
}

async function sendChatMessage() {
  const text = state.chat.input.trim();
  if ((!text && !state.chat.attachments.length) || state.chat.streaming) return;
  const attachments = state.chat.attachments.map(item => ({ ...item }));
  state.chat.messages.push({
    id: crypto.randomUUID(),
    role: 'user',
    content: text || `[附件] ${attachments.map(item => item.name).join(', ')}`,
    attachments,
    time: new Date().toISOString(),
  });
  const assistant = { id: crypto.randomUUID(), role: 'assistant', content: '', time: new Date().toISOString(), streaming: true };
  state.chat.messages.push(assistant);
  state.chat.input = '';
  state.chat.attachments = [];
  state.chat.streaming = true;
  resetAgentFlow();
  addTrace('system', '意图分析', text || '附件检测请求');
  scrollBottom();
  const controller = new AbortController();
  const runId = crypto.randomUUID();
  activeRunId = runId;
  state.chat.controller = controller;

  try {
    await streamChat(
      { message: text || '请检测附件并给出分析。', files: attachments, sessionId: 'vue-chat' },
      event => {
        if (controller.signal.aborted || activeRunId !== runId) return;
        handleAgentEvent(event);
        if (event.type === 'thinking') addTrace('system', '思考中', event.content || event.message || '正在分析请求');
        if (event.type === 'tool_start') addTrace('tool', '工具调用', event.tool || 'tool');
        if (event.type === 'tool_result') {
          addTrace('result', '工具返回', event.message || event.tool || 'tool');
          if (event.result && String(event.tool || '').startsWith('detect_')) {
            assistant.result = normalizeDetection(event.result, attachments[0] || {}, modeFromTool(event.tool, attachments), 0);
          }
        }
        if (event.type === 'token') assistant.content += event.content || '';
        if (event.type === 'error') assistant.content += event.content || event.message || 'Agent 调用失败';
        if (event.type === 'done') assistant.streaming = false;
        scrollBottom();
      },
      controller.signal,
    );
  } catch (error) {
    if (error.name === 'AbortError') {
      if (activeRunId === runId) {
        assistant.content = assistant.content || '已停止生成。';
        addTrace('system', '已停止', '用户停止了本次对话生成');
      }
    } else {
      assistant.content = `请求失败：${error.message}`;
    }
  } finally {
    if (activeRunId === runId) {
      activeRunId = null;
      assistant.streaming = false;
      state.chat.streaming = false;
      state.chat.controller = null;
    }
    scrollBottom();
  }
}

async function quickDetect(mode, items) {
  const label = mode === 'single' ? '单图检测' : mode === 'batch' ? '批量检测' : mode === 'video' ? '视频检测' : 'ZIP 检测';
  const user = { id: crypto.randomUUID(), role: 'user', content: `[快捷检测] ${items.map(item => item.name).join(', ')}`, attachments: items, time: new Date().toISOString() };
  const assistant = { id: crypto.randomUUID(), role: 'assistant', content: `正在执行${label}...`, time: new Date().toISOString(), streaming: true };
  state.chat.messages.push(user, assistant);
  state.chat.streaming = true;
  const controller = new AbortController();
  const runId = crypto.randomUUID();
  activeRunId = runId;
  state.chat.controller = controller;
  resetAgentFlow();
  updateAgentFlow({ node: 'supervisor', status: 'done', detail: `路由决策：${mode}` });
  updateAgentFlow({ node: 'detection', status: 'running', detail: '正在调用 YOLO 检测工具' });
  try {
    const results = await detectFiles(mode, items, { ...state.settings, signal: controller.signal });
    if (controller.signal.aborted || activeRunId !== runId) return;
    const total = results.reduce((sum, item) => sum + Number(item.total || 0), 0);
    assistant.content = `${label}完成，共处理 ${results.length} 个结果，累计发现 ${total} 个目标。`;
    assistant.result = results[0];
    updateAgentFlow({ node: 'detection', status: 'done', detail: `检测完成：${total} 个目标` });
    updateAgentFlow({ node: 'summarize', status: 'done', detail: '结果已整理' });
    toast(`${label}完成`);
  } catch (error) {
    if (error.name === 'AbortError') {
      if (activeRunId === runId) {
        assistant.content = assistant.content === `正在执行${label}...` ? '已停止检测。' : assistant.content;
        addTrace('system', '已停止', '用户停止了本次快捷检测');
        state.chat.agentFlow.forEach(item => {
          if (item.status === 'running') item.status = 'stopped';
        });
      }
    } else {
      assistant.content = `检测失败：${error.message}`;
      updateAgentFlow({ node: 'detection', status: 'error', detail: error.message });
    }
  } finally {
    if (activeRunId === runId) {
      activeRunId = null;
      assistant.streaming = false;
      state.chat.streaming = false;
      state.chat.controller = null;
    }
    scrollBottom();
  }
}

function stopChat() {
  const controller = state.chat.controller;
  if (controller && !controller.signal.aborted) controller.abort();
  activeRunId = null;
  state.chat.streaming = false;
  state.chat.controller = null;
  state.chat.agentFlow.forEach(item => {
    if (item.status === 'running') item.status = 'stopped';
  });
  const current = [...state.chat.messages].reverse().find(item => item.role === 'assistant' && item.streaming);
  if (current) {
    current.streaming = false;
    current.content = current.content || '已停止生成。';
  }
  addTrace('system', '已停止', '用户停止了当前对话任务');
}
</script>

<template>
  <div class="chat-page-grid">
    <section class="chat-main panel">
      <div class="chat-header">
        <div><span class="online-dot"></span><strong>目标检测智能体</strong><small>Vue · Multi-Agent · SSE</small></div>
        <div class="chat-header-actions">
          <button class="btn btn-ghost btn-sm" @click="state.chat.messages = state.chat.messages.slice(0, 1)"><Trash2 :size="15" />清空会话</button>
          <button class="btn btn-ghost btn-sm"><Download :size="15" />导出</button>
        </div>
      </div>

      <div ref="scrollRef" class="chat-scroll">
        <div v-for="message in state.chat.messages" :key="message.id" :class="['chat-message', message.role]">
          <div v-if="message.role === 'assistant'" class="avatar bot-avatar">AI</div>
          <div :class="['chat-bubble', message.role === 'user' ? 'user-bubble' : 'assistant-bubble']">
            <div v-if="message.attachments?.length" class="message-attachments">
              <template v-for="item in message.attachments" :key="item.name">
                <img v-if="item.type?.startsWith('image/')" :src="item.preview" alt="附件" />
                <div v-else class="file-attachment"><span>{{ item.name }}</span></div>
              </template>
            </div>
            <div v-if="message.role === 'assistant'" class="message-author"><strong>FogTraffic-YOLO-Detection</strong><span>{{ message.streaming ? '正在思考' : 'YOLOv11 智能体' }}</span></div>
            <div class="markdown-body" v-html="markdown(message.content || '')"></div>
            <DetectionResult v-if="message.result" :result="message.result" embedded />
            <div class="message-actions"><time>{{ formatTime(message.time) }}</time></div>
          </div>
          <div v-if="message.role === 'user'" class="avatar user-avatar">{{ (state.user?.display_name || state.user?.username || 'U').slice(0, 1).toUpperCase() }}</div>
        </div>
      </div>

      <div class="chat-composer-wrap">
        <div v-if="quickOpen" class="quick-actions chat-tools-menu">
          <button @click="chooseFiles('single')"><span>单图检测</span></button>
          <button @click="chooseFiles('batch')"><span>批量检测</span></button>
          <button @click="chooseFiles('video')"><span>视频检测</span></button>
          <button @click="chooseFiles('zip')"><span>ZIP 检测</span></button>
          <button @click="chooseFiles('attach')"><span>普通附件</span></button>
        </div>
        <div v-if="state.chat.attachments.length" class="pending-attachments">
          <div v-for="(item, index) in state.chat.attachments" :key="item.name">
            <img v-if="item.type?.startsWith('image/')" :src="item.preview" :alt="item.name" />
            <span>{{ item.name }}</span>
            <button @click="removeAttachment(index)">×</button>
          </div>
        </div>
        <div class="chat-composer">
          <button class="composer-icon" :class="{ active: quickOpen }" @click="quickOpen = !quickOpen"><Paperclip :size="20" /></button>
          <textarea v-model="state.chat.input" rows="1" placeholder="输入消息，或点击左侧按钮选择上传类型..." :disabled="state.chat.streaming" @keydown.enter.exact.prevent="sendChatMessage"></textarea>
          <button v-if="state.chat.streaming" class="send-button stop" @click="stopChat"><Square :size="16" />停止</button>
          <button v-else class="send-button icon-only" :disabled="!state.chat.input.trim() && !state.chat.attachments.length" aria-label="发送" title="发送" @click="sendChatMessage"><Send :size="22" /></button>
        </div>
        <div class="composer-hint"><span>Enter 发送 · Shift + Enter 换行</span><span>普通附件会由后端 YOLO 检测，LLM 只看结构化摘要</span></div>
      </div>
      <input ref="fileInput" type="file" hidden @change="onFileChange" />
    </section>

    <aside class="agent-side">
      <AgentFlow />
      <section class="panel trace-card">
        <div class="panel-title"><div><strong>执行轨迹</strong><span>最近 Agent 事件</span></div></div>
        <div class="trace-list">
          <article v-for="(item, index) in state.chat.trace" :key="`${item.title}-${item.time}-${index}`">
            <i :class="['trace-dot', item.type]"></i>
            <div><strong>{{ item.title }}</strong><p>{{ item.detail }}</p><small>{{ item.time }}</small></div>
          </article>
        </div>
      </section>
    </aside>
  </div>
</template>
