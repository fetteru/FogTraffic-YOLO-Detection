<script setup>
import { computed, nextTick, onBeforeUnmount, ref, watch } from 'vue';
import { Aim, Upload, VideoCamera, Files, Delete, Download, Check, Operation, Close, Camera, Switch, CircleCheck } from '@element-plus/icons-vue';
import { ElMessage } from 'element-plus';
import PageHeader from '../components/common/PageHeader.vue';
import { platformStore } from '../stores/platform.js';
import { demoScene } from '../utils/demoImage.js';
import { acquireCamera, releaseCamera } from '../utils/cameraManager.js';

const mode=ref('single');
const files=ref([]);
const running=ref(false);
const result=ref(null);
const input=ref(null);
const cameraVideo=ref(null);
const cameraCanvas=ref(null);
const cameraActive=ref(false);
const cameraStarting=ref(false);
const cameraMirror=ref(true);
const cameraError=ref('');
let cameraStream=null;
const saveAnnotated=ref(true);
const confidencePercent=computed({get:()=>Math.round(platformStore.settings.confidence*100),set:value=>platformStore.settings.confidence=value/100});
const iouPercent=computed({get:()=>Math.round(platformStore.settings.iou*100),set:value=>platformStore.settings.iou=value/100});
const preview=computed(()=>files.value[0]?.preview||demoScene('fog-traffic'));

function choose(){input.value?.click()}
function selected(e){
  cleanupFiles();
  files.value=[...e.target.files].slice(0,mode.value==='batch'?20:1).map(file=>({file,name:file.name,size:file.size,preview:file.type.startsWith('image/')?URL.createObjectURL(file):demoScene(file.name)}));
  result.value=null;
}
function removeFile(index){const file=files.value[index];if(file?.preview?.startsWith('blob:'))URL.revokeObjectURL(file.preview);files.value.splice(index,1)}
function cleanupFiles(){files.value.forEach(file=>{if(file.preview?.startsWith('blob:'))URL.revokeObjectURL(file.preview)})}
function cameraErrorMessage(error){if(!window.isSecureContext)return'摄像头只能在 localhost 或 HTTPS 页面中使用';if(error?.name==='NotAllowedError')return'权限被拒绝，请在地址栏的网站权限中允许摄像头';if(error?.name==='NotFoundError')return'没有检测到可用摄像头';if(error?.name==='NotReadableError')return'摄像头可能正被其他程序占用';return error?.message||'摄像头启动失败'}
async function connectCamera(){mode.value='camera';await nextTick();await startCamera()}
async function startCamera(){
  if(cameraActive.value)return;
  cameraStarting.value=true;cameraError.value='';
  try{
    cameraStream=await acquireCamera('detection-page');
    if(!cameraVideo.value)throw new Error('摄像头预览尚未加载');
    cameraVideo.value.srcObject=cameraStream;
    await cameraVideo.value.play();
    cameraActive.value=true;
    ElMessage.success('摄像头已连接，默认使用镜像预览');
  }catch(error){cameraError.value=cameraErrorMessage(error);ElMessage.error(cameraError.value)}
  finally{cameraStarting.value=false}
}
function stopCamera(){releaseCamera('detection-page');cameraStream=null;if(cameraVideo.value)cameraVideo.value.srcObject=null;cameraActive.value=false;cameraError.value=''}
function captureCameraFrame(){
  const video=cameraVideo.value,canvas=cameraCanvas.value;
  if(!video||!canvas||video.readyState<2)return demoScene('camera-fallback');
  const w=video.videoWidth||1280,h=video.videoHeight||720;canvas.width=w;canvas.height=h;const c=canvas.getContext('2d');
  if(cameraMirror.value){c.translate(w,0);c.scale(-1,1)}
  c.drawImage(video,0,0,w,h);return canvas.toDataURL('image/jpeg',.9)
}
function loadDemo(){mode.value='single';files.value=[{name:'foggy_urban_road_001.jpg',size:2480000,preview:demoScene('demo-road')}];result.value=null}
async function detect(){
  if(mode.value==='camera'&&!cameraActive.value){await startCamera();if(!cameraActive.value)return}
  if(mode.value!=='camera'&&!files.value.length){ElMessage.warning('请先选择图片或视频');return}
  running.value=true;await new Promise(resolve=>setTimeout(resolve,850));
  result.value={image:mode.value==='camera'?captureCameraFrame():preview.value,total:18,inference:42.8,counts:{轿车:10,货车:4,公交车:2,摩托车:2},speed:46.2,flow:836,congestion:'缓行',source:mode.value==='camera'?'USB Camera Live':files.value[0]?.name};
  running.value=false;ElMessage.success('检测完成');
}
watch(mode,value=>{result.value=null;if(value!=='camera')stopCamera()});
onBeforeUnmount(()=>{stopCamera();cleanupFiles()});
</script>
<template>
  <div class="page-stack vue-page detection-page-v2">
    <PageHeader title="交通检测工作台" description="支持图片、视频与 USB 摄像头实时检测，融合增强、车辆识别、ByteTrack 跟踪与交通统计。">
      <button class="btn btn-ghost" @click="loadDemo"><el-icon><Aim/></el-icon>加载示例</button>
      <button class="btn btn-primary" @click="choose"><el-icon><Upload/></el-icon>选择文件</button>
      <button class="btn btn-ghost" @click="connectCamera"><el-icon><VideoCamera/></el-icon>连接摄像头</button>
    </PageHeader>

    <div class="segmented-tabs detection-mode-tabs">
      <button :class="{active:mode==='single'}" @click="mode='single'"><el-icon><Aim/></el-icon>图片 / 视频</button>
      <button :class="{active:mode==='camera'}" @click="mode='camera'"><el-icon><VideoCamera/></el-icon>USB 摄像头</button>
      <button :class="{active:mode==='batch'}" @click="mode='batch'"><el-icon><Files/></el-icon>批量 / ZIP</button>
    </div>
    <input ref="input" hidden type="file" :multiple="mode==='batch'" accept="image/*,video/*,.zip" @change="selected">

    <div class="detection-layout">
      <section class="panel detection-control">
        <div class="panel-title"><div><strong>输入与参数</strong><span>{{mode==='camera'?'实时摄像头输入':'JPG / PNG / MP4 / ZIP'}}</span></div><span class="status-badge" :class="cameraActive&&mode==='camera'?'status-success':'status-neutral'"><i></i>{{cameraActive&&mode==='camera'?'摄像头在线':'等待输入'}}</span></div>
        <div v-if="mode!=='camera'" class="drop-zone" :class="{'has-files':files.length}" @click="choose" @dragover.prevent @drop.prevent="selected({target:{files:$event.dataTransfer.files}})">
          <div v-if="files.length" class="file-stack"><article v-for="(file,index) in files" :key="file.name"><img :src="file.preview" alt=""><div><strong>{{file.name}}</strong><span>{{(file.size/1024/1024).toFixed(2)}} MB</span></div><button @click.stop="removeFile(index)"><el-icon><Delete/></el-icon></button></article></div>
          <template v-else><el-icon class="drop-icon"><Upload/></el-icon><strong>拖拽文件到这里</strong><p>或点击选择图片 / 视频</p><span>单文件不超过 50 MB</span></template>
        </div>
        <div v-else class="camera-box-v2">
          <div class="camera-stage">
            <video v-show="cameraActive" ref="cameraVideo" :class="{mirrored:cameraMirror}" playsinline muted></video>
            <div v-if="!cameraActive" class="camera-placeholder"><span class="camera-placeholder-icon"><el-icon><VideoCamera/></el-icon></span><strong>{{cameraStarting?'正在请求摄像头权限…':'USB 摄像头实时输入'}}</strong><p>{{cameraError||'点击“开启摄像头”，浏览器将弹出权限请求。'}}</p></div>
            <div v-else class="camera-live-badge"><i></i>LIVE · {{cameraMirror?'镜像预览':'原始方向'}}</div>
          </div>
          <canvas ref="cameraCanvas" hidden></canvas>
          <div class="camera-actions">
            <button v-if="!cameraActive" class="btn btn-primary btn-sm" :disabled="cameraStarting" @click="startCamera"><span v-if="cameraStarting" class="spinner"></span><el-icon v-else><Camera/></el-icon>{{cameraStarting?'连接中…':'开启摄像头'}}</button>
            <button v-else class="btn btn-danger btn-sm" @click="stopCamera"><el-icon><Close/></el-icon>关闭摄像头</button>
            <button v-if="cameraActive" class="btn btn-ghost btn-sm" @click="cameraMirror=!cameraMirror"><el-icon><Switch/></el-icon>{{cameraMirror?'切回原始方向':'开启镜像预览'}}</button>
          </div>
          <div class="camera-direction-tip"><el-icon><CircleCheck/></el-icon>默认开启镜像预览；切换方向时截图与检测坐标会同步调整。</div>
        </div>

        <div class="detection-settings-v2">
          <label class="setting-control"><span>检测模型</span><el-select v-model="platformStore.settings.defaultModel" size="large"><el-option label="YOLOv11s Traffic v3.2" value="yolov11s-traffic-v3.2"/><el-option label="YOLOv11n Steel v1.4" value="yolov11n-steel-v1.4"/><el-option label="YOLOv11m Traffic v2.0" value="yolov11m-traffic-v2.0"/></el-select></label>
          <label class="setting-control"><span>置信度阈值 <b>{{platformStore.settings.confidence.toFixed(2)}}</b></span><el-slider v-model="confidencePercent" :min="5" :max="95" :step="5" :show-tooltip="false"/></label>
          <label class="setting-control"><span>IoU 阈值 <b>{{platformStore.settings.iou.toFixed(2)}}</b></span><el-slider v-model="iouPercent" :min="10" :max="90" :step="5" :show-tooltip="false"/></label>
          <el-checkbox v-model="saveAnnotated" class="save-result-check">保存标注结果</el-checkbox>
        </div>
        <button class="btn btn-primary btn-block detection-start-button" :disabled="running" @click="detect"><span v-if="running" class="spinner"></span><el-icon v-else><Operation/></el-icon>{{running?'正在推理…':'开始检测'}}</button>
      </section>

      <section class="panel detection-workspace">
        <div class="panel-title"><div><strong>检测结果</strong><span>目标框、跟踪 ID 与交通指标</span></div><span v-if="result" class="status-badge status-success"><i></i>已完成</span></div>
        <div v-if="!result" class="empty-state detection-empty"><el-icon class="empty-icon"><Aim/></el-icon><h3>等待检测任务</h3><p>{{mode==='camera'?'开启摄像头后点击“开始检测”，这里将截取当前画面并展示检测结果。':'上传图片或视频并点击“开始检测”，这里将显示结果。'}}</p></div>
        <div v-else class="detection-detail">
          <div class="detail-preview"><img :src="result.image" alt="检测结果"><span v-for="(box,index) in 8" :key="box" class="det-box" :style="{left:`${8+(index*11)%72}%`,top:`${14+(index*17)%55}%`,width:`${9+(index%3)*3}%`,height:`${10+(index%2)*5}%`}"><b>vehicle {{(0.91-index*.025).toFixed(2)}}</b></span><div class="preview-toolbar"><span>1280 × 720 · {{result.source}}</span><span>{{result.inference}} ms</span></div></div>
          <div class="detail-summary"><div class="summary-head"><div><strong>{{result.source}}</strong><span>{{platformStore.settings.defaultModel}}</span></div><span class="object-total">{{result.total}}<small>目标</small></span></div><div class="summary-metrics"><div><span>平均车速</span><strong>{{result.speed}} km/h</strong></div><div><span>小时流量</span><strong>{{result.flow}}</strong></div><div><span>拥堵等级</span><strong>{{result.congestion}}</strong></div><div><span>推理耗时</span><strong>{{result.inference}} ms</strong></div></div><div class="class-stats"><div v-for="(count,name) in result.counts" :key="name" class="class-stat-v2"><span>{{name}}</span><i><b :style="{width:`${count/result.total*100}%`}"></b></i><strong>{{count}}</strong></div></div><div class="detail-actions"><button class="btn btn-ghost"><el-icon><Download/></el-icon>下载标注图</button><button class="btn btn-primary"><el-icon><Check/></el-icon>保存到历史</button></div></div>
        </div>
      </section>
    </div>
  </div>
</template>
