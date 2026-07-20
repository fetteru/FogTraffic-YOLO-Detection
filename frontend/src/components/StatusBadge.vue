<script setup>
defineProps({ status: { type: String, default: 'healthy' } });

const map = {
  running: ['运行中', 'running'],
  completed: ['已完成', 'success'],
  queued: ['排队中', 'neutral'],
  stopped: ['已停止', 'warning'],
  failed: ['失败', 'danger'],
  healthy: ['健康', 'success'],
  warning: ['警告', 'warning'],
  degraded: ['降级', 'warning'],
  unhealthy: ['异常', 'danger'],
};
</script>

<template>
  <span :class="['status-badge', `status-${(map[status] || [status, 'neutral'])[1]}`]">
    <i></i>{{ (map[status] || [status, 'neutral'])[0] }}
  </span>
</template>
