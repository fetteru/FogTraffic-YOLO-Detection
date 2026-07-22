<script setup>
import { computed, onMounted, ref } from 'vue';
import StatusBadge from '../components/StatusBadge.vue';
import { api } from '../services/api';
import { state, toast } from '../state';

const loading = ref(false);
const validating = ref(false);
const selectedTaskId = ref('');
const metrics = ref([]);
const report = ref(null);

const selectedTask = computed(() => state.tasks.find(item => String(item.id) === String(selectedTaskId.value)) || state.tasks[0] || null);
const latestMetric = computed(() => metrics.value.at(-1) || {});
const chartPoints = computed(() => metrics.value.slice(-24));

function normalizeTask(task) {
  return {
    id: task.id,
    task_uuid: task.task_uuid || String(task.id),
    name: task.task_name || task.name || `${task.model_name || 'YOLO'} 训练任务`,
    model_name: task.model_name || 'yolov11',
    dataset_name: task.dataset_name || task.scene_name || '未命名数据集',
    status: task.status || 'unknown',
    progress: Number(task.progress || 0),
    current_epoch: Number(task.current_epoch || 0),
    epochs: Number(task.epochs || 0),
    best_map50: Number(task.best_map50 || task.map50 || 0),
    device: task.device || '--',
    created_at: task.created_at,
  };
}

async function loadTasks() {
  loading.value = true;
  try {
    const data = await api('/api/training/tasks', { method: 'GET', timeout: 30000 });
    const items = Array.isArray(data) ? data : data.items || [];
    state.tasks = items.map(normalizeTask);
    if (!selectedTaskId.value && state.tasks[0]) selectedTaskId.value = state.tasks[0].id;
    await loadMetrics();
  } catch (error) {
    toast(error.message, 'error');
  } finally {
    loading.value = false;
  }
}

async function loadMetrics() {
  metrics.value = [];
  report.value = null;
  if (!selectedTask.value) return;
  try {
    const data = await api(`/api/training/metrics/${selectedTask.value.id}`, { method: 'GET', timeout: 30000 });
    metrics.value = Array.isArray(data) ? data : data.metrics || [];
  } catch {
    metrics.value = [];
  }
}

async function validateModel() {
  if (!selectedTask.value) return toast('请先选择训练任务', 'warning');
  validating.value = true;
  try {
    report.value = await api(`/api/training/validate/${selectedTask.value.id}`, {
      method: 'POST',
      body: { split: 'val', conf: 0.001, iou: 0.6, device: selectedTask.value.device || null },
      timeout: 300000,
    });
    toast('模型验证完成');
  } catch (error) {
    toast(error.message, 'error');
  } finally {
    validating.value = false;
  }
}

function percent(value) {
  const number = Number(value || 0);
  if (number <= 1) return `${(number * 100).toFixed(1)}%`;
  return number.toFixed(1);
}

function metricValue(key, fallback = '--') {
  const fromReport = report.value?.metrics?.[key] ?? report.value?.[key];
  const fromMetric = latestMetric.value?.[key];
  const value = fromReport ?? fromMetric;
  return value === undefined || value === null ? fallback : percent(value);
}

onMounted(loadTasks);
</script>

<template>
  <section class="workspace-page">
    <div class="page-title">
      <div>
        <h1>模型评估</h1>
        <p>基于后端训练任务 metrics 与 validate 接口展示真实评估指标。</p>
      </div>
      <div class="page-actions">
        <select v-model="selectedTaskId" class="header-select" @change="loadMetrics">
          <option v-for="task in state.tasks" :key="task.id" :value="task.id">{{ task.name }}</option>
        </select>
        <button class="btn btn-ghost" @click="loadTasks">刷新</button>
        <button class="btn btn-primary" :disabled="validating || !selectedTask" @click="validateModel">
          {{ validating ? '验证中...' : '运行验证' }}
        </button>
      </div>
    </div>

    <section class="evaluation-kpis">
      <article class="accent">
        <span>mAP50</span>
        <strong>{{ metricValue('map50') }}</strong>
        <small>来自训练 metrics 或最新验证报告</small>
      </article>
      <article>
        <span>mAP50-95</span>
        <strong>{{ metricValue('map50_95') }}</strong>
        <small>综合定位质量</small>
      </article>
      <article>
        <span>Precision</span>
        <strong>{{ metricValue('precision') }}</strong>
        <small>预测为目标时的可信程度</small>
      </article>
      <article>
        <span>Recall</span>
        <strong>{{ metricValue('recall') }}</strong>
        <small>实际目标召回情况</small>
      </article>
      <article>
        <span>训练进度</span>
        <strong>{{ selectedTask?.progress ?? 0 }}<em>%</em></strong>
        <small>{{ selectedTask?.current_epoch ?? 0 }}/{{ selectedTask?.epochs ?? 0 }} epoch</small>
      </article>
    </section>

    <div class="evaluation-grid">
      <section class="panel">
        <div class="panel-title">
          <div>
            <strong>任务信息</strong>
            <span>{{ loading ? '加载中' : selectedTask?.task_uuid || '暂无任务' }}</span>
          </div>
          <StatusBadge :status="selectedTask?.status || 'queued'" />
        </div>
        <div v-if="selectedTask" class="context-card compact-info">
          <div class="context-row"><span>模型</span><strong>{{ selectedTask.model_name }}</strong></div>
          <div class="context-row"><span>数据集</span><strong>{{ selectedTask.dataset_name }}</strong></div>
          <div class="context-row"><span>设备</span><strong>{{ selectedTask.device }}</strong></div>
          <div class="context-row"><span>Best mAP50</span><strong>{{ percent(selectedTask.best_map50) }}</strong></div>
        </div>
        <div v-else class="empty-state"><strong>暂无训练任务</strong><p>请先在模型训练页面创建任务。</p></div>
      </section>

      <section class="panel chart-wrap">
        <div class="panel-title">
          <div>
            <strong>mAP50 趋势</strong>
            <span>{{ chartPoints.length }} 个 epoch 采样</span>
          </div>
        </div>
        <div v-if="chartPoints.length" class="simple-line-chart">
          <div v-for="item in chartPoints" :key="item.epoch" :style="{ height: `${Math.max(4, Number(item.map50 || 0) * 100)}%` }">
            <span>{{ item.epoch }}</span>
          </div>
        </div>
        <div v-else class="empty-state"><strong>暂无指标曲线</strong><p>训练运行后会写入 metrics。</p></div>
      </section>
    </div>

    <section class="panel evaluation-report-panel">
      <div class="panel-title">
        <div><strong>验证报告</strong><span>POST /api/training/validate/{task_id}</span></div>
      </div>
      <pre v-if="report" class="json-preview">{{ JSON.stringify(report, null, 2) }}</pre>
      <div v-else class="empty-state report-empty">
        <strong>暂无验证报告</strong>
        <p>点击“运行验证”后显示后端返回结果。</p>
      </div>
    </section>
  </section>
</template>
