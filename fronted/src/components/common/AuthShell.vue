<script setup>
import { Sunny, Moon } from '@element-plus/icons-vue';
import LogoMark from './LogoMark.vue';
import { appStore } from '../../stores/app.js';
defineProps({ title: String, subtitle: String });
</script>
<template>
  <main class="auth-page">
    <section class="auth-visual">
      <div class="auth-grid-lines"></div>
      <div class="auth-brand"><LogoMark/><div><strong>FogTraffic-YOLO-Detection</strong><span>YOLOv11 目标检测智能体平台</span></div></div>
      <div class="auth-copy">
        <div class="hero-pill"><i></i> Agent + YOLOv11 + SSE</div>
        <h1>让目标检测从<br><em>模型工具</em>升级为<span class="auth-nowrap">智能体</span></h1>
        <p>覆盖数据集准备、模型训练、评估导出、图片 / 视频 / 摄像头检测与实时日志监控的完整<span class="auth-nowrap">闭环。</span></p>
        <div class="auth-feature-grid">
          <article><strong>3</strong><span>检测通道</span><small>图片 / 视频 / 摄像头</small></article>
          <article><strong>9</strong><span>业务模块</span><small>手势快速导航</small></article>
          <article><strong>SSE</strong><span>流式对话</span><small>可中断、可降级</small></article>
        </div>
      </div>
      <div class="auth-orbit orbit-a"></div><div class="auth-orbit orbit-b"></div>
      <div class="auth-console"><div class="console-top"><span></span><span></span><span></span><small>agent.trace</small></div><p><b>09:42:16</b> intent → detect_traffic_video</p><p><b>09:42:16</b> tool → YOLOv11 + ByteTrack</p><p><b>09:42:17</b> result → 14 vehicles · 42.8ms</p><div class="console-line"></div></div>
    </section>
    <section class="auth-panel">
      <button class="theme-fab" @click="appStore.toggleTheme()"><el-icon><Sunny v-if="appStore.theme==='dark'"/><Moon v-else/></el-icon></button>
      <div class="auth-card"><div class="auth-card-head"><LogoMark class="mobile-logo"/><h2>{{ title }}</h2><p>{{ subtitle }}</p></div><slot/></div>
    </section>
  </main>
</template>
