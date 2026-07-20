<script setup>
import { computed, ref } from 'vue';
import { Search, Download, Refresh, View, Delete } from '@element-plus/icons-vue';
import PageHeader from '../components/common/PageHeader.vue';
import { platformStore } from '../stores/platform.js';
import { statusClass, statusText } from '../utils/format.js';
const query=ref('');const type=ref('ALL');
const list=computed(()=>platformStore.history.filter(h=>(type.value==='ALL'||h.type===type.value)&&(h.source.toLowerCase().includes(query.value.toLowerCase())||h.model.toLowerCase().includes(query.value.toLowerCase()))));
</script>
<template>
  <div class="page-stack vue-page">
    <PageHeader title="任务历史" description="追溯检测、评估和批量任务，查看输入文件、模型版本、推理耗时和结果状态。"><button class="btn btn-ghost"><el-icon><Download/></el-icon>导出 CSV</button><button class="btn btn-primary"><el-icon><Refresh/></el-icon>重新执行</button></PageHeader>
    <section class="panel"><div class="panel-title"><div><strong>历史任务记录</strong><span>{{list.length}} 条记录</span></div><div class="action-row"><div class="field-shell" style="height:38px"><el-icon><Search/></el-icon><input v-model="query" placeholder="搜索文件或模型"></div><select v-model="type" class="header-select"><option>ALL</option><option>单图检测</option><option>批量检测</option><option>ZIP 检测</option><option>模型评估</option></select></div></div>
      <div class="table-scroll"><table class="page-table"><thead><tr><th>任务 ID</th><th>类型 / 输入</th><th>模型</th><th>目标数</th><th>耗时</th><th>状态</th><th>创建时间</th><th>操作</th></tr></thead><tbody><tr v-for="item in list" :key="item.id"><td><code>{{item.id}}</code></td><td><strong>{{item.type}}</strong><br><small>{{item.source}}</small></td><td>{{item.model}}</td><td>{{item.total}}</td><td>{{item.duration}} ms</td><td><span class="status-badge" :class="statusClass(item.status)"><i></i>{{statusText(item.status)}}</span></td><td>{{item.time}}</td><td><div class="action-row"><button class="icon-button small"><el-icon><View/></el-icon></button><button class="icon-button small"><el-icon><Download/></el-icon></button><button class="icon-button small" @click="platformStore.history.splice(platformStore.history.indexOf(item),1)"><el-icon><Delete/></el-icon></button></div></td></tr></tbody></table></div>
    </section>
  </div>
</template>
