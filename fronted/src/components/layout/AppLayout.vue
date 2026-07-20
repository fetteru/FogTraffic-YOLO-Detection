<script setup>
import { RouterView } from 'vue-router';
import Sidebar from './Sidebar.vue';
import Topbar from './Topbar.vue';
import ParticleCanvas from '../gesture/ParticleCanvas.vue';
import { appStore } from '../../stores/app.js';
import { gestureStore } from '../../stores/gesture.js';
</script>
<template>
  <div class="app-layout" :class="{ 'sidebar-collapsed': appStore.sidebarCollapsed }">
    <div v-if="gestureStore.transition.phase!=='idle' || gestureStore.previewNumber" class="app-ambient-layer is-morphing"><ParticleCanvas mode="ambient"/></div>
    <Sidebar/>
    <div class="mobile-overlay" :class="{visible:appStore.mobileNavOpen}" @click="appStore.mobileNavOpen=false"></div>
    <main class="main-shell"><Topbar/><section class="content-area" id="page-content"><RouterView v-slot="{Component}"><Transition name="route-fade" mode="out-in"><component :is="Component"/></Transition></RouterView></section></main>
  </div>
</template>
