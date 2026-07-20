import { reactive, computed } from 'vue';

const defaultUser = Object.freeze({
  username: 'admin',
  displayName: '演示管理员',
  role: 'admin'
});

function safeStorageGet(key, fallback = '') {
  try {
    const value = localStorage.getItem(key);
    return value == null ? fallback : value;
  } catch {
    return fallback;
  }
}

function safeJsonGet(key, fallback = null) {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return fallback;
    return JSON.parse(raw);
  } catch (error) {
    console.warn(`Ignoring invalid ${key} cache`, error);
    try { localStorage.removeItem(key); } catch {}
    return fallback;
  }
}

function normalizeUser(value) {
  const user = value && typeof value === 'object' ? value : {};
  const username = String(user.username || defaultUser.username).trim() || defaultUser.username;
  const displayName = String(user.displayName || user.display_name || username || defaultUser.displayName).trim() || defaultUser.displayName;
  const role = String(user.role || defaultUser.role).trim() || defaultUser.role;
  return { username, displayName, role };
}

const state = reactive({
  token: safeStorageGet('fogtraffic_token', ''),
  user: normalizeUser(safeJsonGet('fogtraffic_user', defaultUser))
});

function persistSession() {
  try {
    localStorage.setItem('fogtraffic_token', state.token);
    localStorage.setItem('fogtraffic_user', JSON.stringify(state.user));
  } catch (error) {
    console.warn('Unable to persist FogTraffic session', error);
  }
}

export const authStore = {
  state,
  isAuthenticated: computed(() => Boolean(state.token)),
  async login(values) {
    const username = values.username?.trim();
    const password = values.password;
    if (!username || !password) throw new Error('请输入用户名和密码');
    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(values)
      });
      if (!response.ok) throw new Error('接口登录失败');
      const payload = await response.json();
      const data = payload.data || payload;
      state.token = data.access_token || `demo-${username}`;
      state.user = normalizeUser({
        username: data.user?.username || username,
        displayName: data.user?.display_name || values.displayName || '演示管理员',
        role: data.user?.role || 'admin'
      });
    } catch {
      if (!(username === 'admin' && password === '123456')) throw new Error('演示账号：admin / 123456');
      state.token = `demo-${Date.now()}`;
      state.user = normalizeUser({ username, displayName: '演示管理员', role: 'admin' });
    }
    persistSession();
  },
  async register(values) {
    if (!values.username || !values.password || !values.email) throw new Error('请完整填写注册信息');
    await new Promise(resolve => setTimeout(resolve, 450));
    state.token = `demo-${Date.now()}`;
    state.user = normalizeUser({
      username: values.username,
      displayName: values.displayName || values.username,
      role: 'user'
    });
    persistSession();
  },
  logout() {
    state.token = '';
    state.user = normalizeUser(defaultUser);
    try {
      localStorage.removeItem('fogtraffic_token');
      localStorage.removeItem('fogtraffic_user');
    } catch {}
  }
};
