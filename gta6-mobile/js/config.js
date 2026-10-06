/* ============================================================
   VC6 Mobile — конфигурация и адаптивное качество графики.
   Три уровня: LOW / MEDIUM / HIGH. Автовыбор по devicePixelRatio,
   количеству ядер и живому FPS-мониторингу (динамический downscale).
   ============================================================ */
const QUALITY_PRESETS = {
  LOW: {
    pixelRatioCap: 1.0, renderScale: 0.65, shadows: false, shadowMapSize: 512,
    buildingsNear: 26, buildingDetail: 'low', peds: 8, cars: 6, trees: 40,
    fogDensity: 0.010, skySegments: 8, windowGlow: false, waterSegments: 16,
    antialias: false, lampposts: 12, neon: false
  },
  MEDIUM: {
    pixelRatioCap: 1.5, renderScale: 0.85, shadows: true, shadowMapSize: 1024,
    buildingsNear: 40, buildingDetail: 'mid', peds: 16, cars: 12, trees: 90,
    fogDensity: 0.006, skySegments: 12, windowGlow: true, waterSegments: 32,
    antialias: false, lampposts: 24, neon: true
  },
  HIGH: {
    pixelRatioCap: 2.0, renderScale: 1.0, shadows: true, shadowMapSize: 2048,
    buildingsNear: 60, buildingDetail: 'high', peds: 26, cars: 20, trees: 150,
    fogDensity: 0.0035, skySegments: 16, windowGlow: true, waterSegments: 48,
    antialias: true, lampposts: 40, neon: true
  }
};

const CFG = {
  WORLD_SIZE: 480,          // размер города в метрах (grid 8x8 кварталов)
  BLOCK: 60,               // размер квартала
  ROAD_W: 12,              // ширина дороги
  GRAVITY: 22,
  PLAYER_SPEED: 5.2,
  PLAYER_RUN: 9.0,
  PLAYER_JUMP: 8.5,
  CAR_ACCEL: 14,
  CAR_MAX_SPEED: 34,       // ~122 км/ч
  CAR_TURN: 1.9,
  DAY_LENGTH: 240,         // секунд на полный цикл суток
  START_MONEY: 250,
  MISSION_REWARD: 1500
};

/* Автовыбор качества для устройства */
function detectQuality() {
  const cores = navigator.hardwareConcurrency || 2;
  const mem = navigator.deviceMemory || 2;      // ГБ
  const mobile = /Android|iPhone|iPad|Mobile/i.test(navigator.userAgent);
  const gl = document.createElement('canvas').getContext('webgl');
  let renderer = '';
  if (gl) {
    const dbg = gl.getExtension('WEBGL_debug_renderer_info');
    if (dbg) renderer = String(gl.getParameter(dbg.UNMASKED_RENDERER_WEBGL)).toLowerCase();
  }
  const weak = /mali-4|adreno 3|powervr|swiftshader|llvmpipe|software/.test(renderer);
  if (!mobile && cores >= 6 && !weak) return 'HIGH';
  if (weak || cores <= 2 || mem <= 1.5) return 'LOW';
  if (cores >= 6 && mem >= 4) return mobile ? 'MEDIUM' : 'HIGH';
  return 'MEDIUM';
}

/* Глобальный текущий пресет (может меняться динамически) */
let QK = detectQuality();
let QP = QUALITY_PRESETS[QK];
