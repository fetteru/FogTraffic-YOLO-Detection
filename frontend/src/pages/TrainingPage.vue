<script setup>
import { computed, onBeforeUnmount, onMounted, reactive, ref, watch } from 'vue';
import StatusBadge from '../components/StatusBadge.vue';
import { api } from '../services/api';
import { state, toast } from '../state';

const loading = ref(false);
const datasets = ref([]);
const creating = ref(false);
const selectedDatasetId = ref('');
let taskPollTimer = null;
const form = reactive({
  name: '雨雾交通检测训练任务',
  base_model_key: '',
  model_name: '',
  epochs: 100,
  img_size: 640,
  batch_size: 16,
  device: '0',
  optimizer: 'SGD',
  lr0: 0.01,
});

const selectedDataset = computed(() => datasets.value.find(item => String(item.id) === String(selectedDatasetId.value)) || datasets.value[0] || null);
const modelOptions = computed(() => state.settings.models || []);
const selectedBaseModel = computed(() => modelOptions.value.find(item => item.key === form.base_model_key && item.exists) || null);

function normalizeTask(task) {
  return {
    id: task.id,
    task_uuid: task.task_uuid || String(task.id),
    name: task.task_name || task.name || `${task.model_name || '本地模型'} 训练任务`,
    model_name: task.model_name || '本地模型',
    dataset_name: task.dataset_name || task.scene_name || '未命名数据集',
    device: task.device || '--',
    epochs: Number(task.epochs || 0),
    current_epoch: Number(task.current_epoch || 0),
    status: task.status || 'unknown',
    progress: Number(task.progress || 0),
    best_map50: Number(task.best_map50 || task.map50 || 0),
    created_at: task.created_at,
  };
}

function normalizeDataset(item, index) {
  return {
    id: item.id || index + 1,
    name: item.display_name || item.name || `dataset-${index + 1}`,
    scene_id: item.scene_id,
    dataset_path: item.dataset_path || '',
    data_yaml: item.data_yaml || '',
    images: Number(item.images || 0),
    train: Number(item.train || 0),
    val: Number(item.val || 0),
    classes: item.classes || [],
  };
}

async function loadDatasets() {
  const data = await api('/api/training/datasets', { method: 'GET', timeout: 30000 });
  const items = Array.isArray(data) ? data : data.items || [];
  datasets.value = items.map(normalizeDataset);
  state.datasets = datasets.value;
  if (state.trainingDraft?.dataYaml) {
    const matched = datasets.value.find(item => item.data_yaml === state.trainingDraft.dataYaml);
    if (matched) selectedDatasetId.value = matched.id;
  }
  if (!selectedDatasetId.value && datasets.value[0]) selectedDatasetId.value = datasets.value[0].id;
}

async function loadModels() {
  const data = await api('/api/detection/models', { method: 'GET', timeout: 30000 });
  state.settings.models = data.models || [];
  const selectedExists = state.settings.models.some(item => item.key === form.base_model_key && item.exists);
  if (!form.base_model_key || !selectedExists) {
    const preferred =
      state.settings.models.find(item => item.key === state.settings.selectedModelKey && item.exists) ||
      state.settings.models.find(item => item.is_default && item.exists) ||
      state.settings.models.find(item => item.exists);
    form.base_model_key = preferred?.key || '';
  }
}

async function loadTasks() {
  const data = await api('/api/training/tasks', { method: 'GET', timeout: 30000 });
  const items = Array.isArray(data) ? data : data.items || [];
  state.tasks = items.map(normalizeTask);
}

function hasLiveTask() {
  return state.tasks.some(task => task.status === 'pending' || task.status === 'running');
}

function startTaskPolling() {
  if (taskPollTimer) window.clearInterval(taskPollTimer);
  taskPollTimer = window.setInterval(() => {
    if (!hasLiveTask()) return;
    loadTasks().catch(error => console.warn('Failed to refresh training tasks', error));
  }, 3000);
}

async function refreshAll() {
  loading.value = true;
  try {
    await Promise.all([loadModels(), loadDatasets(), loadTasks()]);
  } catch (error) {
    toast(error.message, 'error');
  } finally {
    loading.value = false;
  }
}

async function createTask() {
  if (!selectedDataset.value) return toast('请先准备可训练的数据集 data.yaml', 'warning');
  if (!selectedBaseModel.value) return toast('请先选择可用的基础模型', 'warning');
  creating.value = true;
  try {
    await api('/api/training/start', {
      method: 'POST',
      body: {
        scene_id: selectedDataset.value.scene_id,
        dataset_name: selectedDataset.value.name,
        dataset_path: selectedDataset.value.dataset_path,
        data_yaml: selectedDataset.value.data_yaml,
        model_name: selectedBaseModel.value.name || selectedBaseModel.value.model_name,
        base_model_path: selectedBaseModel.value.path,
        epochs: Number(form.epochs),
        img_size: Number(form.img_size),
        batch_size: Number(form.batch_size),
        device: form.device,
        workers: 0,
        optimizer: form.optimizer,
        lr0: Number(form.lr0),
        augment_config: { mosaic: true, mixup: false },
      },
      timeout: 60000,
    });
    toast('训练任务已创建');
    await loadTasks();
  } catch (error) {
    toast(error.message, 'error');
  } finally {
    creating.value = false;
  }
}

async function stopTask(task) {
  try {
    await api(`/api/training/stop/${task.id}`, { method: 'POST' });
    await loadTasks();
  } catch (error) {
    toast(error.message, 'error');
  }
}

watch(selectedDataset, dataset => {
  if (dataset) form.name = `${dataset.name} 精调训练`;
});

onMounted(() => {
  refreshAll();
  startTaskPolling();
});

onBeforeUnmount(() => {
  if (taskPollTimer) window.clearInterval(taskPollTimer);
});
</script>

<template>
  <section class="workspace-page">
    <div class="page-title">
      <div>
        <h1>模型训练</h1>
        <p>选择真实 data.yaml 创建训练任务，并查看后端训练进度。</p>
      </div>
      <button class="btn btn-ghost" @click="refreshAll">刷新</button>
    </div>

    <div class="training-layout">
      <section class="panel settings-panel">
        <div class="panel-title">
          <div><strong>新建训练任务</strong><span>{{ datasets.length ? '已发现可训练数据集' : '等待 data.yaml' }}</span></div>
        </div>
        <div class="form-grid one-col">
          <label>
            <span>数据集</span>
            <select v-model="selectedDatasetId" :disabled="!datasets.length">
              <option v-for="dataset in datasets" :key="dataset.id" :value="dataset.id">
                {{ dataset.name }} - {{ dataset.images }} images
              </option>
            </select>
          </label>
          <label><span>任务名称</span><input v-model="form.name" /></label>
          <label>
            <span>基础模型</span>
            <select v-model="form.base_model_key" :disabled="!modelOptions.length">
              <option v-for="model in modelOptions" :key="model.key" :value="model.key" :disabled="!model.exists">
                {{ model.name || model.model_name }}{{ model.is_default ? ' · default' : '' }}
              </option>
            </select>
          </label>
          <div class="form-grid">
            <label><span>Epochs</span><input v-model.number="form.epochs" type="number" min="1" max="500" /></label>
            <label><span>Batch</span><input v-model.number="form.batch_size" type="number" min="1" max="64" /></label>
            <label><span>图像尺寸</span><input v-model.number="form.img_size" type="number" min="320" max="1280" /></label>
            <label><span>设备</span><select v-model="form.device"><option value="0">cuda:0</option><option value="cpu">cpu</option></select></label>
          </div>
          <button class="btn btn-primary" :disabled="creating || !selectedDataset" @click="createTask">
            {{ creating ? '创建中...' : '创建并启动训练' }}
          </button>
        </div>
      </section>

      <section class="panel task-table-panel">
        <div class="panel-title"><div><strong>训练任务列表</strong><span>{{ loading ? '加载中' : `${state.tasks.length} 个任务` }}</span></div></div>
        <div class="table-scroll">
          <table class="data-table">
            <thead><tr><th>任务</th><th>模型 / 数据集</th><th>设备</th><th>进度</th><th>状态</th><th>最佳 mAP50</th><th>操作</th></tr></thead>
            <tbody>
              <tr v-for="task in state.tasks" :key="task.id">
                <td><strong>{{ task.name }}</strong><small>{{ task.task_uuid }}</small></td>
                <td><span>{{ task.model_name }}</span><small>{{ task.dataset_name }}</small></td>
                <td>{{ task.device }}</td>
                <td><div class="table-progress"><div><span>{{ task.progress }}%</span><small>{{ task.current_epoch }}/{{ task.epochs }}</small></div><progress :value="task.progress" max="100"></progress></div></td>
                <td><StatusBadge :status="task.status" /></td>
                <td><strong>{{ task.best_map50 ? Number(task.best_map50).toFixed(3) : '--' }}</strong></td>
                <td><button v-if="task.status === 'running'" class="table-link danger" @click="stopTask(task)">停止</button></td>
              </tr>
            </tbody>
          </table>
          <div v-if="!state.tasks.length" class="empty-state"><strong>暂无训练任务</strong><p>左侧选择数据集后可以创建任务。</p></div>
        </div>
      </section>
    </div>
  </section>
</template>
