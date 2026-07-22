const DEFAULT_API_BASE = 'http://127.0.0.1:8000';
const LEGACY_DEFAULT_API_BASE = 'http://localhost:8000';

function normalizeApiBase(value) {
  const base = value || DEFAULT_API_BASE;
  return base === LEGACY_DEFAULT_API_BASE ? DEFAULT_API_BASE : base;
}

export function apiBase() {
  try {
    const settings = JSON.parse(localStorage.getItem('fogtraffic_vue_settings') || '{}');
    return normalizeApiBase(settings.apiBase);
  } catch {
    return DEFAULT_API_BASE;
  }
}

export function token() {
  return sessionStorage.getItem('rsod_token') || localStorage.getItem('rsod_token') || '';
}

export function setToken(value, persistent = true) {
  if (value) {
    sessionStorage.removeItem('rsod_token');
    localStorage.removeItem('rsod_token');
    if (persistent) localStorage.setItem('rsod_token', value);
    else sessionStorage.setItem('rsod_token', value);
  } else {
    localStorage.removeItem('rsod_token');
    sessionStorage.removeItem('rsod_token');
  }
}

export function apiUrl(path) {
  if (/^https?:\/\//i.test(path)) return path;
  return `${apiBase().replace(/\/$/, '')}${path.startsWith('/') ? path : `/${path}`}`;
}

function formatApiError(payload, status) {
  if (status === 403) {
    const detail = typeof payload?.detail === 'string' ? payload.detail : '';
    if (detail.includes('Permission required') || detail.includes('Administrator access required')) {
      return '没有权限执行此操作，请联系管理员分配权限';
    }
  }
  if (Array.isArray(payload?.detail)) {
    return payload.detail.map(item => {
      const field = Array.isArray(item.loc) ? item.loc[item.loc.length - 1] : '';
      return `${field ? `${field}: ` : ''}${item.msg || JSON.stringify(item)}`;
    }).join('；');
  }
  if (typeof payload?.detail === 'string') return payload.detail;
  if (payload?.detail && typeof payload.detail === 'object') return JSON.stringify(payload.detail);
  return payload?.message || payload?.error || `HTTP ${status}`;
}

export async function api(path, options = {}) {
  const headers = { ...(options.headers || {}) };
  if (token()) headers.Authorization = `Bearer ${token()}`;
  if (options.body && !(options.body instanceof FormData) && !headers['Content-Type']) {
    headers['Content-Type'] = 'application/json';
  }
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), options.timeout || 120000);
  try {
    const response = await fetch(apiUrl(path), {
      ...options,
      headers,
      body: options.body && !(options.body instanceof FormData) && typeof options.body !== 'string'
        ? JSON.stringify(options.body)
        : options.body,
      signal: options.signal || controller.signal,
    });
    const contentType = response.headers.get('content-type') || '';
    const payload = contentType.includes('application/json') ? await response.json() : await response.text();
    if (!response.ok) {
      throw new Error(formatApiError(payload, response.status));
    }
    if (payload && typeof payload === 'object' && 'data' in payload && 'code' in payload) return payload.data;
    return payload;
  } finally {
    clearTimeout(timeout);
  }
}

export async function streamChat({ message, files = [], sessionId = 'default', selectedModelKey = '' }, onEvent, signal) {
  const headers = {};
  if (token()) headers.Authorization = `Bearer ${token()}`;
  let body;
  if (files.length) {
    body = new FormData();
    body.append('message', message || '');
    body.append('session_id', sessionId);
    if (selectedModelKey) body.append('model_key', selectedModelKey);
    files.forEach(item => body.append('files', item.file || item, item.name || item.file?.name || 'upload'));
  } else {
    headers['Content-Type'] = 'application/json';
    body = JSON.stringify({ message, session_id: sessionId, model_key: selectedModelKey || undefined });
  }
  const response = await fetch(apiUrl('/api/chat/stream'), {
    method: 'POST',
    headers,
    body,
    signal,
  });
  if (!response.ok || !response.body) {
    let message = `SSE 连接失败 (${response.status})`;
    try {
      const contentType = response.headers.get('content-type') || '';
      const payload = contentType.includes('application/json') ? await response.json() : await response.text();
      message = formatApiError(payload, response.status);
    } catch {
      // Keep the transport-level message if the error payload cannot be parsed.
    }
    throw new Error(message);
  }
  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  const abortError = () => new DOMException('The operation was aborted.', 'AbortError');
  const cancelReader = () => {
    try {
      reader.cancel();
    } catch {
      // The reader may already be closed by the browser.
    }
  };
  if (signal?.aborted) {
    cancelReader();
    throw abortError();
  }
  signal?.addEventListener('abort', cancelReader, { once: true });
  let buffer = '';
  try {
    while (true) {
      if (signal?.aborted) throw abortError();
      const { done, value } = await reader.read();
      if (signal?.aborted) throw abortError();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
      const events = buffer.split('\n\n');
      buffer = events.pop() || '';
      for (const event of events) {
        if (signal?.aborted) throw abortError();
        const dataLine = event.split('\n').find(line => line.startsWith('data:'));
        if (!dataLine) continue;
        const raw = dataLine.slice(5).trim();
        if (raw === '[DONE]') continue;
        try {
          onEvent(JSON.parse(raw));
        } catch {
          // Ignore malformed SSE lines from interrupted streams.
        }
      }
    }
  } finally {
    signal?.removeEventListener('abort', cancelReader);
  }
}
