<script setup>
import { computed, onMounted, reactive, ref } from 'vue';
import { api } from '../services/api';
import { state, toast } from '../state';

const loading = ref(false);
const charts = reactive({
  trend: [],
  classDist: [],
  typeDist: [],
});

const maxObjects = computed(() => Math.max(1, ...charts.trend.map(item => Number(item.object_count || 0))));
const maxClass = computed(() => Math.max(1, ...charts.classDist.map(item => Number(item.value || 0))));

async function loadDashboard() {
  loading.value = true;
  try {
    const [statistics, trend, classDist, typeDist] = await Promise.all([
      api('/api/dashboard/statistics?days=30', { method: 'GET', timeout: 30000 }),
      api('/api/dashboard/trend?days=30', { method: 'GET', timeout: 30000 }),
      api('/api/dashboard/class-dist?days=30', { method: 'GET', timeout: 30000 }),
      api('/api/dashboard/type-dist?days=30', { method: 'GET', timeout: 30000 }),
    ]);
    state.dashboard = statistics;
    charts.trend = trend.trend || [];
    charts.classDist = classDist.distribution || [];
    charts.typeDist = typeDist.distribution || [];
  } catch (error) {
    toast(error.message, 'error');
  } finally {
    loading.value = false;
  }
}

function growth(key) {
  const value = Number(state.dashboard?.growth?.[key] || 0);
  return `${value > 0 ? '+' : ''}${value}%`;
}

onMounted(loadDashboard);
</script>

<template>
  <section class="workspace-page">
    <div class="page-title">
      <div>
        <h1>数据看板</h1>
        <p>接入后端 dashboard 统计、趋势和类别分布接口。</p>
      </div>
      <button class="btn btn-ghost" @click="loadDashboard">刷新</button>
    </div>

    <section class="dashboard-kpis">
      <article><span>检测任务</span><strong>{{ state.dashboard?.total_tasks ?? '--' }}</strong><p>{{ growth('tasks') }} 较上一周期</p></article>
      <article><span>处理图片/视频</span><strong>{{ state.dashboard?.total_images ?? '--' }}</strong><p>{{ growth('images') }} 较上一周期</p></article>
      <article><span>目标数量</span><strong>{{ state.dashboard?.total_objects ?? '--' }}</strong><p>{{ growth('objects') }} 较上一周期</p></article>
      <article><span>平均耗时</span><strong>{{ state.dashboard?.avg_inference_time ?? '--' }}<em>ms</em></strong><p>{{ growth('inference_time') }} 较上一周期</p></article>
    </section>

    <div class="dashboard-main-grid">
      <section class="panel span-2">
        <div class="panel-title">
          <div><strong>30 天目标趋势</strong><span>{{ loading ? '加载中' : `${charts.trend.length} 天` }}</span></div>
        </div>
        <div v-if="charts.trend.length" class="bar-chart trend-chart">
          <div v-for="item in charts.trend" :key="item.date" :title="`${item.date}: ${item.object_count}`">
            <i :style="{ height: `${Math.max(4, Number(item.object_count || 0) / maxObjects * 100)}%` }"></i>
            <span>{{ item.date.slice(5) }}</span>
          </div>
        </div>
        <div v-else class="empty-state"><strong>暂无趋势数据</strong><p>完成检测后这里会出现统计柱状图。</p></div>
      </section>

      <section class="panel">
        <div class="panel-title"><div><strong>任务类型分布</strong><span>按检测任务类型统计</span></div></div>
        <div class="rank-list">
          <article v-for="item in charts.typeDist" :key="item.name">
            <div><strong>{{ item.name }}</strong><span>{{ item.value }} 次</span></div>
            <div class="ranking-bar"><i :style="{ width: `${Math.min(100, Number(item.value || 0) / Math.max(1, state.dashboard?.total_tasks || 1) * 100)}%` }"></i></div>
          </article>
          <div v-if="!charts.typeDist.length" class="empty-state"><strong>暂无类型数据</strong></div>
        </div>
      </section>

      <section class="panel span-2">
        <div class="panel-title"><div><strong>类别统计柱状图</strong><span>来自 /api/dashboard/class-dist</span></div></div>
        <div v-if="charts.classDist.length" class="horizontal-bars">
          <article v-for="item in charts.classDist.slice(0, 12)" :key="item.name">
            <span>{{ item.name }}</span>
            <div><i :style="{ width: `${Number(item.value || 0) / maxClass * 100}%` }"></i></div>
            <strong>{{ item.value }}</strong>
          </article>
        </div>
        <div v-else class="empty-state"><strong>暂无类别分布</strong><p>完成检测并保存历史后会显示。</p></div>
      </section>

      <section class="panel">
        <div class="panel-title"><div><strong>原始统计</strong><span>真实接口返回</span></div></div>
        <details v-if="state.dashboard" class="raw-data-toggle">
          <summary>查看原始接口数据</summary>
          <pre class="json-preview">{{ JSON.stringify(state.dashboard, null, 2) }}</pre>
        </details>
        <div v-else class="empty-state raw-empty">
          <strong>暂无原始统计</strong>
          <p>刷新数据看板后可查看接口返回。</p>
        </div>
      </section>
    </div>
  </section>
</template>
