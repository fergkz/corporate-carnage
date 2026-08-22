const socket = window.io();

const SCALE = 26; // pixels por metro de mundo na tela
const BAKE_SCALE = 56; // pixels por metro de mundo dentro dos sprites pré-renderizados
const WALL_FILL = '#3f4c55';
const WALL_STROKE = '#20292c';
const FLOOR_FILL = '#1b2224';
const GRID_LINE = 'rgba(255,255,255,0.035)';
const ARENA_BORDER = '#7a4a22';
const SHIELD_CAPACITY = 60;
const BASE_VISION = 8; // unidades de mundo visíveis normalmente (estilo Project Zomboid)
const BOOSTED_VISION = 15; // unidades de mundo visíveis com o especial de visão ativo

// ---------------------------------------------------------------------------
// Sprites reais (pixel art), extraídos do pacote "Zombie Apocalypse Tileset"
// de Ittai Manero (itch.io, licença livre para uso pessoal e comercial).
// Personagem, zumbis, armas e itens vêm de lá; o rifle não existia no pacote
// e foi montado à mão na mesma paleta. Paredes/piso/mobília continuam sendo
// desenhados por código (o pacote é de tema rural, não combinava com o
// escritório).
// ---------------------------------------------------------------------------

const SPRITE_BASE = '/assets/sprites/';
function loadImage(file) {
  const img = new Image();
  img.src = SPRITE_BASE + file;
  return img;
}
function spriteReady(img) {
  return !!img && img.complete && img.naturalWidth > 0;
}

const sprites = {
  player: loadImage('player.png'),
  zombie: [loadImage('zombie_skinny.png'), loadImage('zombie_kid.png'), loadImage('zombie_big.png')],
  weaponIcon: {
    knife: loadImage('icon_knife.png'), pistol: loadImage('icon_pistol.png'),
    rifle: loadImage('icon_rifle.png'), shotgun: loadImage('icon_shotgun.png'),
  },
  ammoIcon: [loadImage('icon_ammo1.png'), loadImage('icon_ammo2.png'), loadImage('icon_ammo3.png')],
  healthIcon: loadImage('icon_health.png'),
  flash: { pistol: loadImage('flash_pistol.png'), shotgun: loadImage('flash_shotgun.png') },
  knifeSwipe: loadImage('swipe_knife.png'),
  corpse: loadImage('corpse.png'),
  explosion: loadImage('explosion.png'),
  bloodBurst: loadImage('blood_burst.png'),
  bloodStain: loadImage('blood_stain.png'),
};

function intToRgb(colorInt) {
  return { r: (colorInt >> 16) & 255, g: (colorInt >> 8) & 255, b: colorInt & 255 };
}
function shadeRgb(colorInt, amount) {
  const { r, g, b } = intToRgb(colorInt);
  const adjust = (c) => Math.max(0, Math.min(255, Math.round(amount > 0 ? c + (255 - c) * amount : c + c * amount)));
  return { r: adjust(r), g: adjust(g), b: adjust(b) };
}

// O sprite do jogador só existe numa cor (camiseta branca/calça cinza). Para dar
// uma aparência aleatória a cada agente, os pixels brancos e cinza são
// trocados pela cor sorteada do jogador (pixel a pixel, preservando pele e
// contorno) e o resultado fica em cache por cor.
const playerTintCache = new Map();
function getTintedPlayerSheet(colorInt) {
  const src = sprites.player;
  if (!spriteReady(src)) return null;
  let entry = playerTintCache.get(colorInt);
  if (entry) return entry;
  const w = src.naturalWidth;
  const h = src.naturalHeight;
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const g = canvas.getContext('2d');
  g.drawImage(src, 0, 0);
  const image = g.getImageData(0, 0, w, h);
  const px = image.data;
  const light = intToRgb(colorInt);
  const dark = shadeRgb(colorInt, -0.35);
  for (let i = 0; i < px.length; i += 4) {
    if (px[i] === 255 && px[i + 1] === 255 && px[i + 2] === 255 && px[i + 3] === 255) {
      px[i] = light.r; px[i + 1] = light.g; px[i + 2] = light.b;
    } else if (px[i] === 182 && px[i + 1] === 174 && px[i + 2] === 174 && px[i + 3] === 255) {
      px[i] = dark.r; px[i + 1] = dark.g; px[i + 2] = dark.b;
    }
  }
  g.putImageData(image, 0, 0);
  entry = { canvas, frameW: w / 2, frameH: h };
  playerTintCache.set(colorInt, entry);
  return entry;
}

const ZONES = [
  { x: -5.8, y: 9.8, w: 6.2, h: 6.4, color: 'rgba(84,214,210,0.06)', label: 'SERVIDORES' },
  { x: 7.9, y: -8.5, w: 5.9, h: 10.9, color: 'rgba(240,160,42,0.06)', label: 'COPA' },
  { x: 0, y: 15, w: 5.6, h: 4.6, color: 'rgba(230,160,60,0.05)', label: 'REUNIÃO' },
];

const canvas = document.querySelector('#scene');
const ctx = canvas.getContext('2d');
let width = innerWidth;
let height = innerHeight;

function resize() {
  width = innerWidth;
  height = innerHeight;
  const dpr = Math.min(devicePixelRatio || 1, 2);
  canvas.width = Math.round(width * dpr);
  canvas.height = Math.round(height * dpr);
  canvas.style.width = `${width}px`;
  canvas.style.height = `${height}px`;
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.imageSmoothingEnabled = false;
}
resize();
addEventListener('resize', resize);

const ui = {
  start: document.querySelector('#start'), name: document.querySelector('#name'), deploy: document.querySelector('#deploy'),
  health: document.querySelector('#health-number'), healthFill: document.querySelector('#health-fill'), timer: document.querySelector('#timer span'),
  scoreboard: document.querySelector('#scoreboard'), connection: document.querySelector('#connection'), weapon: document.querySelector('#weapon-name'),
  slots: [...document.querySelectorAll('.slot')], announcement: document.querySelector('#announcement'), damage: document.querySelector('#damage'),
  killfeed: document.querySelector('#killfeed'), ammo: document.querySelector('#ammo'), pickup: document.querySelector('#pickup-toast'),
  shieldBar: document.querySelector('#shield-bar'), shieldFill: document.querySelector('#shield-fill'), grenadeCount: document.querySelector('#grenade-count'),
  roundend: document.querySelector('#roundend'), roundendScoreboard: document.querySelector('#roundend-scoreboard'),
  roundendReady: document.querySelector('#roundend-ready'), roundendStatus: document.querySelector('#roundend-status'),
};

let world = { walls: [], props: [], arena: 22 };
let selfId = null;
let deployed = false;
let currentWeapon = 'knife';
let selfState = null;
let firing = false;
let lastClientShot = 0;
let lastHp = 100;
let mouseX = width / 2;
let mouseY = height / 2;
let visionRadius = BASE_VISION;
const keys = new Set();

const entities = new Map(); // id -> render state (interpolated)
const targets = new Map(); // id -> latest snapshot data
const pickupsState = [];
const tracers = [];
const explosions = [];
const corpses = [];
const bloodBursts = [];
let matchEndsAt = Date.now();

// ---------------------------------------------------------------------------
// Fábrica de sprites: em vez de bolinhas/ícones lisos, cada personagem e móvel
// é pré-desenhado uma vez num canvas fora da tela (com sombreado, contorno e
// várias camadas) e depois "colado" a cada quadro com drawImage — sem
// depender de nenhum arquivo de imagem externo.
// ---------------------------------------------------------------------------

const spriteCache = new Map();

function bakeSprite(key, worldWidth, worldHeight, draw) {
  let sprite = spriteCache.get(key);
  if (sprite) return sprite;
  const spriteCanvas = document.createElement('canvas');
  spriteCanvas.width = Math.max(1, Math.ceil(worldWidth * BAKE_SCALE));
  spriteCanvas.height = Math.max(1, Math.ceil(worldHeight * BAKE_SCALE));
  const g = spriteCanvas.getContext('2d');
  g.translate(spriteCanvas.width / 2, spriteCanvas.height / 2);
  g.scale(BAKE_SCALE, BAKE_SCALE);
  draw(g);
  sprite = { canvas: spriteCanvas, w: worldWidth, h: worldHeight };
  spriteCache.set(key, sprite);
  return sprite;
}

function paintSprite(sprite, scaleFactor = 1) {
  const w = sprite.w * scaleFactor;
  const h = sprite.h * scaleFactor;
  ctx.drawImage(sprite.canvas, -w / 2, -h / 2, w, h);
}

function shape(g, x, y, rx, ry, fillStyle, strokeStyle, lineWidth) {
  g.beginPath();
  g.ellipse(x, y, rx, ry, 0, 0, Math.PI * 2);
  if (fillStyle) { g.fillStyle = fillStyle; g.fill(); }
  if (strokeStyle) { g.lineWidth = lineWidth || 0.04; g.strokeStyle = strokeStyle; g.stroke(); }
}

// --- Personagens: sprites reais, viram apenas por espelhamento (esquerda/direita) ---
// enquanto a arma na mão gira livremente para acompanhar a mira do mouse.

const WALK_FRAME_MS = 190;

function drawCreatureSprite(sheet, x, y, angle, displayW, alive) {
  if (!sheet) return;
  const aspect = sheet.frameH / sheet.frameW;
  const displayH = displayW * aspect;
  const frame = alive === false ? 0 : Math.floor(performance.now() / WALK_FRAME_MS) % 2;
  const facingLeft = Math.cos(angle) < -0.05;
  ctx.save();
  ctx.translate(x, y);
  if (facingLeft) ctx.scale(-1, 1);
  ctx.drawImage(
    sheet.canvas, frame * sheet.frameW, 0, sheet.frameW, sheet.frameH,
    -displayW / 2, -displayH + 0.32, displayW, displayH,
  );
  ctx.restore();
}

function plainSheet(img) {
  if (!spriteReady(img)) return null;
  return { canvas: img, frameW: img.naturalWidth / 2, frameH: img.naturalHeight };
}

function drawWeaponInHand(weapon, angle, flashUntil, flashWeapon, now) {
  const icon = sprites.weaponIcon[weapon];
  if (!spriteReady(icon)) return;
  const size = 0.62;
  const aspect = icon.naturalHeight / icon.naturalWidth;
  // Recuo: nos ~90ms depois de um tiro, a arma desliza pra trás no próprio
  // eixo e volta suavemente conforme flashUntil se aproxima do passado.
  const kick = Math.max(0, (flashUntil - now) / 90) * 0.12;
  // Balanço contínuo e sutil de "respiração" ao andar/ficar parado, pra não
  // parecer congelada — não depende de saber se o personagem está se movendo.
  const sway = Math.sin(now / 220) * 0.03;
  ctx.save();
  ctx.rotate(angle + sway);
  ctx.translate(0.42 - kick, 0.12);
  ctx.drawImage(icon, 0, -size * aspect / 2, size, size * aspect);
  if (flashUntil > now && sprites.flash[flashWeapon] && spriteReady(sprites.flash[flashWeapon])) {
    const flash = sprites.flash[flashWeapon];
    const flashAspect = flash.naturalHeight / flash.naturalWidth;
    const flashW = 0.5;
    ctx.drawImage(flash, size * 0.7, -flashW * flashAspect / 2, flashW, flashW * flashAspect);
  }
  ctx.restore();
}

function drawKnifeSwipe(angle, progress) {
  const img = sprites.knifeSwipe;
  if (!spriteReady(img)) return;
  const aspect = img.naturalHeight / img.naturalWidth;
  const w = 1.1;
  // Varre de -0.5 a +0.5 rad relativo à mira ao longo da janela do golpe,
  // em vez de ficar estático — dá sensação de um corte de um lado ao outro.
  const p = Math.min(1, Math.max(0, progress ?? 0.5));
  const sweep = -0.5 + p * 1.0;
  ctx.save();
  ctx.rotate(angle + sweep);
  ctx.translate(0.55, 0);
  ctx.drawImage(img, 0, -w * aspect / 2, w, w * aspect);
  ctx.restore();
}

// --- Móveis pré-renderizados (tamanho fixo) ---

function drawDeskSprite(g) {
  shape(g, 0, 0.7, 0.34, 0.32, '#171d1f');
  g.fillStyle = '#0f1315';
  g.fillRect(-0.28, 0.42, 0.56, 0.14);
  const top = g.createLinearGradient(-1.1, -0.5, 1.1, 0.5);
  top.addColorStop(0, '#6e4a31');
  top.addColorStop(1, '#573c27');
  g.fillStyle = top;
  g.fillRect(-1.1, -0.5, 2.2, 1.0);
  g.strokeStyle = 'rgba(0,0,0,0.45)';
  g.lineWidth = 0.035;
  g.strokeRect(-1.1, -0.5, 2.2, 1.0);
  g.strokeStyle = 'rgba(0,0,0,0.12)';
  g.lineWidth = 0.018;
  for (let lx = -0.9; lx < 1.05; lx += 0.34) {
    g.beginPath(); g.moveTo(lx, -0.48); g.lineTo(lx, 0.48); g.stroke();
  }
  g.fillStyle = '#3a474c';
  g.fillRect(-1.02, -0.5, 0.08, 1.0);
  g.fillRect(0.94, -0.5, 0.08, 1.0);
  g.fillStyle = '#12181a';
  g.fillRect(-0.32, -0.42, 0.64, 0.4);
  g.fillStyle = '#1c5b60';
  g.fillRect(-0.27, -0.37, 0.54, 0.3);
  g.fillStyle = 'rgba(120,220,230,0.35)';
  g.fillRect(-0.27, -0.37, 0.54, 0.1);
  g.fillStyle = '#1c2529';
  g.fillRect(-0.26, 0.08, 0.5, 0.16);
}

function drawPlantSprite(g) {
  g.fillStyle = '#171d1f';
  g.fillRect(-0.28, -0.05, 0.56, 0.5);
  g.fillStyle = 'rgba(255,255,255,0.06)';
  g.fillRect(-0.28, -0.05, 0.56, 0.1);
  shape(g, 0, -0.3, 0.36, 0.32, '#2f5138');
  shape(g, -0.22, -0.48, 0.24, 0.24, '#3d6b46');
  shape(g, 0.24, -0.46, 0.26, 0.28, '#2f5138');
  shape(g, 0.03, -0.62, 0.2, 0.2, '#3d6b46');
}

function drawSofaSprite(g) {
  g.fillStyle = '#1c2f35';
  g.fillRect(-1.05, -0.58, 2.1, 0.34);
  const cushions = g.createLinearGradient(-1, -0.25, 1, 0.45);
  cushions.addColorStop(0, '#3a5b66');
  cushions.addColorStop(1, '#31515b');
  g.fillStyle = cushions;
  g.fillRect(-1.0, -0.25, 2.0, 0.7);
  g.strokeStyle = 'rgba(0,0,0,0.35)';
  g.lineWidth = 0.025;
  [-0.34, 0.34].forEach((sx) => { g.beginPath(); g.moveTo(sx, -0.25); g.lineTo(sx, 0.45); g.stroke(); });
  g.fillStyle = '#233a41';
  g.fillRect(-1.08, -0.28, 0.18, 0.76);
  g.fillRect(0.9, -0.28, 0.18, 0.76);
}

function drawServerRackSprite(g) {
  g.fillStyle = '#232b2f';
  g.fillRect(-0.42, -0.78, 0.84, 1.56);
  g.strokeStyle = 'rgba(0,0,0,0.5)';
  g.lineWidth = 0.03;
  g.strokeRect(-0.42, -0.78, 0.84, 1.56);
  g.fillStyle = '#171d1f';
  for (let ly = -0.64; ly < 0.72; ly += 0.22) g.fillRect(-0.34, ly, 0.68, 0.14);
  const blink = ['#4ee08a', '#f0a02a', '#e05252'];
  for (let i = 0; i < 6; i += 1) {
    g.fillStyle = blink[i % blink.length];
    g.fillRect(-0.3 + (i % 3) * 0.22, -0.72 + Math.floor(i / 3) * 0.24, 0.05, 0.05);
  }
}

function drawWaterCoolerSprite(g) {
  g.fillStyle = '#3a474c';
  g.fillRect(-0.22, 0.08, 0.44, 0.5);
  shape(g, 0, -0.28, 0.2, 0.32, 'rgba(140,210,230,0.5)', 'rgba(255,255,255,0.3)', 0.025);
  g.fillStyle = '#dfe7e8';
  g.fillRect(-0.05, 0.02, 0.1, 0.1);
}

function drawWhiteboardSprite(g) {
  g.fillStyle = '#c8d6d8';
  g.fillRect(-0.8, -0.09, 1.6, 0.18);
  g.strokeStyle = '#8a969a';
  g.lineWidth = 0.025;
  g.strokeRect(-0.8, -0.09, 1.6, 0.18);
  g.strokeStyle = '#e0574d';
  g.lineWidth = 0.02;
  g.beginPath(); g.moveTo(-0.6, -0.02); g.lineTo(-0.32, 0.03); g.lineTo(-0.12, -0.03); g.stroke();
  g.strokeStyle = '#3f7fd1';
  g.beginPath(); g.moveTo(0.08, 0.02); g.lineTo(0.46, -0.02); g.stroke();
  g.fillStyle = '#232b2f';
  g.fillRect(-0.05, 0.09, 0.1, 0.14);
}

function drawSignSprite(g, text) {
  g.fillStyle = '#11191c';
  g.fillRect(-1.3, -0.3, 2.6, 0.6);
  g.strokeStyle = '#d78c25';
  g.lineWidth = 0.035;
  g.strokeRect(-1.24, -0.24, 2.48, 0.48);
  g.fillStyle = '#dfe7e8';
  g.font = "700 0.26px 'Barlow Condensed', sans-serif";
  g.textAlign = 'center';
  g.textBaseline = 'middle';
  g.fillText(text, 0, -0.07);
  g.fillStyle = '#d78c25';
  g.font = '600 0.09px Inter, sans-serif';
  g.fillText('EMERGENCY OPERATIONS DIVISION', 0, 0.17);
}

const FURNITURE_SPRITES = {
  desk: () => bakeSprite('desk', 2.2, 2.2, drawDeskSprite),
  plant: () => bakeSprite('plant', 1.0, 1.2, drawPlantSprite),
  sofa: () => bakeSprite('sofa', 2.16, 1.34, drawSofaSprite),
  server_rack: () => bakeSprite('server_rack', 0.9, 1.62, drawServerRackSprite),
  water_cooler: () => bakeSprite('water_cooler', 0.5, 0.66, drawWaterCoolerSprite),
  whiteboard: () => bakeSprite('whiteboard', 1.65, 0.36, drawWhiteboardSprite),
};

function drawDynamicProp(prop) {
  switch (prop.type) {
    case 'reception': {
      const grad = ctx.createLinearGradient(-prop.w / 2, -prop.h / 2, prop.w / 2, prop.h / 2);
      grad.addColorStop(0, '#6e4a31');
      grad.addColorStop(1, '#573c27');
      ctx.fillStyle = grad;
      ctx.fillRect(-prop.w / 2, -prop.h / 2, prop.w, prop.h);
      ctx.strokeStyle = 'rgba(0,0,0,0.4)';
      ctx.lineWidth = 0.05;
      ctx.strokeRect(-prop.w / 2, -prop.h / 2, prop.w, prop.h);
      ctx.fillStyle = '#f0a02a';
      ctx.fillRect(-prop.w / 2 + 0.2, -0.12, prop.w - 0.4, 0.24);
      ctx.fillStyle = '#12181a';
      ctx.fillRect(-0.55, -prop.h / 2 + 0.3, 0.5, 0.34);
      ctx.fillRect(0.15, -prop.h / 2 + 0.3, 0.5, 0.34);
      ctx.fillStyle = 'rgba(120,220,230,0.4)';
      ctx.fillRect(-0.5, -prop.h / 2 + 0.35, 0.4, 0.1);
      ctx.fillRect(0.2, -prop.h / 2 + 0.35, 0.4, 0.1);
      break;
    }
    case 'table': {
      const grad = ctx.createLinearGradient(-prop.w / 2, -prop.h / 2, prop.w / 2, prop.h / 2);
      grad.addColorStop(0, '#7a5636');
      grad.addColorStop(1, '#5a3c27');
      ctx.fillStyle = grad;
      ctx.fillRect(-prop.w / 2, -prop.h / 2, prop.w, prop.h);
      ctx.strokeStyle = 'rgba(0,0,0,0.4)';
      ctx.lineWidth = 0.04;
      ctx.strokeRect(-prop.w / 2, -prop.h / 2, prop.w, prop.h);
      ctx.fillStyle = '#171d1f';
      const seats = Math.max(2, Math.round(prop.w / 1.1));
      for (let i = 0; i < seats; i += 1) {
        const sx = -prop.w / 2 + (prop.w / (seats - 1 || 1)) * i;
        ctx.beginPath(); ctx.arc(sx, -prop.h / 2 - 0.28, 0.22, 0, Math.PI * 2); ctx.fill();
        ctx.beginPath(); ctx.arc(sx, prop.h / 2 + 0.28, 0.22, 0, Math.PI * 2); ctx.fill();
      }
      break;
    }
    case 'break_table': {
      const grad = ctx.createRadialGradient(-0.2, -0.2, 0.1, 0, 0, 0.85);
      grad.addColorStop(0, '#7a5636');
      grad.addColorStop(1, '#573c27');
      ctx.fillStyle = grad;
      ctx.beginPath(); ctx.arc(0, 0, 0.72, 0, Math.PI * 2); ctx.fill();
      ctx.strokeStyle = 'rgba(0,0,0,0.4)';
      ctx.lineWidth = 0.035;
      ctx.stroke();
      ctx.fillStyle = '#171d1f';
      [[0, -1.02], [0, 1.02], [-1.02, 0], [1.02, 0]].forEach(([cx, cy]) => {
        ctx.beginPath(); ctx.arc(cx, cy, 0.22, 0, Math.PI * 2); ctx.fill();
      });
      break;
    }
    case 'cabinet': {
      const grad = ctx.createLinearGradient(-0.6, -2.5, 0.6, 2.5);
      grad.addColorStop(0, '#455258');
      grad.addColorStop(1, '#323d42');
      ctx.fillStyle = grad;
      ctx.fillRect(-0.6, -2.5, 1.2, 5);
      ctx.strokeStyle = 'rgba(0,0,0,0.4)';
      ctx.lineWidth = 0.03;
      ctx.strokeRect(-0.6, -2.5, 1.2, 5);
      const folders = ['#f0a02a', '#c45d42', '#6bd2ce', '#d9c15c'];
      let f = 0;
      for (let shelf = -1.8; shelf <= 1.8; shelf += 1.2) {
        ctx.fillStyle = '#20262a';
        ctx.fillRect(-0.5, shelf - 0.08, 1, 0.16);
        for (let fx = -0.42; fx < 0.42; fx += 0.16) {
          ctx.fillStyle = folders[f % folders.length];
          f += 1;
          ctx.fillRect(fx, shelf - 0.3, 0.1, 0.24);
        }
      }
      break;
    }
    case 'vending': {
      const grad = ctx.createLinearGradient(-1, -0.65, 1, 0.65);
      grad.addColorStop(0, '#2f3b41');
      grad.addColorStop(1, '#20272b');
      ctx.fillStyle = grad;
      ctx.fillRect(-1, -0.65, 2, 1.3);
      ctx.strokeStyle = 'rgba(0,0,0,0.4)';
      ctx.lineWidth = 0.03;
      ctx.strokeRect(-1, -0.65, 2, 1.3);
      ctx.fillStyle = '#12181a';
      ctx.fillRect(-0.86, -0.5, 1.3, 0.94);
      const snacks = ['#f0a02a', '#c45d42', '#6bd2ce', '#d9c15c', '#8ac26b'];
      let s = 0;
      for (let sy = -0.42; sy < 0.36; sy += 0.28) {
        for (let sx = -0.76; sx < 0.36; sx += 0.28) {
          ctx.fillStyle = snacks[s % snacks.length];
          s += 1;
          ctx.fillRect(sx, sy, 0.2, 0.2);
        }
      }
      ctx.fillStyle = '#f0a02a';
      ctx.fillRect(0.55, -0.5, 0.3, 0.94);
      break;
    }
    case 'sign':
      paintSprite(bakeSprite(`sign-${prop.text}`, 2.6, 0.6, (g) => drawSignSprite(g, prop.text)));
      break;
    default:
      break;
  }
}

function drawProp(prop) {
  ctx.save();
  ctx.translate(prop.x, prop.y);
  if (prop.rot) ctx.rotate(prop.rot);
  const factory = FURNITURE_SPRITES[prop.type];
  if (factory) paintSprite(factory());
  else drawDynamicProp(prop);
  ctx.restore();
}

function drawZones() {
  for (const zone of ZONES) {
    ctx.fillStyle = zone.color;
    ctx.fillRect(zone.x - zone.w / 2, zone.y - zone.h / 2, zone.w, zone.h);
    ctx.fillStyle = 'rgba(200,215,218,0.4)';
    ctx.font = '600 0.32px Inter, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(zone.label, zone.x, zone.y - zone.h / 2 + 0.4);
  }
}

function drawLightPools(arena) {
  for (let ly = -arena + 4; ly <= arena - 4; ly += 8) {
    for (let lx = -arena + 4; lx <= arena - 4; lx += 9) {
      const grad = ctx.createRadialGradient(lx, ly, 0, lx, ly, 3.4);
      grad.addColorStop(0, 'rgba(255,214,160,0.05)');
      grad.addColorStop(1, 'rgba(255,214,160,0)');
      ctx.fillStyle = grad;
      ctx.beginPath(); ctx.arc(lx, ly, 3.4, 0, Math.PI * 2); ctx.fill();
    }
  }
}

function drawFloor(arena) {
  ctx.fillStyle = FLOOR_FILL;
  ctx.fillRect(-arena, -arena, arena * 2, arena * 2);
  drawLightPools(arena);
  ctx.strokeStyle = GRID_LINE;
  ctx.lineWidth = 0.04;
  for (let g = -arena; g <= arena; g += 2) {
    ctx.beginPath(); ctx.moveTo(g, -arena); ctx.lineTo(g, arena); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(-arena, g); ctx.lineTo(arena, g); ctx.stroke();
  }
  drawZones();
  ctx.strokeStyle = ARENA_BORDER;
  ctx.lineWidth = 0.4;
  ctx.strokeRect(-arena, -arena, arena * 2, arena * 2);
}

function drawWalls() {
  for (const wall of world.walls) {
    ctx.fillStyle = WALL_FILL;
    ctx.fillRect(wall.x - wall.w / 2, wall.y - wall.h / 2, wall.w, wall.h);
    ctx.strokeStyle = WALL_STROKE;
    ctx.lineWidth = 0.06;
    ctx.strokeRect(wall.x - wall.w / 2, wall.y - wall.h / 2, wall.w, wall.h);
    ctx.fillStyle = 'rgba(255,255,255,0.05)';
    ctx.fillRect(wall.x - wall.w / 2, wall.y - wall.h / 2, wall.w, Math.min(0.12, wall.h));
  }
}

function drawProps() {
  for (const prop of world.props) drawProp(prop);
}

function drawImageIcon(img, displayW) {
  if (!spriteReady(img)) return;
  const aspect = img.naturalHeight / img.naturalWidth;
  ctx.drawImage(img, -displayW / 2, -displayW * aspect / 2, displayW, displayW * aspect);
}

function drawShieldIcon(iconCtx) {
  iconCtx.fillStyle = '#3f7fd1';
  iconCtx.beginPath();
  iconCtx.moveTo(0, -0.32);
  iconCtx.lineTo(0.26, -0.2);
  iconCtx.lineTo(0.26, 0.08);
  iconCtx.lineTo(0, 0.32);
  iconCtx.lineTo(-0.26, 0.08);
  iconCtx.lineTo(-0.26, -0.2);
  iconCtx.closePath();
  iconCtx.fill();
  iconCtx.strokeStyle = 'rgba(255,255,255,0.5)';
  iconCtx.lineWidth = 0.025;
  iconCtx.stroke();
  iconCtx.fillStyle = 'rgba(255,255,255,0.3)';
  iconCtx.fillRect(-0.06, -0.18, 0.12, 0.36);
}

function drawGrenadeIcon(iconCtx) {
  iconCtx.fillStyle = '#3a4a2e';
  iconCtx.beginPath(); iconCtx.arc(0, 0.04, 0.22, 0, Math.PI * 2); iconCtx.fill();
  iconCtx.strokeStyle = 'rgba(0,0,0,0.4)';
  iconCtx.lineWidth = 0.02;
  iconCtx.stroke();
  iconCtx.strokeStyle = 'rgba(0,0,0,0.3)';
  iconCtx.lineWidth = 0.015;
  [-0.08, 0, 0.08].forEach((dx) => { iconCtx.beginPath(); iconCtx.moveTo(dx, -0.15); iconCtx.lineTo(dx, 0.22); iconCtx.stroke(); });
  iconCtx.fillStyle = '#6b7a80';
  iconCtx.fillRect(-0.05, -0.32, 0.1, 0.14);
  iconCtx.strokeStyle = '#d9c15c';
  iconCtx.lineWidth = 0.03;
  iconCtx.beginPath(); iconCtx.arc(0.08, -0.26, 0.1, 0.6, 3.4); iconCtx.stroke();
}

function ammoIconFor(amount) {
  if (amount <= 10) return sprites.ammoIcon[0];
  if (amount <= 25) return sprites.ammoIcon[1];
  return sprites.ammoIcon[2];
}

function drawPickups(now) {
  for (const pickup of pickupsState) {
    ctx.save();
    ctx.translate(pickup.x, pickup.y + Math.sin(now * 0.003 + pickup.x) * 0.06);
    const glow = ctx.createRadialGradient(0, 0.1, 0, 0, 0.1, 0.55);
    glow.addColorStop(0, 'rgba(0,0,0,0.32)');
    glow.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = glow;
    ctx.beginPath(); ctx.arc(0, 0.1, 0.55, 0, Math.PI * 2); ctx.fill();
    if (pickup.kind === 'heart') {
      drawImageIcon(sprites.healthIcon, 0.6);
    } else if (pickup.kind === 'shield') {
      drawShieldIcon(ctx);
    } else if (pickup.kind === 'grenade') {
      ctx.rotate(Math.sin(now * 0.0015 + pickup.x) * 0.4);
      drawGrenadeIcon(ctx);
    } else if (pickup.kind === 'weapon') {
      drawImageIcon(sprites.weaponIcon[pickup.weapon], 0.85);
    } else {
      drawImageIcon(ammoIconFor(pickup.amount), 0.55);
    }
    ctx.restore();
  }
}

function drawExplosions(dt) {
  for (let i = explosions.length - 1; i >= 0; i -= 1) {
    const explosion = explosions[i];
    explosion.life -= dt;
    if (explosion.life <= 0) { explosions.splice(i, 1); continue; }
    const t = 1 - Math.max(0, explosion.life / explosion.duration);
    ctx.save();
    ctx.globalAlpha = Math.max(0, 1 - t * t);
    const glowRadius = explosion.radius * (0.4 + t * 0.6);
    const glow = ctx.createRadialGradient(explosion.x, explosion.y, 0, explosion.x, explosion.y, glowRadius);
    glow.addColorStop(0, 'rgba(255,205,150,0.55)');
    glow.addColorStop(1, 'rgba(255,140,60,0)');
    ctx.fillStyle = glow;
    ctx.beginPath(); ctx.arc(explosion.x, explosion.y, glowRadius, 0, Math.PI * 2); ctx.fill();
    if (spriteReady(sprites.explosion)) {
      const frameCount = 6;
      const frame = Math.min(frameCount - 1, Math.floor(t * frameCount));
      const frameW = sprites.explosion.naturalWidth / frameCount;
      const frameH = sprites.explosion.naturalHeight;
      const size = explosion.radius * 1.7;
      ctx.drawImage(sprites.explosion, frame * frameW, 0, frameW, frameH, explosion.x - size / 2, explosion.y - size / 2, size, size);
    }
    ctx.restore();
  }
}

// Corpo caído (com moscas alternando) + mancha de sangue no chão, criados no
// instante em que uma entidade passa de viva pra morta (ver `interpolate`).
// Independentes do Map `entities` para continuarem visíveis mesmo depois que
// o id original é reciclado por um respawn.
function spawnDeathEffect(entity) {
  const now = performance.now();
  corpses.push({ x: entity.x, y: entity.y, angle: entity.angle, until: now + 4200, stain: Math.floor(Math.random() * 5) });
  bloodBursts.push({ x: entity.x, y: entity.y, life: 0.3, duration: 0.3 });
}

function drawBloodStains(now) {
  if (!spriteReady(sprites.bloodStain)) return;
  const frameW = sprites.bloodStain.naturalWidth / 5;
  const frameH = sprites.bloodStain.naturalHeight;
  for (const corpse of corpses) {
    const age = 1 - Math.max(0, (corpse.until - now) / 4200);
    const fade = Math.max(0, 1 - Math.max(0, age - 0.7) / 0.3);
    ctx.save();
    ctx.globalAlpha = 0.85 * fade;
    ctx.drawImage(sprites.bloodStain, corpse.stain * frameW, 0, frameW, frameH, corpse.x - 0.55, corpse.y - 0.5, 1.1, frameH / frameW * 1.1);
    ctx.restore();
  }
}

function drawCorpses(now) {
  if (!spriteReady(sprites.corpse)) return;
  const frameW = sprites.corpse.naturalWidth / 2;
  const frameH = sprites.corpse.naturalHeight;
  for (let i = corpses.length - 1; i >= 0; i -= 1) {
    const corpse = corpses[i];
    if (now >= corpse.until) { corpses.splice(i, 1); continue; }
    const flicker = Math.floor(now / 260) % 2;
    const fadeOut = Math.max(0, Math.min(1, (corpse.until - now) / 400));
    ctx.save();
    ctx.globalAlpha = fadeOut;
    ctx.translate(corpse.x, corpse.y);
    if (Math.cos(corpse.angle) < 0) ctx.scale(-1, 1);
    ctx.drawImage(sprites.corpse, flicker * frameW, 0, frameW, frameH, -0.65, -1.05, 1.3, frameH / frameW * 1.3);
    ctx.restore();
  }
}

function drawBloodBursts(dt) {
  if (!spriteReady(sprites.bloodBurst)) { bloodBursts.length = 0; return; }
  const frameCount = 5;
  const frameW = sprites.bloodBurst.naturalWidth / frameCount;
  const frameH = sprites.bloodBurst.naturalHeight;
  for (let i = bloodBursts.length - 1; i >= 0; i -= 1) {
    const burst = bloodBursts[i];
    burst.life -= dt;
    if (burst.life <= 0) { bloodBursts.splice(i, 1); continue; }
    const t = 1 - Math.max(0, burst.life / burst.duration);
    const frame = Math.min(frameCount - 1, Math.floor(t * frameCount));
    ctx.save();
    ctx.globalAlpha = Math.max(0, 1 - t);
    const size = 1.3;
    ctx.drawImage(sprites.bloodBurst, frame * frameW, 0, frameW, frameH, burst.x - size / 2, burst.y - size / 2, size, frameH / frameW * size);
    ctx.restore();
  }
}

// O pacote de sprites só tem 3 zumbis; a variante 4 ("bomba", vinda do servidor)
// reaproveita o corpo do zumbi grande com um brilho vermelho pulsante por cima.
const ZOMBIE_SPRITE_INDEX = [0, 1, 2, 2];

function drawZombies(now) {
  for (const [, entity] of entities) {
    if (entity.kind !== 'zombie' || entity.alive === false) continue;
    ctx.fillStyle = 'rgba(0,0,0,0.4)';
    ctx.beginPath(); ctx.ellipse(entity.x, entity.y + 0.1, 0.5, 0.22, 0, 0, Math.PI * 2); ctx.fill();
    if (entity.variant === 3) {
      const armed = entity.fuseAt > 0;
      const pulse = 0.5 + 0.5 * Math.sin(now / (armed ? 55 : 220));
      const glowRadius = armed ? 0.95 : 0.75;
      const glow = ctx.createRadialGradient(entity.x, entity.y, 0, entity.x, entity.y, glowRadius);
      glow.addColorStop(0, `rgba(255,60,40,${(armed ? 0.75 : 0.45) * pulse})`);
      glow.addColorStop(1, 'rgba(255,60,40,0)');
      ctx.fillStyle = glow;
      ctx.beginPath(); ctx.arc(entity.x, entity.y, glowRadius, 0, Math.PI * 2); ctx.fill();
    }
    drawCreatureSprite(plainSheet(sprites.zombie[ZOMBIE_SPRITE_INDEX[entity.variant || 0]]), entity.x, entity.y, entity.angle, 1.15, entity.alive);
    if (typeof entity.hp === 'number' && entity.hp < 65) {
      const barWidth = 0.7;
      ctx.fillStyle = 'rgba(0,0,0,0.5)';
      ctx.fillRect(entity.x - barWidth / 2, entity.y - 0.85, barWidth, 0.08);
      ctx.fillStyle = '#bf3c35';
      ctx.fillRect(entity.x - barWidth / 2, entity.y - 0.85, barWidth * Math.max(0, entity.hp / 65), 0.08);
    }
  }
  void now;
}

function drawPlayers(now) {
  for (const [id, entity] of entities) {
    if (entity.kind !== 'player' || entity.alive === false) continue;
    const weapon = id === selfId ? currentWeapon : (entity.weapon || 'knife');
    ctx.fillStyle = 'rgba(0,0,0,0.4)';
    ctx.beginPath(); ctx.ellipse(entity.x, entity.y + 0.14, 0.5, 0.24, 0, 0, Math.PI * 2); ctx.fill();
    drawCreatureSprite(getTintedPlayerSheet(entity.color ?? 0x888888), entity.x, entity.y, entity.angle, 1.25, entity.alive);
    ctx.save();
    ctx.translate(entity.x, entity.y);
    if (entity.swingUntil > now) {
      const swingProgress = 1 - Math.min(1, Math.max(0, (entity.swingUntil - now) / 150));
      drawKnifeSwipe(entity.angle, swingProgress);
    } else {
      drawWeaponInHand(weapon, entity.angle, entity.flashUntil || 0, entity.flashWeapon, now);
    }
    ctx.restore();
    if (entity.shield > 0) {
      ctx.strokeStyle = 'rgba(63,127,209,0.85)';
      ctx.lineWidth = 0.09;
      ctx.beginPath(); ctx.arc(entity.x, entity.y, 0.82, 0, Math.PI * 2); ctx.stroke();
    }
    if (id === selfId) {
      ctx.strokeStyle = '#f3a229';
      ctx.lineWidth = 0.07;
      ctx.beginPath(); ctx.arc(entity.x, entity.y, 0.74, 0, Math.PI * 2); ctx.stroke();
    } else if (typeof entity.hp === 'number') {
      ctx.font = `${11 / SCALE}px Inter, sans-serif`;
      ctx.textAlign = 'center';
      ctx.fillStyle = 'rgba(220,230,232,0.85)';
      ctx.fillText(entity.name || '', entity.x, entity.y - 1.05);
      const barWidth = 0.9;
      ctx.fillStyle = 'rgba(0,0,0,0.5)';
      ctx.fillRect(entity.x - barWidth / 2, entity.y - 0.95, barWidth, 0.1);
      ctx.fillStyle = entity.hp > 60 ? '#50d89d' : entity.hp > 30 ? '#f0a02a' : '#bf3c35';
      ctx.fillRect(entity.x - barWidth / 2, entity.y - 0.95, barWidth * Math.max(0, entity.hp / 100), 0.1);
    }
  }
}

function drawTracers(dt) {
  for (let i = tracers.length - 1; i >= 0; i -= 1) {
    const tracer = tracers[i];
    tracer.life -= dt;
    if (tracer.life <= 0) { tracers.splice(i, 1); continue; }
    ctx.strokeStyle = tracer.color;
    ctx.globalAlpha = Math.max(0, tracer.life * 6);
    ctx.lineWidth = 0.06;
    ctx.beginPath(); ctx.moveTo(tracer.x1, tracer.y1); ctx.lineTo(tracer.x2, tracer.y2); ctx.stroke();
    ctx.globalAlpha = 1;
  }
}

function drawReticle() {
  ctx.save();
  ctx.strokeStyle = 'rgba(255,255,255,0.85)';
  ctx.lineWidth = 1.4;
  ctx.beginPath(); ctx.arc(mouseX, mouseY, 9, 0, Math.PI * 2); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(mouseX - 14, mouseY); ctx.lineTo(mouseX - 5, mouseY); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(mouseX + 5, mouseY); ctx.lineTo(mouseX + 14, mouseY); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(mouseX, mouseY - 14); ctx.lineTo(mouseX, mouseY - 5); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(mouseX, mouseY + 5); ctx.lineTo(mouseX, mouseY + 14); ctx.stroke();
  ctx.restore();
}

// Vinheta de campo de visão limitado (estilo Project Zomboid): desenhada em
// espaço de tela (a câmera sempre centraliza o jogador local em width/2,
// height/2), então um gradiente radial centrado no meio da tela já corresponde
// exatamente à posição do jogador no mundo. A área clara é alongada e deslocada
// na direção em que o personagem está olhando (ângulo de mira), não um círculo
// uniforme — por isso se vê bem mais longe pra frente do que pros lados/trás.
function drawFogOfWar(radiusWorldUnits, angle) {
  const rx = radiusWorldUnits * SCALE;
  const ry = rx * 0.58;
  const forwardShift = rx * 0.32;
  ctx.save();
  ctx.translate(width / 2, height / 2);
  ctx.rotate(angle || 0);
  ctx.translate(forwardShift, 0);
  ctx.scale(1, ry / rx);
  const grad = ctx.createRadialGradient(0, 0, rx * 0.32, 0, 0, rx);
  grad.addColorStop(0, 'rgba(2,5,6,0)');
  grad.addColorStop(1, 'rgba(2,5,6,0.97)');
  ctx.fillStyle = grad;
  ctx.fillRect(-6000, -6000, 12000, 12000);
  ctx.restore();
}

function render(now, dt) {
  const self = entities.get(selfId);
  const camX = self ? self.x : 0;
  const camY = self ? self.y : 0;

  ctx.save();
  ctx.fillStyle = '#05090c';
  ctx.fillRect(0, 0, width, height);
  ctx.translate(width / 2, height / 2);
  ctx.scale(SCALE, SCALE);
  ctx.translate(-camX, -camY);

  drawFloor(world.arena);
  drawBloodStains(now);
  drawWalls();
  drawProps();
  drawPickups(now);
  drawCorpses(now);
  drawZombies(now);
  drawPlayers(now);
  drawTracers(dt);
  drawBloodBursts(dt);
  drawExplosions(dt);
  ctx.restore();

  if (deployed) {
    drawFogOfWar(visionRadius, aimAngle());
    drawReticle();
  }
}

function aimAngle() {
  return Math.atan2(mouseY - height / 2, mouseX - width / 2);
}

function lerpAngle(a, b, t) {
  const diff = ((b - a + Math.PI * 3) % (Math.PI * 2)) - Math.PI;
  return a + diff * t;
}

function syncEntity(id, kind, data) {
  let entity = entities.get(id);
  if (!entity) {
    entity = { x: data.x, y: data.y, angle: data.angle || 0, kind, swingUntil: 0 };
    entities.set(id, entity);
  }
  entity.kind = kind;
  targets.set(id, data);
}

function removeMissing(validIds) {
  for (const id of [...entities.keys()]) {
    if (!validIds.has(id)) { entities.delete(id); targets.delete(id); }
  }
}

function interpolate(dt) {
  const factor = Math.min(1, dt * 12);
  for (const [id, entity] of entities) {
    const target = targets.get(id);
    if (!target) continue;
    entity.x += (target.x - entity.x) * factor;
    entity.y += (target.y - entity.y) * factor;
    entity.angle = lerpAngle(entity.angle, target.angle || entity.angle, factor);
    entity.hp = target.hp;
    if (entity.alive === true && target.alive === false) spawnDeathEffect(entity);
    entity.alive = target.alive;
    entity.name = target.name;
    entity.color = target.color;
    entity.variant = target.variant;
    entity.weapon = target.weapon;
    entity.shield = target.shield;
    entity.fuseAt = target.fuseAt;
  }
}

function escapeHtml(value) {
  return String(value).replace(/[&<>'"]/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' }[char]));
}

function updateHud(players) {
  const self = players.find((player) => player.id === selfId);
  if (self) {
    selfState = self;
    // `visionBoostUntil` vem de um pickup especial de visão tratado no servidor;
    // aqui só decidimos o raio de visão local a partir dele.
    visionRadius = (self.visionBoostUntil > Date.now()) ? BOOSTED_VISION : BASE_VISION;
    if (self.weapon !== currentWeapon) activateWeapon(self.weapon, false);
    if (self.hp < lastHp) { ui.damage.style.opacity = '.78'; setTimeout(() => { ui.damage.style.opacity = '0'; }, 130); }
    lastHp = self.hp;
    ui.health.textContent = self.hp;
    ui.healthFill.style.width = `${self.hp}%`;
    ui.ammo.textContent = currentWeapon === 'knife' ? '∞' : String(self.ammo[currentWeapon] ?? 0);
    const order = ['knife', 'pistol', 'rifle', 'shotgun'];
    ui.slots.forEach((slot, index) => slot.classList.toggle('locked', !self.inventory.includes(order[index])));
    const shieldPct = Math.round(((self.shield || 0) / SHIELD_CAPACITY) * 100);
    ui.shieldFill.style.width = `${shieldPct}%`;
    ui.shieldBar.classList.toggle('active', shieldPct > 0);
    ui.grenadeCount.textContent = String(self.grenades || 0);
  }
  const seconds = Math.max(0, Math.ceil((matchEndsAt - Date.now()) / 1000));
  ui.timer.textContent = `${String(Math.floor(seconds / 60)).padStart(2, '0')}:${String(seconds % 60).padStart(2, '0')}`;
  const sorted = [...players].sort((a, b) => b.score - a.score);
  ui.scoreboard.innerHTML = `<div class="score-head"><span>AGENTE</span><span>PTS</span><span>K</span></div>${sorted.map((p) => `<div class="score-row ${p.id === selfId ? 'self' : ''}"><span>${escapeHtml(p.name)}</span><b>${p.score}</b><span>${p.kills}</span></div>`).join('')}`;
}

function activateWeapon(weapon, emit = true) {
  const order = ['knife', 'pistol', 'rifle', 'shotgun'];
  const index = order.indexOf(weapon);
  if (index < 0 || (emit && selfState && !selfState.inventory.includes(weapon))) return;
  currentWeapon = weapon;
  if (emit) socket.emit('weapon', weapon);
  ui.slots.forEach((slot, i) => slot.classList.toggle('active', i === index));
  ui.weapon.textContent = ['FACA TÁTICA', 'PISTOLA P9', 'RIFLE AR-21', 'ESCOPETA M12'][index];
}

const cooldowns = { knife: 480, pistol: 330, rifle: 110, shotgun: 720 };
function attemptShoot() {
  if (!deployed) return;
  const now = performance.now();
  if (now - lastClientShot < cooldowns[currentWeapon]) return;
  lastClientShot = now;
  socket.emit('shoot', { weapon: currentWeapon, angle: aimAngle() });
}

let lastClientGrenade = 0;
function attemptGrenade() {
  if (!deployed) return;
  const now = performance.now();
  if (now - lastClientGrenade < 900) return;
  lastClientGrenade = now;
  const cursorDistance = Math.hypot(mouseX - width / 2, mouseY - height / 2) / SCALE;
  socket.emit('throwGrenade', { angle: aimAngle(), distance: cursorDistance });
}

socket.on('connect', () => { ui.connection.textContent = 'LINK ESTÁVEL'; });
socket.on('disconnect', () => { ui.connection.textContent = 'RECONECTANDO'; });
socket.on('welcome', (data) => {
  selfId = data.id;
  world = { walls: data.walls, props: data.props, arena: data.arena };
  matchEndsAt = data.matchEndsAt;
});
socket.on('snapshot', (snapshot) => {
  matchEndsAt = snapshot.matchEndsAt;
  const valid = new Set();
  for (const player of snapshot.players) { valid.add(player.id); syncEntity(player.id, 'player', player); }
  for (const zombie of snapshot.zombies) { valid.add(zombie.id); syncEntity(zombie.id, 'zombie', zombie); }
  removeMissing(valid);
  pickupsState.length = 0;
  pickupsState.push(...(snapshot.pickups || []));
  updateHud(snapshot.players);
});
socket.on('announcement', (message) => {
  ui.announcement.querySelector('h2').textContent = message.title;
  ui.announcement.querySelector('p').textContent = message.subtitle;
  ui.announcement.classList.add('show');
  setTimeout(() => ui.announcement.classList.remove('show'), message.brief ? 1400 : 3300);
  if (message.title === 'NOVA RODADA') ui.roundend.style.display = 'none';
});
socket.on('roundEnd', (data) => {
  const sorted = [...(data.scores || [])].sort((a, b) => b.score - a.score);
  ui.roundendScoreboard.innerHTML = `<div class="score-head"><span>AGENTE</span><span>PTS</span><span>K</span></div>${sorted.map((p) => `<div class="score-row ${p.id === selfId ? 'self' : ''}"><span>${escapeHtml(p.name)}</span><b>${p.score}</b><span>${p.kills}</span></div>`).join('')}`;
  ui.roundendReady.disabled = false;
  ui.roundendReady.textContent = 'PRÓXIMA PARTIDA';
  ui.roundendStatus.textContent = '';
  ui.roundend.style.display = 'grid';
});
socket.on('readyUpdate', ({ ready, total }) => {
  ui.roundendStatus.textContent = `${ready}/${total} PRONTOS`;
});
socket.on('killfeed', (message) => {
  const row = document.createElement('div');
  row.className = 'kill';
  row.textContent = message;
  ui.killfeed.prepend(row);
  setTimeout(() => row.remove(), 4100);
});
socket.on('pickup', (message) => {
  ui.pickup.textContent = message.label;
  ui.pickup.classList.add('show');
  setTimeout(() => ui.pickup.classList.remove('show'), 1600);
});
socket.on('shot', (shot) => {
  const entity = entities.get(shot.id);
  if (shot.weapon === 'knife') {
    if (entity) entity.swingUntil = performance.now() + 150;
    return;
  }
  if (entity && sprites.flash[shot.weapon]) {
    entity.flashUntil = performance.now() + 90;
    entity.flashWeapon = shot.weapon;
  }
  const impact = shot.impacts[0];
  if (!impact) return;
  tracers.push({ x1: shot.x, y1: shot.y, x2: impact.x, y2: impact.y, life: 0.12, color: shot.weapon === 'shotgun' ? '#ffb04a' : '#8be9ff' });
});
socket.on('grenade', (data) => {
  explosions.push({ x: data.x, y: data.y, radius: data.radius, life: 0.35, duration: 0.35 });
});

ui.deploy.addEventListener('click', () => {
  deployed = true;
  socket.emit('ready', ui.name.value);
  ui.start.style.display = 'none';
});
ui.roundendReady.addEventListener('click', () => {
  socket.emit('readyNext');
  ui.roundendReady.disabled = true;
  ui.roundendReady.textContent = 'AGUARDANDO OUTROS AGENTES...';
});
addEventListener('mousemove', (event) => { mouseX = event.clientX; mouseY = event.clientY; });
addEventListener('mousedown', (event) => { if (event.button === 0) { firing = true; attemptShoot(); } });
addEventListener('mouseup', (event) => { if (event.button === 0) firing = false; });
addEventListener('keydown', (event) => {
  keys.add(event.code);
  if (event.code === 'Digit1') activateWeapon('knife');
  if (event.code === 'Digit2') activateWeapon('pistol');
  if (event.code === 'Digit3') activateWeapon('rifle');
  if (event.code === 'Digit4') activateWeapon('shotgun');
  if (event.code === 'KeyG') attemptGrenade();
});
addEventListener('keyup', (event) => keys.delete(event.code));

let inputAccumulator = 0;
let lastFrame = performance.now();
function animate(now) {
  requestAnimationFrame(animate);
  const dt = Math.min((now - lastFrame) / 1000, 0.05);
  lastFrame = now;
  inputAccumulator += dt;

  if (deployed && inputAccumulator > 0.045) {
    const moveX = (keys.has('KeyD') ? 1 : 0) - (keys.has('KeyA') ? 1 : 0);
    const moveY = (keys.has('KeyS') ? 1 : 0) - (keys.has('KeyW') ? 1 : 0);
    socket.emit('input', { x: moveX, y: moveY, angle: aimAngle() });
    inputAccumulator = 0;
  }
  if (deployed && firing && currentWeapon === 'rifle') attemptShoot();

  interpolate(dt);
  render(now, dt);
}
requestAnimationFrame(animate);
