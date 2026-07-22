<script setup>
import { computed, reactive, ref } from 'vue';
import {
  ArrowRight,
  Box,
  CheckCircle2,
  Copy,
  Eye,
  EyeOff,
  LockKeyhole,
  Mail,
  Moon,
  Sun,
  User,
} from 'lucide-vue-next';
import { api, setToken } from '../services/api';
import { resetUserScopedState, state, toast } from '../state';

const emit = defineEmits(['login']);
const mode = ref('login');
const authError = ref('');
const busy = ref(false);
const passwordVisible = ref(false);
const rememberMe = ref(true);
const form = reactive({
  username: '',
  email: '',
  password: '',
  confirmPassword: '',
});

const isRegister = computed(() => mode.value === 'register');

function toggleTheme() {
  state.theme = state.theme === 'dark' ? 'light' : 'dark';
  localStorage.setItem('fogtraffic_theme', state.theme);
}

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
      body: { username, password: form.password },
      timeout: 30000,
    });
    resetUserScopedState();
    setToken(data.access_token, rememberMe.value);
    state.token = data.access_token;
    state.user = data.user || { username, display_name: username };
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
  if (username.length < 3) {
    authError.value = '用户名至少需要 3 个字符';
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
      body: { username, email, password: form.password },
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

async function copyDemoAccount() {
  form.username = 'admin';
  form.password = 'admin123456';
  try {
    await navigator.clipboard.writeText('admin / admin123456');
    toast('演示账号已填写并复制');
  } catch {
    toast('演示账号已自动填写');
  }
}
</script>

<template>
  <main class="auth-page">
    <section class="auth-visual">
      <div class="auth-grid-lines"></div>

      <div class="auth-brand">
        <span class="brand-logo fog-brand-logo"><Box :size="25" /></span>
        <div>
          <strong>FogTraffic-YOLO-Detection</strong>
          <span>雨雾交通 YOLOv11 智能视觉平台</span>
        </div>
      </div>

      <div class="auth-copy">
        <div class="hero-pill"><i></i> Agent + YOLOv11 + Traffic Vision</div>
        <h1>让雨雾交通检测<br />从<em>模型工具</em>升级为智能体</h1>
        <p>保留原有检测、增强、跟踪、车流统计、训练评估、数据集与权限管理能力，并提供统一的沉浸式交互入口。</p>
        <div class="auth-feature-grid">
          <article><strong>多源</strong><span>交通输入</span><small>图片 / 视频 / 摄像头</small></article>
          <article><strong>YOLO</strong><span>检测闭环</span><small>训练 / 评估 / 推理</small></article>
          <article><strong>SSE</strong><span>智能对话</span><small>Agent 流式响应</small></article>
        </div>
      </div>

      <div class="auth-orbit orbit-a"></div>
      <div class="auth-orbit orbit-b"></div>
      <div class="auth-console">
        <div class="console-top"><span></span><span></span><span></span><small>traffic.agent.trace</small></div>
        <p><b>09:42:16</b> source → fog traffic camera</p>
        <p><b>09:42:16</b> model → YOLOv11 inference</p>
        <p><b>09:42:17</b> result → vehicles tracked · risk analyzed</p>
        <div class="console-line"></div>
      </div>
    </section>

    <section class="auth-panel">
      <button class="theme-fab" type="button" aria-label="切换主题" @click="toggleTheme">
        <Sun v-if="state.theme === 'dark'" :size="18" />
        <Moon v-else :size="18" />
      </button>

      <div class="auth-card">
        <div class="auth-card-head">
          <span class="mobile-logo fog-brand-logo"><Box :size="26" /></span>
          <h2>{{ isRegister ? '创建平台账号' : '欢迎回来' }}</h2>
          <p>{{ isRegister ? '注册后自动进入 FogTraffic 工作台' : '登录后进入雨雾交通智能视觉工作台' }}</p>
        </div>

        <div class="auth-tabs">
          <button :class="{ active: mode === 'login' }" type="button" @click="switchMode('login')">登录</button>
          <button :class="{ active: mode === 'register' }" type="button" @click="switchMode('register')">注册</button>
        </div>

        <form class="auth-form" autocomplete="off" @submit.prevent="submitAuth">
          <label>
            <span>用户名或邮箱</span>
            <div class="field-shell">
              <span class="icon"><User /></span>
              <input v-model="form.username" autocomplete="username" minlength="3" maxlength="50" placeholder="请输入用户名" />
            </div>
          </label>

          <label v-if="isRegister">
            <span>邮箱</span>
            <div class="field-shell">
              <span class="icon"><Mail /></span>
              <input v-model="form.email" type="email" autocomplete="email" placeholder="name@example.com" />
            </div>
          </label>

          <label>
            <span>密码</span>
            <div class="field-shell">
              <span class="icon"><LockKeyhole /></span>
              <input
                v-model="form.password"
                :type="passwordVisible ? 'text' : 'password'"
                :autocomplete="isRegister ? 'new-password' : 'current-password'"
                placeholder="请输入密码"
              />
              <button type="button" aria-label="显示或隐藏密码" @click="passwordVisible = !passwordVisible">
                <EyeOff v-if="passwordVisible" :size="16" />
                <Eye v-else :size="16" />
              </button>
            </div>
          </label>

          <label v-if="isRegister">
            <span>确认密码</span>
            <div class="field-shell">
              <span class="icon"><LockKeyhole /></span>
              <input v-model="form.confirmPassword" :type="passwordVisible ? 'text' : 'password'" autocomplete="new-password" placeholder="再次输入密码" />
            </div>
          </label>

          <div class="auth-options">
            <label class="check-label"><input v-model="rememberMe" type="checkbox" /><span></span>保持登录</label>
            <button class="text-link" type="button" @click="toast('请联系管理员重置密码', 'warning')">忘记密码？</button>
          </div>

          <p v-if="isRegister" class="auth-role-note">注册后默认分配操作员角色，管理员可在用户管理中调整权限。</p>
          <p v-if="authError" class="auth-error">{{ authError }}</p>

          <button class="btn btn-primary btn-auth" type="submit" :disabled="busy">
            <span v-if="busy" class="spinner"></span>
            {{ busy ? '正在连接…' : isRegister ? '注册并登录' : '进入工作台' }}
            <ArrowRight v-if="!busy" :size="17" />
          </button>
        </form>

        <div class="demo-account">
          <span><CheckCircle2 :size="14" /> 默认管理员</span>
          <code>admin</code><i>/</i><code>admin123456</code>
          <button type="button" @click="copyDemoAccount"><Copy :size="13" /> 填写</button>
        </div>

        <p class="auth-terms">当前连接地址：{{ state.settings.apiBase }}。登录注册仍调用 FogTraffic 原有 FastAPI 接口。</p>
      </div>
    </section>
  </main>
</template>
