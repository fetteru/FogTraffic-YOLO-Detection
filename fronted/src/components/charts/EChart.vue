<script setup>
import { onBeforeUnmount, onMounted, ref, watch } from 'vue';
import * as echarts from 'echarts';
import { appStore } from '../../stores/app.js';

const props = defineProps({
  option: { type: Object, required: true },
  height: { type: String, default: '300px' }
});
const root = ref();
let chart;
let observer;

const lightColorMap = new Map([
  ['#8fa4bf', '#607786'],
  ['#70849e', '#718591'],
  ['#a8bad0', '#526a78'],
  ['#93a8c2', '#617786'],
  ['#eef6ff', '#233846'],
  ['rgba(148,181,226,.18)', 'rgba(55,92,110,.18)'],
  ['rgba(148,181,226,.08)', 'rgba(55,92,110,.10)'],
  ['rgba(7,16,31,.94)', 'rgba(249,252,252,.96)'],
  ['rgba(56,189,248,.2)', 'rgba(43,138,163,.24)']
]);

function cloneWithTheme(value) {
  if (Array.isArray(value)) return value.map(cloneWithTheme);
  if (!value || typeof value !== 'object') {
    return appStore.theme === 'light' && typeof value === 'string'
      ? (lightColorMap.get(value) || value)
      : value;
  }
  return Object.fromEntries(Object.entries(value).map(([key, item]) => [key, cloneWithTheme(item)]));
}

function themedOption() {
  const option = cloneWithTheme(props.option);
  if (appStore.theme === 'light') {
    option.color ||= ['#2b8aa3', '#6878b5', '#d29160', '#4d9a82', '#b87588'];
    option.textStyle = { color: '#536c79', ...(option.textStyle || {}) };
  }
  return option;
}

const render = () => {
  if (!chart) return;
  chart.setOption(themedOption(), true);
};

onMounted(() => {
  chart = echarts.init(root.value);
  render();
  observer = new ResizeObserver(() => chart?.resize());
  observer.observe(root.value);
});
watch(() => props.option, render, { deep: true });
watch(() => appStore.theme, render);
onBeforeUnmount(() => { observer?.disconnect(); chart?.dispose(); });
</script>
<template><div ref="root" class="chart-box" :style="{ height }"></div></template>
