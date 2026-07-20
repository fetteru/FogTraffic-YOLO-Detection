import { reactive } from 'vue';

const metrics = Array.from({ length: 72 }, (_, i) => {
  const epoch = i + 1;
  const p = epoch / 72;
  return {
    epoch,
    boxLoss: +(2.1 * Math.exp(-3.1 * p) + .22 + Math.sin(epoch / 5) * .02).toFixed(3),
    clsLoss: +(2.7 * Math.exp(-3.5 * p) + .18 + Math.cos(epoch / 6) * .025).toFixed(3),
    dflLoss: +(1.25 * Math.exp(-2.6 * p) + .31).toFixed(3),
    precision: +(Math.min(.94, .28 + p * .65)).toFixed(3),
    recall: +(Math.min(.91, .24 + p * .65)).toFixed(3),
    map50: +(Math.min(.79, .79 * (.14 + p * .86))).toFixed(3),
    map5095: +(Math.min(.545, .545 * (.1 + p * .9))).toFixed(3)
  };
});

export const platformStore = reactive({
  datasets: [
    { id: 1, name: 'Traffic-Vehicle', scene: '智慧交通', format: 'YOLO', images: 3268, labels: 3268, classes: ['car','truck','bus','person'], quality: 96, status: 'ready', size: '3.8 GB' },
    { id: 2, name: 'Night-Traffic', scene: '工业交通', format: 'YOLO', images: 1880, labels: 1872, classes: ['oiltank','building','vehicle'], quality: 89, status: 'warning', size: '2.1 GB' },
    { id: 3, name: 'Steel-Defect', scene: '工业质检', format: 'COCO', images: 5420, labels: 5420, classes: ['scratch','dent','crack'], quality: 92, status: 'converting', size: '5.6 GB' },
    { id: 4, name: 'Urban-Road', scene: '智慧交通', format: 'VOC', images: 2740, labels: 2718, classes: ['car','truck','bus','bicycle'], quality: 94, status: 'ready', size: '4.2 GB' }
  ],
  tasks: [
    { id: 101, name: '车辆检测增强模型 v3', model: 'yolov11s', dataset: 'Traffic-Vehicle', status: 'completed', progress: 100, epoch: 120, epochs: 120, map50: .873 },
    { id: 102, name: '工业缺陷精调', model: 'yolov11n', dataset: 'Steel-Defect', status: 'running', progress: 72, epoch: 72, epochs: 100, map50: .681 },
    { id: 103, name: '道路车辆夜间增强', model: 'yolov11m', dataset: 'Night-Traffic', status: 'running', progress: 35, epoch: 28, epochs: 80, map50: .492 },
    { id: 104, name: '油罐场景基线', model: 'yolov11n', dataset: 'Night-Traffic', status: 'queued', progress: 0, epoch: 0, epochs: 60, map50: 0 }
  ],
  selectedTaskId: 102,
  metrics,
  history: Array.from({ length: 18 }, (_, i) => ({
    id: `H${20260717001 + i}`, type: ['单图检测','批量检测','ZIP 检测','模型评估'][i % 4],
    source: i % 3 === 0 ? `batch_${i + 1}.zip` : `traffic_${String(i + 1).padStart(3, '0')}.jpg`,
    model: i % 2 ? 'yolov11s-traffic-v3.2' : 'yolov11n-steel-v1.4', total: 5 + (i * 7) % 32,
    duration: 31 + (i * 11) % 89, status: i === 8 ? 'failed' : 'completed', time: `2026-07-${String(17 - Math.floor(i / 6)).padStart(2,'0')} ${String(9 + i % 8).padStart(2,'0')}:${String((i * 7) % 60).padStart(2,'0')}`
  })),
  services: [
    { name: 'Application', key: 'application', latency: 3, message: '应用服务正常' },
    { name: 'PostgreSQL', key: 'database', latency: 16, message: '连接池正常' },
    { name: 'Redis', key: 'redis', latency: 5, message: '缓存服务正常' },
    { name: 'MinIO', key: 'minio', latency: 24, message: '对象存储正常' },
    { name: 'YOLOv11', key: 'yolo', latency: 41, message: '推理服务就绪' }
  ],
  logs: [
    ['INFO','application','FogTraffic Vue 前端已初始化'],['INFO','database','PostgreSQL 连接池状态正常'],['INFO','redis','Redis 缓存服务响应 5ms'],['INFO','minio','MinIO 对象存储响应 24ms'],['INFO','agent','已注册 detect_single / detect_batch / detect_zip'],['WARN','dataset','Night-Traffic 发现 8 个缺失标注文件']
  ].map((x,i)=>({level:x[0],module:x[1],message:x[2],time:`09:${String(42-i).padStart(2,'0')}:${String(16+i*3).padStart(2,'0')}`})),
  settings: { apiBase: '', demoFallback: true, defaultModel: 'yolov11s-traffic-v3.2', confidence: .25, iou: .45, pollInterval: 5, compact: false, notifications: true, autoSave: true }
});
