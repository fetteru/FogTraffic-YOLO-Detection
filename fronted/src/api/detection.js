import { request } from './request.js';
export const detectSingle = file => { const body=new FormData();body.append('file',file);return request('/api/detection/single',{method:'POST',body}); };
export const detectBatch = files => { const body=new FormData();files.forEach(file=>body.append('files',file));return request('/api/detection/batch',{method:'POST',body}); };
