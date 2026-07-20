<script setup>
import { onBeforeUnmount, onMounted, ref, watch } from 'vue';
import { gestureStore } from '../../stores/gesture.js';

const layer = ref(null);
const glow = ref(null);
const core = ref(null);
const active = ref(false);
const interactive = ref(false);
const pressed = ref(false);
const source = ref('none');

let raf = 0;
let mouseEnabled = false;
let reducedMotion = false;
let targetX = 0;
let targetY = 0;
let speed = 0;
let renderedSpeed = 0;
let lastX = 0;
let lastY = 0;
let lastTime = 0;
let lastMouseInputAt = 0;
let mousePressed = false;
let finePointerMedia;
let reducedMotionMedia;
let stopGestureWatch;

const clamp = (value, min, max) => Math.max(min, Math.min(max, value));
const interactiveSelector = 'button, a, input, select, textarea, label, [role="button"], [tabindex]:not([tabindex="-1"]), .el-slider';

function setActive(value) {
  if (active.value !== value) active.value = value;
}

function setInteractive(value) {
  if (interactive.value !== value) interactive.value = value;
}

function setSource(value) {
  if (source.value === value) return;
  source.value = value;
  document.documentElement.classList.toggle('gesture-pointer-active', value === 'hand');
}

function scheduleRender() {
  if (!raf) raf = requestAnimationFrame(render);
}

function render() {
  raf = 0;
  renderedSpeed += (speed - renderedSpeed) * (reducedMotion ? 1 : 0.34);
  speed *= reducedMotion ? 0 : 0.76;

  const haloScale = 1 + renderedSpeed * 0.18 + (interactive.value ? 0.08 : 0) - (pressed.value ? 0.08 : 0);
  const coreScale = 1 + renderedSpeed * 0.07 + (interactive.value ? 0.12 : 0) - (pressed.value ? 0.16 : 0);
  glow.value?.style.setProperty(
    'transform',
    `translate3d(${targetX}px, ${targetY}px, 0) scale(${Math.max(.72, haloScale).toFixed(3)})`
  );
  core.value?.style.setProperty(
    'transform',
    `translate3d(${targetX}px, ${targetY}px, 0) scale(${Math.max(.62, coreScale).toFixed(3)})`
  );
  layer.value?.style.setProperty('--mouse-glow-speed', renderedSpeed.toFixed(3));

  if (renderedSpeed > 0.008 || speed > 0.008) scheduleRender();
}

function getLatestPoint(event) {
  const samples = typeof event.getCoalescedEvents === 'function' ? event.getCoalescedEvents() : null;
  return samples?.length ? samples[samples.length - 1] : event;
}

function updatePosition(x, y, now, target) {
  const elapsed = Math.max(1, now - (lastTime || now));
  const distance = Math.hypot(x - lastX, y - lastY);
  targetX = x;
  targetY = y;
  speed = clamp(distance / elapsed / 1.55, 0, 1);
  lastX = x;
  lastY = y;
  lastTime = now;

  setActive(true);
  setInteractive(Boolean(target instanceof Element && target.closest(interactiveSelector)));
  scheduleRender();
}

function pointerMove(event) {
  if (!mouseEnabled || event.pointerType === 'touch') return;

  const point = getLatestPoint(event);
  const now = performance.now();
  lastMouseInputAt = now;
  mousePressed = Boolean(event.buttons & 1);
  setSource('mouse');
  pressed.value = mousePressed;
  updatePosition(point.clientX, point.clientY, now, event.target);
}

function pointerDown(event) {
  if (!mouseEnabled || event.pointerType === 'touch') return;
  lastMouseInputAt = performance.now();
  mousePressed = true;
  setSource('mouse');
  pressed.value = true;
  speed = Math.max(speed, 0.62);
  scheduleRender();
}

function pointerUp() {
  mousePressed = false;
  if (source.value === 'mouse') pressed.value = false;
}

function syncHandCursor() {
  const cursor = gestureStore.cursor;
  if (!gestureStore.active || !cursor?.visible) {
    if (source.value === 'hand') hideGlow();
    return;
  }

  const now = performance.now();
  // A real mouse movement temporarily wins control. Continued hand tracking
  // takes over again after the mouse has been idle for a brief moment.
  if (source.value === 'mouse' && now - lastMouseInputAt < 520) return;

  const x = clamp(cursor.x, 0, 1) * innerWidth;
  const y = clamp(cursor.y, 0, 1) * innerHeight;
  setSource('hand');
  pressed.value = Boolean(cursor.pinching);
  updatePosition(x, y, now, document.elementFromPoint(x, y));
}

function hideGlow() {
  setActive(false);
  setInteractive(false);
  setSource('none');
  mousePressed = false;
  pressed.value = false;
  speed = 0;
}

function pointerOut(event) {
  if (event.relatedTarget) return;
  if (gestureStore.active && gestureStore.cursor?.visible) syncHandCursor();
  else hideGlow();
}

function visibilityChange() {
  if (document.hidden) hideGlow();
}

function syncPointerCapability() {
  mouseEnabled = Boolean(finePointerMedia?.matches);
  if (!mouseEnabled && source.value === 'mouse') hideGlow();
}

function syncMotionPreference() {
  reducedMotion = Boolean(reducedMotionMedia?.matches);
}

onMounted(() => {
  finePointerMedia = window.matchMedia('(any-pointer: fine)');
  reducedMotionMedia = window.matchMedia('(prefers-reduced-motion: reduce)');
  syncPointerCapability();
  syncMotionPreference();

  stopGestureWatch = watch(
    () => [
      gestureStore.active,
      gestureStore.cursor?.visible,
      gestureStore.cursor?.x,
      gestureStore.cursor?.y,
      gestureStore.cursor?.pinching
    ],
    syncHandCursor,
    { flush: 'sync' }
  );

  finePointerMedia.addEventListener?.('change', syncPointerCapability);
  reducedMotionMedia.addEventListener?.('change', syncMotionPreference);
  document.addEventListener('pointermove', pointerMove, { passive: true, capture: true });
  document.addEventListener('pointerdown', pointerDown, { passive: true, capture: true });
  document.addEventListener('pointerup', pointerUp, { passive: true, capture: true });
  document.addEventListener('pointercancel', hideGlow, { passive: true, capture: true });
  document.addEventListener('pointerout', pointerOut, { passive: true, capture: true });
  document.addEventListener('visibilitychange', visibilityChange);
  window.addEventListener('blur', hideGlow, { passive: true });
});

onBeforeUnmount(() => {
  cancelAnimationFrame(raf);
  stopGestureWatch?.();
  document.documentElement.classList.remove('gesture-pointer-active');
  finePointerMedia?.removeEventListener?.('change', syncPointerCapability);
  reducedMotionMedia?.removeEventListener?.('change', syncMotionPreference);
  document.removeEventListener('pointermove', pointerMove, true);
  document.removeEventListener('pointerdown', pointerDown, true);
  document.removeEventListener('pointerup', pointerUp, true);
  document.removeEventListener('pointercancel', hideGlow, true);
  document.removeEventListener('pointerout', pointerOut, true);
  document.removeEventListener('visibilitychange', visibilityChange);
  window.removeEventListener('blur', hideGlow);
});
</script>

<template>
  <div
    ref="layer"
    class="mouse-glow-layer"
    :class="{
      'is-active': active,
      'is-interactive': interactive,
      'is-pressed': pressed,
      'is-hand-source': source === 'hand'
    }"
    aria-hidden="true"
  >
    <span ref="glow" class="mouse-glow"></span>
    <span ref="core" class="mouse-glow-core"></span>
  </div>
</template>
