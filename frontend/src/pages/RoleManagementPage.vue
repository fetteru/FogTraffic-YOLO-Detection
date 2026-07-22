<script setup>
import { computed, onMounted, reactive, ref } from 'vue';
import { LockKeyhole, Plus, RefreshCw } from 'lucide-vue-next';
import { api } from '../services/api';
import { toast } from '../state';

const loading = ref(false);
const roles = ref([]);
const permissions = ref([]);
const selectedRole = ref(null);
const selectedPermissionIds = ref([]);
const permissionModalOpen = ref(false);
const form = reactive({
  name: '',
  display_name: '',
  description: '',
});

const groupedPermissions = computed(() => {
  const groups = [];
  for (const permission of permissions.value) {
    let group = groups.find(item => item.module === permission.module);
    if (!group) {
      group = { module: permission.module, items: [] };
      groups.push(group);
    }
    group.items.push(permission);
  }
  return groups;
});

async function loadRoles() {
  loading.value = true;
  try {
    const data = await api('/api/role/list', { method: 'GET', timeout: 30000 });
    roles.value = data.roles || [];
  } catch (error) {
    toast(error.message, 'error');
  } finally {
    loading.value = false;
  }
}

async function loadPermissions() {
  try {
    const data = await api('/api/permission/list', { method: 'GET', timeout: 30000 });
    permissions.value = data.permissions || [];
  } catch (error) {
    toast(error.message, 'error');
  }
}

async function createRole() {
  if (!form.name || !form.display_name) {
    toast('请填写角色标识和显示名称', 'warning');
    return;
  }
  try {
    await api('/api/role', {
      method: 'POST',
      body: {
        name: form.name.trim(),
        display_name: form.display_name.trim(),
        description: form.description.trim() || null,
      },
    });
    form.name = '';
    form.display_name = '';
    form.description = '';
    toast('角色已创建');
    await loadRoles();
  } catch (error) {
    toast(error.message, 'error');
  }
}

async function deleteRole(role) {
  if (role.is_system) return;
  if (!window.confirm(`确定删除角色 ${role.display_name || role.name} 吗？`)) return;
  try {
    await api(`/api/role/${role.id}`, { method: 'DELETE' });
    toast('角色已删除');
    await loadRoles();
  } catch (error) {
    toast(error.message, 'error');
  }
}

async function openPermissionModal(role) {
  selectedRole.value = role;
  permissionModalOpen.value = true;
  try {
    const data = await api(`/api/role/${role.id}/permissions`, { method: 'GET', timeout: 30000 });
    selectedPermissionIds.value = (data.permissions || []).map(item => item.id);
  } catch (error) {
    toast(error.message, 'error');
  }
}

async function saveRolePermissions() {
  if (!selectedRole.value) return;
  try {
    await api(`/api/role/${selectedRole.value.id}/permissions`, {
      method: 'POST',
      body: { permission_ids: selectedPermissionIds.value },
    });
    permissionModalOpen.value = false;
    toast('角色权限已更新');
    await loadRoles();
  } catch (error) {
    toast(error.message, 'error');
  }
}

onMounted(async () => {
  await Promise.all([loadPermissions(), loadRoles()]);
});
</script>

<template>
  <section class="workspace-page">
    <div class="page-title">
      <div>
        <h1>角色管理</h1>
        <p>维护平台角色，并配置每个角色可以访问的菜单、按钮和 API 权限。</p>
      </div>
      <button class="btn btn-ghost" :disabled="loading" @click="loadRoles">
        <RefreshCw :size="16" />{{ loading ? '刷新中...' : '刷新' }}
      </button>
    </div>

    <div class="management-grid">
      <section class="panel settings-section">
        <div class="settings-section-head">
          <div><strong>新建角色</strong><p>系统角色不可删除，自定义角色可自由配置权限。</p></div>
          <Plus :size="18" />
        </div>
        <div class="settings-form-grid">
          <label><span>角色标识</span><input v-model="form.name" placeholder="road_admin" /></label>
          <label><span>显示名称</span><input v-model="form.display_name" placeholder="道路管理员" /></label>
          <label class="span-2"><span>描述</span><textarea v-model="form.description" rows="3" placeholder="这个角色负责哪些操作" /></label>
        </div>
        <div class="settings-actions">
          <button class="btn btn-primary" @click="createRole">创建角色</button>
        </div>
      </section>

      <section class="panel task-table-panel">
        <div class="panel-title">
          <div><strong>角色列表</strong><span>{{ roles.length }} 个角色</span></div>
        </div>
        <div class="table-scroll">
          <table class="data-table compact">
            <thead>
              <tr>
                <th>角色</th>
                <th>类型</th>
                <th>说明</th>
                <th>操作</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="role in roles" :key="role.id">
                <td><strong>{{ role.display_name || role.name }}</strong><small>{{ role.name }}</small></td>
                <td><span :class="['status-dot-text', role.is_system ? 'ok' : 'muted']">{{ role.is_system ? '系统' : '自定义' }}</span></td>
                <td>{{ role.description || '-' }}</td>
                <td>
                  <button class="table-link" @click="openPermissionModal(role)">权限</button>
                  <button v-if="!role.is_system" class="table-link danger" @click="deleteRole(role)">删除</button>
                </td>
              </tr>
              <tr v-if="!roles.length && !loading">
                <td colspan="4">
                  <div class="empty-state"><strong>暂无角色</strong><p>启动后端后会自动初始化系统角色。</p></div>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>
    </div>

    <div v-if="permissionModalOpen" class="modal-backdrop visible" @click.self="permissionModalOpen = false">
      <section class="modal-card modal-lg">
        <header class="modal-header">
          <div>
            <h2>配置权限</h2>
            <p>{{ selectedRole?.display_name || selectedRole?.name }}</p>
          </div>
        </header>
        <div class="modal-body">
          <div class="permission-groups">
            <section v-for="group in groupedPermissions" :key="group.module">
              <h3>{{ group.module }}</h3>
              <div class="permission-grid">
                <label v-for="permission in group.items" :key="permission.id" class="check-row">
                  <input v-model="selectedPermissionIds" type="checkbox" :value="permission.id" />
                  <span>
                    <strong>{{ permission.name }}</strong>
                    <small>{{ permission.code }}</small>
                  </span>
                </label>
              </div>
            </section>
          </div>
        </div>
        <footer class="modal-footer">
          <button class="btn btn-ghost" @click="permissionModalOpen = false">取消</button>
          <button class="btn btn-primary" @click="saveRolePermissions"><LockKeyhole :size="16" />保存权限</button>
        </footer>
      </section>
    </div>
  </section>
</template>
