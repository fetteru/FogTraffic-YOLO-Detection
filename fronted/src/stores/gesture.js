import { reactive } from 'vue';

const emptyTransition = token => ({
  phase: 'idle',
  number: 0,
  progress: 0,
  token,
  route: '',
  label: ''
});

export const gestureStore = reactive({
  requested: false,
  active: false,
  modelReady: false,
  preview: true,
  mirror: true,
  status: '鼠标 / 触控模式',
  systemStatus: '粒子引擎已就绪',
  confidence: 0,
  number: 0,
  previewNumber: 0,
  error: '',
  effectPulse: 0,
  cursor: { visible: false, x: .5, y: .5, pinching: false, source: 'hand', pinchRatio: 1 },
  transition: emptyTransition(0),

  start() {
    this.error = '';
    this.requested = true;
  },
  stop() {
    this.requested = false;
    this.active = false;
    this.modelReady = false;
    this.cursor.visible = false;
    this.number = 0;
    this.previewNumber = 0;
    this.clearDigitTransition();
  },
  togglePreview() {
    this.preview = !this.preview;
  },
  toggleMirror() {
    this.mirror = !this.mirror;
  },
  pulse() {
    this.effectPulse += 1;
  },
  beginDigitTransition(number, route, label) {
    if (this.transition.phase !== 'idle') return 0;
    const token = this.transition.token + 1;
    this.previewNumber = 0;
    this.number = number;
    this.transition = {
      phase: 'forming',
      number,
      progress: 0,
      token,
      route,
      label
    };
    return token;
  },
  setTransitionProgress(progress, token) {
    if (token && token !== this.transition.token) return;
    if (this.transition.phase === 'idle') return;
    this.transition.progress = Math.max(0, Math.min(1, progress));
  },
  setTransitionPhase(phase, token) {
    if (token && token !== this.transition.token) return;
    this.transition.phase = phase;
  },
  clearDigitTransition(token = 0) {
    if (token && token !== this.transition.token) return;
    const nextToken = this.transition.token;
    this.transition = emptyTransition(nextToken);
    this.number = 0;
  },
  showDigitPreview(number) {
    if (this.transition.phase !== 'idle') return;
    this.previewNumber = number;
    this.number = number;
  },
  clearDigitPreview() {
    this.previewNumber = 0;
    if (this.transition.phase === 'idle') this.number = 0;
  }
});
