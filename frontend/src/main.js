import { createApp } from 'vue';
import '../styles.css';
import './vue-overrides.css';
import App from './App.vue';

document.documentElement.dataset.theme = 'light';

createApp(App).mount('#app');
