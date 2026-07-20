<script setup>
import { computed } from 'vue';
import { classLabel } from '../utils/detection';

const props = defineProps({
  result: { type: Object, required: true },
  embedded: { type: Boolean, default: false },
});

const hasMedia = computed(() => Boolean(props.result.videoUrl || props.result.preview));
const counts = computed(() => Object.entries(props.result.counts || {}));
const totalLabel = computed(() => props.result.videoUrl && props.result.uniqueVehicleCount !== null ? '去重车辆' : '目标');
const riskReasons = computed(() => props.result.risk?.reasons?.join('；') || '暂无明显风险');

function countBarWidth(count) {
  return `${Math.max(8, Number(count || 0) * 7)}px`;
}
</script>

<template>
  <div :class="['detection-detail', embedded ? 'embedded' : '', hasMedia ? 'video-detail' : 'summary-only-detail']">
    <div class="detail-preview" v-if="hasMedia">
      <video v-if="result.videoUrl" :src="result.videoUrl" controls playsinline preload="metadata"></video>
      <img v-else :src="result.preview" :alt="result.filename" />
      <div class="preview-toolbar">
        <span>backend result</span>
        <span>{{ Number(result.inference || 0).toFixed(1) }} ms</span>
      </div>
    </div>

    <div class="detail-summary video-side-panel">
      <div class="summary-head">
        <div>
          <strong>{{ result.filename }}</strong>
          <span>{{ result.model }}</span>
        </div>
        <span class="object-total">{{ Number(result.total || 0).toLocaleString() }}<small>{{ totalLabel }}</small></span>
      </div>
      <div class="summary-metrics">
        <div><span>置信度</span><strong>{{ Number(result.confidence || 0).toFixed(2) }}</strong></div>
        <div><span>IoU</span><strong>{{ Number(result.iou || 0).toFixed(2) }}</strong></div>
        <div><span>类别</span><strong>{{ counts.length }}</strong></div>
        <div><span>耗时</span><strong>{{ Number(result.inference || 0).toFixed(1) }}ms</strong></div>
        <div v-if="result.sampledTotal"><span>采样检测</span><strong>{{ Number(result.sampledTotal).toLocaleString() }}次</strong></div>
      </div>
      <div class="class-stats">
        <div v-for="[name, count] in counts" :key="name">
          <span>{{ classLabel(name) }}</span>
          <div><i :style="{ width: countBarWidth(count) }"></i></div>
          <strong>{{ count }}</strong>
        </div>
      </div>
    </div>

    <div v-if="result.risk" class="risk-box">
      <div>
        <strong>雨雾交通风险</strong>
        <span>{{ result.risk.risk_level ?? 0 }}级 · {{ result.risk.risk_name || '正常' }}</span>
      </div>
      <p>{{ riskReasons }}</p>
      <pre v-if="result.report">{{ result.report }}</pre>
    </div>

    <div v-if="result.frameStats?.length" class="video-frame-table">
      <table class="data-table compact">
        <thead><tr><th>Frame</th><th>Time</th><th>Objects</th><th>Classes</th></tr></thead>
        <tbody>
          <tr v-for="frame in result.frameStats.slice(0, 12)" :key="frame.frame_number || frame.frame">
            <td>{{ frame.frame_number ?? frame.frame }}</td>
            <td>{{ frame.frame_time ?? frame.time }}</td>
            <td>{{ frame.total_objects ?? frame.objects ?? frame.detections?.length ?? 0 }}</td>
            <td>{{ frame.classes || Object.entries(frame.class_counts || {}).map(([k,v]) => `${k}: ${v}`).join(', ') }}</td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
</template>
