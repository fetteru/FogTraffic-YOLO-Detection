import { reactive } from 'vue';

function readSavedUi() {
  try {
    const raw = localStorage.getItem('fogtraffic_ui');
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === 'object' ? parsed : {};
  } catch (error) {
    console.warn('Ignoring invalid fogtraffic_ui cache', error);
    try { localStorage.removeItem('fogtraffic_ui'); } catch {}
    return {};
  }
}

function updateThemeChrome(theme) {
  document.documentElement.dataset.theme = theme;
  const themeMeta = document.querySelector('meta[name="theme-color"]');
  themeMeta?.setAttribute('content', theme === 'light' ? '#edf3f4' : '#07101f');
}

const saved = readSavedUi();
const initialTheme = saved.theme === 'light' ? 'light' : 'dark';

export const appStore = reactive({
  theme: initialTheme,
  sidebarCollapsed: Boolean(saved.sidebarCollapsed),
  mobileNavOpen: false,
  notificationsOpen: false,
  persist() {
    try {
      localStorage.setItem('fogtraffic_ui', JSON.stringify({
        theme: this.theme,
        sidebarCollapsed: this.sidebarCollapsed
      }));
    } catch (error) {
      console.warn('Unable to persist FogTraffic UI preferences', error);
    }
  },
  toggleTheme() {
    this.theme = this.theme === 'dark' ? 'light' : 'dark';
    updateThemeChrome(this.theme);
    this.persist();
  },
  toggleSidebar() {
    this.sidebarCollapsed = !this.sidebarCollapsed;
    this.persist();
  }
});

updateThemeChrome(appStore.theme);
