import { authStore } from '../stores/auth.js';
export async function request(url, options = {}) {
  const headers = { ...(options.body instanceof FormData ? {} : { 'Content-Type': 'application/json' }), ...(authStore.state.token ? { Authorization: `Bearer ${authStore.state.token}` } : {}), ...options.headers };
  const response = await fetch(url, { ...options, headers });
  if (!response.ok) throw new Error(`请求失败：${response.status}`);
  const payload = await response.json();
  return payload.data ?? payload;
}
