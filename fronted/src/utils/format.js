export const percent = value => `${Math.round(Number(value || 0) * 100)}%`;
export const number = value => Number(value || 0).toLocaleString('zh-CN');
export const statusText = status => ({ completed:'已完成',running:'训练中',queued:'排队中',failed:'失败',ready:'就绪',warning:'需修复',converting:'转换中' }[status] || status);
export const statusClass = status => ({ completed:'status-success',running:'status-running',queued:'status-neutral',failed:'status-danger',ready:'status-success',warning:'status-warning',converting:'status-running' }[status] || 'status-neutral');
