<script setup>
import { onBeforeUnmount, onMounted, ref, watch } from 'vue';
import { gestureStore } from '../../stores/gesture.js';

const props = defineProps({ mode: { type: String, default: 'hero' } });
const canvas = ref(null);
const TAU = Math.PI * 2;
const clamp = (value, min, max) => Math.max(min, Math.min(max, value));
const lerp = (a, b, amount) => a + (b - a) * amount;
const smooth = value => value * value * (3 - 2 * value);
const easeInOutCubic = value => value < .5
  ? 4 * value * value * value
  : 1 - Math.pow(-2 * value + 2, 3) / 2;
const easeOutCubic = value => 1 - Math.pow(1 - value, 3);
const FORMATION_CENTER_DELAY = 140;
const FORMATION_DURATION = 1020;
const FORMATION_SETTLE = 320;
const FORMATION_TIMEOUT = 2150;
const RELEASE_DURATION = 420;

let ctx = null;
let raf = 0;
let width = 1;
let height = 1;
let dpr = 1;
let count = 0;
let frame = 0;
let displayedDigit = 0;
let activeToken = 0;
let previewMode = false;
let morph = 0;
let morphTarget = 0;
let formationStartedAt = 0;
let releaseStartedAt = 0;
let releaseFrom = 0;
let digitHoldUntil = 0;
let formedAt = 0;
let formedNotifiedToken = 0;
let shock = 0;
let lastNow = 0;
let glyphPoints = [];
let comets = [];
let sparks = [];
let resizeObserver = null;

const center = { x: 0, y: 0, initialized: false };
const particles = {};

function particleCount() {
  const area = width * height;
  if (props.mode === 'ambient') return Math.min(4200, Math.max(2200, Math.floor(area / 620)));
  return Math.min(6800, Math.max(3900, Math.floor(area / 330)));
}

function defaultCenter() {
  if (props.mode === 'ambient') return { x: width * .62, y: height * .38 };
  if (width < 980) return { x: width * .5, y: height * .48 };
  return { x: width * .55, y: height * .5 };
}

function baseRadius() {
  const side = Math.min(width, height);
  if (props.mode === 'ambient') return side * (width < 760 ? .105 : .082);
  return side * (width < 760 ? .145 : .175);
}

function randomNormal() {
  let u = 0;
  let v = 0;
  while (!u) u = Math.random();
  while (!v) v = Math.random();
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(TAU * v);
}

function allocate(total) {
  count = total;
  const fields = [
    'x', 'y', 'z', 'px', 'py', 'pz', 'vx', 'vy', 'vz',
    'ux', 'uy', 'uz', 'shell', 'seed', 'size', 'tone', 'kind',
    'gx', 'gy', 'gz', 'fieldX', 'fieldY', 'fieldZ',
    'screenX', 'screenY', 'prevScreenX', 'prevScreenY'
  ];
  for (const key of fields) particles[key] = new Float32Array(total);
}

function seedParticle(index, hard = true) {
  const z = Math.random() * 2 - 1;
  const angle = Math.random() * TAU;
  const radial = Math.sqrt(Math.max(0, 1 - z * z));
  particles.ux[index] = Math.cos(angle) * radial;
  particles.uy[index] = Math.sin(angle) * radial;
  particles.uz[index] = z;
  particles.shell[index] = .14 + .86 * Math.pow(Math.random(), .15);
  particles.seed[index] = Math.random() * TAU;
  particles.size[index] = (props.mode === 'ambient' ? .26 : .36)
    + Math.pow(Math.random(), 2.05) * (props.mode === 'ambient' ? 1.45 : 2.15);
  particles.tone[index] = Math.random();
  particles.kind[index] = Math.random();
  particles.fieldX[index] = randomNormal();
  particles.fieldY[index] = randomNormal();
  particles.fieldZ[index] = randomNormal();
  particles.gx[index] = 0;
  particles.gy[index] = 0;
  particles.gz[index] = 0;

  const radius = baseRadius() * particles.shell[index];
  if (hard) {
    particles.x[index] = particles.ux[index] * radius;
    particles.y[index] = particles.uy[index] * radius;
    particles.z[index] = particles.uz[index] * radius;
    particles.px[index] = particles.x[index];
    particles.py[index] = particles.y[index];
    particles.pz[index] = particles.z[index];
    particles.vx[index] = 0;
    particles.vy[index] = 0;
    particles.vz[index] = 0;
  }
}

function makeComet() {
  const diagonal = Math.random() > .45;
  return {
    x: Math.random() * width,
    y: -60 - Math.random() * height * .85,
    len: 45 + Math.random() * 150,
    speed: .35 + Math.random() * 1.25,
    alpha: .05 + Math.random() * .2,
    drift: diagonal ? (-.18 - Math.random() * .38) : (-.06 + Math.random() * .12),
    thick: .35 + Math.random() * .55
  };
}

function reseed() {
  allocate(particleCount());
  for (let index = 0; index < count; index += 1) seedParticle(index, true);
  comets = Array.from({ length: props.mode === 'ambient' ? 7 : 20 }, makeComet);
  sparks = [];
  buildGlyph(displayedDigit);
}

function resize() {
  if (!canvas.value || !ctx) return;
  const rect = canvas.value.getBoundingClientRect();
  width = Math.max(1, rect.width || innerWidth);
  height = Math.max(1, rect.height || innerHeight);
  dpr = Math.min(devicePixelRatio || 1, 1.65);
  canvas.value.width = Math.round(width * dpr);
  canvas.value.height = Math.round(height * dpr);
  canvas.value.style.width = `${width}px`;
  canvas.value.style.height = `${height}px`;
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  const initial = defaultCenter();
  center.x = initial.x;
  center.y = initial.y;
  center.initialized = true;
  reseed();
}

function buildGlyph(number) {
  glyphPoints = [];
  if (!number) return;

  const side = Math.max(560, Math.min(920, Math.round(Math.min(width, height) * 1.02)));
  const offscreen = document.createElement('canvas');
  offscreen.width = side;
  offscreen.height = side;
  const offctx = offscreen.getContext('2d', { willReadFrequently: true });
  offctx.clearRect(0, 0, side, side);
  offctx.textAlign = 'center';
  offctx.textBaseline = 'middle';
  const fontSize = Math.round(side * (number === 1 ? .83 : .76));
  offctx.font = `900 ${fontSize}px Inter, Arial Black, Arial, sans-serif`;
  offctx.fillStyle = '#fff';
  offctx.strokeStyle = '#fff';
  offctx.lineJoin = 'round';
  offctx.lineWidth = Math.max(5, side * .01);
  offctx.strokeText(String(number), side * .5, side * .515);
  offctx.fillText(String(number), side * .5, side * .515);

  const data = offctx.getImageData(0, 0, side, side).data;
  const step = count > 4300 ? 2 : 3;
  // 保持数字粒子在视觉中心，避免过度占据画面主体。
  const scale = Math.min(width * (props.mode === 'ambient' ? .19 : .22), height * .38);
  for (let y = 0; y < side; y += step) {
    for (let x = 0; x < side; x += step) {
      const alpha = data[(y * side + x) * 4 + 3];
      if (alpha > 38 && Math.random() < .83) {
        glyphPoints.push({
          x: (x / side - .5) * scale * 1.28,
          y: (y / side - .5) * scale * 1.28,
          z: (Math.random() - .5) * 14
        });
      }
    }
  }

  for (let index = glyphPoints.length - 1; index > 0; index -= 1) {
    const swap = Math.floor(Math.random() * (index + 1));
    [glyphPoints[index], glyphPoints[swap]] = [glyphPoints[swap], glyphPoints[index]];
  }
  if (!glyphPoints.length) return;

  for (let index = 0; index < count; index += 1) {
    const point = glyphPoints[(index * 71 + Math.floor(particles.seed[index] * 997)) % glyphPoints.length];
    particles.gx[index] = point.x + (Math.random() - .5) * .82;
    particles.gy[index] = point.y + (Math.random() - .5) * .82;
    particles.gz[index] = point.z;
  }
}

function emitSparks(amount = 80, origin = null) {
  const source = origin || center;
  for (let index = 0; index < amount; index += 1) {
    const angle = Math.random() * TAU;
    const speed = 1.1 + Math.random() * 6.2;
    sparks.push({
      x: source.x,
      y: source.y,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed * .68,
      life: .7 + Math.random() * .6,
      size: .45 + Math.random() * 1.7,
      tone: Math.random()
    });
  }
  if (sparks.length > 380) sparks.splice(0, sparks.length - 380);
}

function pullParticlesInward(force = 4.6) {
  for (let index = 0; index < count; index += 1) {
    const distance = Math.hypot(particles.x[index], particles.y[index], particles.z[index]) || 1;
    const amount = force * (.55 + Math.random() * .65);
    particles.vx[index] -= particles.x[index] / distance * amount;
    particles.vy[index] -= particles.y[index] / distance * amount;
    particles.vz[index] -= particles.z[index] / distance * amount * .7;
  }
}

function triggerDigit(number, token = 0, isPreview = false) {
  const now = performance.now();
  displayedDigit = number;
  activeToken = token;
  previewMode = isPreview;
  buildGlyph(number);
  formationStartedAt = now;
  releaseStartedAt = 0;
  releaseFrom = morph;
  morphTarget = 1;
  digitHoldUntil = now + (isPreview ? 2100 : 4300);
  formedAt = 0;
  formedNotifiedToken = 0;
  shock = 1;
  emitSparks(props.mode === 'ambient' ? 72 : 108);
  // 先产生一次内收脉冲，再进入有弧度的数字凝聚，避免粒子瞬间“硬切”成字形。
  pullParticlesInward(3.75);
  if (token) gestureStore.setTransitionProgress(0, token);
}

function releaseDigit() {
  releaseFrom = morph;
  releaseStartedAt = performance.now();
  morphTarget = 0;
  previewMode = false;
  activeToken = 0;
  formedAt = 0;
}

function triggerBurst() {
  shock = 1;
  emitSparks(75);
}

function sphereTarget(index, time, out) {
  const radius = baseRadius() * particles.shell[index];
  let x = particles.ux[index] * radius;
  let y = particles.uy[index] * radius;
  let z = particles.uz[index] * radius;
  const yaw = time * (props.mode === 'ambient' ? .09 : .17)
    + (particles.tone[index] > .58 ? 1 : -1) * .08 * Math.sin(time * .31 + particles.seed[index]);
  const pitch = .18 * Math.sin(time * .23) + .04 * Math.sin(particles.seed[index] * 2);
  const roll = .08 * Math.sin(time * .19);
  const cy = Math.cos(yaw);
  const sy = Math.sin(yaw);
  const cx = Math.cos(pitch);
  const sx = Math.sin(pitch);
  const cz = Math.cos(roll);
  const sz = Math.sin(roll);
  const x1 = x * cy + z * sy;
  const z1 = -x * sy + z * cy;
  const y1 = y * cx - z1 * sx;
  const z2 = y * sx + z1 * cx;
  let x2 = x1 * cz - y1 * sz;
  let y2 = x1 * sz + y1 * cz;
  const wobble = 1 + Math.sin(time * .86 + particles.seed[index])
    * (.016 + (1 - Math.abs(particles.uz[index])) * .025);
  x2 *= wobble;
  y2 *= wobble;

  if (particles.kind[index] > .89) {
    const orbit = baseRadius() * (.9 + (particles.kind[index] - .89) * 2.4);
    const angle = time * (.26 + particles.tone[index] * .15) + particles.seed[index] * 1.7;
    x2 = Math.cos(angle) * orbit;
    y2 = Math.sin(angle * .73) * orbit * .58;
    z = Math.sin(angle) * orbit * .5;
  } else if (particles.kind[index] > .78) {
    x2 += particles.fieldX[index] * baseRadius() * .2 * Math.sin(time * .25 + particles.seed[index]);
    y2 += particles.fieldY[index] * baseRadius() * .16 * Math.cos(time * .2 + particles.seed[index]);
    z += particles.fieldZ[index] * baseRadius() * .18 * Math.sin(time * .18 + particles.seed[index]);
  } else {
    z = z2 * wobble;
  }

  out.x = x2;
  out.y = y2;
  out.z = z;
}

function glyphTarget(index, time, out) {
  const locked = gestureStore.transition.phase === 'locked' || gestureStore.transition.phase === 'routing';
  const breathe = 1 + Math.sin(time * 2.15 + particles.seed[index]) * (locked ? .0025 : .0045);
  const drift = locked ? .28 : .64;
  out.x = particles.gx[index] * breathe + Math.sin(time * 1.65 + particles.seed[index]) * drift;
  out.y = particles.gy[index] * breathe + Math.cos(time * 1.5 + particles.seed[index]) * drift;
  out.z = particles.gz[index] + Math.sin(time * 1.8 + particles.seed[index]) * (locked ? 1.25 : 2.2);
}

function interactionPoint() {
  if (gestureStore.active && gestureStore.cursor?.visible) {
    return {
      x: gestureStore.cursor.x * width,
      y: gestureStore.cursor.y * height,
      pinch: gestureStore.cursor.pinching,
      source: 'hand'
    };
  }
  return null;
}

function updateCenter(point, dt) {
  const morphing = morphTarget > 0 || morph > .08;
  const fallback = defaultCenter();
  const target = morphing
    ? { x: width * .5, y: height * .5 }
    : (point || fallback);
  if (!center.initialized) {
    center.x = target.x;
    center.y = target.y;
    center.initialized = true;
    return;
  }
  const responsiveness = morphing ? .12 : (point?.source === 'hand' ? .16 : .11);
  const amount = 1 - Math.pow(1 - responsiveness, dt);
  center.x = lerp(center.x, target.x, amount);
  center.y = lerp(center.y, target.y, amount);
}

function project(x, y, z) {
  const focal = Math.max(520, Math.min(width, height) * 1.15);
  const scale = clamp(focal / (focal - z * .72), .54, 1.75);
  return { x: center.x + x * scale, y: center.y + y * scale, scale };
}

function drawBackdrop(time, mix) {
  const radius = Math.min(width, height) * (props.mode === 'ambient' ? .27 : .48);
  const glow = ctx.createRadialGradient(center.x, center.y, 0, center.x, center.y, radius);
  glow.addColorStop(0, `rgba(43,216,255,${props.mode === 'ambient' ? .018 + mix * .055 : .065 + mix * .06})`);
  glow.addColorStop(.24, `rgba(38,141,255,${props.mode === 'ambient' ? .012 + mix * .03 : .034 + mix * .025})`);
  glow.addColorStop(.5, `rgba(111,79,255,${props.mode === 'ambient' ? .008 : .022})`);
  glow.addColorStop(1, 'rgba(2,7,17,0)');
  ctx.fillStyle = glow;
  ctx.fillRect(0, 0, width, height);

  if (props.mode === 'ambient' && mix < .08) return;
  ctx.save();
  ctx.translate(center.x, center.y);
  ctx.globalCompositeOperation = 'lighter';
  for (let ring = 0; ring < 3; ring += 1) {
    ctx.rotate((ring % 2 ? -.11 : .08) * time);
    ctx.strokeStyle = `rgba(${ring === 1 ? '128,101,255' : '79,220,255'},${.025 + ring * .01 + mix * .05})`;
    ctx.lineWidth = .55;
    ctx.setLineDash([2 + ring, 8 + ring * 3]);
    ctx.beginPath();
    ctx.ellipse(0, 0, baseRadius() * (1.04 + ring * .17), baseRadius() * (.68 + ring * .1), ring * .3, -.7, 4.9);
    ctx.stroke();
  }
  ctx.restore();
}

function drawComets() {
  if (props.mode === 'ambient' && morph < .08) return;
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  for (const comet of comets) {
    comet.y += comet.speed * (props.mode === 'ambient' ? .65 : 1.2);
    comet.x += comet.drift;
    if (comet.y - comet.len > height || comet.x < -comet.len) {
      Object.assign(comet, makeComet());
      comet.y = -comet.len;
    }
    const gradient = ctx.createLinearGradient(comet.x - comet.len * .33, comet.y - comet.len, comet.x, comet.y);
    gradient.addColorStop(0, 'rgba(71,205,255,0)');
    gradient.addColorStop(.76, `rgba(70,201,255,${comet.alpha * .34})`);
    gradient.addColorStop(1, `rgba(218,253,255,${comet.alpha})`);
    ctx.strokeStyle = gradient;
    ctx.lineWidth = comet.thick;
    ctx.beginPath();
    ctx.moveTo(comet.x - comet.len * .33, comet.y - comet.len);
    ctx.lineTo(comet.x, comet.y);
    ctx.stroke();
  }
  ctx.restore();
}

function drawSparks() {
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  for (let index = sparks.length - 1; index >= 0; index -= 1) {
    const spark = sparks[index];
    spark.x += spark.vx;
    spark.y += spark.vy;
    spark.vx *= .985;
    spark.vy *= .985;
    spark.life -= .016;
    const alpha = Math.max(0, spark.life);
    ctx.fillStyle = spark.tone > .28
      ? `rgba(91,225,255,${alpha})`
      : `rgba(151,121,255,${alpha * .86})`;
    ctx.beginPath();
    ctx.arc(spark.x, spark.y, spark.size * (.4 + alpha * .7), 0, TAU);
    ctx.fill();
    if (spark.life <= 0) sparks.splice(index, 1);
  }
  ctx.restore();
}

function drawDigitAura(mix) {
  if (!displayedDigit || mix < .08) return;
  const size = Math.min(width * (props.mode === 'ambient' ? .21 : .26), height * .47);
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.font = `900 ${size}px Inter, Arial Black, sans-serif`;
  ctx.fillStyle = `rgba(190,242,255,${.004 + mix * .01})`;
  ctx.strokeStyle = `rgba(232,251,255,${mix * .032})`;
  ctx.lineWidth = .65 + mix * .5;
  ctx.shadowBlur = 42 + mix * 38;
  ctx.shadowColor = '#b9efff';
  ctx.fillText(String(displayedDigit), center.x, center.y);
  ctx.strokeText(String(displayedDigit), center.x, center.y);
  ctx.restore();
}

function drawInteraction(point, time) {
  if (!point || morph > .1) return;
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  const pulse = 1 + Math.sin(time * (point.pinch ? 10 : 4)) * .14;
  const radius = (point.pinch ? 34 : 21) * pulse;
  const color = point.pinch ? '159,119,255' : '88,226,255';
  ctx.strokeStyle = `rgba(${color},.72)`;
  ctx.lineWidth = 1;
  ctx.shadowBlur = 24;
  ctx.shadowColor = point.pinch ? '#9b70ff' : '#48dcff';
  ctx.beginPath();
  ctx.arc(point.x, point.y, radius, 0, TAU);
  ctx.stroke();
  ctx.setLineDash([3, 6]);
  ctx.beginPath();
  ctx.arc(point.x, point.y, radius * (point.pinch ? 1.85 : 1.42), 0, TAU);
  ctx.strokeStyle = `rgba(${color},.22)`;
  ctx.stroke();
  ctx.restore();
}

function drawLinks(mix) {
  if (frame % 2 || (props.mode === 'ambient' && mix < .12)) return;
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  ctx.lineWidth = .35;
  let made = 0;
  for (let index = 0; index < count && made < 76; index += 23) {
    const other = (index * 13 + 97) % count;
    const dx = particles.screenX[index] - particles.screenX[other];
    const dy = particles.screenY[index] - particles.screenY[other];
    const distanceSquared = dx * dx + dy * dy;
    if (distanceSquared < 7200) {
      ctx.strokeStyle = `rgba(74,214,255,${.018 + mix * .05})`;
      ctx.beginPath();
      ctx.moveTo(particles.screenX[index], particles.screenY[index]);
      ctx.lineTo(particles.screenX[other], particles.screenY[other]);
      ctx.stroke();
      made += 1;
    }
  }
  ctx.restore();
}

const sphere = { x: 0, y: 0, z: 0 };
const glyph = { x: 0, y: 0, z: 0 };

function notifyFormationComplete(now, mix, averageError) {
  if (!activeToken || previewMode || formedNotifiedToken === activeToken) return;
  if (gestureStore.transition.token !== activeToken || gestureStore.transition.phase !== 'forming') return;

  const settleScore = clamp(1 - averageError / 28, 0, 1);
  const visualProgress = mix < .985
    ? mix * .97
    : Math.min(.995, .955 + settleScore * .04);
  gestureStore.setTransitionProgress(visualProgress, activeToken);

  const timedOut = now - formationStartedAt > FORMATION_TIMEOUT;
  if (mix < .985 || (!timedOut && averageError > 16)) {
    formedAt = 0;
    return;
  }
  if (!formedAt) formedAt = now;
  if (now - formedAt < FORMATION_SETTLE) return;

  formedNotifiedToken = activeToken;
  gestureStore.setTransitionProgress(1, activeToken);
  window.dispatchEvent(new CustomEvent('gesture:digit-formed', {
    detail: { number: displayedDigit, token: activeToken }
  }));
}

function draw(now) {
  if (!ctx) return;
  frame += 1;
  const dt = clamp((now - (lastNow || now)) / 16.667, .35, 2.2);
  lastNow = now;
  const time = now * .001;
  const point = interactionPoint();
  updateCenter(point, dt);
  ctx.clearRect(0, 0, width, height);

  const transitionActive = gestureStore.transition.phase !== 'idle'
    && gestureStore.transition.number === displayedDigit
    && gestureStore.transition.token === activeToken;
  if (!transitionActive && !previewMode && displayedDigit && now > digitHoldUntil) morphTarget = 0;
  if (previewMode && now > digitHoldUntil) releaseDigit();

  if (morphTarget) {
    const raw = clamp((now - formationStartedAt - FORMATION_CENTER_DELAY) / FORMATION_DURATION, 0, 1);
    morph = easeInOutCubic(raw);
  } else if (releaseStartedAt) {
    const raw = clamp((now - releaseStartedAt) / RELEASE_DURATION, 0, 1);
    morph = releaseFrom * (1 - easeOutCubic(raw));
    if (raw >= 1) releaseStartedAt = 0;
  } else {
    morph += (0 - morph) * .055 * dt;
  }
  if (!morphTarget && morph < .012) {
    morph = 0;
    displayedDigit = 0;
    glyphPoints = [];
  }
  shock *= Math.pow(.94, dt);
  const mix = smooth(clamp(morph, 0, 1));

  drawBackdrop(time, mix);
  drawComets();
  drawDigitAura(mix);

  let convergence = 0;
  let convergenceSamples = 0;
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  for (let index = 0; index < count; index += 1) {
    sphereTarget(index, time, sphere);
    if (displayedDigit) glyphTarget(index, time, glyph);
    else {
      glyph.x = sphere.x;
      glyph.y = sphere.y;
      glyph.z = sphere.z;
    }

    // 粒子按极短的种子错峰进入字形，并在中段走一段弧线，视觉上更接近视频里的“整体吸附凝聚”。
    const stagger = displayedDigit ? (particles.seed[index] / TAU) * .105 : 0;
    const localMix = displayedDigit
      ? smooth(clamp((mix - stagger) / Math.max(.001, 1 - stagger), 0, 1))
      : mix;
    const curl = Math.sin(localMix * Math.PI) * (particles.tone[index] > .5 ? 1 : -1) * .72;
    const cosCurl = Math.cos(curl);
    const sinCurl = Math.sin(curl);
    const curvedX = sphere.x * cosCurl - sphere.y * sinCurl;
    const curvedY = sphere.x * sinCurl + sphere.y * cosCurl;
    const compression = 1 - Math.sin(clamp(localMix * 1.35, 0, 1) * Math.PI) * .075;
    const targetX = lerp(curvedX * compression, glyph.x, localMix);
    const targetY = lerp(curvedY * compression, glyph.y, localMix);
    const targetZ = lerp(sphere.z * compression, glyph.z, localMix);
    const stiffness = props.mode === 'ambient'
      ? lerp(.03, .172, localMix)
      : lerp(.028, .165, localMix);
    particles.vx[index] += (targetX - particles.x[index]) * stiffness * dt;
    particles.vy[index] += (targetY - particles.y[index]) * stiffness * dt;
    particles.vz[index] += (targetZ - particles.z[index]) * stiffness * .78 * dt;
    const damping = lerp(props.mode === 'ambient' ? .9 : .905, .72, localMix);
    particles.vx[index] *= Math.pow(damping, dt);
    particles.vy[index] *= Math.pow(damping, dt);
    particles.vz[index] *= Math.pow(.87, dt);
    particles.x[index] += particles.vx[index] * dt;
    particles.y[index] += particles.vy[index] * dt;
    particles.z[index] += particles.vz[index] * dt;

    if (mix > .88 && index % 17 === 0) {
      convergence += Math.hypot(targetX - particles.x[index], targetY - particles.y[index]);
      convergenceSamples += 1;
    }

    const projected = project(particles.x[index], particles.y[index], particles.z[index]);
    particles.prevScreenX[index] = particles.screenX[index] || projected.x;
    particles.prevScreenY[index] = particles.screenY[index] || projected.y;
    particles.screenX[index] = projected.x;
    particles.screenY[index] = projected.y;

    if (point && mix < .12) {
      const dx = point.x - projected.x;
      const dy = point.y - projected.y;
      const distance = Math.hypot(dx, dy) || 1;
      const influenceRadius = baseRadius() * 1.55;
      if (distance < influenceRadius) {
        const force = (1 - distance / influenceRadius) * dt;
        if (point.pinch) {
          particles.vx[index] += dx / distance * force * .62;
          particles.vy[index] += dy / distance * force * .62;
        } else {
          particles.vx[index] += -dy / distance * force * .09;
          particles.vy[index] += dx / distance * force * .09;
        }
      }
    }

    const depth = clamp(projected.scale * .72, .28, 1.32);
    const digitBoost = 1 + localMix * .42;
    const alphaBase = props.mode === 'ambient' ? .075 : .11;
    const alphaRange = props.mode === 'ambient' ? .29 : .42;
    const alpha = alphaBase + alphaRange * depth + localMix * .22;
    const violet = particles.tone[index] < .22;
    const white = particles.tone[index] > .91;
    const digitColor = localMix > .28;
    ctx.fillStyle = white
      ? `rgba(239,254,255,${alpha * (digitColor ? .9 : 1)})`
      : violet
        ? (digitColor
          ? `rgba(202,213,255,${alpha * .74})`
          : `rgba(143,118,255,${alpha * .88})`)
        : (digitColor
          ? `rgba(174,239,255,${alpha * .84})`
          : `rgba(61,216,255,${alpha})`);
    const radius = particles.size[index] * depth * digitBoost;
    if (radius < .9) {
      ctx.fillRect(projected.x, projected.y, Math.max(.55, radius), Math.max(.55, radius));
    } else {
      ctx.beginPath();
      ctx.arc(projected.x, projected.y, radius, 0, TAU);
      ctx.fill();
    }

    if ((mix > .12 || shock > .08) && index % 6 === 0) {
      ctx.strokeStyle = violet
        ? `rgba(${mix > .28 ? '202,213,255' : '150,124,255'},${.018 + mix * .075 + shock * .06})`
        : `rgba(${mix > .28 ? '183,241,255' : '78,224,255'},${.018 + mix * .082 + shock * .06})`;
      ctx.lineWidth = .38;
      ctx.beginPath();
      ctx.moveTo(particles.prevScreenX[index], particles.prevScreenY[index]);
      ctx.lineTo(projected.x, projected.y);
      ctx.stroke();
    }
  }
  ctx.restore();

  const averageError = convergenceSamples ? convergence / convergenceSamples : 999;
  notifyFormationComplete(now, mix, averageError);
  drawLinks(mix);
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  ctx.shadowBlur = 14 + mix * 10;
  for (let index = 5; index < count; index += 31) {
    const depth = clamp((particles.z[index] + baseRadius()) / (baseRadius() * 2), 0, 1);
    const formedHighlight = mix > .28;
    ctx.fillStyle = particles.tone[index] < .22
      ? `rgba(${formedHighlight ? '214,222,255' : '166,139,255'},${.17 + depth * .34})`
      : `rgba(${formedHighlight ? '230,252,255' : '202,251,255'},${.19 + depth * .39})`;
    ctx.shadowColor = particles.tone[index] < .22
      ? (formedHighlight ? '#cbd6ff' : '#8b72ff')
      : (formedHighlight ? '#c7f3ff' : '#43ddff');
    ctx.beginPath();
    ctx.arc(particles.screenX[index], particles.screenY[index], .65 + particles.size[index] * .68, 0, TAU);
    ctx.fill();
  }
  ctx.restore();

  drawSparks();
  drawInteraction(point, time);
  raf = requestAnimationFrame(draw);
}

watch(
  () => gestureStore.transition.token,
  token => {
    const transition = gestureStore.transition;
    if (token && transition.number && transition.phase !== 'idle') {
      triggerDigit(transition.number, token, false);
    }
  },
  { immediate: true }
);

watch(
  () => gestureStore.transition.phase,
  phase => {
    if (phase === 'idle' && activeToken) {
      digitHoldUntil = performance.now() + 260;
      releaseDigit();
    }
  }
);

watch(
  () => gestureStore.previewNumber,
  number => {
    if (gestureStore.transition.phase !== 'idle') return;
    if (number >= 1 && number <= 9) triggerDigit(number, 0, true);
    else if (previewMode) releaseDigit();
  }
);

watch(() => gestureStore.effectPulse, () => triggerBurst());

onMounted(() => {
  ctx = canvas.value.getContext('2d', { alpha: true, desynchronized: true });
  resize();
  resizeObserver = new ResizeObserver(resize);
  resizeObserver.observe(canvas.value);
  raf = requestAnimationFrame(draw);
});

onBeforeUnmount(() => {
  cancelAnimationFrame(raf);
  resizeObserver?.disconnect();
});
</script>

<template>
  <canvas ref="canvas" class="particle-canvas" :class="`particle-${mode}`" aria-hidden="true"></canvas>
</template>
