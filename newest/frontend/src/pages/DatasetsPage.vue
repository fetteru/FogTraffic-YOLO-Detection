<script setup>
import { computed, onMounted, ref } from 'vue';
import StatusBadge from '../components/StatusBadge.vue';
import { api } from '../services/api';
import { state, toast } from '../state';

const loading = ref(false);
const query = ref('');

const filteredDatasets = computed(() => {
  const keyword = query.value.trim().toLowerCase();
  if (!keyword) return state.datasets;
  return state.datasets.filter(item => `${item.name} ${item.scene_name} ${item.data_yaml}`.toLowerCase().includes(keyword));
});

const totals = computed(() => state.datasets.reduce((acc, item) => {
  acc.images += Number(item.images || 0);
  acc.train += Number(item.train || 0);
  acc.val += Number(item.val || 0);
  acc.classes = Math.max(acc.classes, (item.classes || []).length);
  return acc;
}, { images: 0, train: 0, val: 0, classes: 0 }));

function normalizeDataset(item, index) {
  return {
    id: item.id || index + 1,
    name: item.display_name || item.name || `dataset-${index + 1}`,
    scene_name: item.scene_name || 'traffic_rain_fog',
    format: item.format || 'YOLO',
    dataset_path: item.dataset_path || '',
    data_yaml: item.data_yaml || '',
    train: Number(item.train || 0),
    val: Number(item.val || 0),
    test: Number(item.test || 0),
    images: Number(item.images || 0),
    labels: Number(item.labels || item.images || 0),
    classes: item.classes || [],
    status: item.status || 'ready',
    quality: item.status === 'ready' ? 100 : 0,
  };
}

async function loadDatasets() {
  loading.value = true;
  try {
    const data = await api('/api/training/datasets', { method: 'GET', timeout: 30000 });
    const items = Array.isArray(data) ? data : data.items || [];
    state.datasets = items.map(normalizeDataset);
    if (!state.datasets.length) toast('没有发现 data.yaml，请检查 backend/datasets 目录', 'warning');
  } catch (error) {
    toast(error.message, 'error');
  } finally {
    loading.value = false;
  }
}

function trainWithDataset(dataset) {
  state.trainingDraft = {
    datasetName: dataset.name,
    datasetPath: dataset.dataset_path,
    dataYaml: dataset.data_yaml,
    sceneId: dataset.scene_id,
  };
  state.page = 'training';
  location.hash = 'training';
}

onMounted(loadDatasets);
</script>

<template>
  <section class="workspace-page">
    <div class="page-title">
      <div>
        <h1>数据集管理</h1>
        <p>读取后端 datasets 目录中的 YOLO data.yaml，用于训练任务选择。</p>
      </div>
      <button class="btn btn-ghost" @click="loadDatasets">刷新</button>
    </div>

    <section class="kpi-grid">
      <article class="kpi-card panel"><span>数据集</span><strong>{{ state.datasets.length }}</strong></article>
      <article class="kpi-card panel"><span>图像总数</span><strong>{{ totals.images }}</strong></article>
      <article class="kpi-card panel"><span>训练集</span><strong>{{ totals.train }}</strong></article>
      <article class="kpi-card panel"><span>最大类别数</span><strong>{{ totals.classes }}</strong></article>
    </section>

    <section class="panel dataset-page-panel">
      <div class="dataset-toolbar">
        <input v-model="query" class="search-field" placeholder="搜索数据集名称、场景或 data.yaml 路径" />
        <span class="toolbar-count">{{ loading ? '加载中' : `${filteredDatasets.length} / ${state.datasets.length} 个数据集` }}</span>
      </div>
      <div v-if="filteredDatasets.length" class="dataset-grid vue-dataset-grid">
        <article v-for="dataset in filteredDatasets" :key="dataset.id" class="dataset-card">
          <div class="dataset-cover generated-cover">
            <div class="dataset-cover-top">
              <StatusBadge :status="dataset.status === 'ready' ? 'healthy' : 'warning'" />
              <span>{{ dataset.format }}</span>
            </div>
            <div class="dataset-cover-bottom">
              <strong>{{ dataset.images }}</strong>
              <span>images</span>
            </div>
          </div>
          <div class="dataset-body">
            <div class="dataset-title">
              <div>
                <strong>{{ dataset.name }}</strong>
                <span>{{ dataset.scene_name }}</span>
              </div>
              <StatusBadge :status="dataset.status === 'ready' ? 'completed' : 'warning'" />
            </div>
            <div class="dataset-kpis">
              <div><strong>{{ dataset.train }}</strong><span>Train</span></div>
              <div><strong>{{ dataset.val }}</strong><span>Val</span></div>
              <div><strong>{{ dataset.classes.length }}</strong><span>Classes</span></div>
            </div>
            <div class="split-bar">
              <i :style="{ width: `${dataset.images ? dataset.train / dataset.images * 100 : 0}%` }"></i>
              <i :style="{ width: `${dataset.images ? dataset.val / dataset.images * 100 : 0}%` }"></i>
              <i></i>
            </div>
            <div class="dataset-tags">
              <span v-for="name in dataset.classes.slice(0, 6)" :key="name">{{ name }}</span>
            </div>
            <div class="dataset-foot">
              <span>{{ dataset.data_yaml || dataset.dataset_path }}</span>
              <button @click="trainWithDataset(dataset)">用于训练</button>
            </div>
          </div>
        </article>
      </div>
      <div v-else class="empty-state">
        <strong>暂无数据集</strong>
        <p>请确认 backend/datasets 下存在 YOLO 格式 data.yaml。</p>
      </div>
    </section>
  </section>
</template>
