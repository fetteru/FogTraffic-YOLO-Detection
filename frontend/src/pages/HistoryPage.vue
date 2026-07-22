<script setup>
import { computed, onMounted, reactive, ref } from 'vue';
import StatusBadge from '../components/StatusBadge.vue';
import { api } from '../services/api';
import { state, toast } from '../state';

const loading = ref(false);
const summary = ref({});
const pager = reactive({
  page: 1,
  pageSize: 10,
  total: 0,
  totalPages: 0,
  keyword: '',
  taskType: '',
});

const pages = computed(() => {
  const total = Math.max(1, pager.totalPages || 1);
  const start = Math.max(1, pager.page - 2);
  const end = Math.min(total, start + 4);
  return Array.from({ length: end - start + 1 }, (_, index) => start + index);
});

async function loadHistory(page = pager.page) {
  loading.value = true;
  pager.page = page;
  try {
    const params = new URLSearchParams({
      page: String(pager.page),
      page_size: String(pager.pageSize),
    });
    if (pager.keyword.trim()) params.set('keyword', pager.keyword.trim());
    if (pager.taskType) params.set('task_type', pager.taskType);
    const data = await api(`/api/history/tasks?${params.toString()}`, { method: 'GET', timeout: 30000 });
    state.history = data.items || [];
    pager.total = Number(data.total || state.history.length);
    pager.totalPages = Number(data.total_pages || Math.ceil(pager.total / pager.pageSize) || 1);
  } catch (error) {
    toast(error.message, 'error');
  } finally {
    loading.value = false;
  }
}

async function loadSummary() {
  try {
    summary.value = await api('/api/history/summary', { method: 'GET', timeout: 30000 });
  } catch {
    summary.value = {};
  }
}

async function refreshAll() {
  await Promise.all([loadHistory(1), loadSummary()]);
}

function typeName(value) {
  return {
    single: '单图',
    batch: '批量',
    zip: 'ZIP',
    video: '视频',
    camera: '摄像头',
  }[value] || value || '--';
}

onMounted(refreshAll);
</script>

<template>
  <section class="workspace-page">
    <div class="page-title">
      <div>
        <h1>任务历史</h1>
        <p>分页查看后端保存的检测任务记录。</p>
      </div>
      <button class="btn btn-ghost" @click="refreshAll">刷新</button>
    </div>

    <section class="history-summary">
      <article><div class="icon-wrap"></div><div><strong>{{ summary.total_tasks ?? pager.total }}</strong><span>历史任务</span></div></article>
      <article><div class="icon-wrap success"></div><div><strong>{{ summary.total_objects ?? '--' }}</strong><span>目标总数</span></div></article>
      <article><div class="icon-wrap warning"></div><div><strong>{{ summary.total_images ?? '--' }}</strong><span>处理图像</span></div></article>
      <article><div class="icon-wrap violet"></div><div><strong>{{ pager.page }}/{{ Math.max(1, pager.totalPages) }}</strong><span>当前页</span></div></article>
    </section>

    <section class="panel">
      <div class="history-toolbar">
        <input v-model="pager.keyword" class="search-field" placeholder="搜索任务名称或来源" @keydown.enter="loadHistory(1)" />
        <select v-model="pager.taskType" @change="loadHistory(1)">
          <option value="">全部类型</option>
          <option value="single">单图</option>
          <option value="batch">批量</option>
          <option value="zip">ZIP</option>
          <option value="video">视频</option>
          <option value="camera">摄像头</option>
        </select>
        <select v-model.number="pager.pageSize" @change="loadHistory(1)">
          <option :value="10">10 条/页</option>
          <option :value="20">20 条/页</option>
          <option :value="50">50 条/页</option>
        </select>
        <button class="btn btn-ghost btn-sm" @click="loadHistory(1)">查询</button>
        <span class="toolbar-count">{{ loading ? '加载中' : `${pager.total} 条` }}</span>
      </div>
      <div class="table-scroll">
        <table class="data-table">
          <thead><tr><th>ID</th><th>类型</th><th>任务名</th><th>目标数</th><th>图像数</th><th>状态</th><th>时间</th></tr></thead>
          <tbody>
            <tr v-for="item in state.history" :key="item.id">
              <td><code>{{ item.id }}</code></td>
              <td>{{ typeName(item.task_type || item.type) }}</td>
              <td><strong>{{ item.task_name || item.source || item.filename || '--' }}</strong><small>{{ item.result_path }}</small></td>
              <td>{{ item.total_objects ?? item.total ?? 0 }}</td>
              <td>{{ item.total_images ?? '--' }}</td>
              <td><StatusBadge :status="item.status || 'completed'" /></td>
              <td>{{ item.created_at ? new Date(item.created_at).toLocaleString('zh-CN', { hour12: false }) : '--' }}</td>
            </tr>
          </tbody>
        </table>
        <div v-if="!state.history.length" class="empty-state"><strong>暂无历史记录</strong><p>完成检测并保存后会出现在这里。</p></div>
      </div>
      <div class="pagination-row">
        <span>第 {{ pager.page }} 页，共 {{ Math.max(1, pager.totalPages) }} 页</span>
        <div class="pagination">
          <button :disabled="pager.page <= 1" @click="loadHistory(pager.page - 1)">上一页</button>
          <button v-for="page in pages" :key="page" :class="{ active: page === pager.page }" @click="loadHistory(page)">{{ page }}</button>
          <button :disabled="pager.page >= pager.totalPages" @click="loadHistory(pager.page + 1)">下一页</button>
        </div>
      </div>
    </section>
  </section>
</template>
