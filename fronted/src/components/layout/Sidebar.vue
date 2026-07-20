<script setup>
import { computed } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { ChatDotRound, Aim, Coin, Cpu, TrendCharts, Grid, Clock, Monitor, Setting, Fold, Expand, SwitchButton, ArrowRight } from '@element-plus/icons-vue';
import LogoMark from '../common/LogoMark.vue';
import { appStore } from '../../stores/app.js';
import { authStore } from '../../stores/auth.js';

const route = useRoute();
const router = useRouter();
const groups = [
  { title: '工作台', items: [{name:'chat',label:'智能对话',icon:ChatDotRound},{name:'detection',label:'交通检测工作台',icon:Aim}] },
  { title: '模型闭环', items: [{name:'datasets',label:'数据集管理',icon:Coin},{name:'training',label:'模型训练',icon:Cpu},{name:'evaluation',label:'模型评估',icon:TrendCharts}] },
  { title: '分析与运维', items: [{name:'dashboard',label:'数据看板',icon:Grid},{name:'history',label:'任务历史',icon:Clock},{name:'monitoring',label:'系统监控',icon:Monitor}] },
  { title: '系统', items: [{name:'settings',label:'系统设置',icon:Setting}] }
];
const displayName = computed(() => String(authStore.state.user?.displayName || authStore.state.user?.username || '平台用户'));
const avatarText = computed(() => displayName.value.trim().slice(0, 2) || '用户');
const roleLabel = computed(() => authStore.state.user?.role === 'admin' ? '平台管理员' : '普通用户');
function logout(){ authStore.logout(); router.replace('/login'); }
</script>
<template>
  <aside class="sidebar" :class="{ 'mobile-open': appStore.mobileNavOpen }">
    <div class="sidebar-brand"><LogoMark/><div class="brand-text"><strong>FogTraffic-YOLO-Detection</strong><span>Traffic Vision System</span></div><button class="sidebar-toggle" :title="appStore.sidebarCollapsed ? '展开边栏' : '收起边栏'" @click="appStore.toggleSidebar()"><el-icon><component :is="appStore.sidebarCollapsed ? Expand : Fold"/></el-icon></button></div>
    <nav class="sidebar-nav">
      <div v-for="group in groups" :key="group.title" class="nav-group">
        <div class="nav-group-title">{{ group.title }}</div>
        <button v-for="item in group.items" :key="item.name" class="nav-item" :class="{ active: route.name === item.name }" :title="item.label" @click="router.push({name:item.name})">
          <el-icon><component :is="item.icon"/></el-icon><span>{{ item.label }}</span><i v-if="route.name === item.name" class="active-dot"></i>
        </button>
      </div>
    </nav>
    <div class="sidebar-status"><div class="status-orb healthy"></div><div><strong>全部服务正常</strong><span>5 / 5 services</span></div><button @click="router.push({name:'monitoring'})"><el-icon><ArrowRight/></el-icon></button></div>
    <div class="sidebar-user"><div class="avatar">{{ avatarText }}</div><div><strong>{{ displayName }}</strong><span>{{ roleLabel }}</span></div><button @click="logout"><el-icon><SwitchButton/></el-icon></button></div>
  </aside>
</template>
