<script setup>
import { computed, onMounted } from 'vue';
import { Box, ChevronLeft, LogOut, Menu } from 'lucide-vue-next';
import StatusBadge from './components/StatusBadge.vue';
import LoginPage from './pages/LoginPage.vue';
import ChatPage from './pages/ChatPage.vue';
import DetectionPage from './pages/DetectionPage.vue';
import TrainingPage from './pages/TrainingPage.vue';
import DatasetsPage from './pages/DatasetsPage.vue';
import EvaluationPage from './pages/EvaluationPage.vue';
import DashboardPage from './pages/DashboardPage.vue';
import HistoryPage from './pages/HistoryPage.vue';
import SettingsPage from './pages/SettingsPage.vue';
import { api, setToken } from './services/api';
import { navItems, state, toast } from './state';

const groupedNav = computed(() => {
  const groups = [];
  for (const item of navItems) {
    let group = groups.find(row => row.name === item.group);
    if (!group) {
      group = { name: item.group, items: [] };
      groups.push(group);
    }
    group.items.push(item);
  }
  return groups;
});

const currentTitle = computed(() => navItems.find(item => item.key === state.page)?.label || '智能对话');

function navigate(page) {
  state.page = page;
  location.hash = page;
}

function logout() {
  setToken('');
  state.token = '';
  state.user = null;
  toast('已安全退出');
}

async function loadUser() {
  if (!state.token) return;
  try {
    state.user = await api('/api/auth/me', { method: 'GET', timeout: 30000 });
  } catch {
    setToken('');
    state.token = '';
  }
}

onMounted(() => {
  window.addEventListener('hashchange', () => {
    state.page = location.hash.replace('#', '') || 'chat';
  });
  loadUser();
});
</script>

<template>
  <LoginPage v-if="!state.token" @login="loadUser" />
  <div v-else :class="['app-layout', { 'sidebar-collapsed': state.sidebarCollapsed }]">
    <aside class="sidebar">
      <div class="brand">
        <span class="brand-icon"><Box :size="26" /></span>
        <div>
          <strong>FogTraffic-YOLO-Detection</strong>
          <small>Traffic Vision System</small>
        </div>
      </div>
      <nav class="side-nav">
        <section v-for="group in groupedNav" :key="group.name">
          <p>{{ group.name }}</p>
          <button v-for="item in group.items" :key="item.key" :class="{ active: state.page === item.key }" @click="navigate(item.key)">
            <span>{{ item.label }}</span>
          </button>
        </section>
      </nav>
      <div class="sidebar-footer">
        <div class="service-mini"><StatusBadge status="healthy" /><span>全部服务正常</span></div>
        <div class="user-mini">
          <strong>{{ state.user?.display_name || state.user?.username || 'lzq' }}</strong>
          <small>普通用户</small>
          <button @click="logout"><LogOut :size="15" /></button>
        </div>
      </div>
    </aside>

    <main class="main-shell">
      <header class="topbar">
        <button class="icon-button" @click="state.sidebarCollapsed = !state.sidebarCollapsed">
          <Menu v-if="state.sidebarCollapsed" :size="18" />
          <ChevronLeft v-else :size="18" />
        </button>
        <div class="breadcrumb"><span>RSOD</span><strong>{{ currentTitle }}</strong></div>
      </header>
      <section class="page-content">
        <ChatPage v-if="state.page === 'chat'" />
        <DetectionPage v-else-if="state.page === 'detection'" />
        <TrainingPage v-else-if="state.page === 'training'" />
        <DatasetsPage v-else-if="state.page === 'datasets'" />
        <EvaluationPage v-else-if="state.page === 'evaluation'" />
        <DashboardPage v-else-if="state.page === 'dashboard'" />
        <HistoryPage v-else-if="state.page === 'history'" />
        <SettingsPage v-else-if="state.page === 'settings'" />
      </section>
    </main>

    <div class="toast-root">
      <article v-for="item in state.toast" :key="item.id" :class="['toast', item.type]">
        <strong>{{ item.type === 'error' ? '错误' : item.type === 'warning' ? '提示' : '完成' }}</strong>
        <p>{{ item.message }}</p>
      </article>
    </div>
  </div>
</template>
