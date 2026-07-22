import { createApp } from 'vue';
import '../styles.css';
import './vue-overrides.css';
import './frontend-new-theme.css';
import './gesture-experience.css';
import './fogtraffic-port.css';
import App from './App.vue';

function initCinematicLoader() {
  const loader = document.querySelector('#cinematic-loader');
  const progressNode = document.querySelector('#loader-progress-value');
  if (!loader) {
    document.body.classList.remove('cinematic-intro-active');
    return;
  }

  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    loader.remove();
    document.body.classList.remove('cinematic-intro-active');
    return;
  }

  let raf = 0;
  let finishTimer = 0;
  let startedAt = 0;
  let lastPaint = 0;
  let finished = false;

  const finish = () => {
    if (finished) return;
    finished = true;
    cancelAnimationFrame(raf);
    if (progressNode) progressNode.textContent = '100';
    loader.classList.add('is-leaving');
    finishTimer = window.setTimeout(() => {
      loader.remove();
      document.body.classList.remove('cinematic-intro-active');
    }, 920);
  };

  const tick = time => {
    if (!startedAt) startedAt = time;
    const elapsed = time - startedAt;
    const normalized = Math.min(1, elapsed / 2350);
    if (progressNode && (time - lastPaint >= 50 || normalized >= 1)) {
      const progress = Math.min(100, Math.round((1 - Math.pow(1 - normalized, 2.6)) * 100));
      progressNode.textContent = String(progress).padStart(3, '0');
      lastPaint = time;
    }
    if (elapsed >= 2850) finish();
    else raf = requestAnimationFrame(tick);
  };

  loader.addEventListener('click', finish, { once: true });
  window.addEventListener('pagehide', () => clearTimeout(finishTimer), { once: true });
  raf = requestAnimationFrame(tick);
}

initCinematicLoader();
createApp(App).mount('#app');

requestAnimationFrame(() => {
  import('./gesture-experience.js').catch(error => {
    console.error('手势交互模块加载失败：', error);
  });
});
