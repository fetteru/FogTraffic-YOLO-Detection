<script setup>
import { reactive, ref } from 'vue';
import StatusBadge from '../components/StatusBadge.vue';
import { api } from '../services/api';
import { state, toast } from '../state';

const checking = ref(false);
const health = ref(null);
const passwordSaving = ref(false);
const passwordForm = reactive({
  old_password: '',
  new_password: '',
  confirm_password: '',
});

function rangeProgress(value, min, max) {
  const percent = ((Number(value) - min) / (max - min)) * 100;
  return `${Math.min(100, Math.max(0, percent))}%`;
}

function save() {
  localStorage.setItem('fogtraffic_vue_settings', JSON.stringify(state.settings));
  document.documentElement.dataset.theme = 'light';
  toast('设置已保存');
}

async function checkBackend() {
  checking.value = true;
  try {
    health.value = await api('/api/health/detail', { method: 'GET', timeout: 30000 });
    toast('后端连接正常');
  } catch (error) {
    health.value = { status: 'unhealthy', error: error.message };
    toast(error.message, 'error');
  } finally {
    checking.value = false;
  }
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
</script>

<template>
  <section class="workspace-page">
    <div class="page-title">
      <div>
        <h1>系统设置</h1>
        <p>配置前端 API 地址、检测阈值和后端连接状态。</p>
      </div>
      <button class="btn btn-ghost" @click="checkBackend">{{ checking ? '检查中...' : '测试连接' }}</button>
    </div>

    <div class="settings-layout">
      <section class="panel settings-nav">
        <button class="active">基础配置</button>
        <button>检测参数</button>
        <button>账号设置</button>
        <button>服务状态</button>
      </section>

      <section class="settings-content">
        <div class="panel settings-section">
          <div class="settings-section-head">
            <div><strong>基础配置</strong><p>这些配置保存在浏览器 localStorage。</p></div>
            <StatusBadge :status="health?.status || 'healthy'" />
          </div>
          <div class="settings-form-grid">
            <label class="span-2"><span>后端 API 地址</span><input v-model="state.settings.apiBase" /></label>
            <label><span>默认模型</span><input v-model="state.settings.defaultModel" /></label>
            <label><span>界面主题</span><input value="light / 白色主题" disabled /></label>
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

        <div class="panel settings-section">
          <div class="settings-section-head">
            <div><strong>后端状态</strong><p>GET /api/health/detail</p></div>
          </div>
          <pre class="json-preview">{{ JSON.stringify(health || { message: '点击“测试连接”查看后端状态' }, null, 2) }}</pre>
        </div>
      </section>
    </div>
  </section>
</template>
