<script setup>
import { computed, onBeforeUnmount, onMounted, ref } from 'vue';
import { useRouter } from 'vue-router';
import { ChatDotRound, Aim, FolderOpened, Cpu, DataAnalysis, TrendCharts, Clock, Monitor, Setting, VideoCamera, View, Switch, Right } from '@element-plus/icons-vue';
import ParticleCanvas from '../components/gesture/ParticleCanvas.vue';
import AiCoreIcon from '../components/common/AiCoreIcon.vue';
import { gestureStore } from '../stores/gesture.js';
import { authStore } from '../stores/auth.js';

const router=useRouter();
const dragging=ref(false);
const progress=ref(0);
let startX=0,keyboardTimer=0;
const activeDigit=computed(()=>gestureStore.transition.number||gestureStore.number);
const morphing=computed(()=>gestureStore.transition.phase!=='idle');
const modules=[
  {number:1,name:'智能对话',desc:'Agent 对话与工具调度',route:'chat',icon:ChatDotRound},
  {number:2,name:'交通检测',desc:'图片、视频与摄像头',route:'detection',icon:Aim},
  {number:3,name:'数据集管理',desc:'标注、转换与质检',route:'datasets',icon:FolderOpened},
  {number:4,name:'模型训练',desc:'任务编排与指标曲线',route:'training',icon:Cpu},
  {number:5,name:'模型评估',desc:'精度、召回与混淆矩阵',route:'evaluation',icon:DataAnalysis},
  {number:6,name:'数据看板',desc:'交通态势与业务趋势',route:'dashboard',icon:TrendCharts},
  {number:7,name:'任务历史',desc:'检测结果与运行记录',route:'history',icon:Clock},
  {number:8,name:'系统监控',desc:'服务健康与运行日志',route:'monitoring',icon:Monitor},
  {number:9,name:'系统设置',desc:'模型、接口与偏好配置',route:'settings',icon:Setting}
];
function enter(){router.push('/login')}
function register(){router.push('/register')}
function goModule(item){if(authStore.isAuthenticated.value)router.push({name:item.route});else router.push({name:'login',query:{redirect:`/app/${item.route}`}})}
function down(e){dragging.value=true;startX=e.clientX;progress.value=0;e.currentTarget.setPointerCapture?.(e.pointerId)}
function move(e){if(!dragging.value)return;progress.value=Math.min(100,Math.max(0,(e.clientX-startX)/250*100));if(progress.value>84){dragging.value=false;gestureStore.pulse();enter()}}
function up(){dragging.value=false;setTimeout(()=>progress.value=0,260)}

function previewDigit(event){
  if(event.ctrlKey||event.metaKey||event.altKey||event.repeat)return;
  const number=Number(event.key);
  if(number<1||number>9)return;
  clearTimeout(keyboardTimer);
  gestureStore.showDigitPreview(number);
  gestureStore.confidence=1;
  gestureStore.status=`数字 ${number} · 粒子数字预览`;
  keyboardTimer=setTimeout(()=>{
    if(!gestureStore.active){gestureStore.clearDigitPreview();gestureStore.confidence=0;gestureStore.status='鼠标 / 触控模式'}
  },1800);
}
onMounted(()=>addEventListener('keydown',previewDigit));
onBeforeUnmount(()=>{removeEventListener('keydown',previewDigit);clearTimeout(keyboardTimer)});

</script>
<template>
  <section id="gesture-experience" :class="['gesture-experience is-intro gesture-home-v2',{'is-particle-morphing':morphing}]">
    <ParticleCanvas mode="hero"/>
    <div class="gesture-aurora"></div><div class="gesture-vignette"></div><div class="gesture-grid"></div><div class="gesture-scanline"></div>
    <header class="gesture-brand"><div class="gesture-brand-mark"><i></i><span></span></div><div><strong>FOGTRAFFIC · GESTURE VISION</strong><small>Vue 3 Intelligent Traffic Workspace</small></div></header>
    <div class="gesture-status enhanced"><span class="gesture-status-dot" :class="{'is-live':gestureStore.active,'is-error':gestureStore.error}"></span><div><small>{{gestureStore.systemStatus}}</small><strong>{{gestureStore.status}}</strong></div><i class="gesture-confidence"><b :style="{width:`${gestureStore.confidence*100}%`}"></b></i></div>

    <div class="gesture-intro-copy">
      <p class="gesture-kicker">CAMERA · PARTICLES · NINE ROUTES</p>
      <h1><span>挥动手掌，</span><em>进入智能交通视觉空间</em></h1>
      <p>从屏幕左侧向右挥动，进入登录 / 注册页面。登录后保持手势控制开启，即可用数字 1–9 跳转九个业务模块；1–5 为单手，6–9 可用双手手指数相加。</p>
      <div class="gesture-intro-actions">
        <button class="gesture-primary-action" @click="gestureStore.start()"><el-icon><VideoCamera/></el-icon>{{gestureStore.active?'摄像头已开启':'启动手势控制'}}</button>
        <button v-if="gestureStore.active" class="gesture-secondary-action" @click="gestureStore.togglePreview()"><el-icon><View/></el-icon>{{gestureStore.preview?'隐藏摄像头':'显示摄像头'}}</button>
        <button class="gesture-secondary-action" @click="enter"><el-icon><Right/></el-icon>登录</button>
        <button class="gesture-secondary-action register-direct-action" @click="register">直接注册</button>
      </div>
      <div class="gesture-direction-row"><span><el-icon><Switch/></el-icon>当前摄像头方向：{{gestureStore.mirror?'镜像预览':'原始方向（不左右翻转）'}}</span><button v-if="gestureStore.active" @click="gestureStore.toggleMirror()">切换方向</button></div>
      <small class="gesture-privacy">摄像头图像只在当前浏览器中处理，不会上传。首次加载手势模型需要网络连接。</small>
      <p v-if="gestureStore.error" class="gesture-error-inline">{{gestureStore.error}}</p>
    </div>

    <Transition name="digit-pop"><div v-if="activeDigit" class="gesture-digit-indicator particle-lock-chip"><i></i><div><span>GESTURE {{activeDigit}}</span><small>{{morphing?'数字导航已识别':'三维粒子形态预览'}}</small></div></div></Transition>
    <div class="particle-field-telemetry"><span><i></i>3D PARTICLE FIELD</span><span>MORPH 1—9</span><span>按键 1–9 可预览</span></div>

    <div class="gesture-module-panel">
      <div class="gesture-module-head"><div><span class="module-eyebrow">DIGITAL GESTURE ROUTES</span><strong>九模块手势导航</strong></div><AiCoreIcon :size="58"/></div>
      <div class="gesture-module-ring">
        <button v-for="item in modules" :key="item.number" :class="{recognized:activeDigit===item.number}" @click="goModule(item)">
          <b>{{item.number}}</b><el-icon><component :is="item.icon"/></el-icon><span>{{item.name}}</span><small>{{item.desc}}</small><i></i>
        </button>
      </div>
      <div class="gesture-module-help"><span>稳定识别数字后自动进入对应模块</span><span v-if="activeDigit">当前数字：{{activeDigit}}</span><span v-else>也可按键 1–9 预览粒子数字</span></div>
    </div>

    <div class="gesture-edge-zone" :class="{'is-dragging':dragging}" role="button" tabindex="0" @pointerdown="down" @pointermove="move" @pointerup="up" @pointercancel="up" @keydown.enter="enter"><span class="edge-pulse"></span><span class="edge-arrow">›</span><div><strong>从这里向右挥动</strong><small>进入登录 / 注册页面</small></div><i :style="{width:`${progress}%`}"></i></div>
  </section>
</template>
