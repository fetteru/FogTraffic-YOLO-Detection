<script setup>
import { computed, onMounted } from 'vue';
import { Box, ChevronLeft, LogOut, Menu, Users, Shield } from 'lucide-vue-next';
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
import UserPage from './pages/UserPage.vue';
import RolePage from './pages/RolePage.vue';
import { api, setToken } from './services/api';
import { getAuthorizedNavItems, hasPermission, navItems, resetUserScopedState, state, toast } from './state';

const groupedNav = computed(() => {
  const groups = [];
  // 使用权限过滤后的导航项
  const authorizedItems = getAuthorizedNavItems();
  for (const item of authorizedItems) {
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
  // 检查权限
  const navItem = navItems.find(item => item.key === page);
  if (navItem && !hasPermission(navItem.permission)) {
    toast('您没有访问此页面的权限', 'error');
    return;
  }
  state.page = page;
  location.hash = page;
}

function logout() {
  setToken('');
  state.token = '';
  state.user = null;
  resetUserScopedState();
  toast('已安全退出');
}

function getUserRoleText() {
  if (!state.user) return '未登录';
  if (state.user.is_superuser) return '超级管理员';
  const roles = state.user.roles || [];
  if (roles.length === 0) return '普通用户';
  if (roles.includes('admin')) return '管理员';
  if (roles.includes('operator')) return '操作员';
  if (roles.includes('viewer')) return '访客';
  return '普通用户';
}

async function loadUser() {
  if (!state.token) return;
  try {
    const user = await api('/api/auth/me', { method: 'GET', timeout: 30000 });
    if (state.user?.id && user?.id && state.user.id !== user.id) {
      resetUserScopedState();
    }
    state.user = user;
  } catch {
    setToken('');
    state.token = '';
    state.user = null;
    resetUserScopedState();
  }
}

onMounted(() => {
  window.addEventListener('hashchange', () => {
    const page = location.hash.replace('#', '') || 'chat';
    // 检查权限
    const navItem = navItems.find(item => item.key === page);
    if (navItem && !hasPermission(navItem.permission)) {
      state.page = 'chat';
      return;
    }
    state.page = page;
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
          <strong>{{ state.user?.display_name || state.user?.username || '用户' }}</strong>
          <small>{{ getUserRoleText() }}</small>
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
        <DetectionPage v-else-if="state.page === 'detection' && hasPermission('detection:scan')" />
        <TrainingPage v-else-if="state.page === 'training' && hasPermission('training:start')" />
        <DatasetsPage v-else-if="state.page === 'datasets' && hasPermission('detection:batch')" />
        <EvaluationPage v-else-if="state.page === 'evaluation' && hasPermission('training:evaluate')" />
        <DashboardPage v-else-if="state.page === 'dashboard' && hasPermission('dashboard:view')" />
        <HistoryPage v-else-if="state.page === 'history' && hasPermission('history:view')" />
        <SettingsPage v-else-if="state.page === 'settings'" />
        <UserPage v-else-if="state.page === 'users' && hasPermission('user:manage')" />
        <RolePage v-else-if="state.page === 'roles' && hasPermission('role:manage')" />
        <!-- 无权限时显示提示 -->
        <div v-else class="no-permission">
          <h2>🚫 无访问权限</h2>
          <p>您没有访问此页面的权限，请联系管理员。</p>
          <button class="btn btn-primary" @click="navigate('chat')">返回首页</button>
        </div>
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

<style scoped>
.no-permission {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 60vh;
  text-align: center;
}

.no-permission h2 {
  font-size: 24px;
  margin-bottom: 12px;
}

.no-permission p {
  color: var(--text-secondary);
  margin-bottom: 20px;
}

.user-mini {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 12px;
}

.user-mini strong {
  font-size: 14px;
  text-align: left;
}

.user-mini small {
  font-size: 12px;
  color: var(--text-secondary);
  text-align: left;
}
</style>
