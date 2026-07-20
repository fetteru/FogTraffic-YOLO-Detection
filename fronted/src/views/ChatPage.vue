<script setup>
import { nextTick, reactive, ref } from 'vue';
import { Delete, Download, Aim, Coin, Files, Cpu, Paperclip, Promotion, Check, Monitor, Setting } from '@element-plus/icons-vue';
import AiCoreIcon from '../components/common/AiCoreIcon.vue';
import { authStore } from '../stores/auth.js';
import { platformStore } from '../stores/platform.js';
const input=ref('');const scroll=ref();const messages=reactive([{role:'assistant',content:'你好，我是 **车辆检测智能体**。本演示聚焦雨雾/暗光增强、YOLOv11 车辆检测、ByteTrack 多目标跟踪、ROI 车道划分、车速与车流统计，以及四级拥堵自动预警。你可以上传图片或视频开始体验。',time:'09:42'}]);
function renderMarkdown(text){return text.replace(/\*\*([^*]+)\*\*/g,'<strong>$1</strong>').replace(/\n/g,'<br>')}
async function send(){const text=input.value.trim();if(!text)return;messages.push({role:'user',content:text,time:new Date().toLocaleTimeString('zh-CN',{hour:'2-digit',minute:'2-digit'})});input.value='';await nextTick();scroll.value.scrollTop=scroll.value.scrollHeight;setTimeout(()=>{messages.push({role:'assistant',content:'已收到你的请求。当前为 Vue 3 演示前端，我会调用车辆检测工具并返回车辆类别、数量、速度、车流密度和拥堵等级。',time:new Date().toLocaleTimeString('zh-CN',{hour:'2-digit',minute:'2-digit'})});nextTick(()=>scroll.value.scrollTop=scroll.value.scrollHeight)},550)}
function keydown(e){if(e.key==='Enter'&&!e.shiftKey){e.preventDefault();send()}}
</script>
<template>
  <div class="chat-page-grid vue-page">
    <section class="chat-main panel">
      <div class="chat-header"><div><span class="online-dot"></span><strong>目标检测智能体</strong><small>自然语言通道 · SSE 流式响应</small></div><div class="chat-header-actions"><button class="btn btn-ghost btn-sm" @click="messages.splice(0)"><el-icon><Delete/></el-icon>清空会话</button><button class="btn btn-ghost btn-sm"><el-icon><Download/></el-icon>导出</button></div></div>
      <div ref="scroll" class="chat-scroll">
        <div v-for="(message,index) in messages" :key="index" class="chat-message" :class="message.role">
          <div v-if="message.role==='assistant'" class="avatar bot-avatar"><AiCoreIcon :size="38" compact/></div>
          <div class="chat-bubble" :class="message.role==='user'?'user-bubble':'assistant-bubble'">
            <div v-if="message.role==='assistant'" class="message-author"><strong>FogTraffic-YOLO-Detection</strong><span>YOLOv11 智能体</span></div>
            <div class="markdown-body" v-html="renderMarkdown(message.content)"></div><div class="message-actions"><time>{{message.time}}</time></div>
          </div>
          <div v-if="message.role==='user'" class="avatar user-avatar">{{authStore.state.user.displayName.slice(0,1)}}</div>
        </div>
      </div>
      <div class="chat-composer-wrap">
        <div class="quick-actions"><button><el-icon><Aim/></el-icon><span>单图检测</span><small>直接调用 API</small></button><button><el-icon><Coin/></el-icon><span>批量检测</span><small>多图并行处理</small></button><button><el-icon><Files/></el-icon><span>ZIP 检测</span><small>自动解压分析</small></button><router-link custom to="/app/training" v-slot="{navigate}"><button @click="navigate"><el-icon><Cpu/></el-icon><span>训练状态</span><small>查看实时指标</small></button></router-link></div>
        <div class="chat-composer"><button class="composer-icon"><el-icon><Paperclip/></el-icon></button><textarea v-model="input" rows="1" placeholder="输入消息，或拖拽图片 / 视频到这里…" @keydown="keydown"></textarea><button class="send-button" :disabled="!input.trim()" @click="send"><el-icon><Promotion/></el-icon><span>发送</span></button></div><div class="composer-hint"><span>Enter 发送 · Shift + Enter 换行</span><span>快捷检测在 LLM 不可用时仍可工作</span></div>
      </div>
    </section>
    <aside class="agent-side">
      <section class="panel agent-status-card"><div class="panel-title"><div><strong>Agent 运行状态</strong><span>ReAct 调度器</span></div><span class="status-badge status-success"><i></i>健康</span></div><div class="agent-core"><div class="agent-core-orbit"><AiCoreIcon :size="76" status/></div><div><strong>3 个工具已就绪</strong><p>意图识别、工具调用与结果整理均正常</p></div></div><div class="tool-list"><div><el-icon><Aim/></el-icon><span><strong>detect_single</strong><small>单图目标检测</small></span><i class="tool-ready"></i></div><div><el-icon><Coin/></el-icon><span><strong>detect_batch</strong><small>多图批量检测</small></span><i class="tool-ready"></i></div><div><el-icon><Files/></el-icon><span><strong>detect_video</strong><small>视频目标跟踪</small></span><i class="tool-ready"></i></div></div></section>
      <section class="panel trace-card"><div class="panel-title"><div><strong>执行轨迹</strong><span>最近 Agent 事件</span></div></div><div class="trace-list"><article><i class="trace-dot system"></i><div><strong>Agent 就绪</strong><p>ReAct Agent 与 3 个检测工具已绑定</p><small>刚刚</small></div></article><article><i class="trace-dot tool"></i><div><strong>模型已加载</strong><p>{{platformStore.settings.defaultModel}}</p><small>1 分钟前</small></div></article></div></section>
      <section class="panel context-card"><div class="panel-title"><div><strong>当前上下文</strong><span>会话配置</span></div></div><div class="context-row"><span>默认模型</span><strong>{{platformStore.settings.defaultModel}}</strong></div><div class="context-row"><span>置信度阈值</span><strong>{{platformStore.settings.confidence.toFixed(2)}}</strong></div><div class="context-row"><span>IoU 阈值</span><strong>{{platformStore.settings.iou.toFixed(2)}}</strong></div><div class="context-row"><span>传输方式</span><strong>SSE Stream</strong></div></section>
    </aside>
  </div>
</template>
