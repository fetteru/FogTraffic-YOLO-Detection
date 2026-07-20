<script setup>
import { ref } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { Menu, Search, Monitor, Sunny, Moon, Bell } from '@element-plus/icons-vue';
import { appStore } from '../../stores/app.js';
const route = useRoute(); const router = useRouter(); const showNotice = ref(false);
const labels = {chat:'智能对话',detection:'交通检测工作台',datasets:'数据集管理',training:'模型训练',evaluation:'模型评估',dashboard:'数据看板',history:'任务历史',monitoring:'系统监控',settings:'系统设置'};
</script>
<template>
  <header class="topbar"><div class="topbar-left"><button class="mobile-menu" @click="appStore.mobileNavOpen=!appStore.mobileNavOpen"><el-icon><Menu/></el-icon></button><div class="breadcrumb"><span>FogTraffic</span><i>/</i><strong>{{ labels[route.name] || 'Workspace' }}</strong></div></div>
    <div class="topbar-right">
      <button class="command-trigger" @click="router.push({name:'chat'})"><el-icon><Search/></el-icon><span>搜索功能、任务或数据集</span><kbd>⌘ K</kbd></button>
      <button class="icon-button health-button" @click="router.push({name:'monitoring'})"><i class="health-dot"></i><el-icon><Monitor/></el-icon></button>
      <button class="icon-button" @click="appStore.toggleTheme()"><el-icon><Sunny v-if="appStore.theme==='dark'"/><Moon v-else/></el-icon></button>
      <div class="popover-anchor"><button class="icon-button" @click="showNotice=!showNotice"><el-icon><Bell/></el-icon><span class="notification-badge">3</span></button>
        <div v-if="showNotice" class="popover notification-popover"><div class="popover-head"><strong>通知</strong><button @click="showNotice=false">全部已读</button></div><article><span class="notice-icon success">✓</span><div><strong>训练任务已完成</strong><p>车辆检测增强模型 v3 已达到 mAP50 87.3%</p><small>12 分钟前</small></div></article><article><span class="notice-icon warning">!</span><div><strong>数据集存在异常</strong><p>Night-Traffic 缺少 8 个标注文件</p><small>35 分钟前</small></div></article></div>
      </div>
    </div>
  </header>
</template>
