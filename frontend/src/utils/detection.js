import { api, apiUrl } from '../services/api';
import { state } from '../state';

export const DETECTION_FILE_ACCEPTS = {
  single: 'image/*,.jpg,.jpeg,.png,.bmp,.webp',
  batch: 'image/*,.jpg,.jpeg,.png,.bmp,.webp',
  video: 'video/*,.mp4,.avi,.mov,.mkv,.wmv,.flv,.webm',
  zip: '.zip,application/zip,application/x-zip-compressed',
  attach: 'image/*,video/*,.jpg,.jpeg,.png,.bmp,.webp,.mp4,.avi,.mov,.mkv,.wmv,.flv,.webm,.zip,application/zip,application/x-zip-compressed',
};

const IMAGE_EXTENSIONS = new Set(['.jpg', '.jpeg', '.png', '.bmp', '.webp']);
const VIDEO_EXTENSIONS = new Set(['.mp4', '.avi', '.mov', '.mkv', '.wmv', '.flv', '.webm']);

export function fileItems(files) {
  return [...(files || [])].map(file => ({
    file,
    name: file.name,
    size: file.size,
    type: file.type || (file.name.toLowerCase().endsWith('.zip') ? 'application/zip' : ''),
    preview: file.type?.startsWith('image/') || file.type?.startsWith('video/') ? URL.createObjectURL(file) : '',
  }));
}

function fileExtension(item = {}) {
  const name = (item.name || item.file?.name || '').toLowerCase();
  const index = name.lastIndexOf('.');
  return index >= 0 ? name.slice(index) : '';
}

export function isImageUpload(item) {
  return item?.type?.startsWith('image/') || IMAGE_EXTENSIONS.has(fileExtension(item));
}

export function isVideoUpload(item) {
  return item?.type?.startsWith('video/') || VIDEO_EXTENSIONS.has(fileExtension(item));
}

export function isZipUpload(item) {
  const type = item?.type || '';
  return fileExtension(item) === '.zip' || type.includes('zip');
}

export function isAllowedDetectionFile(item, mode) {
  if (mode === 'single' || mode === 'batch') return isImageUpload(item);
  if (mode === 'video') return isVideoUpload(item);
  if (mode === 'zip') return isZipUpload(item);
  if (mode === 'attach') return isImageUpload(item) || isVideoUpload(item) || isZipUpload(item);
  return true;
}

export function classLabel(name) {
  return {
    car: '汽车',
    truck: '卡车',
    bus: '公交车',
    person: '行人',
    motorcycle: '摩托车',
    motorbike: '摩托车',
    bicycle: '自行车',
    aircraft: '飞机',
    oiltank: '油罐',
    ship: '船舶',
    vehicle: '车辆',
  }[name] || name;
}

function normalizeMediaUrl(value) {
  if (!value || typeof value !== 'string') return '';
  if (/^(data:|blob:|https?:\/\/)/i.test(value)) return value;
  return value.startsWith('/') ? apiUrl(value) : value;
}

export function normalizeDetection(payload = {}, fileItem = {}, mode = 'single', index = 0) {
  const analysis = payload.rain_fog_analysis || {};
  const counts = payload.unique_class_counts || analysis.traffic?.unique_class_counts || payload.class_counts || {};
  const isVideo = mode === 'video' || Boolean(payload.video_url || payload.annotated_video_url);
  const rawPreview = isVideo
    ? (payload.annotated_video_url || payload.video_url || payload.local_video_url || fileItem.preview || '')
    : (payload.annotated_image || fileItem.preview || '');
  const preview = normalizeMediaUrl(rawPreview);
  const selectedModel = state.settings.models.find(item => item.key === state.settings.selectedModelKey);
  const fallbackModel = selectedModel?.name || selectedModel?.model_name || state.settings.defaultModel || '未指定模型';
  return {
    id: payload.task_id || `${mode}_${Date.now()}_${index}`,
    filename: payload.filename || fileItem.name || `result_${index + 1}`,
    mode,
    model: typeof payload.model === 'object'
      ? (payload.model.name || payload.model.model_name || payload.model.key)
      : (payload.model || fallbackModel),
    modelKey: typeof payload.model === 'object' ? payload.model.key : '',
    total: Number(payload.total_objects ?? payload.total ?? 0),
    counts,
    boxes: payload.detections || [],
    confidence: Number(payload.confidence ?? 0.25),
    iou: Number(payload.iou ?? 0.45),
    inference: Number(payload.inference_time ?? payload.processing_time ?? 0),
    preview,
    videoUrl: isVideo ? preview : '',
    risk: analysis.risk || null,
    report: analysis.report || '',
    visibility: analysis.visibility || null,
    traffic: analysis.traffic || null,
    frameStats: payload.frame_stats || payload.sampled_frames || [],
    uniqueVehicleCount: analysis.traffic?.unique_vehicle_count ?? payload.unique_vehicle_count ?? null,
    sampledTotal: analysis.traffic?.sampled_vehicle_instances ?? payload.sampled_vehicle_instances ?? 0,
  };
}

function abortError() {
  return new DOMException('The operation was aborted.', 'AbortError');
}

function wait(ms, signal) {
  if (signal?.aborted) return Promise.reject(abortError());
  return new Promise((resolve, reject) => {
    const timer = setTimeout(resolve, ms);
    signal?.addEventListener('abort', () => {
      clearTimeout(timer);
      reject(abortError());
    }, { once: true });
  });
}

export async function pollVideo(taskId, signal) {
  for (;;) {
    await wait(1200, signal);
    const status = await api(`/api/detection/video/status/${taskId}`, { method: 'GET', timeout: 30000, signal });
    if (status.status === 'completed') return status.result;
    if (status.status === 'failed') throw new Error(status.error || '视频检测失败');
  }
}

export async function detectFiles(mode, items, options = {}) {
  const first = items[0];
  const firstName = first?.name || '';
  const isVideo = mode === 'video' || (mode === 'single' && (first?.type?.startsWith('video/') || /\.(mp4|avi|mov|mkv|wmv|flv)$/i.test(firstName)));
  const endpoint = isVideo ? '/api/detection/video' : mode === 'zip' ? '/api/detection/zip' : mode === 'batch' ? '/api/detection/batch' : '/api/detection/single';
  const form = new FormData();
  form.append('conf', String(options.confidence ?? 0.25));
  form.append('iou', String(options.iou ?? 0.45));
  if (options.selectedModelKey) form.append('model_key', options.selectedModelKey);
  if (options.modelVersionId) form.append('model_version_id', String(options.modelVersionId));
  if (isVideo) {
    form.append('sample_interval', String(options.sampleInterval ?? 5));
    form.append('max_frames', '0');
    form.append('file', first.file);
  } else if (mode === 'batch') {
    items.forEach(item => form.append('files', item.file));
  } else {
    form.append('file', first.file);
  }
  const response = await api(endpoint, {
    method: 'POST',
    body: form,
    headers: { 'X-File-Name': encodeURIComponent(firstName || 'upload') },
    timeout: isVideo ? 300000 : 120000,
    signal: options.signal,
  });
  const payload = isVideo ? await pollVideo(response.task_id, options.signal) : response;
  const list = payload.items || payload.results;
  if (Array.isArray(list)) {
    return list.map((item, index) => {
      const sourceItem = mode === 'batch' ? items[index] : {};
      return normalizeDetection(item, sourceItem, mode, index);
    });
  }
  return [normalizeDetection(payload, first, isVideo ? 'video' : mode, 0)];
}
