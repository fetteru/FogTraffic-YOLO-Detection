import { createApp } from 'vue';
import ElementPlus from 'element-plus';
import zhCn from 'element-plus/es/locale/lang/zh-cn';
import 'element-plus/dist/index.css';
import './assets/styles/platform.css';
import './assets/styles/gesture.css';
import './assets/styles/vue-app.css';
import './assets/styles/polish.css';
import './assets/styles/daylight.css';
import './assets/styles/experience.css';
import App from './App.vue';
import router from './router/index.js';

const root = document.querySelector('#app');
const app = createApp(App);

function renderStartupFallback(error) {
  console.error('FogTraffic startup error', error);
  requestAnimationFrame(() => {
    if (!root || root.querySelector('.auth-page,.app-layout')) return;
    root.innerHTML = `
      <main style="min-height:100vh;display:grid;place-items:center;padding:24px;background:linear-gradient(145deg,#e9f1f3,#f3efe8);font-family:system-ui,sans-serif;color:#263d49">
        <section style="max-width:560px;padding:28px;border:1px solid rgba(51,88,101,.16);border-radius:22px;background:rgba(255,255,253,.74);box-shadow:0 24px 64px rgba(72,92,98,.14);backdrop-filter:blur(24px)">
          <strong style="font-size:20px">页面初始化失败</strong>
          <p style="margin:10px 0 18px;color:#6b8089;line-height:1.7">已阻止空白页。请清除旧缓存后重新加载，或点击下方按钮自动重置本地界面数据。</p>
          <button id="fogtraffic-reset" style="min-height:42px;padding:0 18px;border:0;border-radius:11px;background:linear-gradient(135deg,#2b8aa3,#6878b5);color:#fff;font-weight:700;cursor:pointer">重置缓存并重新加载</button>
        </section>
      </main>`;
    document.querySelector('#fogtraffic-reset')?.addEventListener('click', () => {
      try {
        localStorage.removeItem('fogtraffic_ui');
        localStorage.removeItem('fogtraffic_user');
        localStorage.removeItem('fogtraffic_token');
      } catch {}
      location.reload();
    });
  });
}

app.config.errorHandler = renderStartupFallback;
window.addEventListener('error', event => renderStartupFallback(event.error || event.message));
window.addEventListener('unhandledrejection', event => {
  if (!root?.querySelector('.auth-page,.app-layout')) renderStartupFallback(event.reason);
});

app.use(router).use(ElementPlus, { locale: zhCn }).mount('#app');
