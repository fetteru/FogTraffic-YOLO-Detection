<script setup>
import { RouterView } from 'vue-router';
import MouseGlow from './components/common/MouseGlow.vue';
import GlobalGestureEngine from './components/gesture/GlobalGestureEngine.vue';
</script>

<template>
  <RouterView />
  <MouseGlow />
  <GlobalGestureEngine />
</template>
