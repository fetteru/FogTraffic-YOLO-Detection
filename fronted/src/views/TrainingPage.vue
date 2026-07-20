<script setup>
import { computed, ref } from 'vue';
import { Plus, Refresh, VideoPlay, Download, Check, Cpu } from '@element-plus/icons-vue';
import { ElMessage } from 'element-plus';
import PageHeader from '../components/common/PageHeader.vue';
import EChart from '../components/charts/EChart.vue';
import { platformStore } from '../stores/platform.js';
import { statusClass, statusText } from '../utils/format.js';
const selectedId=ref(platformStore.selectedTaskId);
const selected=computed(()=>platformStore.tasks.find(t=>t.id===selectedId.value)||platformStore.tasks[0]);
const baseChart={backgroundColor:'transparent',textStyle:{color:'#93a8c2'},tooltip:{trigger:'axis',backgroundColor:'rgba(7,16,31,.94)',borderColor:'rgba(56,189,248,.2)',textStyle:{color:'#eef6ff'}},legend:{top:4,textStyle:{color:'#8fa4bf'}},grid:{left:45,right:24,top:45,bottom:35},xAxis:{type:'category',boundaryGap:false,axisLine:{lineStyle:{color:'rgba(148,181,226,.18)'}},axisLabel:{color:'#70849e'}},yAxis:{type:'value',splitLine:{lineStyle:{color:'rgba(148,181,226,.08)'}},axisLabel:{color:'#70849e'}}};
const lossOption=computed(()=>({...baseChart,xAxis:{...baseChart.xAxis,data:platformStore.metrics.map(m=>m.epoch)},series:[{name:'box_loss',type:'line',smooth:true,showSymbol:false,data:platformStore.metrics.map(m=>m.boxLoss),lineStyle:{width:2},areaStyle:{opacity:.05}},{name:'cls_loss',type:'line',smooth:true,showSymbol:false,data:platformStore.metrics.map(m=>m.clsLoss),lineStyle:{width:2}},{name:'dfl_loss',type:'line',smooth:true,showSymbol:false,data:platformStore.metrics.map(m=>m.dflLoss),lineStyle:{width:2}}]}));
const metricOption=computed(()=>({...baseChart,yAxis:{...baseChart.yAxis,min:0,max:1},xAxis:{...baseChart.xAxis,data:platformStore.metrics.map(m=>m.epoch)},series:[{name:'Precision',type:'line',smooth:true,showSymbol:false,data:platformStore.metrics.map(m=>m.precision),lineStyle:{width:2}},{name:'Recall',type:'line',smooth:true,showSymbol:false,data:platformStore.metrics.map(m=>m.recall),lineStyle:{width:2}},{name:'mAP50',type:'line',smooth:true,showSymbol:false,data:platformStore.metrics.map(m=>m.map50),lineStyle:{width:3}},{name:'mAP50-95',type:'line',smooth:true,showSymbol:false,data:platformStore.metrics.map(m=>m.map5095),lineStyle:{width:2}}]}));
function add(){const id=Date.now();platformStore.tasks.unshift({id,name:'交通检测新训练任务',model:'yolov11s',dataset:'Traffic-Vehicle',status:'queued',progress:0,epoch:0,epochs:100,map50:0});selectedId.value=id;ElMessage.success('训练任务已创建')}
</script>
<template>
  <div class="page-stack vue-page">
    <PageHeader title="模型训练" description="创建、监控和管理 YOLOv11 训练任务，实时查看 Loss、Precision、Recall 与 mAP 指标。"><button class="btn btn-ghost"><el-icon><Refresh/></el-icon>刷新任务</button><button class="btn btn-primary" @click="add"><el-icon><Plus/></el-icon>新建训练任务</button></PageHeader>
    <div class="training-layout">
      <section class="panel task-list-panel"><div class="panel-title"><div><strong>训练任务</strong><span>{{platformStore.tasks.length}} 个任务</span></div></div><div class="task-list"><button v-for="task in platformStore.tasks" :key="task.id" class="task-card" :class="{active:selectedId===task.id}" @click="selectedId=task.id"><div class="task-card-icon"><el-icon><Cpu/></el-icon></div><div class="task-card-main"><div><strong>{{task.name}}</strong><span class="status-badge" :class="statusClass(task.status)"><i></i>{{statusText(task.status)}}</span></div><p>{{task.model}} · {{task.dataset}}</p><div class="task-progress"><i><b :style="{width:`${task.progress}%`}"></b></i><span>{{task.progress}}%</span></div></div></button></div></section>
      <section class="training-main">
        <div class="data-card-grid"><article class="panel metric-mini"><span>当前 Epoch</span><strong>{{selected.epoch}} / {{selected.epochs}}</strong><small>{{selected.status==='running'?'正在训练':'任务状态：'+statusText(selected.status)}}</small></article><article class="panel metric-mini"><span>最佳 mAP50</span><strong>{{selected.map50.toFixed(3)}}</strong><small>目标检测精度</small></article><article class="panel metric-mini"><span>训练进度</span><strong>{{selected.progress}}%</strong><small>{{selected.dataset}}</small></article><article class="panel metric-mini"><span>推理模型</span><strong style="font-size:19px">{{selected.model}}</strong><small>CUDA / FP16</small></article></div>
        <section class="panel"><div class="panel-title"><div><strong>训练损失曲线</strong><span>Box / Classification / DFL Loss · ECharts</span></div><div class="action-row"><button class="btn btn-ghost btn-sm"><el-icon><Download/></el-icon>导出 CSV</button></div></div><EChart :option="lossOption" height="310px"/></section>
        <section class="panel"><div class="panel-title"><div><strong>验证指标曲线</strong><span>Precision / Recall / mAP50 / mAP50-95 · ECharts</span></div><span class="status-badge status-running"><i></i>实时更新</span></div><EChart :option="metricOption" height="310px"/></section>
        <section class="panel"><div class="panel-title"><div><strong>任务操作</strong><span>{{selected.name}}</span></div></div><div class="action-row" style="padding:18px"><button class="btn btn-primary"><el-icon><VideoPlay/></el-icon>{{selected.status==='running'?'继续训练':'启动训练'}}</button><button class="btn btn-ghost"><el-icon><Check/></el-icon>运行验证</button><button class="btn btn-ghost"><el-icon><Download/></el-icon>导出模型</button></div></section>
      </section>
    </div>
  </div>
</template>
