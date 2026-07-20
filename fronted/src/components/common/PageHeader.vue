<script setup>
defineProps({ title: String, description: String });
</script>
<template>
  <div class="page-heading">
    <div><div class="eyebrow">YOLOv11 · Agent Workspace</div><h1>{{ title }}</h1><p>{{ description }}</p></div>
    <div class="page-heading-actions"><slot /></div>
  </div>
</template>
