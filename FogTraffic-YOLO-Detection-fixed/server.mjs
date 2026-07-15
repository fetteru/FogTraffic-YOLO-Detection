import { randomUUID } from 'node:crypto';
import fs from 'node:fs';
import http from 'node:http';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.dirname(fileURLToPath(import.meta.url));
const port = Number(process.env.PORT || 4173);
const host = process.env.HOST || '0.0.0.0';

const mime = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
  '.csv': 'text/csv; charset=utf-8',
  '.txt': 'text/plain; charset=utf-8'
};

const startedAt = Date.now();
const users = new Map([
  ['admin', { id: 1, username: 'admin', display_name: '演示管理员', email: 'admin@rsod.local', role: 'admin' }]
]);

const tasks = [
  makeTask({ id: 101, name: '遥感飞机检测 v3', model: 'yolov11s', dataset: 'RSOD-Aircraft', device: 'cuda:0', epochs: 120, current: 120, status: 'completed', map50: 0.873 }),
  makeTask({ id: 102, name: '工业缺陷精调', model: 'yolov11n', dataset: 'Steel-Defect', device: 'cuda:0', epochs: 100, current: 72, status: 'running', map50: 0.681 }),
  makeTask({ id: 103, name: '道路车辆夜间增强', model: 'yolov11m', dataset: 'Night-Traffic', device: 'cpu', epochs: 80, current: 28, status: 'running', map50: 0.492 }),
  makeTask({ id: 104, name: '油罐场景基线', model: 'yolov11n', dataset: 'RSOD-Oiltank', device: 'cpu', epochs: 60, current: 0, status: 'queued', map50: 0 })
];

const logs = [];
for (const line of [
  ['INFO', 'application', 'RSOD Agent Platform demo API started'],
  ['INFO', 'database', 'PostgreSQL connection pool healthy'],
  ['INFO', 'redis', 'Redis cache connection healthy'],
  ['INFO', 'minio', 'MinIO object storage healthy'],
  ['INFO', 'training', 'Loaded 4 training tasks'],
  ['INFO', 'agent', 'Detection tools registered: single, batch, zip']
]) pushLog(...line);

function nowText() {
  return new Date().toISOString().replace('T', ' ').replace('Z', '').slice(0, 23);
}

function pushLog(level, module, message) {
  logs.unshift({ id: randomUUID(), time: nowText(), level, module, message });
  if (logs.length > 240) logs.length = 240;
}

function makeMetrics(epochs, map50 = 0.72) {
  const count = Math.max(1, Math.min(epochs, 120));
  return Array.from({ length: count }, (_, index) => {
    const e = index + 1;
    const p = e / count;
    return {
      epoch: e,
      box_loss: +(2.05 * Math.exp(-3.2 * p) + 0.23 + Math.sin(e / 4) * 0.025).toFixed(4),
      cls_loss: +(2.8 * Math.exp(-3.7 * p) + 0.18 + Math.cos(e / 5) * 0.03).toFixed(4),
      dfl_loss: +(1.35 * Math.exp(-2.8 * p) + 0.31).toFixed(4),
      precision: +(Math.min(0.94, 0.31 + p * 0.62 + Math.sin(e / 6) * 0.018)).toFixed(4),
      recall: +(Math.min(0.92, 0.27 + p * 0.61 + Math.cos(e / 7) * 0.018)).toFixed(4),
      map50: +(Math.max(0.03, map50 * (0.17 + p * 0.83) + Math.sin(e / 7) * 0.012)).toFixed(4),
      map50_95: +(Math.max(0.01, map50 * 0.68 * (0.12 + p * 0.88))).toFixed(4)
    };
  });
}

function makeTask(input) {
  const id = input.id ?? Math.floor(Math.random() * 90000 + 10000);
  const current = input.current ?? 0;
  const epochs = input.epochs ?? 100;
  const map50 = input.map50 ?? 0;
  return {
    id,
    task_uuid: `task_${String(id)}_${randomUUID().slice(0, 6)}`,
    name: input.name || `训练任务 ${id}`,
    model_name: input.model || 'yolov11n',
    dataset_name: input.dataset || 'RSOD-Aircraft',
    device: input.device || 'cpu',
    epochs,
    current_epoch: current,
    batch_size: input.batch_size || 16,
    image_size: input.image_size || 640,
    status: input.status || 'queued',
    progress: Math.round((current / epochs) * 100),
    created_at: input.created_at || new Date(Date.now() - id * 170000).toISOString(),
    updated_at: new Date().toISOString(),
    metrics: makeMetrics(current || 1, map50),
    best_map50: map50,
    exported: input.exported || false
  };
}

function taskView(task) {
  const latest = task.metrics.at(-1) || null;
  return {
    id: task.id,
    task_uuid: task.task_uuid,
    name: task.name,
    model_name: task.model_name,
    dataset_name: task.dataset_name,
    device: task.device,
    epochs: task.epochs,
    current_epoch: task.current_epoch,
    batch_size: task.batch_size,
    image_size: task.image_size,
    status: task.status,
    progress: task.progress,
    created_at: task.created_at,
    updated_at: task.updated_at,
    latest_metrics: latest,
    best_map50: task.best_map50,
    exported: task.exported
  };
}

function json(res, status, payload, extraHeaders = {}) {
  const body = JSON.stringify(payload);
  res.writeHead(status, {
    'Content-Type': 'application/json; charset=utf-8',
    'Content-Length': Buffer.byteLength(body),
    'Cache-Control': 'no-store',
    ...extraHeaders
  });
  res.end(body);
}

function ok(res, data, message = 'ok') {
  json(res, 200, { code: 200, message, data });
}

function error(res, status, message) {
  json(res, status, { code: status, message, detail: message });
}

async function readBody(req, max = 20 * 1024 * 1024) {
  const chunks = [];
  let size = 0;
  for await (const chunk of req) {
    size += chunk.length;
    if (size > max) throw new Error('请求体过大');
    chunks.push(chunk);
  }
  return Buffer.concat(chunks);
}

async function readJson(req) {
  const buf = await readBody(req);
  if (!buf.length) return {};
  const type = req.headers['content-type'] || '';
  if (type.includes('application/json')) return JSON.parse(buf.toString('utf8'));
  if (type.includes('application/x-www-form-urlencoded')) {
    return Object.fromEntries(new URLSearchParams(buf.toString('utf8')));
  }
  return { raw: buf, filename: req.headers['x-file-name'] || 'upload.jpg' };
}

function bearerUser(req) {
  const auth = String(req.headers.authorization || '');
  if (!auth.startsWith('Bearer ')) return users.get('admin');
  const token = auth.slice(7);
  const username = token.split('.')[0].replace('demo-', '') || 'admin';
  return users.get(username) || users.get('admin');
}

function evaluationFor(task) {
  const base = task.best_map50 || task.metrics.at(-1)?.map50 || 0.72;
  const classes = task.dataset_name.includes('Steel')
    ? ['scratch', 'dent', 'inclusion', 'patch', 'crack']
    : task.dataset_name.includes('Traffic')
      ? ['car', 'truck', 'bus', 'person', 'bicycle', 'traffic-light']
      : ['aircraft', 'oiltank', 'ship', 'vehicle', 'bridge', 'harbor'];
  const perClass = classes.map((name, index) => ({
    name,
    precision: +(Math.max(0.43, Math.min(0.96, base + 0.07 - index * 0.028 + Math.sin(index) * 0.02))).toFixed(3),
    recall: +(Math.max(0.39, Math.min(0.94, base + 0.02 - index * 0.025 + Math.cos(index) * 0.025))).toFixed(3),
    ap50: +(Math.max(0.42, Math.min(0.97, base + 0.06 - index * 0.035))).toFixed(3),
    ap50_95: +(Math.max(0.28, Math.min(0.82, base * 0.71 - index * 0.025))).toFixed(3)
  }));
  return {
    task_id: task.id,
    model_name: task.model_name,
    dataset_name: task.dataset_name,
    precision: +(Math.min(0.95, base + 0.034)).toFixed(3),
    recall: +(Math.min(0.93, base + 0.008)).toFixed(3),
    map50: +base.toFixed(3),
    map50_95: +(base * 0.69).toFixed(3),
    fitness: +(base * 0.74).toFixed(3),
    speed_ms: +(18 + (task.model_name.endsWith('m') ? 17 : task.model_name.endsWith('s') ? 9 : 3)).toFixed(1),
    per_class: perClass,
    generated_at: new Date().toISOString()
  };
}

function detectionPayload(mode = 'single', filename = 'demo.jpg') {
  const classCounts = mode === 'industrial'
    ? { scratch: 4, dent: 2, crack: 1 }
    : { aircraft: 5, oiltank: 3, vehicle: 4, ship: 2 };
  return {
    task_id: `det_${randomUUID().slice(0, 8)}`,
    mode,
    filename,
    model: 'yolov11s-rsod-v3.2',
    total_objects: Object.values(classCounts).reduce((a, b) => a + b, 0),
    class_counts: classCounts,
    confidence: 0.25,
    iou: 0.45,
    inference_time: +(42 + Math.random() * 18).toFixed(1),
    detections: Object.entries(classCounts).flatMap(([class_name, count], c) =>
      Array.from({ length: Math.min(count, 4) }, (_, index) => ({
        class_name,
        confidence: +(0.96 - c * 0.045 - index * 0.035).toFixed(3),
        bbox: [80 + c * 92 + index * 21, 56 + index * 48, 164 + c * 92 + index * 21, 132 + index * 48]
      }))
    ),
    created_at: new Date().toISOString()
  };
}

function routeMatch(pathname, pattern) {
  const names = [];
  const source = pattern.replace(/:[^/]+/g, token => {
    names.push(token.slice(1));
    return '([^/]+)';
  });
  const match = pathname.match(new RegExp(`^${source}$`));
  if (!match) return null;
  return Object.fromEntries(names.map((name, index) => [name, decodeURIComponent(match[index + 1])]));
}

function tickTasks() {
  for (const task of tasks) {
    if (task.status !== 'running') continue;
    if (task.current_epoch >= task.epochs) {
      task.status = 'completed';
      task.progress = 100;
      pushLog('INFO', 'training', `${task.task_uuid} completed; best mAP50=${task.best_map50.toFixed(3)}`);
      continue;
    }
    task.current_epoch += 1;
    task.progress = Math.round((task.current_epoch / task.epochs) * 100);
    const p = task.current_epoch / task.epochs;
    const target = task.dataset_name.includes('Steel') ? 0.79 : task.dataset_name.includes('Traffic') ? 0.75 : 0.86;
    const metric = makeMetrics(task.current_epoch, target).at(-1);
    task.metrics.push(metric);
    if (task.metrics.length > 140) task.metrics.shift();
    task.best_map50 = Math.max(task.best_map50, metric.map50);
    task.updated_at = new Date().toISOString();
    if (task.current_epoch % 5 === 0) {
      pushLog('INFO', 'training', `${task.task_uuid} epoch ${task.current_epoch}/${task.epochs} box=${metric.box_loss} mAP50=${metric.map50}`);
    }
  }
}
setInterval(tickTasks, 3500).unref();

async function handleApi(req, res, url) {
  const { pathname, searchParams } = url;
  const started = performance.now();
  const finishLog = status => pushLog(status >= 500 ? 'ERROR' : status >= 400 ? 'WARN' : 'INFO', 'request', `${req.method} ${pathname} status=${status} ${(performance.now() - started).toFixed(1)}ms`);

  try {
    if (req.method === 'GET' && pathname === '/api/health') {
      finishLog(200);
      return ok(res, { status: 'healthy', app_name: 'RSOD Agent Platform', version: '2.0.0', uptime_seconds: Math.floor((Date.now() - startedAt) / 1000) });
    }
    if (req.method === 'GET' && pathname === '/api/health/detail') {
      finishLog(200);
      return ok(res, {
        status: 'healthy',
        app_name: 'RSOD Agent Platform',
        version: '2.0.0',
        services: {
          application: { status: 'healthy', latency_ms: 3, message: 'Node demo API 正常' },
          database: { status: 'healthy', latency_ms: 16, message: 'PostgreSQL 连接正常（演示）' },
          redis: { status: 'healthy', latency_ms: 5, message: 'Redis 连接正常（演示）' },
          minio: { status: 'healthy', latency_ms: 24, message: 'MinIO 连接正常（演示）' },
          yolo: { status: 'healthy', latency_ms: 41, message: 'YOLOv11 推理服务就绪（演示）' }
        }
      });
    }
    if (req.method === 'POST' && pathname === '/api/auth/login') {
      const body = await readJson(req);
      const username = body.username || body.email || 'admin';
      const user = users.get(username) || users.get('admin');
      finishLog(200);
      return ok(res, { access_token: `demo-${user.username}.${randomUUID().slice(0, 8)}`, token_type: 'bearer', user }, '登录成功');
    }
    if (req.method === 'POST' && pathname === '/api/auth/register') {
      const body = await readJson(req);
      const username = body.username || String(body.email || `user${users.size + 1}`).split('@')[0];
      const user = { id: users.size + 1, username, display_name: body.display_name || body.full_name || username, email: body.email || `${username}@rsod.local`, role: 'user' };
      users.set(username, user);
      finishLog(200);
      return ok(res, user, '注册成功');
    }
    if (req.method === 'GET' && pathname === '/api/auth/me') {
      finishLog(200);
      return ok(res, bearerUser(req));
    }
    if (req.method === 'GET' && pathname === '/api/training/tasks') {
      finishLog(200);
      return ok(res, tasks.map(taskView));
    }
    if (req.method === 'POST' && pathname === '/api/training/start') {
      const body = await readJson(req);
      const task = makeTask({
        id: Math.max(...tasks.map(item => item.id)) + 1,
        name: body.name || body.task_name || `${body.dataset_name || body.dataset || '自定义数据集'} 训练`,
        model: body.model_name || 'yolov11n',
        dataset: body.dataset_name || body.dataset || 'RSOD-Aircraft',
        device: body.device || 'cpu',
        epochs: Number(body.epochs || 100),
        batch_size: Number(body.batch_size || 16),
        image_size: Number(body.image_size || 640),
        current: 1,
        status: 'running',
        map50: 0.09
      });
      tasks.unshift(task);
      pushLog('INFO', 'training', `Started ${task.task_uuid} model=${task.model_name} dataset=${task.dataset_name}`);
      finishLog(200);
      return ok(res, taskView(task), '训练任务已启动');
    }
    let params = routeMatch(pathname, '/api/training/status/:id');
    if (req.method === 'GET' && params) {
      const task = tasks.find(item => String(item.id) === params.id || item.task_uuid === params.id);
      if (!task) return error(res, 404, '训练任务不存在');
      finishLog(200);
      return ok(res, { ...taskView(task), is_running: task.status === 'running' });
    }
    params = routeMatch(pathname, '/api/training/metrics/:id');
    if (req.method === 'GET' && params) {
      const task = tasks.find(item => String(item.id) === params.id || item.task_uuid === params.id);
      if (!task) return error(res, 404, '训练任务不存在');
      finishLog(200);
      return ok(res, task.metrics);
    }
    params = routeMatch(pathname, '/api/training/stop/:id');
    if (req.method === 'POST' && params) {
      const task = tasks.find(item => String(item.id) === params.id || item.task_uuid === params.id);
      if (!task) return error(res, 404, '训练任务不存在');
      task.status = 'stopped';
      pushLog('WARN', 'training', `Stopped ${task.task_uuid} at epoch ${task.current_epoch}`);
      finishLog(200);
      return ok(res, taskView(task), '训练任务已停止');
    }
    params = routeMatch(pathname, '/api/training/results/:id');
    if (req.method === 'GET' && params) {
      const task = tasks.find(item => item.task_uuid === params.id || String(item.id) === params.id);
      if (!task) return error(res, 404, '训练任务不存在');
      const header = 'epoch,box_loss,cls_loss,dfl_loss,precision,recall,map50,map50_95\n';
      const rows = task.metrics.map(m => [m.epoch, m.box_loss, m.cls_loss, m.dfl_loss, m.precision, m.recall, m.map50, m.map50_95].join(',')).join('\n');
      const body = header + rows;
      finishLog(200);
      res.writeHead(200, {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="${task.task_uuid}-results.csv"`,
        'Content-Length': Buffer.byteLength(body)
      });
      return res.end(body);
    }
    params = routeMatch(pathname, '/api/training/validate/:id');
    if (req.method === 'POST' && params) {
      const task = tasks.find(item => String(item.id) === params.id || item.task_uuid === params.id);
      if (!task) return error(res, 404, '训练任务不存在');
      const report = evaluationFor(task);
      pushLog('INFO', 'evaluation', `Validated ${task.task_uuid}; mAP50=${report.map50}`);
      finishLog(200);
      return ok(res, report, '模型评估完成');
    }
    params = routeMatch(pathname, '/api/training/export/:id');
    if (req.method === 'POST' && params) {
      const task = tasks.find(item => String(item.id) === params.id || item.task_uuid === params.id);
      if (!task) return error(res, 404, '训练任务不存在');
      const body = await readJson(req);
      task.exported = true;
      const version = body.version || `v${new Date().getFullYear()}.${new Date().getMonth() + 1}.0`;
      pushLog('INFO', 'model', `Exported ${task.task_uuid} as ${version}`);
      finishLog(200);
      return ok(res, {
        task_id: task.id,
        model_name: body.model_name || task.name,
        version,
        format: body.format || 'pt',
        path: `models/${task.dataset_name.toLowerCase().replace(/[^a-z0-9]+/g, '-')}_${version}/best.${body.format || 'pt'}`,
        minio_url: body.upload_minio === false ? null : `minio://rsod-models/${task.task_uuid}/${version}`,
        created_at: new Date().toISOString()
      }, '模型导出成功');
    }
    params = routeMatch(pathname, '/api/training/download/:id');
    if (req.method === 'GET' && params) {
      const task = tasks.find(item => String(item.id) === params.id || item.task_uuid === params.id);
      if (!task) return error(res, 404, '训练任务不存在');
      const body = Buffer.from(`RSOD DEMO MODEL\nname=${task.name}\nmodel=${task.model_name}\ntask=${task.task_uuid}\nmap50=${task.best_map50}\n`);
      finishLog(200);
      res.writeHead(200, {
        'Content-Type': 'application/octet-stream',
        'Content-Disposition': `attachment; filename="${task.model_name}-${task.task_uuid}.pt"`,
        'Content-Length': body.length
      });
      return res.end(body);
    }
    if (req.method === 'POST' && pathname === '/api/training/predict') {
      await readBody(req);
      const data = detectionPayload('predict', req.headers['x-file-name'] || 'test-image.jpg');
      finishLog(200);
      return ok(res, data, '测试图验证完成');
    }
    if (req.method === 'POST' && ['/api/detection/single', '/api/detection/batch', '/api/detection/zip'].includes(pathname)) {
      await readBody(req);
      const mode = pathname.split('/').at(-1);
      const base = detectionPayload(mode, req.headers['x-file-name'] || `${mode}-upload.jpg`);
      const data = mode === 'single'
        ? base
        : { task_id: base.task_id, mode, total_files: mode === 'zip' ? 8 : 4, completed: mode === 'zip' ? 8 : 4, failed: 0, total_objects: base.total_objects * (mode === 'zip' ? 4 : 2), results: Array.from({ length: mode === 'zip' ? 8 : 4 }, (_, i) => detectionPayload(mode, `image_${String(i + 1).padStart(2, '0')}.jpg`)) };
      pushLog('INFO', 'detection', `${mode} detection completed; task=${base.task_id}`);
      finishLog(200);
      return ok(res, data, '检测完成');
    }
    params = routeMatch(pathname, '/api/detection/status/:id');
    if (req.method === 'GET' && params) {
      finishLog(200);
      return ok(res, { task_id: params.id, status: 'completed', progress: 100 });
    }
    if (req.method === 'POST' && pathname === '/api/chat/upload') {
      await readBody(req);
      finishLog(200);
      return ok(res, { file_path: `/tmp/uploads/${randomUUID().slice(0, 8)}-${req.headers['x-file-name'] || 'image.jpg'}` }, '上传成功');
    }
    if (req.method === 'POST' && pathname === '/api/chat/stream') {
      const body = await readJson(req);
      const text = String(body.message || body.content || '你好');
      res.writeHead(200, {
        'Content-Type': 'text/event-stream; charset=utf-8',
        'Cache-Control': 'no-cache, no-transform',
        Connection: 'keep-alive',
        'X-Accel-Buffering': 'no'
      });
      res.write(`data: ${JSON.stringify({ type: 'start', conversation_id: body.conversation_id || randomUUID() })}\n\n`);
      const needsDetect = /检测|识别|图片|图像|目标/.test(text) || Boolean(body.image_path || body.has_attachment);
      const sequence = [];
      if (needsDetect) {
        sequence.push({ type: 'tool_start', tool: 'detect_single_image', message: '正在调用 YOLOv11 检测工具…' });
        sequence.push({ type: 'tool_result', tool: 'detect_single_image', result: detectionPayload('single', body.filename || 'conversation-image.jpg') });
        sequence.push({ type: 'token', content: '检测已经完成。' });
        sequence.push({ type: 'token', content: '我在图像中识别到了多个目标，' });
        sequence.push({ type: 'token', content: '下面给出了类别统计、置信度与推理耗时。' });
      } else {
        const answer = '你好，我是车辆目标检测智能体。我可以通过自然语言调用单图、批量和 ZIP 检测工具，也可以协助查看训练进度、评估指标与模型导出状态。';
        for (const token of answer.match(/.{1,8}/g) || []) sequence.push({ type: 'token', content: token });
      }
      sequence.push({ type: 'done', message: 'completed' });
      let index = 0;
      const timer = setInterval(() => {
        if (index >= sequence.length) {
          clearInterval(timer);
          finishLog(200);
          res.end();
          return;
        }
        res.write(`data: ${JSON.stringify(sequence[index++])}\n\n`);
      }, 150);
      req.on('close', () => clearInterval(timer));
      return;
    }
    if (req.method === 'GET' && pathname === '/api/logs') {
      const level = searchParams.get('level');
      const module = searchParams.get('module');
      const q = (searchParams.get('q') || '').toLowerCase();
      const data = logs.filter(item => (!level || level === 'ALL' || item.level === level) && (!module || module === 'ALL' || item.module === module) && (!q || `${item.message} ${item.module}`.toLowerCase().includes(q))).slice(0, Number(searchParams.get('limit') || 120));
      finishLog(200);
      return ok(res, data);
    }
    if (req.method === 'DELETE' && pathname === '/api/logs') {
      logs.length = 0;
      pushLog('INFO', 'application', 'Log buffer cleared');
      finishLog(200);
      return ok(res, true, '日志已清空');
    }

    finishLog(404);
    return error(res, 404, `API 不存在: ${req.method} ${pathname}`);
  } catch (err) {
    pushLog('ERROR', 'application', `${req.method} ${pathname} failed: ${err.message}`);
    finishLog(500);
    return error(res, 500, err.message || '服务器内部错误');
  }
}

function serveStatic(req, res, pathname) {
  let safePath = decodeURIComponent(pathname);
  if (safePath === '/') safePath = '/index.html';
  let file = path.resolve(root, `.${safePath}`);
  if (!file.startsWith(root)) return error(res, 403, 'Forbidden');
  if (!fs.existsSync(file) || fs.statSync(file).isDirectory()) file = path.join(root, 'index.html');
  fs.readFile(file, (err, data) => {
    if (err) return error(res, 404, 'Not Found');
    const ext = path.extname(file).toLowerCase();
    res.writeHead(200, {
      'Content-Type': mime[ext] || 'application/octet-stream',
      'Cache-Control': ext === '.html' ? 'no-cache' : 'public, max-age=120'
    });
    res.end(data);
  });
}

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url || '/', `http://${req.headers.host || `localhost:${port}`}`);
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('Referrer-Policy', 'same-origin');
  if (url.pathname.startsWith('/api/')) return handleApi(req, res, url);
  return serveStatic(req, res, url.pathname);
});

server.listen(port, host, () => {
  console.log(`\nRSOD Agent Platform is running:`);
  console.log(`  Local:   http://localhost:${port}`);
  console.log(`  Health:  http://localhost:${port}/api/health/detail`);
  console.log(`  Demo account: admin / 123456\n`);
});
