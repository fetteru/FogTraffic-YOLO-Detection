<script setup>
import { computed, ref } from 'vue';
import { Refresh, Monitor, Search, Download, Delete } from '@element-plus/icons-vue';
import PageHeader from '../components/common/PageHeader.vue';
import EChart from '../components/charts/EChart.vue';
import { platformStore } from '../stores/platform.js';
const query=ref('');const level=ref('ALL');
const logs=computed(()=>platformStore.logs.filter(l=>(level.value==='ALL'||l.level===level.value)&&(`${l.module} ${l.message}`).toLowerCase().includes(query.value.toLowerCase())));
const healthOption={backgroundColor:'transparent',tooltip:{trigger:'axis'},legend:{top:4,textStyle:{color:'#8fa4bf'}},grid:{left:45,right:24,top:45,bottom:35},xAxis:{type:'category',data:['09:35','09:36','09:37','09:38','09:39','09:40','09:41','09:42'],axisLabel:{color:'#70849e'}},yAxis:{type:'value',axisLabel:{color:'#70849e'},splitLine:{lineStyle:{color:'rgba(148,181,226,.08)'}}},series:[{name:'API 延迟',type:'line',smooth:true,showSymbol:false,data:[42,38,51,36,44,39,48,41],lineStyle:{width:2}},{name:'YOLO 延迟',type:'line',smooth:true,showSymbol:false,data:[65,71,62,68,74,66,69,64],lineStyle:{width:2}}]};
</script>
<template>
  <div class="page-stack vue-page">
    <PageHeader title="系统监控" description="监测应用、数据库、缓存、对象存储与 YOLOv11 推理服务，实时查看运行日志和延迟。"><button class="btn btn-ghost"><el-icon><Download/></el-icon>下载日志</button><button class="btn btn-primary"><el-icon><Refresh/></el-icon>刷新状态</button></PageHeader>
    <div class="monitor-service-grid"><article v-for="service in platformStore.services" :key="service.key" class="panel service-card-vue"><header><el-icon><Monitor/></el-icon><span class="status-badge status-success"><i></i>健康</span></header><strong>{{service.name}}</strong><p>{{service.message}}</p><div class="context-row"><span>延迟</span><strong>{{service.latency}} ms</strong></div></article></div>
    <section class="panel"><div class="panel-title"><div><strong>服务延迟趋势</strong><span>最近 8 分钟</span></div><span class="status-badge status-running"><i></i>自动刷新</span></div><EChart :option="healthOption" height="280px"/></section>
    <section class="panel"><div class="panel-title"><div><strong>运行日志</strong><span>Application / Database / Agent / Training</span></div><div class="action-row"><div class="field-shell" style="height:38px"><el-icon><Search/></el-icon><input v-model="query" placeholder="搜索日志"></div><select v-model="level" class="header-select"><option>ALL</option><option>INFO</option><option>WARN</option><option>ERROR</option></select><button class="icon-button" @click="platformStore.logs.splice(0)"><el-icon><Delete/></el-icon></button></div></div><div class="terminal-body" style="min-height:260px"><p v-for="(log,index) in logs" :key="index"><b>[{{log.time}}]</b> <span :class="log.level.toLowerCase()">{{log.level}}</span> <strong>{{log.module}}</strong> {{log.message}}</p></div></section>
  </div>
</template>
