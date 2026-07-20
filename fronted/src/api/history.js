import { request } from './request.js';
export const getLogs = (limit=100) => request(`/api/logs?limit=${limit}`);
