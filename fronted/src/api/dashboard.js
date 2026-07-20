import { request } from './request.js';
export const getHealth = () => request('/api/health/detail');
export const getTasks = () => request('/api/training/tasks');
