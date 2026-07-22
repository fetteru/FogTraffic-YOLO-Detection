<script setup>
import { computed, onMounted, ref } from 'vue';
import { Shield, Plus, Edit, Trash2, Key } from 'lucide-vue-next';
import { api } from '../services/api';
import { toast } from '../state';

const roles = ref([]);
const allPermissions = ref([]);
const loading = ref(false);
const showAddDialog = ref(false);
const showPermissionDialog = ref(false);
const editingRole = ref(null);
const selectedRole = ref(null);
const selectedPermissionIds = ref([]);

const form = ref({
  name: '',
  display_name: '',
  description: '',
});

const filteredRoles = computed(() => {
  return roles.value;
});

const groupedPermissions = computed(() => {
  const groups = {};
  for (const perm of allPermissions.value) {
    const module = perm.code.split(':')[0] || '其他';
    if (!groups[module]) {
      groups[module] = [];
    }
    groups[module].push(perm);
  }
  return groups;
});

async function fetchRoles() {
  loading.value = true;
  try {
    const data = await api('/api/role/list', { method: 'GET' });
    roles.value = data.roles || data || [];
  } catch (error) {
    console.error('获取角色列表失败:', error);
    toast('获取角色列表失败', 'error');
  } finally {
    loading.value = false;
  }
}

async function fetchPermissions() {
  try {
    const data = await api('/api/permission/list', { method: 'GET' });
    allPermissions.value = data.permissions || data || [];
  } catch (error) {
    console.error('获取权限列表失败:', error);
  }
}

async function fetchRolePermissions(roleId) {
  try {
    const data = await api(`/api/role/${roleId}/permissions`, { method: 'GET' });
    return data.permissions || [];
  } catch (error) {
    console.error('获取角色权限失败:', error);
    return [];
  }
}

async function addRole() {
  try {
    await api('/api/role', {
      method: 'POST',
      body: JSON.stringify(form.value)
    });
    toast('角色创建成功');
    showAddDialog.value = false;
    resetForm();
    fetchRoles();
  } catch (error) {
    console.error('创建角色失败:', error);
    toast('创建角色失败', 'error');
  }
}

async function deleteRole(roleId) {
  if (!confirm('确定要删除该角色吗？')) return;
  try {
    await api(`/api/role/${roleId}`, { method: 'DELETE' });
    toast('角色删除成功');
    fetchRoles();
  } catch (error) {
    console.error('删除角色失败:', error);
    toast('删除角色失败', 'error');
  }
}

async function openPermissionDialog(role) {
  selectedRole.value = role;
  // 获取该角色当前的权限
  const rolePermissions = await fetchRolePermissions(role.id);
  selectedPermissionIds.value = rolePermissions.map(p => p.id);
  showPermissionDialog.value = true;
}

async function saveRolePermissions() {
  if (!selectedRole.value) return;
  try {
    await api(`/api/role/${selectedRole.value.id}/permissions`, {
      method: 'POST',
      body: JSON.stringify({ permission_ids: selectedPermissionIds.value })
    });
    toast('权限分配成功');
    showPermissionDialog.value = false;
    fetchRoles();
  } catch (error) {
    console.error('分配权限失败:', error);
    toast('分配权限失败', 'error');
  }
}

function togglePermission(permissionId) {
  const index = selectedPermissionIds.value.indexOf(permissionId);
  if (index === -1) {
    selectedPermissionIds.value.push(permissionId);
  } else {
    selectedPermissionIds.value.splice(index, 1);
  }
}

function resetForm() {
  form.value = { name: '', display_name: '', description: '' };
}

function getRoleColor(name) {
  const colors = {
    admin: '#ef4444',
    operator: '#3b82f6',
    viewer: '#10b981'
  };
  return colors[name] || '#6b7280';
}

function getPermissionModule(code) {
  return code.split(':')[0] || '其他';
}

onMounted(() => {
  fetchRoles();
  fetchPermissions();
});
</script>

<template>
  <div class="page-stack vue-page">
    <header class="page-header">
      <div class="page-header-text">
        <h2><Shield :size="20" /> 角色管理</h2>
        <p>管理系统角色和权限配置</p>
      </div>
      <div class="page-header-actions">
        <button class="btn btn-ghost" @click="fetchRoles">刷新</button>
        <button class="btn btn-primary" @click="showAddDialog = true; resetForm()">
          <Plus :size="16" /> 添加角色
        </button>
      </div>
    </header>

    <div v-if="loading" class="loading-state">加载中...</div>

    <div v-else class="roles-grid">
      <div v-for="role in filteredRoles" :key="role.id" class="role-card panel">
        <div class="role-header">
          <div class="role-icon" :style="{ background: getRoleColor(role.name) }">
            <Shield :size="20" />
          </div>
          <div class="role-info">
            <h3>{{ role.display_name || role.name }}</h3>
            <p>{{ role.description || '暂无描述' }}</p>
          </div>
        </div>

        <div class="role-meta">
          <span class="role-name">{{ role.name }}</span>
          <span v-if="role.is_system" class="system-badge">系统角色</span>
        </div>

        <div class="role-actions">
          <button class="btn btn-ghost btn-sm" @click="openPermissionDialog(role)">
            <Key :size="14" /> 权限
          </button>
          <button v-if="!role.is_system" class="btn btn-ghost btn-sm btn-danger" @click="deleteRole(role.id)">
            <Trash2 :size="14" /> 删除
          </button>
        </div>
      </div>
    </div>

    <!-- 添加角色对话框 -->
    <div v-if="showAddDialog" class="modal-overlay" @click.self="showAddDialog = false">
      <div class="modal">
        <div class="modal-header">
          <h3>添加角色</h3>
          <button class="btn btn-ghost btn-sm" @click="showAddDialog = false">×</button>
        </div>
        <div class="modal-body">
          <div class="form-group">
            <label>角色标识</label>
            <input v-model="form.name" placeholder="如：admin, operator, viewer" required />
          </div>
          <div class="form-group">
            <label>显示名称</label>
            <input v-model="form.display_name" placeholder="如：管理员, 操作员, 访客" required />
          </div>
          <div class="form-group">
            <label>描述</label>
            <textarea v-model="form.description" placeholder="角色描述（可选）" rows="3"></textarea>
          </div>
        </div>
        <div class="modal-footer">
          <button class="btn btn-ghost" @click="showAddDialog = false">取消</button>
          <button class="btn btn-primary" @click="addRole">创建</button>
        </div>
      </div>
    </div>

    <!-- 分配权限对话框 -->
    <div v-if="showPermissionDialog" class="modal-overlay" @click.self="showPermissionDialog = false">
      <div class="modal modal-lg">
        <div class="modal-header">
          <h3>分配权限 - {{ selectedRole?.display_name || selectedRole?.name }}</h3>
          <button class="btn btn-ghost btn-sm" @click="showPermissionDialog = false">×</button>
        </div>
        <div class="modal-body">
          <div class="permissions-section">
            <div v-for="(perms, module) in groupedPermissions" :key="module" class="permission-group">
              <h4>{{ module }}</h4>
              <div class="permission-list">
                <label v-for="perm in perms" :key="perm.id" class="permission-checkbox">
                  <input
                    type="checkbox"
                    :checked="selectedPermissionIds.includes(perm.id)"
                    @change="togglePermission(perm.id)"
                  />
                  <div class="permission-info">
                    <strong>{{ perm.name }}</strong>
                    <small>{{ perm.code }}</small>
                  </div>
                </label>
              </div>
            </div>
          </div>
        </div>
        <div class="modal-footer">
          <button class="btn btn-ghost" @click="showPermissionDialog = false">取消</button>
          <button class="btn btn-primary" @click="saveRolePermissions">保存</button>
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

.roles-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
  gap: 16px;
}

.role-card {
  padding: 20px;
}

.role-header {
  display: flex;
  gap: 16px;
  margin-bottom: 16px;
}

.role-icon {
  width: 48px;
  height: 48px;
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
  flex-shrink: 0;
}

.role-info h3 {
  margin: 0 0 4px 0;
  font-size: 16px;
}

.role-info p {
  margin: 0;
  font-size: 13px;
  color: var(--text-secondary);
}

.role-meta {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 16px;
}

.role-name {
  font-size: 12px;
  color: var(--text-secondary);
  font-family: monospace;
}

.system-badge {
  font-size: 11px;
  background: rgba(59, 130, 246, 0.1);
  color: #3b82f6;
  padding: 2px 8px;
  border-radius: 4px;
}

.role-actions {
  display: flex;
  gap: 8px;
  padding-top: 12px;
  border-top: 1px solid var(--border);
}

.loading-state {
  padding: 40px;
  text-align: center;
  color: var(--text-secondary);
}

.btn-sm {
  padding: 6px 12px;
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

.modal-lg {
  max-width: 600px;
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

.form-group input,
.form-group textarea {
  width: 100%;
  padding: 10px 14px;
  border: 1px solid var(--border);
  border-radius: 8px;
  font-size: 14px;
  background: var(--background);
  color: var(--text);
  font-family: inherit;
}

.form-group input:focus,
.form-group textarea:focus {
  outline: none;
  border-color: var(--primary);
}

.permissions-section {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.permission-group h4 {
  margin: 0 0 12px 0;
  font-size: 14px;
  color: var(--text-secondary);
  text-transform: capitalize;
}

.permission-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.permission-checkbox {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 10px 12px;
  background: var(--background);
  border: 1px solid var(--border);
  border-radius: 6px;
  cursor: pointer;
  transition: all 0.2s;
}

.permission-checkbox:hover {
  border-color: var(--primary);
}

.permission-checkbox:has(input:checked) {
  border-color: var(--primary);
  background: rgba(59, 130, 246, 0.05);
}

.permission-checkbox input {
  width: auto;
}

.permission-info {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.permission-info strong {
  font-size: 13px;
}

.permission-info small {
  font-size: 11px;
  color: var(--text-secondary);
  font-family: monospace;
}
</style>
