import { request } from './request.js';
export const login = payload => request('/api/auth/login',{method:'POST',body:JSON.stringify(payload)});
export const register = payload => request('/api/auth/register',{method:'POST',body:JSON.stringify(payload)});
