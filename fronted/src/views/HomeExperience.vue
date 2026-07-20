<script setup>
import { computed, onBeforeUnmount, onMounted, ref } from 'vue';
import LoginPanel from '../components/views/LoginPanel.vue';
import CinematicLoader from '../components/common/CinematicLoader.vue';

const scene = ref(null);
const stage = ref(null);
const currentProgress = ref(0);

let raf = 0;
let targetProgress = 0;
let smoothProgress = 0;
let previousTime = 0;
let pointerTargetX = 0;
let pointerTargetY = 0;
let pointerX = 0;
let pointerY = 0;
let resizeObserver = null;

const loginReady = computed(() => currentProgress.value > 0.78);

const clamp = (value, min = 0, max = 1) => Math.max(min, Math.min(max, value));
const smoothstep = (from, to, value) => {
  const x = clamp((value - from) / Math.max(0.0001, to - from));
  return x * x * (3 - 2 * x);
};

function measureProgress() {
  if (!scene.value) return;
  const rect = scene.value.getBoundingClientRect();
  const distance = Math.max(1, rect.height - window.innerHeight);
  targetProgress = clamp(-rect.top / distance);
}

function applyProgress(value) {
  if (!stage.value) return;
  const morph = smoothstep(0.04, 0.42, value);
  const galleryIn = smoothstep(0.16, 0.43, value);
  const galleryOut = smoothstep(0.53, 0.73, value);
  const gallery = galleryIn * (1 - galleryOut);
  const login = smoothstep(0.56, 0.94, value);
  const heroCopy = smoothstep(0.05, 0.24, value);
  const accessTitle = galleryIn * (1 - smoothstep(0.5, 0.7, value));

  stage.value.style.setProperty('--p', value.toFixed(5));
  stage.value.style.setProperty('--morph', morph.toFixed(5));
  stage.value.style.setProperty('--gallery', gallery.toFixed(5));
  stage.value.style.setProperty('--login', login.toFixed(5));
  stage.value.style.setProperty('--hero-copy-out', heroCopy.toFixed(5));
  stage.value.style.setProperty('--access-title', accessTitle.toFixed(5));
  stage.value.style.setProperty('--px', pointerX.toFixed(5));
  stage.value.style.setProperty('--py', pointerY.toFixed(5));
  currentProgress.value = value;
}

function frame(time) {
  const dt = Math.min(0.05, Math.max(0.001, (time - previousTime) / 1000 || 0.016));
  previousTime = time;
  const follow = 1 - Math.exp(-dt * 8.8);
  const pointerFollow = 1 - Math.exp(-dt * 6.5);
  smoothProgress += (targetProgress - smoothProgress) * follow;
  pointerX += (pointerTargetX - pointerX) * pointerFollow;
  pointerY += (pointerTargetY - pointerY) * pointerFollow;
  applyProgress(smoothProgress);
  raf = requestAnimationFrame(frame);
}

function pointerMove(event) {
  pointerTargetX = clamp(event.clientX / Math.max(1, window.innerWidth), 0, 1) - 0.5;
  pointerTargetY = clamp(event.clientY / Math.max(1, window.innerHeight), 0, 1) - 0.5;
}

function scrollToAccess() {
  if (!scene.value) return;
  const rect = scene.value.getBoundingClientRect();
  const pageTop = window.scrollY + rect.top;
  const target = pageTop + Math.max(0, rect.height - window.innerHeight) * 0.96;
  window.scrollTo({ top: target, behavior: 'smooth' });
}

function scrollToHero() {
  if (!scene.value) return;
  const rect = scene.value.getBoundingClientRect();
  window.scrollTo({ top: window.scrollY + rect.top, behavior: 'smooth' });
}

onMounted(() => {
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    targetProgress = 1;
    smoothProgress = 1;
    applyProgress(1);
    return;
  }
  measureProgress();
  window.addEventListener('scroll', measureProgress, { passive: true });
  window.addEventListener('resize', measureProgress, { passive: true });
  window.addEventListener('pointermove', pointerMove, { passive: true });
  resizeObserver = new ResizeObserver(measureProgress);
  if (scene.value) resizeObserver.observe(scene.value);
  raf = requestAnimationFrame(frame);
});

onBeforeUnmount(() => {
  cancelAnimationFrame(raf);
  resizeObserver?.disconnect();
  window.removeEventListener('scroll', measureProgress);
  window.removeEventListener('resize', measureProgress);
  window.removeEventListener('pointermove', pointerMove);
});
</script>

<template>
  <main class="experience-page cinematic-home">
    <CinematicLoader />
    <section ref="scene" class="cinematic-scroll-scene">
      <div ref="stage" class="cinematic-stage" :class="{ 'is-login-ready': loginReady }">
        <div class="cinematic-backdrop" aria-hidden="true">
          <div class="cinematic-grid"></div>
          <div class="cinematic-orbit cinematic-orbit--one"></div>
          <div class="cinematic-orbit cinematic-orbit--two"></div>
          <div class="cinematic-glow"></div>
        </div>

        <img
          class="cinematic-poster"
          src="/experience/home-hero-v17.webp"
          alt="FogTraffic-YOLO-Detection 雨雾高速车辆检测平台首页"
        >

        <nav class="cinematic-nav" aria-label="首页导航">
          <button class="cinematic-brand" type="button" @click="scrollToHero">
            <span>FT</span><strong>FOGTRAFFIC<br>ASSEMBLY</strong>
          </button>
          <div class="cinematic-nav-center"><span>PLATFORM</span><i></i><span>ACCESS</span></div>
          <button class="cinematic-enter" type="button" @click="scrollToAccess"><span>ENTER</span><i></i></button>
        </nav>

        <div class="cinematic-editorial" aria-hidden="true">
          <span>SELECTIVE</span>
          <strong>ACCESS</strong>
          <small>FOG-ROBUST VISION / REAL-TIME INTELLIGENCE</small>
        </div>

        <figure class="cinematic-object">
          <div class="cinematic-object-media">
            <img src="/experience/home-hero-v17.webp" alt="">
            <div class="cinematic-object-glass"></div>
          </div>
          <figcaption><span>01 / 02</span><strong>VEHICLE INTELLIGENCE CORE</strong><small>Commitment precedes entry</small></figcaption>
        </figure>

        <div class="cinematic-gallery" aria-hidden="true">
          <figure class="cinematic-card cinematic-card--a"><img src="/experience/scene-03.webp" alt=""><figcaption>LOW-LIGHT ROAD</figcaption></figure>
          <figure class="cinematic-card cinematic-card--b"><img src="/experience/scene-08.webp" alt=""><figcaption>REALTIME CORE</figcaption></figure>
          <figure class="cinematic-card cinematic-card--c"><img src="/experience/scene-11.webp" alt=""><figcaption>TRAFFIC FLOW</figcaption></figure>
          <figure class="cinematic-card cinematic-card--d"><img src="/experience/scene-15.webp" alt=""><figcaption>MODEL TRACE</figcaption></figure>
        </div>

        <button class="cinematic-explore-hotspot" type="button" aria-label="滚动进入登录界面" @click="scrollToAccess"></button>

        <section class="cinematic-login-portal" aria-label="系统登录">
          <div class="portal-index"><span>02</span><div><strong>SELECTIVE ACCESS</strong><small>AUTHORIZED OPERATORS ONLY</small></div></div>
          <div class="cinematic-login-card">
            <div class="auth-card-head">
              <p class="portal-kicker"><i></i> SECURE ENTRY</p>
              <h2>欢迎回来</h2>
              <p>登录后进入 YOLO 雨雾低光车辆检测智能体工作台</p>
            </div>
            <LoginPanel />
          </div>
          <button class="portal-back" type="button" @click="scrollToHero"><span>BACK TO OVERVIEW</span><i></i></button>
        </section>

        <div class="cinematic-scroll-cue" aria-hidden="true">
          <span>{{ loginReady ? 'ACCESS READY' : 'SCROLL TO EXPLORE' }}</span>
          <i><b></b></i>
          <small>{{ String(Math.round(currentProgress * 100)).padStart(2, '0') }}</small>
        </div>
      </div>
    </section>
  </main>
</template>
