<script setup>
import { computed, onMounted, ref } from 'vue';
import { RefreshCw, Search, ShieldCheck } from 'lucide-vue-next';
import { api } from '../services/api';
import { toast } from '../state';

const loading = ref(false);
const users = ref([]);
const roles = ref([]);
const keyword = ref('');
const selectedUser = ref(null);
const selectedRoleId = ref(null);
const roleModalOpen = ref(false);

const totalUsers = computed(() => users.value.length);

async function loadUsers() {
  loading.value = true;
  try {
    const data = await api(`/api/user/list?page=1&page_size=100${keyword.value ? `&keyword=${encodeURIComponent(keyword.value)}` : ''}`, {
      method: 'GET',
      timeout: 30000,
    });
    users.value = data.items || [];
  } catch (error) {
    toast(error.message, 'error');
  } finally {
    loading.value = false;
  }
}

async function loadRoles() {
  try {
    const data = await api('/api/role/list', { method: 'GET', timeout: 30000 });
    roles.value = data.roles || data.items || [];
  } catch (error) {
    toast(error.message, 'error');
  }
}

async function openRoleModal(user) {
  selectedUser.value = user;
  roleModalOpen.value = true;
  try {
    const data = await api(`/api/user/${user.id}/roles`, { method: 'GET', timeout: 30000 });
    selectedRoleId.value = (data.roles || [])[0]?.id || null;
  } catch (error) {
    toast(error.message, 'error');
  }
}

async function saveUserRoles() {
  if (!selectedUser.value) return;
  try {
    const roleIds = selectedRoleId.value ? [selectedRoleId.value] : [];
    await api(`/api/user/${selectedUser.value.id}/roles`, {
      method: 'POST',
      body: { role_ids: roleIds },
    });
    roleModalOpen.value = false;
    toast('用户角色已更新');
    await loadUsers();
  } catch (error) {
    toast(error.message, 'error');
  }
}

function selectRole(roleId) {
  selectedRoleId.value = roleId;
}

function displayRoles(user) {
  return user.role_details?.length ? user.role_details : (user.roles || []).map(name => ({ name, display_name: name }));
}

onMounted(async () => {
  await Promise.all([loadRoles(), loadUsers()]);
});
</script>

<template>
  <section class="workspace-page">
    <div class="page-title">
      <div>
        <h1>用户管理</h1>
        <p>查看平台用户，并为用户分配管理员、操作员或只读角色。</p>
      </div>
      <button class="btn btn-ghost" :disabled="loading" @click="loadUsers">
        <RefreshCw :size="16" />{{ loading ? '刷新中...' : '刷新' }}
      </button>
    </div>

    <section class="panel task-table-panel">
      <div class="panel-title">
        <div><strong>用户列表</strong><span>{{ totalUsers }} 个账号</span></div>
        <div class="management-toolbar">
          <Search :size="15" />
          <input v-model="keyword" placeholder="搜索用户名或邮箱" @keydown.enter="loadUsers" />
          <button class="btn btn-primary btn-sm" @click="loadUsers">搜索</button>
        </div>
      </div>
      <div class="table-scroll">
        <table class="data-table">
          <thead>
            <tr>
              <th>用户</th>
              <th>联系方式</th>
              <th>角色</th>
              <th>权限数</th>
              <th>状态</th>
              <th>操作</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="user in users" :key="user.id">
              <td><strong>{{ user.username }}</strong><small>ID {{ user.id }}</small></td>
              <td><span>{{ user.email }}</span><small>{{ user.phone || '未填写手机号' }}</small></td>
              <td>
                <div class="role-tags">
                  <span v-for="role in displayRoles(user)" :key="role.id || role.name">{{ role.display_name || role.name }}</span>
                  <small v-if="!displayRoles(user).length">无角色</small>
                </div>
              </td>
              <td>{{ user.is_superuser ? '全部' : (user.permissions?.length || 0) }}</td>
              <td><span :class="['status-dot-text', user.is_active ? 'ok' : 'muted']">{{ user.is_active ? '启用' : '停用' }}</span></td>
              <td>
                <button class="table-link" @click="openRoleModal(user)">分配角色</button>
              </td>
            </tr>
            <tr v-if="!users.length && !loading">
              <td colspan="6">
                <div class="empty-state"><strong>暂无用户</strong><p>注册账号后会出现在这里。</p></div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </section>

    <div v-if="roleModalOpen" class="modal-backdrop visible" @click.self="roleModalOpen = false">
      <section class="modal-card modal-sm">
        <header class="modal-header">
          <div>
            <h2>分配角色</h2>
            <p>{{ selectedUser?.username }}</p>
          </div>
          <ShieldCheck :size="20" />
        </header>
        <div class="modal-body">
          <div class="permission-grid">
            <label v-for="role in roles" :key="role.id" class="check-row">
              <input
                name="user-role"
                type="radio"
                :checked="selectedRoleId === role.id"
                @change="selectRole(role.id)"
              />
              <span><strong>{{ role.display_name || role.name }}</strong><small>{{ role.description || role.name }}</small></span>
            </label>
            <label class="check-row">
              <input
                name="user-role"
                type="radio"
                :checked="selectedRoleId === null"
                @change="selectRole(null)"
              />
              <span><strong>无角色</strong><small>移除该用户的所有角色</small></span>
            </label>
          </div>
        </div>
        <footer class="modal-footer">
          <button class="btn btn-ghost" @click="roleModalOpen = false">取消</button>
          <button class="btn btn-primary" @click="saveUserRoles">保存</button>
        </footer>
      </section>
    </div>
  </section>
</template>
