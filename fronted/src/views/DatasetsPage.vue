<script setup>
import { computed, ref } from 'vue';
import { Plus, Refresh, Upload, Search, View, Cpu } from '@element-plus/icons-vue';
import { ElMessage } from 'element-plus';
import PageHeader from '../components/common/PageHeader.vue';
import { platformStore } from '../stores/platform.js';
import { statusClass, statusText } from '../utils/format.js';
const query=ref('');const format=ref('ALL');
const list=computed(()=>platformStore.datasets.filter(d=>(format.value==='ALL'||d.format===format.value)&&d.name.toLowerCase().includes(query.value.toLowerCase())));
function add(){const id=Date.now();platformStore.datasets.unshift({id,name:`New-Traffic-${platformStore.datasets.length+1}`,scene:'智慧交通',format:'YOLO',images:0,labels:0,classes:['car','truck'],quality:100,status:'ready',size:'0 MB'});ElMessage.success('已创建演示数据集')}
</script>
<template>
  <div class="page-stack vue-page">
    <PageHeader title="数据集管理" description="管理图像、标注、类别映射与训练集划分，支持 VOC、COCO、LabelMe 向 YOLO 格式转换。"><button class="btn btn-ghost"><el-icon><Refresh/></el-icon>格式转换</button><button class="btn btn-primary" @click="add"><el-icon><Plus/></el-icon>新建数据集</button></PageHeader>
    <section class="panel"><div class="panel-title"><div><strong>数据集资产</strong><span>{{list.length}} 个数据集 · {{platformStore.datasets.reduce((s,d)=>s+d.images,0).toLocaleString()}} 张图像</span></div><div class="action-row"><div class="field-shell" style="height:38px"><el-icon><Search/></el-icon><input v-model="query" placeholder="搜索数据集"></div><select v-model="format" class="header-select"><option>ALL</option><option>YOLO</option><option>COCO</option><option>VOC</option></select></div></div>
      <div class="dataset-card-grid" style="padding:18px">
        <article v-for="dataset in list" :key="dataset.id" class="panel dataset-card-vue"><div class="dataset-cover"><span class="status-badge" :class="statusClass(dataset.status)" style="position:absolute;right:12px;top:12px"><i></i>{{statusText(dataset.status)}}</span></div><div class="dataset-content"><div style="display:flex;justify-content:space-between;gap:12px"><div><h3>{{dataset.name}}</h3><p>{{dataset.scene}} · {{dataset.format}} · {{dataset.size}}</p></div><strong style="font-size:25px">{{dataset.quality}}</strong></div><div class="tag-row"><span v-for="item in dataset.classes" :key="item">{{item}}</span></div><div class="summary-metrics" style="margin-top:14px"><div><span>图像</span><strong>{{dataset.images.toLocaleString()}}</strong></div><div><span>标注</span><strong>{{dataset.labels.toLocaleString()}}</strong></div><div><span>类别</span><strong>{{dataset.classes.length}}</strong></div><div><span>质量</span><strong>{{dataset.quality}}%</strong></div></div><div class="action-row" style="margin-top:14px"><button class="btn btn-ghost btn-sm"><el-icon><View/></el-icon>详情</button><button class="btn btn-ghost btn-sm"><el-icon><Upload/></el-icon>导入</button><router-link custom to="/app/training" v-slot="{navigate}"><button class="btn btn-primary btn-sm" @click="navigate"><el-icon><Cpu/></el-icon>训练</button></router-link></div></div></article>
      </div>
    </section>
  </div>
</template>
