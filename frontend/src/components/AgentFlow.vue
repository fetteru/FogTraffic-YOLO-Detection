<script setup>
import { computed } from 'vue';
import StatusBadge from './StatusBadge.vue';
import { state } from '../state';

const active = computed(() => state.chat.agentFlow.some(item => item.status === 'running'));
const done = computed(() => state.chat.agentFlow.filter(item => item.status === 'done').length);
</script>

<template>
  <section class="panel agent-status-card">
    <div class="panel-title">
      <div>
        <strong>智能体调用流程</strong>
        <span>{{ active ? '正在执行' : '等待任务' }} · {{ done }}/{{ state.chat.agentFlow.length }}</span>
      </div>
      <StatusBadge status="healthy" />
    </div>
    <div class="agent-flow">
      <article v-for="(item, index) in state.chat.agentFlow" :key="item.id" :class="['agent-step', item.status]">
        <i>{{ index + 1 }}</i>
        <div>
          <strong>{{ item.label }}</strong>
          <p>{{ item.detail }}</p>
        </div>
        <span>{{ item.status === 'done' ? '完成' : item.status === 'running' ? '运行中' : item.status === 'error' ? '异常' : '待命' }}</span>
      </article>
    </div>
    <div class="flow-note">Supervisor 负责路由；Detection、QA/RAG、Analysis 可按任务并行执行，最终由 Summarize 汇总。</div>
  </section>
</template>
