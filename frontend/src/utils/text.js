export function escapeHtml(text) {
  return String(text ?? '').replace(/[&<>'"]/g, char => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    "'": '&#39;',
    '"': '&quot;',
  }[char]));
}

export function markdown(text) {
  return escapeHtml(text)
    .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
    .replace(/\n/g, '<br>');
}

export function formatTime(value) {
  return new Date(value || Date.now()).toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' });
}
