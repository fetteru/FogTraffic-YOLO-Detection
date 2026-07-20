<script setup>
import { computed, reactive, ref } from 'vue';
import { ShieldCheck } from 'lucide-vue-next';
import { api, setToken } from '../services/api';
import { state, toast } from '../state';

const emit = defineEmits(['login']);
const mode = ref('login');
const authError = ref('');
const busy = ref(false);
const form = reactive({
  username: '',
  email: '',
  password: '',
  confirmPassword: '',
});

const isRegister = computed(() => mode.value === 'register');

async function login() {
  authError.value = '';
  const username = form.username.trim();
  if (!username || !form.password) {
    authError.value = '请输入用户名和密码';
    toast(authError.value, 'warning');
    return;
  }
  busy.value = true;
  try {
    const data = await api('/api/auth/login', {
      method: 'POST',
      body: {
        username,
        password: form.password,
      },
      timeout: 30000,
    });
    setToken(data.access_token);
    state.token = data.access_token;
    state.user = data.user || { username: form.username, display_name: form.username };
    emit('login');
  } catch (error) {
    authError.value = error.message || '登录失败';
    toast(authError.value, 'error');
  } finally {
    busy.value = false;
  }
}

async function register() {
  authError.value = '';
  const username = form.username.trim();
  const email = form.email.trim();
  if (!username || !email || !form.password) {
    authError.value = '请填写用户名、邮箱和密码';
    toast(authError.value, 'warning');
    return;
  }
  if (username.length < 2) {
    authError.value = '用户名至少需要 2 个字符';
    toast(authError.value, 'warning');
    return;
  }
  if (form.password.length < 6) {
    authError.value = '密码至少需要 6 位';
    toast(authError.value, 'warning');
    return;
  }
  if (form.password !== form.confirmPassword) {
    authError.value = '两次输入的密码不一致';
    toast(authError.value, 'warning');
    return;
  }

  busy.value = true;
  try {
    await api('/api/auth/register', {
      method: 'POST',
      body: {
        username,
        email,
        password: form.password,
      },
      timeout: 30000,
    });
    toast('注册成功，正在登录');
    await login();
  } catch (error) {
    authError.value = error.message || '注册失败';
    toast(authError.value, 'error');
  } finally {
    busy.value = false;
  }
}

function submitAuth() {
  return isRegister.value ? register() : login();
}

function switchMode(nextMode) {
  mode.value = nextMode;
  authError.value = '';
  form.password = '';
  form.confirmPassword = '';
}
</script>

<template>
  <main class="auth-page">
    <section class="auth-hero-top">
      <div class="auth-brand-large">
        <span><ShieldCheck :size="28" /></span>
        <div>
          <strong>FogTraffic-YOLO-Detection</strong>
          <small>Rain & Fog Traffic Vision System</small>
        </div>
      </div>
      <div class="auth-copy-lite">
        <span class="eyebrow">YOLOv11 · Multi-Agent</span>
        <h1>雨雾交通目标检测与预警平台</h1>
        <p>连接后端 YOLO 检测、视频采样、摄像头实时检测、RAG 问答和交通风险分析。</p>
      </div>
    </section>

    <section class="auth-card">
      <div class="auth-brand">
        <span class="brand-mark">F</span>
        <div>
          <h1>{{ isRegister ? '注册账号' : '登录平台' }}</h1>
          <p>{{ isRegister ? '创建本地 FastAPI 账号后自动进入工作台' : '使用本地 FastAPI 账号进入工作台' }}</p>
        </div>
      </div>

      <div class="auth-switch">
        <button :class="{ active: mode === 'login' }" type="button" @click="switchMode('login')">登录</button>
        <button :class="{ active: mode === 'register' }" type="button" @click="switchMode('register')">注册</button>
      </div>

      <form class="auth-form" autocomplete="off" @submit.prevent="submitAuth">
        <label><span>用户名</span><input v-model="form.username" autocomplete="off" minlength="2" maxlength="50" /></label>
        <label v-if="isRegister"><span>邮箱</span><input v-model="form.email" type="email" autocomplete="off" placeholder="example@qq.com" /></label>
        <label><span>密码</span><input v-model="form.password" type="password" autocomplete="new-password" /></label>
        <label v-if="isRegister"><span>确认密码</span><input v-model="form.confirmPassword" type="password" autocomplete="new-password" /></label>
        <p v-if="authError" class="auth-error">{{ authError }}</p>
        <button class="btn btn-primary" type="submit" :disabled="busy">{{ busy ? '处理中...' : isRegister ? '注册并登录' : '登录' }}</button>
      </form>

      <p class="auth-hint">默认连接：{{ state.settings.apiBase }}</p>
    </section>
  </main>
</template>
