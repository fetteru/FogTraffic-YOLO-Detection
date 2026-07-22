<script setup>
import { computed, onMounted, ref } from 'vue';
import { Users, Plus, Edit, Trash2, Search, Shield } from 'lucide-vue-next';
import { api } from '../services/api';
import { toast } from '../state';

const users = ref([]);
const roles = ref([]);
const loading = ref(false);
const searchQuery = ref('');
const showAddDialog = ref(false);
const showRoleDialog = ref(false);
const editingUser = ref(null);
const selectedUser = ref(null);
const selectedRoleId = ref(null);

const form = ref({
  username: '',
  email: '',
  password: '',
});

const filteredUsers = computed(() => {
  if (!searchQuery.value) return users.value;
  const query = searchQuery.value.toLowerCase();
  return users.value.filter(user =>
    user.username?.toLowerCase().includes(query) ||
    user.email?.toLowerCase().includes(query)
  );
});

async function fetchUsers() {
  loading.value = true;
  try {
    const data = await api('/api/user/list', { method: 'GET' });
    users.value = data.items || data.users || data || [];
  } catch (error) {
    console.error('获取用户列表失败:', error);
    toast('获取用户列表失败', 'error');
  } finally {
    loading.value = false;
  }
}

async function fetchRoles() {
  try {
    const data = await api('/api/role/list', { method: 'GET' });
    roles.value = data.roles || data || [];
  } catch (error) {
    console.error('获取角色列表失败:', error);
  }
}

async function addUser() {
  try {
    await api('/api/auth/register', {
      method: 'POST',
      body: JSON.stringify(form.value)
    });
    toast('用户创建成功');
    showAddDialog.value = false;
    resetForm();
    fetchUsers();
  } catch (error) {
    console.error('创建用户失败:', error);
    toast('创建用户失败', 'error');
  }
}

async function deleteUser(userId) {
  if (!confirm('确定要删除该用户吗？')) return;
  try {
    await api(`/api/user/${userId}`, { method: 'DELETE' });
    toast('用户删除成功');
    fetchUsers();
  } catch (error) {
    console.error('删除用户失败:', error);
    toast('删除用户失败', 'error');
  }
}

function editUser(user) {
  editingUser.value = user;
  form.value = {
    username: user.username,
    email: user.email,
    password: '',
  };
  showAddDialog.value = true;
}

function openRoleDialog(user) {
  selectedUser.value = user;
  // 单选：取第一个角色的 ID
  selectedRoleId.value = (user.roles && user.roles.length > 0) ? user.roles[0].id : null;
  showRoleDialog.value = true;
}

async function saveUserRoles() {
  if (!selectedUser.value) return;
  try {
    // 单选：只传一个角色 ID
    const roleIds = selectedRoleId.value ? [selectedRoleId.value] : [];
    await api(`/api/user/${selectedUser.value.id}/roles`, {
      method: 'POST',
      body: JSON.stringify({ role_ids: roleIds })
    });
    toast('角色分配成功');
    showRoleDialog.value = false;
    fetchUsers();
  } catch (error) {
    console.error('分配角色失败:', error);
    toast('分配角色失败', 'error');
  }
}

function selectRole(roleId) {
  selectedRoleId.value = roleId;
}

function resetForm() {
  form.value = { username: '', email: '', password: '' };
}

function getUserRoles(user) {
  if (!user.roles || user.roles.length === 0) return '无角色';
  return user.roles.map(r => r.display_name || r.name).join(', ');
}

function getUserRoleBadgeClass(user) {
  if (!user.roles || user.roles.length === 0) return 'badge-none';
  if (user.roles.some(r => r.name === 'admin')) return 'badge-admin';
  if (user.roles.some(r => r.name === 'operator')) return 'badge-operator';
  return 'badge-viewer';
}

onMounted(() => {
  fetchUsers();
  fetchRoles();
});
</script>

<template>
  <div class="page-stack vue-page">
    <header class="page-header">
      <div class="page-header-text">
        <h2><Users :size="20" /> 用户管理</h2>
        <p>管理系统用户账号和权限</p>
      </div>
      <div class="page-header-actions">
        <button class="btn btn-ghost" @click="fetchUsers">刷新</button>
        <button class="btn btn-primary" @click="showAddDialog = true; resetForm()">
          <Plus :size="16" /> 添加用户
        </button>
      </div>
    </header>

    <div class="search-bar">
      <Search :size="16" />
      <input v-model="searchQuery" placeholder="搜索用户名或邮箱..." />
    </div>

    <div class="panel">
      <div class="panel-title">
        <div>
          <strong>用户列表</strong>
          <span>共 {{ filteredUsers.length }} 个用户</span>
        </div>
      </div>

      <div v-if="loading" class="loading-state">加载中...</div>

      <table v-else class="page-table">
        <thead>
          <tr>
            <th>用户名</th>
            <th>邮箱</th>
            <th>角色</th>
            <th>状态</th>
            <th>操作</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="user in filteredUsers" :key="user.id">
            <td>
              <div class="user-info">
                <strong>{{ user.username }}</strong>
                <small v-if="user.is_superuser" class="superuser-tag">超级管理员</small>
              </div>
            </td>
            <td>{{ user.email || '-' }}</td>
            <td>
              <span :class="['badge', getUserRoleBadgeClass(user)]">
                {{ getUserRoles(user) }}
              </span>
            </td>
            <td>
              <span :class="['status-dot', user.is_active ? 'active' : 'inactive']"></span>
              {{ user.is_active ? '启用' : '禁用' }}
            </td>
            <td>
              <div class="action-buttons">
                <button class="btn btn-ghost btn-sm" @click="openRoleDialog(user)" title="分配角色">
                  <Shield :size="14" />
                </button>
                <button class="btn btn-ghost btn-sm btn-danger" @click="deleteUser(user.id)" title="删除">
                  <Trash2 :size="14" />
                </button>
              </div>
            </td>
          </tr>
        </tbody>
      </table>

      <div v-if="!loading && filteredUsers.length === 0" class="empty-state">
        <p>暂无用户数据</p>
      </div>
    </div>

    <!-- 添加用户对话框 -->
    <div v-if="showAddDialog" class="modal-overlay" @click.self="showAddDialog = false">
      <div class="modal">
        <div class="modal-header">
          <h3>添加用户</h3>
          <button class="btn btn-ghost btn-sm" @click="showAddDialog = false">×</button>
        </div>
        <div class="modal-body">
          <div class="form-group">
            <label>用户名</label>
            <input v-model="form.username" placeholder="请输入用户名" required />
          </div>
          <div class="form-group">
            <label>邮箱</label>
            <input v-model="form.email" type="email" placeholder="请输入邮箱" />
          </div>
          <div class="form-group">
            <label>密码</label>
            <input v-model="form.password" type="password" placeholder="请输入密码" required />
          </div>
        </div>
        <div class="modal-footer">
          <button class="btn btn-ghost" @click="showAddDialog = false">取消</button>
          <button class="btn btn-primary" @click="addUser">创建</button>
        </div>
      </div>
    </div>

    <!-- 分配角色对话框 -->
    <div v-if="showRoleDialog" class="modal-overlay" @click.self="showRoleDialog = false">
      <div class="modal">
        <div class="modal-header">
          <h3>分配角色 - {{ selectedUser?.username }}</h3>
          <button class="btn btn-ghost btn-sm" @click="showRoleDialog = false">×</button>
        </div>
        <div class="modal-body">
          <div class="role-list">
            <label v-for="role in roles" :key="role.id" class="role-radio">
              <input
                type="radio"
                name="userRole"
                :value="role.id"
                :checked="selectedRoleId === role.id"
                @change="selectRole(role.id)"
              />
              <div class="role-info">
                <strong>{{ role.display_name }}</strong>
                <small>{{ role.description || role.name }}</small>
              </div>
            </label>
            <label class="role-radio">
              <input
                type="radio"
                name="userRole"
                :value="null"
                :checked="selectedRoleId === null"
                @change="selectRole(null)"
              />
              <div class="role-info">
                <strong>无角色</strong>
                <small>移除所有角色</small>
              </div>
            </label>
          </div>
        </div>
        <div class="modal-footer">
          <button class="btn btn-ghost" @click="showRoleDialog = false">取消</button>
          <button class="btn btn-primary" @click="saveUserRoles">保存</button>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.page-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 24px;
}

.page-header-text h2 {
  display: flex;
  align-items: center;
  gap: 8px;
  margin: 0 0 4px 0;
  font-size: 20px;
}

.page-header-text p {
  margin: 0;
  color: var(--text-secondary);
  font-size: 14px;
}

.page-header-actions {
  display: flex;
  gap: 8px;
}

.search-bar {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 16px;
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: 8px;
  margin-bottom: 16px;
}

.search-bar :deep(svg) {
  width: 16px;
  height: 16px;
  flex-shrink: 0;
}

.search-bar input {
  flex: 1;
  border: none;
  background: transparent;
  outline: none;
  font-size: 14px;
}

.page-table {
  width: 100%;
  border-collapse: collapse;
}

.page-table th,
.page-table td {
  padding: 12px 16px;
  text-align: left;
  border-bottom: 1px solid var(--border);
}

.page-table th {
  font-weight: 600;
  color: var(--text-secondary);
  font-size: 13px;
}

.user-info {
  display: flex;
  align-items: center;
  gap: 8px;
}

.superuser-tag {
  font-size: 11px;
  color: #ef4444;
  background: rgba(239, 68, 68, 0.1);
  padding: 2px 6px;
  border-radius: 4px;
}

.badge {
  display: inline-block;
  padding: 4px 10px;
  border-radius: 12px;
  font-size: 12px;
  font-weight: 500;
}

.badge-admin {
  background: rgba(239, 68, 68, 0.1);
  color: #ef4444;
}

.badge-operator {
  background: rgba(59, 130, 246, 0.1);
  color: #3b82f6;
}

.badge-viewer {
  background: rgba(16, 185, 129, 0.1);
  color: #10b981;
}

.badge-none {
  background: rgba(156, 163, 175, 0.1);
  color: #9ca3af;
}

.status-dot {
  display: inline-block;
  width: 8px;
  height: 8px;
  border-radius: 50%;
  margin-right: 6px;
}

.status-dot.active {
  background: #10b981;
}

.status-dot.inactive {
  background: #ef4444;
}

.action-buttons {
  display: flex;
  gap: 4px;
}

.loading-state,
.empty-state {
  padding: 40px;
  text-align: center;
  color: var(--text-secondary);
}

.btn-sm {
  padding: 6px 8px;
  font-size: 13px;
}

.btn-danger {
  color: #ef4444;
}

.btn-danger:hover {
  background: rgba(239, 68, 68, 0.1);
}

.modal-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
}

.modal {
  background: var(--surface);
  border-radius: 12px;
  width: 90%;
  max-width: 440px;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
}

.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 20px 24px;
  border-bottom: 1px solid var(--border);
}

.modal-header h3 {
  margin: 0;
  font-size: 18px;
}

.modal-body {
  padding: 24px;
  max-height: 60vh;
  overflow-y: auto;
}

.modal-footer {
  display: flex;
  justify-content: flex-end;
  gap: 12px;
  padding: 16px 24px;
  border-top: 1px solid var(--border);
}

.form-group {
  margin-bottom: 16px;
}

.form-group label {
  display: block;
  margin-bottom: 6px;
  font-weight: 500;
  font-size: 14px;
}

.form-group input {
  width: 100%;
  padding: 10px 14px;
  border: 1px solid var(--border);
  border-radius: 8px;
  font-size: 14px;
  background: var(--background);
  color: var(--text);
}

.form-group input:focus {
  outline: none;
  border-color: var(--primary);
}

.role-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.role-radio {
  display: flex;
  align-items: flex-start;
  gap: 12px;
  padding: 12px;
  background: var(--background);
  border: 1px solid var(--border);
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.2s;
}

.role-radio:hover {
  border-color: var(--primary);
}

.role-radio:has(input:checked) {
  border-color: var(--primary);
  background: rgba(59, 130, 246, 0.05);
}

.role-radio input {
  margin-top: 4px;
}

.role-info {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.role-info strong {
  font-size: 14px;
}

.role-info small {
  font-size: 12px;
  color: var(--text-secondary);
}
</style>
