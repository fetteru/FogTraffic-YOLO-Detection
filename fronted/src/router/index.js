import { createRouter, createWebHistory } from 'vue-router';
import { authStore } from '../stores/auth.js';
import LoginPage from '../views/LoginPage.vue';
import RegisterPage from '../views/RegisterPage.vue';
import HomeExperience from '../views/HomeExperience.vue';

export const moduleRoutes = [
  { path: 'chat', name: 'chat', label: '智能对话', component: () => import('../views/ChatPage.vue') },
  { path: 'detection', name: 'detection', label: '交通检测工作台', component: () => import('../views/DetectionPage.vue') },
  { path: 'datasets', name: 'datasets', label: '数据集管理', component: () => import('../views/DatasetsPage.vue') },
  { path: 'training', name: 'training', label: '模型训练', component: () => import('../views/TrainingPage.vue') },
  { path: 'evaluation', name: 'evaluation', label: '模型评估', component: () => import('../views/EvaluationPage.vue') },
  { path: 'dashboard', name: 'dashboard', label: '数据看板', component: () => import('../views/DashboardPage.vue') },
  { path: 'history', name: 'history', label: '任务历史', component: () => import('../views/HistoryPage.vue') },
  { path: 'monitoring', name: 'monitoring', label: '系统监控', component: () => import('../views/MonitoringPage.vue') },
  { path: 'settings', name: 'settings', label: '系统设置', component: () => import('../views/SettingsPage.vue') }
];

const router = createRouter({
  history: createWebHistory(),
  scrollBehavior(to, from, savedPosition) {
    if (savedPosition) return savedPosition;
    if (to.hash) return { el: to.hash, behavior: 'smooth' };
    return { top: 0 };
  },
  routes: [
    { path: '/', name: 'home', component: HomeExperience },
    { path: '/gesture', redirect: '/login' },
    { path: '/login', name: 'login', component: LoginPage },
    { path: '/register', name: 'register', component: RegisterPage },
    { path: '/app', component: () => import('../components/layout/AppLayout.vue'), meta: { requiresAuth: true }, children: [
      { path: '', redirect: '/app/chat' }, ...moduleRoutes
    ] },
    { path: '/:pathMatch(.*)*', redirect: '/' }
  ]
});

router.beforeEach(to => {
  if (to.meta.requiresAuth && !authStore.isAuthenticated.value) return { name: 'login', query: { redirect: to.fullPath } };
  if ((to.name === 'login' || to.name === 'register') && authStore.isAuthenticated.value) return { name: 'chat' };
});
export default router;
