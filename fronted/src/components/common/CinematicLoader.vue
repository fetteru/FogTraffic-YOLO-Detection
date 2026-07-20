<script setup>
import { onBeforeUnmount, onMounted, ref } from 'vue';
const visible = ref(true);
const leaving = ref(false);
const progress = ref(0);

let raf = 0;
let finishTimer = 0;
let startedAt = 0;
let lastPaint = 0;

function finish() {
  if (!visible.value || leaving.value) return;
  progress.value = 100;
  leaving.value = true;
  finishTimer = window.setTimeout(() => {
    visible.value = false;
    document.body.classList.remove('cinematic-intro-active');
  }, 920);
}

function tick(time) {
  if (!startedAt) startedAt = time;
  const elapsed = time - startedAt;
  const normalized = Math.min(1, elapsed / 2350);
  if (time - lastPaint >= 50 || normalized >= 1) {
    progress.value = Math.min(100, Math.round((1 - Math.pow(1 - normalized, 2.6)) * 100));
    lastPaint = time;
  }
  if (elapsed >= 2850) {
    finish();
    return;
  }
  raf = requestAnimationFrame(tick);
}

onMounted(() => {
  if (!visible.value) return;
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    visible.value = false;
    return;
  }
  document.body.classList.add('cinematic-intro-active');
  raf = requestAnimationFrame(tick);
});

onBeforeUnmount(() => {
  cancelAnimationFrame(raf);
  clearTimeout(finishTimer);
  document.body.classList.remove('cinematic-intro-active');
});
</script>

<template>
  <Transition name="loader-remove">
    <div
      v-if="visible"
      class="cinematic-loader"
      :class="{ 'is-leaving': leaving }"
      role="status"
      aria-live="polite"
      aria-label="FogTraffic 正在载入"
      @click="finish"
    >
      <div class="cinematic-loader-paper">
        <div class="loader-mark" aria-hidden="true">
          <i class="loader-face loader-face--left"></i>
          <i class="loader-face loader-face--right"></i>
          <i class="loader-face loader-face--top"></i>
        </div>
        <div class="loader-wordmark">
          <strong>FogTraffic</strong>
          <span>INTELLIGENT VISION SYSTEM</span>
        </div>
        <div class="loader-progress"><b>{{ String(progress).padStart(3, '0') }}</b><i></i><span>LOADING</span></div>
      </div>
      <div class="loader-curtain" aria-hidden="true">
        <span>VISION · RESILIENT · INTELLIGENT</span>
      </div>
    </div>
  </Transition>
</template>
