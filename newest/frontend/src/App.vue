<script setup>
import { computed, nextTick, onBeforeUnmount, onMounted, watch } from 'vue';
import {
  Activity,
  BarChart3,
  Box,
  BrainCircuit,
  ChevronLeft,
  Database,
  FlaskConical,
  History,
  LogOut,
  Menu,
  MessageCircle,
  Moon,
  ScanLine,
  Settings,
  ShieldCheck,
  Sun,
  Users,
} from 'lucide-vue-next';
import LoginPage from './pages/LoginPage.vue';
import ChatPage from './pages/ChatPage.vue';
import DetectionPage from './pages/DetectionPage.vue';
import TrainingPage from './pages/TrainingPage.vue';
import DatasetsPage from './pages/DatasetsPage.vue';
import EvaluationPage from './pages/EvaluationPage.vue';
import DashboardPage from './pages/DashboardPage.vue';
import HistoryPage from './pages/HistoryPage.vue';
import RoleManagementPage from './pages/RoleManagementPage.vue';
import SettingsPage from './pages/SettingsPage.vue';
import UserManagementPage from './pages/UserManagementPage.vue';
import { api, setToken } from './services/api';
import { navItems, resetUserScopedState, state, toast, userCanSee, userRoles } from './state';

const iconMap = {
  chat: MessageCircle,
  detection: ScanLine,
  datasets: Database,
  training: BrainCircuit,
  evaluation: FlaskConical,
  dashboard: BarChart3,
  history: History,
  users: Users,
  roles: ShieldCheck,
  settings: Settings,
};

const groupedNav = computed(() => {
  const groups = [];
  for (const item of navItems.filter(userCanSee)) {
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
const currentGroup = computed(() => navItems.find(item => item.key === state.page)?.group || '工作台');

const roleLabel = computed(() => {
  if (state.user?.is_superuser) return '管理员';
  const labels = { admin: '管理员', operator: '操作员', viewer: '普通用户' };
  return userRoles().map(role => labels[role] || role).join(' / ') || '普通用户';
});

const permissionCount = computed(() => (state.user?.is_superuser ? '全部' : `${state.user?.permissions?.length || 0}`));

function navIcon(key) {
  return iconMap[key] || Activity;
}

function navigate(page) {
  const item = navItems.find(row => row.key === page);
  if (!item || !userCanSee(item)) return;
  state.page = page;
  state.mobileNavOpen = false;
  location.hash = page;
}

function toggleTheme() {
  state.theme = state.theme === 'dark' ? 'light' : 'dark';
  localStorage.setItem('fogtraffic_theme', state.theme);
}

function logout() {
  setToken('');
  state.token = '';
  state.user = null;
  resetUserScopedState();
  toast('已安全退出');
}

async function loadUser() {
  if (!state.token) return;
  try {
    const user = await api('/api/auth/me', { method: 'GET', timeout: 30000 });
    if (state.user?.id && user?.id && state.user.id !== user.id) resetUserScopedState();
    state.user = user;
    if (!userCanSee(navItems.find(item => item.key === state.page) || {})) navigate('chat');
  } catch {
    setToken('');
    state.token = '';
    state.user = null;
    resetUserScopedState();
  }
}

function onHashChange() {
  const page = location.hash.replace('#', '') || 'chat';
  const item = navItems.find(row => row.key === page);
  state.page = item && userCanSee(item) ? page : 'chat';
}

function onGestureNavigate(event) {
  const page = event.detail?.page;
  if (page) navigate(page);
}

watch(
  () => state.theme,
  theme => {
    document.documentElement.dataset.theme = theme;
  },
  { immediate: true },
);

watch(
  () => Boolean(state.token),
  authenticated => {
    document.body.classList.toggle('app-authenticated', authenticated);
    window.dispatchEvent(new CustomEvent('app:auth-change', { detail: { authenticated } }));
  },
  { immediate: true },
);

watch(
  () => state.page,
  page => {
    document.body.classList.toggle('chat-page-active', page === 'chat' && Boolean(state.token));
  },
  { immediate: true },
);

onMounted(async () => {
  window.addEventListener('hashchange', onHashChange);
  window.addEventListener('gesture:navigate', onGestureNavigate);
  await loadUser();
  await nextTick();
});

onBeforeUnmount(() => {
  window.removeEventListener('hashchange', onHashChange);
  window.removeEventListener('gesture:navigate', onGestureNavigate);
});
</script>

<template>
  <LoginPage v-if="!state.token" @login="loadUser" />

  <div v-else :class="['app-layout', { 'sidebar-collapsed': state.sidebarCollapsed }]">
    <button class="icon-button mobile-menu shell-mobile-menu" type="button" aria-label="打开导航" @click="state.mobileNavOpen = true">
      <Menu :size="18" />
    </button>

    <div v-if="state.mobileNavOpen" class="mobile-overlay" @click="state.mobileNavOpen = false"></div>

    <aside :class="['sidebar', { 'mobile-open': state.mobileNavOpen }]">
      <div class="sidebar-brand">
        <span class="brand-logo fog-brand-logo"><Box :size="25" /></span>
        <div class="brand-text">
          <strong>FogTraffic</strong>
          <span>TRAFFIC VISION SYSTEM</span>
        </div>
        <button class="sidebar-toggle" type="button" :aria-label="state.sidebarCollapsed ? '展开侧栏' : '收起侧栏'" @click="state.sidebarCollapsed = !state.sidebarCollapsed">
          <Menu v-if="state.sidebarCollapsed" :size="17" />
          <ChevronLeft v-else :size="17" />
        </button>
      </div>

      <nav class="sidebar-nav">
        <div v-for="group in groupedNav" :key="group.name" class="nav-group">
          <div class="nav-group-title">{{ group.name }}</div>
          <button
            v-for="item in group.items"
            :key="item.key"
            :class="['nav-item', { active: state.page === item.key }]"
            type="button"
            :title="item.label"
            @click="navigate(item.key)"
          >
            <span class="icon"><component :is="navIcon(item.key)" /></span>
            <span>{{ item.label }}</span>
            <i v-if="state.page === item.key" class="active-dot"></i>
          </button>
        </div>
      </nav>

      <div class="sidebar-status">
        <i class="status-orb healthy"></i>
        <div>
          <strong>服务连接正常</strong>
          <span>FastAPI · YOLOv11</span>
        </div>
        <Activity :size="15" />
      </div>

      <div class="sidebar-user">
        <div class="avatar">{{ (state.user?.display_name || state.user?.username || 'A').slice(0, 1).toUpperCase() }}</div>
        <div>
          <strong>{{ state.user?.display_name || state.user?.username || 'admin' }}</strong>
          <span>{{ roleLabel }} · {{ permissionCount }} 权限</span>
        </div>
        <button type="button" aria-label="退出登录" @click="logout"><LogOut :size="15" /></button>
      </div>
    </aside>

    <main class="main-shell">
      <header class="topbar">
        <div class="topbar-left">
          <button class="icon-button mobile-menu" type="button" aria-label="打开导航" @click="state.mobileNavOpen = true">
            <Menu :size="18" />
          </button>
          <div class="breadcrumb">
            <span>{{ currentGroup }}</span><i>/</i><strong>{{ currentTitle }}</strong>
          </div>
        </div>
        <div class="topbar-right">
          <div class="health-chip"><i></i><span>系统在线</span></div>
          <button class="icon-button" type="button" aria-label="切换主题" @click="toggleTheme">
            <Sun v-if="state.theme === 'dark'" :size="17" />
            <Moon v-else :size="17" />
          </button>
        </div>
      </header>

      <section id="page-content" class="content-area page-content page-enter">
        <ChatPage v-if="state.page === 'chat'" />
        <DetectionPage v-else-if="state.page === 'detection'" />
        <TrainingPage v-else-if="state.page === 'training'" />
        <DatasetsPage v-else-if="state.page === 'datasets'" />
        <EvaluationPage v-else-if="state.page === 'evaluation'" />
        <DashboardPage v-else-if="state.page === 'dashboard'" />
        <HistoryPage v-else-if="state.page === 'history'" />
        <UserManagementPage v-else-if="state.page === 'users'" />
        <RoleManagementPage v-else-if="state.page === 'roles'" />
        <SettingsPage v-else-if="state.page === 'settings'" />
      </section>
    </main>

    <div class="toast-root">
      <article v-for="item in state.toast" :key="item.id" :class="['toast', item.type, 'show']">
        <strong>{{ item.type === 'error' ? '错误' : item.type === 'warning' ? '提示' : '完成' }}</strong>
        <p>{{ item.message }}</p>
      </article>
    </div>
  </div>
</template>
