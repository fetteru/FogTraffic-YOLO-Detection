<script setup>
import { computed, ref } from 'vue';
import { Check, Delete, Connection, Aim, Bell, Cpu, DataLine } from '@element-plus/icons-vue';
import { ElMessage, ElMessageBox } from 'element-plus';
import PageHeader from '../components/common/PageHeader.vue';
import { platformStore } from '../stores/platform.js';
const saved=ref(false);
const confidencePercent=computed({get:()=>Math.round(platformStore.settings.confidence*100),set:value=>platformStore.settings.confidence=value/100});
const iouPercent=computed({get:()=>Math.round(platformStore.settings.iou*100),set:value=>platformStore.settings.iou=value/100});
function save(){localStorage.setItem('fogtraffic_settings',JSON.stringify(platformStore.settings));saved.value=true;ElMessage.success('设置已保存');setTimeout(()=>saved.value=false,1200)}
async function clear(){try{await ElMessageBox.confirm('将清空浏览器中的登录状态与界面偏好，是否继续？','清空本地数据',{type:'warning'});localStorage.clear();location.href='/login'}catch{}}
</script>
<template>
  <div class="page-stack vue-page settings-page-v2">
    <PageHeader title="系统设置" description="配置后端 API、默认检测参数、模型版本、对象存储和界面通知行为。"><button class="btn btn-primary" @click="save"><el-icon><Check/></el-icon>{{saved?'已保存':'保存设置'}}</button></PageHeader>
    <section class="settings-layout-v2">
      <article class="panel settings-section"><div class="settings-section-head"><div><strong>后端连接</strong><p>连接真实 FastAPI 服务；留空时使用 Vite 代理和本地演示 API。</p></div><span class="settings-head-icon"><el-icon><Connection/></el-icon></span></div><div class="settings-form-grid setting-grid-vue"><label class="setting-field span-2"><span>API Base URL</span><input v-model="platformStore.settings.apiBase" class="form-control" placeholder="http://localhost:8000"></label><label class="setting-field"><span>训练轮询间隔</span><el-select v-model="platformStore.settings.pollInterval" size="large"><el-option :value="3" label="3 秒"/><el-option :value="5" label="5 秒"/><el-option :value="10" label="10 秒"/></el-select></label><label class="switch-setting"><div><strong>演示降级</strong><p>后端不可用时使用本地模拟数据。</p></div><input v-model="platformStore.settings.demoFallback" type="checkbox"><i></i></label></div></article>

      <article class="panel settings-section"><div class="settings-section-head"><div><strong>模型与存储</strong><p>选择默认模型以及模型、结果文件的存储位置。</p></div><span class="settings-head-icon"><el-icon><Cpu/></el-icon></span></div><div class="settings-form-grid setting-grid-vue"><label class="setting-field span-2"><span>默认模型</span><el-select v-model="platformStore.settings.defaultModel" size="large"><el-option label="YOLOv11s Traffic v3.2" value="yolov11s-traffic-v3.2"/><el-option label="YOLOv11n Steel v1.4" value="yolov11n-steel-v1.4"/><el-option label="YOLOv11m Traffic v2.0" value="yolov11m-traffic-v2.0"/></el-select></label><label class="setting-field span-2"><span>MinIO Bucket</span><input class="form-control" value="fogtraffic-models"></label></div></article>

      <article class="panel settings-section span-all"><div class="settings-section-head"><div><strong>检测默认参数</strong><p>新建检测与测试任务时自动使用，参数卡片在不同分辨率下保持对齐。</p></div><span class="settings-head-icon"><el-icon><Aim/></el-icon></span></div><div class="parameter-settings-grid"><div class="parameter-setting-card"><div><span>置信度阈值</span><strong>{{platformStore.settings.confidence.toFixed(2)}}</strong></div><p>过滤低置信度目标框，数值越高结果越严格。</p><el-slider v-model="confidencePercent" :min="5" :max="95" :step="5" :show-tooltip="false"/><footer><span>0.05</span><span>0.95</span></footer></div><div class="parameter-setting-card"><div><span>IoU 阈值</span><strong>{{platformStore.settings.iou.toFixed(2)}}</strong></div><p>控制重叠目标框的非极大值抑制强度。</p><el-slider v-model="iouPercent" :min="10" :max="90" :step="5" :show-tooltip="false"/><footer><span>0.10</span><span>0.90</span></footer></div></div></article>

      <article class="panel settings-section"><div class="settings-section-head"><div><strong>界面与通知</strong><p>控制表格密度、任务完成提示和自动保存。</p></div><span class="settings-head-icon"><el-icon><Bell/></el-icon></span></div><div class="setting-list"><label class="switch-setting"><div><strong>紧凑表格</strong><p>减少任务列表和历史记录的行高。</p></div><input v-model="platformStore.settings.compact" type="checkbox"><i></i></label><label class="switch-setting"><div><strong>桌面通知</strong><p>训练完成、检测失败或服务异常时发送通知。</p></div><input v-model="platformStore.settings.notifications" type="checkbox"><i></i></label><label class="switch-setting"><div><strong>自动保存检测结果</strong><p>检测完成后自动写入历史记录。</p></div><input v-model="platformStore.settings.autoSave" type="checkbox"><i></i></label></div></article>

      <article class="panel settings-summary-card"><div class="settings-section-head"><div><strong>当前配置摘要</strong><p>保存前快速确认关键运行参数。</p></div><span class="settings-head-icon"><el-icon><DataLine/></el-icon></span></div><div class="settings-summary-list"><div><span>默认模型</span><strong>{{platformStore.settings.defaultModel}}</strong></div><div><span>置信度 / IoU</span><strong>{{platformStore.settings.confidence.toFixed(2)}} / {{platformStore.settings.iou.toFixed(2)}}</strong></div><div><span>后端模式</span><strong>{{platformStore.settings.apiBase?'自定义 API':'本地代理'}}</strong></div><div><span>结果保存</span><strong>{{platformStore.settings.autoSave?'自动保存':'手动保存'}}</strong></div></div></article>

      <article class="panel danger-zone span-all"><div><strong>本地数据</strong><p>清空浏览器中的登录状态、界面偏好和演示缓存，不影响真实后端数据。</p></div><button class="btn btn-danger" @click="clear"><el-icon><Delete/></el-icon>清空本地数据</button></article>
    </section>
  </div>
</template>
