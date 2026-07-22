<script setup>
import { computed, onMounted, reactive, ref } from 'vue';
import { api } from '../services/api';
import { persistSettings, state, toast } from '../state';

const passwordSaving = ref(false);
const passwordForm = reactive({
  old_password: '',
  new_password: '',
  confirm_password: '',
});

const modelOptions = computed(() => state.settings.models || []);
const selectedModel = computed(() => modelOptions.value.find(item => item.key === state.settings.selectedModelKey) || null);
const themeOptions = [
  { key: 'dark', label: '深色主题' },
  { key: 'light', label: '浅色主题' },
];
const accentOptions = [
  { key: 'ocean', label: '蓝青', primary: '#38bdf8', secondary: '#6366f1' },
  { key: 'violet', label: '紫藤', primary: '#8b5cf6', secondary: '#ec4899' },
  { key: 'emerald', label: '翠绿', primary: '#10b981', secondary: '#14b8a6' },
  { key: 'amber', label: '琥珀', primary: '#f59e0b', secondary: '#ef4444' },
  { key: 'rose', label: '玫红', primary: '#f43f5e', secondary: '#8b5cf6' },
];

async function loadModels() {
  try {
    const data = await api('/api/detection/models', { method: 'GET', timeout: 30000 });
    state.settings.models = data.models || [];
    const selectedExists = state.settings.models.some(item => item.key === state.settings.selectedModelKey && item.exists);
    if ((!state.settings.selectedModelKey || !selectedExists) && state.settings.models.length) {
      const preferred = state.settings.models.find(item => item.is_default && item.exists) || state.settings.models.find(item => item.exists);
      state.settings.selectedModelKey = preferred?.key || '';
      state.settings.defaultModel = preferred?.name || preferred?.model_name || state.settings.defaultModel;
    }
  } catch {
    state.settings.models = [];
  }
}

function rangeProgress(value, min, max) {
  const percent = ((Number(value) - min) / (max - min)) * 100;
  return `${Math.min(100, Math.max(0, percent))}%`;
}

function save() {
  const model = selectedModel.value;
  if (model) state.settings.defaultModel = model.name || model.model_name;
  localStorage.setItem('fogtraffic_theme', state.theme);
  persistSettings();
  toast('设置已保存');
}

async function changePassword() {
  if (!passwordForm.old_password || !passwordForm.new_password) {
    toast('请先填写旧密码和新密码', 'warning');
    return;
  }
  if (passwordForm.new_password.length < 6) {
    toast('新密码至少需要 6 位', 'warning');
    return;
  }
  if (passwordForm.new_password !== passwordForm.confirm_password) {
    toast('两次输入的新密码不一致', 'warning');
    return;
  }
  passwordSaving.value = true;
  try {
    await api('/api/user/password', {
      method: 'PUT',
      body: {
        old_password: passwordForm.old_password,
        new_password: passwordForm.new_password,
      },
    });
    passwordForm.old_password = '';
    passwordForm.new_password = '';
    passwordForm.confirm_password = '';
    toast('密码已修改');
  } catch (error) {
    toast(error.message, 'error');
  } finally {
    passwordSaving.value = false;
  }
}

onMounted(loadModels);
</script>

<template>
  <section class="workspace-page">
    <div class="page-title">
      <div>
        <h1>系统设置</h1>
        <p>配置前端 API 地址、默认模型和检测阈值。</p>
      </div>
    </div>

    <div class="settings-layout">
      <section class="panel settings-nav">
        <button class="active">基础配置</button>
        <button>检测参数</button>
        <button>账号设置</button>
      </section>

      <section class="settings-content">
        <div class="panel settings-section">
          <div class="settings-section-head">
            <div><strong>基础配置</strong><p>这些配置保存在浏览器 localStorage。</p></div>
          </div>
          <div class="settings-form-grid">
            <label class="span-2"><span>后端 API 地址</span><input v-model="state.settings.apiBase" /></label>
            <label>
              <span>默认模型</span>
              <select v-model="state.settings.selectedModelKey">
                <option value="">自动选择可用模型</option>
                <option v-for="model in modelOptions" :key="model.key" :value="model.key" :disabled="!model.exists">
                  {{ model.name || model.model_name }}{{ model.version ? ` · ${model.version}` : '' }}{{ model.is_default ? ' · default' : '' }}
                </option>
              </select>
            </label>
            <label>
              <span>界面明暗</span>
              <select v-model="state.theme">
                <option v-for="item in themeOptions" :key="item.key" :value="item.key">{{ item.label }}</option>
              </select>
            </label>
            <div class="theme-palette span-2">
              <span>主题颜色</span>
              <div class="theme-color-grid">
                <button
                  v-for="item in accentOptions"
                  :key="item.key"
                  type="button"
                  :class="['theme-color-option', { active: state.settings.themeAccent === item.key }]"
                  :style="{ '--swatch-a': item.primary, '--swatch-b': item.secondary }"
                  @click="state.settings.themeAccent = item.key"
                >
                  <i></i>
                  <strong>{{ item.label }}</strong>
                </button>
              </div>
            </div>
            <label><span>置信度阈值 {{ state.settings.confidence.toFixed(2) }}</span><input v-model.number="state.settings.confidence" type="range" min="0.05" max="0.95" step="0.05" :style="{ '--range-progress': rangeProgress(state.settings.confidence, 0.05, 0.95) }" /></label>
            <label><span>IoU 阈值 {{ state.settings.iou.toFixed(2) }}</span><input v-model.number="state.settings.iou" type="range" min="0.1" max="0.9" step="0.05" :style="{ '--range-progress': rangeProgress(state.settings.iou, 0.1, 0.9) }" /></label>
          </div>
          <div class="settings-actions">
            <button class="btn btn-primary" @click="save">保存设置</button>
          </div>
        </div>

        <div class="panel settings-section">
          <div class="settings-section-head">
            <div><strong>账号设置</strong><p>修改当前登录账号密码，提交后需要使用新密码重新登录。</p></div>
          </div>
          <div class="settings-form-grid">
            <label><span>旧密码</span><input v-model="passwordForm.old_password" type="password" autocomplete="current-password" /></label>
            <label><span>新密码</span><input v-model="passwordForm.new_password" type="password" autocomplete="new-password" /></label>
            <label><span>确认新密码</span><input v-model="passwordForm.confirm_password" type="password" autocomplete="new-password" /></label>
          </div>
          <div class="settings-actions">
            <button class="btn btn-primary" :disabled="passwordSaving" @click="changePassword">{{ passwordSaving ? '保存中...' : '修改密码' }}</button>
          </div>
        </div>
      </section>
    </div>
  </section>
</template>
