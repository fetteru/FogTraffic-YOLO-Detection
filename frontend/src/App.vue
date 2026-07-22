<script setup>
import { computed, onMounted, ref } from 'vue';
import { Box, ChevronLeft, LockKeyhole, LogOut, Menu } from 'lucide-vue-next';
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
const currentNavItem = computed(() => navItems.find(item => item.key === state.page) || null);
const currentPageAllowed = computed(() => userCanSee(currentNavItem.value || {}));
const firstAllowedPage = computed(() => navItems.find(item => userCanSee(item))?.key || 'chat');
const userLoaded = ref(false);

const roleLabel = computed(() => {
  if (state.user?.is_superuser) return '管理员';
  const labels = { admin: '管理员', operator: '操作员', viewer: '普通用户' };
  return userRoles().map(role => labels[role] || role).join(' / ') || '普通用户';
});

const permissionCount = computed(() => (state.user?.is_superuser ? '全部' : `${state.user?.permissions?.length || 0}`));

function navigate(page) {
  const item = navItems.find(row => row.key === page);
  state.page = page;
  location.hash = page;
  if (item && !userCanSee(item)) {
    toast('您没有访问此页面的权限，请联系管理员', 'error');
  }
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
  userLoaded.value = false;
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
  } finally {
    userLoaded.value = true;
  }
}

onMounted(() => {
  window.addEventListener('hashchange', () => {
    const page = location.hash.replace('#', '') || 'chat';
    const item = navItems.find(row => row.key === page);
    state.page = item ? page : 'chat';
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
          <button
            v-for="item in group.items"
            :key="item.key"
            :class="{ active: state.page === item.key, locked: state.user && !userCanSee(item) }"
            :title="state.user && !userCanSee(item) ? '无访问权限' : ''"
            @click="navigate(item.key)"
          >
            <span>{{ item.label }}</span>
          </button>
        </section>
      </nav>
      <div class="sidebar-footer">
        <div class="user-mini">
          <div class="user-mini-info" :title="`${roleLabel} · ${permissionCount} 权限`">
            <strong>{{ state.user?.display_name || state.user?.username || 'admin' }}</strong>
            <small>{{ roleLabel }} · {{ permissionCount }} 权限</small>
          </div>
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
        <div v-if="!userLoaded || !state.user" class="empty-state">
          <strong>正在加载用户权限...</strong>
        </div>
        <div v-else-if="!currentPageAllowed" class="no-permission-panel">
          <span class="no-permission-icon"><LockKeyhole :size="30" /></span>
          <strong>无访问权限</strong>
          <p>当前角色暂无访问「{{ currentTitle }}」的权限，请联系管理员分配。</p>
          <button class="btn btn-primary" @click="navigate(firstAllowedPage)">返回可访问页面</button>
        </div>
        <template v-else>
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
        </template>
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
.side-nav button.locked {
  opacity: 0.58;
}

.side-nav button.locked span::after {
  content: " 无权限";
  margin-left: 8px;
  font-size: 11px;
  color: var(--text-muted);
}

.no-permission-panel {
  min-height: 52vh;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 12px;
  text-align: center;
  color: var(--text-primary);
}

.no-permission-icon {
  width: 58px;
  height: 58px;
  border-radius: 16px;
  display: grid;
  place-items: center;
  color: #2563eb;
  background: rgba(37, 99, 235, 0.1);
  border: 1px solid rgba(37, 99, 235, 0.18);
}

.no-permission-panel strong {
  font-size: 20px;
}

.no-permission-panel p {
  max-width: 420px;
  margin: 0;
  color: var(--text-secondary);
}
</style>
