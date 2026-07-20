<script setup>
defineProps({
  title: { type: String, required: true },
  subtitle: { type: String, default: '' },
});
</script>

<template>
  <section class="workspace-page">
    <div class="page-title"><div><h1>{{ title }}</h1><p>{{ subtitle }}</p></div></div>
    <section class="panel">
      <div class="empty-state">
        <strong>Vue 页面已接入</strong>
        <p>该模块保留入口，后续可继续拆成独立组件并接入更完整的后端数据。</p>
      </div>
    </section>
  </section>
</template>
