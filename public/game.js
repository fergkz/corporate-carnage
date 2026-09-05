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
const EXPLORED_MASK_RES = 3; // px por unidade de mundo na máscara de exploração (baixa resolução, célula ~0.33 unidade)
const STRETCH_WINDUP_MS = 650; // espelha o windupMs do zumbi "braço esticável" no servidor

// ---------------------------------------------------------------------------
// Sprites reais (pixel art), extraídos do pacote "Zombie Apocalypse Tileset"
// de Ittai Manero (itch.io, licença livre para uso pessoal e comercial).
// Personagem, zumbis, armas e itens vêm de lá; o rifle não existia no pacote
// e foi montado à mão na mesma paleta. Paredes/piso/mobília continuam sendo
// desenhados por código (o pacote é de tema rural, não combinava com o
// escritório). Os zumbis especiais (tanque, braço esticável, bomba retocada)
// são derivados via Pillow de frames do mesmo pacote; o cuspidor de ácido usa
// o "Turret Zombie" do pacote, que já tinha uma animação de cuspir pronta.
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

const ZOMBIE_TYPE_META = {
  normal0: { sprite: 'zombie_skinny.png', size: 1.15, maxHp: 65 },
  normal1: { sprite: 'zombie_kid.png', size: 1.15, maxHp: 65 },
  normal2: { sprite: 'zombie_big.png', size: 1.15, maxHp: 65 },
  bomb: { sprite: 'zombie_bomb.png', size: 1.15, maxHp: 65 },
  tank: { sprite: 'zombie_tank.png', size: 1.55, maxHp: 260 },
  stretcher: { sprite: 'zombie_stretcher.png', size: 1.15, maxHp: 70 },
  acid: { sprite: 'zombie_spitter.png', size: 1.15, maxHp: 55 },
  // Os 5 tipos abaixo reaproveitam corpos já existentes — a distinção visual
  // vem do brilho colorido (ZOMBIE_GLOW), não de sprite dedicado, dado o
  // volume de tipos novos pedidos numa única leva.
  screamer: { sprite: 'zombie_skinny.png', size: 1.15, maxHp: 55 },
  crawler: { sprite: 'zombie_kid.png', size: 0.9, maxHp: 30 },
  armored: { sprite: 'zombie_big.png', size: 1.2, maxHp: 90 },
  leaper: { sprite: 'zombie_stretcher.png', size: 1.15, maxHp: 60 },
  gasser: { sprite: 'zombie_spitter.png', size: 1.15, maxHp: 50 },
};

const ZOMBIE_GLOW = {
  screamer: '150,60,220',
  crawler: '60,220,190',
  armored: '150,170,190',
  leaper: '255,150,40',
  gasser: '140,220,80',
};

const sprites = {
  player: loadImage('player.png'),
  zombieByType: Object.fromEntries(Object.entries(ZOMBIE_TYPE_META).map(([id, meta]) => [id, loadImage(meta.sprite)])),
  acidProjectile: loadImage('acid_projectile.png'),
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
// `ctx` é `let`, não `const`, porque `renderRememberedLayer` a redireciona
// temporariamente para `rememberedCtx` (ver `withCanvasContext`) pra reusar
// drawFloor/drawWalls/drawProps sem duplicá-los.
let ctx = canvas.getContext('2d');
let width = innerWidth;
let height = innerHeight;

// Canvas offscreen onde a camada "lembrada" (chão/paredes/props escurecidos,
// recortados pela máscara de exploração) é composta antes de ser colada na
// tela — ver `renderRememberedLayer`.
const rememberedCanvas = document.createElement('canvas');
const rememberedCtx = rememberedCanvas.getContext('2d');

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
  rememberedCanvas.width = canvas.width;
  rememberedCanvas.height = canvas.height;
  rememberedCtx.setTransform(dpr, 0, 0, dpr, 0, 0);
  rememberedCtx.imageSmoothingEnabled = false;
}
resize();
addEventListener('resize', resize);

const ui = {
  landing: document.querySelector('#landing'), name: document.querySelector('#name'),
  btnCreateRoom: document.querySelector('#btn-create-room'), btnJoinByCode: document.querySelector('#btn-join-by-code'),
  roomCodeInput: document.querySelector('#room-code'), publicRooms: document.querySelector('#public-rooms'),
  createRoomEl: document.querySelector('#createRoom'), createRoomTitle: document.querySelector('#createRoom-title'),
  roomCreateBack: document.querySelector('#room-create-back'),
  roomCreateSubmit: document.querySelector('#room-create-submit'),
  lobbyEl: document.querySelector('#lobby'), lobbyRoomName: document.querySelector('#lobby-room-name'),
  lobbyLink: document.querySelector('#lobby-link'), lobbyCopyLink: document.querySelector('#lobby-copy-link'),
  lobbyPlayers: document.querySelector('#lobby-players'), lobbyStart: document.querySelector('#lobby-start'),
  lobbyStatus: document.querySelector('#lobby-status'), lobbySettings: document.querySelector('#lobby-settings'),
  lobbyLeave: document.querySelector('#lobby-leave'),
  health: document.querySelector('#health-number'), healthFill: document.querySelector('#health-fill'), timer: document.querySelector('#timer span'),
  objective: document.querySelector('#objective span'),
  scoreLimit: document.querySelector('#score-limit'), scoreLimitValue: document.querySelector('#score-limit span'),
  scoreboard: document.querySelector('#scoreboard'), connection: document.querySelector('#connection'), weapon: document.querySelector('#weapon-name'),
  slots: [...document.querySelectorAll('#weapon-slots .slot')], announcement: document.querySelector('#announcement'), damage: document.querySelector('#damage'),
  killfeed: document.querySelector('#killfeed'), ammo: document.querySelector('#ammo'), pickup: document.querySelector('#pickup-toast'),
  shieldBar: document.querySelector('#shield-bar'), shieldFill: document.querySelector('#shield-fill'), grenadeCount: document.querySelector('#grenade-count'),
  roundend: document.querySelector('#roundend'), roundendScoreboard: document.querySelector('#roundend-scoreboard'),
  roundendReady: document.querySelector('#roundend-ready'), roundendStatus: document.querySelector('#roundend-status'),
  roundendLobby: document.querySelector('#roundend-lobby'), roundendLeave: document.querySelector('#roundend-leave'),
};

let world = { walls: [], props: [], arena: 22 };
// Máscara de exploração: memória local de "por onde o jogador já passou"
// nesta partida. Começa totalmente transparente (nada explorado) e cada
// célula fica opaca pra sempre assim que o jogador visita — nunca volta a
// escurecer. Resetada só quando `world` é reatribuído (nova sala/partida),
// não a cada respawn.
let exploredMask = null; // { canvas, ctx, arena }
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

// --- Estado de sessão (sala/lobby) ---
let clientState = 'landing'; // 'landing' | 'createRoom' | 'lobby' | 'playing' | 'roundEnd'
let roomId = null;
let roomCode = null;
let isHost = false;

function setClientState(next) {
  clientState = next;
  deployed = next === 'playing';
  ui.landing.style.display = next === 'landing' ? 'grid' : 'none';
  ui.createRoomEl.style.display = next === 'createRoom' ? 'grid' : 'none';
  ui.lobbyEl.style.display = next === 'lobby' ? 'grid' : 'none';
  if (next === 'landing') requestRoomList();
}

const entities = new Map(); // id -> render state (interpolada), inclui players/zombies/projéteis
const targets = new Map(); // id -> último dado do snapshot
const pickupsState = [];
const tracers = [];
const explosions = [];
const corpses = [];
const bloodBursts = [];
let stageInfo = { index: 0, count: 1, name: '', objectiveLabel: '' };

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

function drawGrenadeInHand(angle, now) {
  const sway = Math.sin(now / 180) * 0.05;
  ctx.save();
  ctx.rotate(angle + sway);
  ctx.translate(0.4, 0.1);
  drawGrenadeIcon(ctx);
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
    } else if (pickup.kind === 'weapon' && pickup.weapon === 'rocket') {
      drawRocketIcon(ctx);
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

// Monta o contorno de uma língua/braço afinando da base pra ponta, com uma
// leve ondulação perpendicular ao longo do comprimento — silhueta preenchida
// em vez de um traço de largura constante, pra ler como carne, não como laser.
function tongueOutline(length, baseWidth, tipWidth, wobble, phase) {
  const segments = 10;
  const upper = [];
  const lower = [];
  for (let i = 0; i <= segments; i += 1) {
    const t = i / segments;
    const x = length * t;
    const width = baseWidth + (tipWidth - baseWidth) * t;
    const wave = Math.sin(t * Math.PI * 2.2 + phase) * wobble * t;
    upper.push([x, wave - width / 2]);
    lower.push([x, wave + width / 2]);
  }
  return { upper, lower };
}

function traceTongueOutline(g, outline) {
  g.beginPath();
  g.moveTo(outline.upper[0][0], outline.upper[0][1]);
  for (const [x, y] of outline.upper) g.lineTo(x, y);
  for (let i = outline.lower.length - 1; i >= 0; i -= 1) g.lineTo(outline.lower[i][0], outline.lower[i][1]);
  g.closePath();
}

// Telegraph do zumbi "braço esticável": uma língua/braço que estica, afina na
// ponta e ondula levemente conforme o golpe se aproxima — dá uma janela real
// de esquiva antes do impacto, em tom de carne em vez de um traço vermelho reto.
function drawStretchTelegraph(entity) {
  const now = Date.now();
  if (entity.stretchPhase === 'strike' || entity.stretchPhase === 'pull') {
    // Braço conectado: golpe/puxão em andamento — reforça visualmente o
    // acerto, já que antes strike/recover não tinham nenhum efeito próprio.
    ctx.save();
    ctx.translate(entity.x, entity.y - 0.5);
    ctx.rotate(entity.angle);
    const outline = tongueOutline(2.0, 0.24, 0.06, Math.sin(now / 90) * 0.05, now / 140);
    traceTongueOutline(ctx, outline);
    const grad = ctx.createLinearGradient(0, 0, 2.0, 0);
    grad.addColorStop(0, 'rgba(110,35,70,0.95)');
    grad.addColorStop(1, 'rgba(225,120,150,0.9)');
    ctx.fillStyle = grad;
    ctx.fill();
    ctx.strokeStyle = 'rgba(60,15,35,0.6)';
    ctx.lineWidth = 0.025;
    ctx.stroke();
    ctx.restore();
    return;
  }
  const remaining = (entity.phaseAt || 0) - now;
  if (remaining <= 0 || remaining > STRETCH_WINDUP_MS) return;
  const t = 1 - Math.max(0, Math.min(1, remaining / STRETCH_WINDUP_MS));
  const reach = 0.6 + t * 1.4;
  ctx.save();
  ctx.translate(entity.x, entity.y - 0.5);
  ctx.rotate(entity.angle);
  const outline = tongueOutline(reach, 0.1 + t * 0.1, 0.03, 0.03 * t, now / 160);
  traceTongueOutline(ctx, outline);
  const grad = ctx.createLinearGradient(0, 0, reach, 0);
  grad.addColorStop(0, `rgba(110,35,70,${0.4 + t * 0.4})`);
  grad.addColorStop(1, `rgba(225,${Math.round(120 - t * 20)},${Math.round(150 - t * 30)},${0.5 + t * 0.3})`);
  ctx.fillStyle = grad;
  ctx.fill();
  ctx.restore();
}

function drawZombies(now) {
  for (const [, entity] of entities) {
    if (entity.kind !== 'zombie' || entity.alive === false) continue;
    const meta = ZOMBIE_TYPE_META[entity.typeId] || ZOMBIE_TYPE_META.normal0;
    const displayW = meta.size;
    const shadowScale = displayW / 1.15;
    ctx.fillStyle = 'rgba(0,0,0,0.4)';
    ctx.beginPath(); ctx.ellipse(entity.x, entity.y + 0.1, 0.5 * shadowScale, 0.22 * shadowScale, 0, 0, Math.PI * 2); ctx.fill();
    if (entity.typeId === 'bomb') {
      const armed = entity.fuseAt > 0;
      const pulse = 0.5 + 0.5 * Math.sin(now / (armed ? 55 : 220));
      const glowRadius = armed ? 0.95 : 0.75;
      const glow = ctx.createRadialGradient(entity.x, entity.y, 0, entity.x, entity.y, glowRadius);
      glow.addColorStop(0, `rgba(255,60,40,${(armed ? 0.75 : 0.45) * pulse})`);
      glow.addColorStop(1, 'rgba(255,60,40,0)');
      ctx.fillStyle = glow;
      ctx.beginPath(); ctx.arc(entity.x, entity.y, glowRadius, 0, Math.PI * 2); ctx.fill();
    }
    const glowColor = ZOMBIE_GLOW[entity.typeId];
    if (glowColor) {
      const pulse = 0.5 + 0.5 * Math.sin(now / 260);
      const glowRadius = 0.7 * shadowScale;
      const glow = ctx.createRadialGradient(entity.x, entity.y, 0, entity.x, entity.y, glowRadius);
      glow.addColorStop(0, `rgba(${glowColor},${0.4 * pulse})`);
      glow.addColorStop(1, `rgba(${glowColor},0)`);
      ctx.fillStyle = glow;
      ctx.beginPath(); ctx.arc(entity.x, entity.y, glowRadius, 0, Math.PI * 2); ctx.fill();
    }
    if (entity.typeId === 'stretcher' && entity.stretchPhase && entity.stretchPhase !== 'idle' && entity.stretchPhase !== 'recover') drawStretchTelegraph(entity);
    drawCreatureSprite(plainSheet(sprites.zombieByType[entity.typeId]) || plainSheet(sprites.zombieByType.normal0), entity.x, entity.y, entity.angle, displayW, entity.alive);
    if (typeof entity.hp === 'number' && entity.hp < meta.maxHp) {
      const barWidth = 0.7 * shadowScale;
      ctx.fillStyle = 'rgba(0,0,0,0.5)';
      ctx.fillRect(entity.x - barWidth / 2, entity.y - 0.85 * shadowScale, barWidth, 0.08);
      ctx.fillStyle = '#bf3c35';
      ctx.fillRect(entity.x - barWidth / 2, entity.y - 0.85 * shadowScale, barWidth * Math.max(0, entity.hp / meta.maxHp), 0.08);
    }
  }
}

function drawAcidProjectiles() {
  for (const [, entity] of entities) {
    if (entity.kind !== 'projectile') continue;
    if (entity.projectileKind === 'rocket') continue; // desenhado em drawRockets()
    ctx.save();
    const glow = ctx.createRadialGradient(entity.x, entity.y, 0, entity.x, entity.y, 0.22);
    glow.addColorStop(0, 'rgba(150,230,60,0.85)');
    glow.addColorStop(1, 'rgba(150,230,60,0)');
    ctx.fillStyle = glow;
    ctx.beginPath(); ctx.arc(entity.x, entity.y, 0.22, 0, Math.PI * 2); ctx.fill();
    if (spriteReady(sprites.acidProjectile)) {
      const aspect = sprites.acidProjectile.naturalHeight / sprites.acidProjectile.naturalWidth;
      const w = 0.32;
      ctx.drawImage(sprites.acidProjectile, entity.x - w / 2, entity.y - w * aspect / 2, w, w * aspect);
    }
    ctx.restore();
  }
}

function drawGasHazards(now) {
  for (const [, entity] of entities) {
    if (entity.kind !== 'hazard') continue;
    const pulse = 0.5 + 0.5 * Math.sin(now / 300);
    const glow = ctx.createRadialGradient(entity.x, entity.y, 0, entity.x, entity.y, entity.radius || 2);
    glow.addColorStop(0, `rgba(120,200,70,${0.28 * pulse})`);
    glow.addColorStop(1, 'rgba(120,200,70,0)');
    ctx.fillStyle = glow;
    ctx.beginPath(); ctx.arc(entity.x, entity.y, entity.radius || 2, 0, Math.PI * 2); ctx.fill();
  }
}

function drawRocketIcon(iconCtx) {
  iconCtx.fillStyle = '#8a929a';
  iconCtx.beginPath();
  iconCtx.moveTo(0.24, 0);
  iconCtx.lineTo(-0.1, -0.08);
  iconCtx.lineTo(-0.1, 0.08);
  iconCtx.closePath();
  iconCtx.fill();
  iconCtx.fillStyle = '#3a474c';
  iconCtx.fillRect(-0.24, -0.06, 0.16, 0.12);
  iconCtx.fillStyle = '#c45d42';
  iconCtx.beginPath();
  iconCtx.moveTo(-0.24, -0.06); iconCtx.lineTo(-0.34, -0.12); iconCtx.lineTo(-0.24, -0.02); iconCtx.closePath(); iconCtx.fill();
  iconCtx.beginPath();
  iconCtx.moveTo(-0.24, 0.06); iconCtx.lineTo(-0.34, 0.12); iconCtx.lineTo(-0.24, 0.02); iconCtx.closePath(); iconCtx.fill();
}

function drawRockets() {
  for (const [, entity] of entities) {
    if (entity.kind !== 'projectile' || entity.projectileKind !== 'rocket') continue;
    ctx.save();
    ctx.translate(entity.x, entity.y);
    ctx.rotate(entity.angle || 0);
    const flame = ctx.createRadialGradient(-0.28, 0, 0, -0.28, 0, 0.22);
    flame.addColorStop(0, 'rgba(255,180,80,0.8)');
    flame.addColorStop(1, 'rgba(255,120,40,0)');
    ctx.fillStyle = flame;
    ctx.beginPath(); ctx.arc(-0.28, 0, 0.22, 0, Math.PI * 2); ctx.fill();
    drawRocketIcon(ctx);
    ctx.restore();
  }
}

// Lâminas giratórias: renderizadas para qualquer jogador com o buff ativo
// (inclusive outros agentes/NPCs, não só o local), orbitando em volta dele.
function drawBladesAura(entity, now) {
  if (!(entity.bladesUntil > Date.now())) return;
  const count = 3;
  const radius = 0.85;
  for (let i = 0; i < count; i += 1) {
    const angle = now / 260 + (i * Math.PI * 2) / count;
    const bx = entity.x + Math.cos(angle) * radius;
    const by = entity.y + Math.sin(angle) * radius;
    ctx.save();
    ctx.translate(bx, by);
    ctx.rotate(angle + Math.PI / 2);
    ctx.fillStyle = '#d8e0e3';
    ctx.beginPath();
    ctx.moveTo(0, -0.16); ctx.lineTo(0.05, 0.1); ctx.lineTo(-0.05, 0.1); ctx.closePath();
    ctx.fill();
    ctx.restore();
  }
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
    } else if (weapon === 'grenade') {
      drawGrenadeInHand(entity.angle, now);
    } else if (weapon === 'rocket') {
      ctx.save();
      ctx.rotate(entity.angle);
      ctx.translate(0.42, 0.12);
      drawRocketIcon(ctx);
      ctx.restore();
    } else {
      drawWeaponInHand(weapon, entity.angle, entity.flashUntil || 0, entity.flashWeapon, now);
    }
    ctx.restore();
    drawBladesAura(entity, now);
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
      ctx.fillText(`${entity.name || ''}${entity.isBot ? ' · NPC' : ''}`, entity.x, entity.y - 1.05);
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

// Proporções da elipse de visão (alongada e deslocada na direção da mira),
// compartilhadas entre `drawFogOfWar` (vinheta em espaço de tela) e
// `clipToVisionCone` (recorte em espaço de mundo) pra ambas desenharem
// exatamente a mesma forma.
const VISION_RY_RATIO = 0.58;
const VISION_FORWARD_SHIFT_RATIO = 0.32;

function resetExploredMask(arena) {
  const size = Math.max(1, Math.ceil(arena * 2 * EXPLORED_MASK_RES));
  const maskCanvas = document.createElement('canvas');
  maskCanvas.width = size;
  maskCanvas.height = size;
  exploredMask = { canvas: maskCanvas, ctx: maskCanvas.getContext('2d'), arena };
}

// "Queima" permanentemente um círculo revelado na máscara de exploração na
// posição atual do jogador — pintura normal (source-over) que só soma
// opacidade, nunca escurece de volta uma área já revelada.
function burnExploredMask(x, y, radiusWorldUnits) {
  if (!exploredMask) return;
  const mctx = exploredMask.ctx;
  const mx = (x + exploredMask.arena) * EXPLORED_MASK_RES;
  const my = (y + exploredMask.arena) * EXPLORED_MASK_RES;
  const r = radiusWorldUnits * EXPLORED_MASK_RES;
  const grad = mctx.createRadialGradient(mx, my, r * 0.35, mx, my, r);
  grad.addColorStop(0, 'rgba(0,0,0,1)');
  grad.addColorStop(1, 'rgba(0,0,0,0)');
  mctx.fillStyle = grad;
  mctx.beginPath();
  mctx.arc(mx, my, r, 0, Math.PI * 2);
  mctx.fill();
}

// Redireciona temporariamente o `ctx` global pra `targetCtx` — permite reusar
// drawFloor/drawWalls/drawProps (que sempre desenham no `ctx` do módulo) pra
// compor a camada "lembrada" num canvas offscreen, sem duplicar essas funções.
function withCanvasContext(targetCtx, fn) {
  const prev = ctx;
  ctx = targetCtx;
  fn();
  ctx = prev;
}

// Camada "lembrada": chão + paredes + props (sem entidades, pickups ou
// efeitos) desenhados escurecidos e recortados pela `exploredMask` — a
// silhueta estática do que o jogador já visitou, mas não está vendo agora.
function renderRememberedLayer(camX, camY, arena) {
  rememberedCtx.clearRect(0, 0, rememberedCanvas.width, rememberedCanvas.height);
  withCanvasContext(rememberedCtx, () => {
    ctx.save();
    ctx.translate(width / 2, height / 2);
    ctx.scale(SCALE, SCALE);
    ctx.translate(-camX, -camY);
    drawFloor(arena);
    drawWalls();
    drawProps();
    ctx.fillStyle = 'rgba(0,0,0,0.48)';
    ctx.fillRect(-arena, -arena, arena * 2, arena * 2);
    ctx.globalCompositeOperation = 'destination-in';
    ctx.drawImage(exploredMask.canvas, -arena, -arena, arena * 2, arena * 2);
    ctx.globalCompositeOperation = 'source-over';
    ctx.restore();
  });
}

// Recorta os desenhos seguintes (dentro do `ctx.save()` de `render`) à mesma
// elipse de visão de `drawFogOfWar`, mas em espaço de mundo — garante que
// zumbis/jogadores/pickups/efeitos nunca apareçam fora do raio de visão
// atual, mesmo na franja onde o gradiente da vinheta ainda não está 100% opaco.
function clipToVisionCone(camX, camY, angle, radiusWorldUnits) {
  const rx = radiusWorldUnits;
  const ry = rx * VISION_RY_RATIO;
  const forwardShift = rx * VISION_FORWARD_SHIFT_RATIO;
  ctx.save();
  ctx.translate(camX, camY);
  ctx.rotate(angle || 0);
  ctx.translate(forwardShift, 0);
  ctx.scale(1, ry / rx);
  ctx.beginPath();
  ctx.arc(0, 0, rx, 0, Math.PI * 2);
  ctx.restore();
  ctx.clip();
}

// Vinheta de campo de visão limitado (estilo Project Zomboid): desenhada em
// espaço de tela (a câmera sempre centraliza o jogador local em width/2,
// height/2), então um gradiente radial centrado no meio da tela já corresponde
// exatamente à posição do jogador no mundo. A área clara é alongada e deslocada
// na direção em que o personagem está olhando (ângulo de mira), não um círculo
// uniforme — por isso se vê bem mais longe pra frente do que pros lados/trás.
function drawFogOfWar(radiusWorldUnits, angle) {
  const rx = radiusWorldUnits * SCALE;
  const ry = rx * VISION_RY_RATIO;
  const forwardShift = rx * VISION_FORWARD_SHIFT_RATIO;
  ctx.save();
  ctx.translate(width / 2, height / 2);
  ctx.rotate(angle || 0);
  ctx.translate(forwardShift, 0);
  ctx.scale(1, ry / rx);
  // A opacidade fora do raio NÃO vai a 1 (como antes): essa vinheta é
  // desenhada por cima da camada "lembrada" também, e opacidade total aqui
  // apagaria de vez a silhueta escurecida da exploração. O teto de 0.62
  // ainda deixa a área nunca visitada bem escura (quase preta, ver
  // `renderRememberedLayer`), só sem tampar o que já foi explorado.
  const grad = ctx.createRadialGradient(0, 0, rx * 0.26, 0, 0, rx);
  grad.addColorStop(0, 'rgba(2,5,6,0)');
  grad.addColorStop(0.75, 'rgba(2,5,6,0.5)');
  grad.addColorStop(1, 'rgba(2,5,6,0.62)');
  ctx.fillStyle = grad;
  ctx.fillRect(-6000, -6000, 12000, 12000);
  ctx.restore();
}

function render(now, dt) {
  const self = entities.get(selfId);
  const camX = self ? self.x : 0;
  const camY = self ? self.y : 0;
  const angle = aimAngle();

  ctx.save();
  ctx.fillStyle = '#05090c';
  ctx.fillRect(0, 0, width, height);

  if (deployed && exploredMask) {
    burnExploredMask(camX, camY, visionRadius);
    renderRememberedLayer(camX, camY, world.arena);
    ctx.drawImage(rememberedCanvas, 0, 0, width, height);
  }

  ctx.translate(width / 2, height / 2);
  ctx.scale(SCALE, SCALE);
  ctx.translate(-camX, -camY);
  if (deployed) clipToVisionCone(camX, camY, angle, visionRadius);

  drawFloor(world.arena);
  drawBloodStains(now);
  drawGasHazards(now);
  drawWalls();
  drawProps();
  drawPickups(now);
  drawCorpses(now);
  drawZombies(now);
  drawPlayers(now);
  drawTracers(dt);
  drawAcidProjectiles();
  drawRockets();
  drawBloodBursts(dt);
  drawExplosions(dt);
  ctx.restore();

  if (deployed) {
    drawFogOfWar(visionRadius, angle);
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
    entity.typeId = target.typeId;
    entity.weapon = target.weapon;
    entity.shield = target.shield;
    entity.fuseAt = target.fuseAt;
    entity.stretchPhase = target.stretchPhase;
    entity.phaseAt = target.phaseAt;
    entity.isBot = target.isBot;
    entity.projectileKind = target.kind;
    entity.radius = target.radius;
    entity.bladesUntil = target.bladesUntil;
  }
}

function escapeHtml(value) {
  return String(value).replace(/[&<>'"]/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' }[char]));
}

function showToast(text) {
  ui.pickup.textContent = text;
  ui.pickup.classList.add('show');
  setTimeout(() => ui.pickup.classList.remove('show'), 1800);
}

// --- Armas: slots trocam no scroll do mouse; granada entra no mesmo ciclo ---
const SLOT_ORDER = ['knife', 'pistol', 'rifle', 'shotgun', 'rocket', 'grenade'];
const WEAPON_LABELS = { knife: 'FACA TÁTICA', pistol: 'PISTOLA P9', rifle: 'RIFLE AR-21', shotgun: 'ESCOPETA M12', rocket: 'LANÇA-MÍSSEIS', grenade: 'GRANADA' };

function availableSlots() {
  if (!selfState) return ['knife'];
  return SLOT_ORDER.filter((slot) => (
    slot === 'knife' ? true :
    slot === 'grenade' ? (selfState.grenades || 0) > 0 :
    selfState.inventory.includes(slot)
  ));
}

// Depois de uma troca local (scroll/tecla), o servidor demora um round-trip
// pra confirmar `player.weapon` — sem essa janela de graça, o resync abaixo em
// updateHud() reverte a troca de volta ao valor antigo assim que o próximo
// snapshot (ainda desatualizado) chega, fazendo o scroll parecer quebrado.
let lastLocalWeaponChangeAt = 0;
function activateSlot(slot, emit = true) {
  if (!SLOT_ORDER.includes(slot)) return;
  if (emit && !availableSlots().includes(slot)) return;
  currentWeapon = slot;
  if (emit) {
    lastLocalWeaponChangeAt = performance.now();
    if (slot !== 'grenade') socket.emit('weapon', slot);
  }
  const index = SLOT_ORDER.indexOf(slot);
  ui.slots.forEach((el, i) => el.classList.toggle('active', i === index));
  ui.weapon.textContent = WEAPON_LABELS[slot];
}

function cycleWeapon(direction) {
  const slots = availableSlots();
  if (slots.length <= 1) return;
  const idx = slots.indexOf(currentWeapon);
  const next = slots[(idx + direction + slots.length + slots.length) % slots.length];
  activateSlot(next);
}

const cooldowns = { knife: 480, pistol: 330, rifle: 110, shotgun: 720, rocket: 1600 };
const AMMO_COST = { pistol: 1, rifle: 1, shotgun: 3, rocket: 10 };
function attemptShoot() {
  if (!deployed || currentWeapon === 'grenade') return;
  const now = performance.now();
  if (now - lastClientShot < cooldowns[currentWeapon]) return;
  lastClientShot = now;
  socket.emit('fire', { weapon: currentWeapon, angle: aimAngle() });
}

let lastClientGrenade = 0;
function attemptGrenade() {
  if (!deployed) return;
  const now = performance.now();
  if (now - lastClientGrenade < 900) return;
  lastClientGrenade = now;
  const cursorDistance = Math.hypot(mouseX - width / 2, mouseY - height / 2) / SCALE;
  socket.emit('fire', { weapon: 'grenade', angle: aimAngle(), distance: cursorDistance });
}

function attemptFire() {
  if (!deployed) return;
  if (currentWeapon === 'grenade') attemptGrenade();
  else attemptShoot();
}

function updateHud(players) {
  const self = players.find((player) => player.id === selfId);
  if (self) {
    selfState = self;
    // `visionBoostUntil` vem de um pickup especial de visão tratado no servidor;
    // aqui só decidimos o raio de visão local a partir dele.
    visionRadius = (self.visionBoostUntil > Date.now()) ? BOOSTED_VISION : BASE_VISION;
    const recentLocalChange = performance.now() - lastLocalWeaponChangeAt < 500;
    if (currentWeapon !== 'grenade' && self.weapon !== currentWeapon && !recentLocalChange) activateSlot(self.weapon, false);
    if (self.hp < lastHp) { ui.damage.style.opacity = '.78'; setTimeout(() => { ui.damage.style.opacity = '0'; }, 130); }
    lastHp = self.hp;
    ui.health.textContent = self.hp;
    ui.healthFill.style.width = `${self.hp}%`;
    ui.ammo.textContent = currentWeapon === 'knife' ? '∞' : currentWeapon === 'grenade' ? String(self.grenades || 0) : String(Math.floor((self.ammo ?? 0) / (AMMO_COST[currentWeapon] || 1)));
    ui.slots.forEach((slot, index) => {
      const name = SLOT_ORDER[index];
      const locked = name === 'knife' ? false : name === 'grenade' ? !((self.grenades || 0) > 0) : !self.inventory.includes(name);
      slot.classList.toggle('locked', locked);
    });
    const shieldPct = Math.round(((self.shield || 0) / SHIELD_CAPACITY) * 100);
    ui.shieldFill.style.width = `${shieldPct}%`;
    ui.shieldBar.classList.toggle('active', shieldPct > 0);
    ui.grenadeCount.textContent = String(self.grenades || 0);
  }
  ui.timer.textContent = `${stageInfo.index + 1}/${stageInfo.count}`;
  ui.objective.textContent = stageInfo.objectiveLabel;
  const sorted = [...players].sort((a, b) => b.score - a.score);
  ui.scoreboard.innerHTML = `<div class="score-head"><span>AGENTE</span><span>PTS</span><span>K</span></div>${sorted.map((p) => `<div class="score-row ${p.id === selfId ? 'self' : ''}"><span>${escapeHtml(p.name)}${p.isBot ? ' <small style="opacity:.6">NPC</small>' : ''}</span><b>${p.score}</b><span>${p.kills}</span></div>`).join('')}`;
  const scoreLimit = latestRoomSettings && latestRoomSettings.mode === 'versus' ? latestRoomSettings.scoreLimit : 0;
  if (ui.scoreLimit) {
    ui.scoreLimit.style.display = scoreLimit > 0 ? 'block' : 'none';
    if (scoreLimit > 0) ui.scoreLimitValue.textContent = `${sorted[0] ? sorted[0].score : 0}/${scoreLimit}`;
  }
}

// --- Sessão: lobby, criação/entrada em salas ---

const MODE_LABEL = { coop: 'COOP', versus: 'VERSUS' };
const LIFE_LABEL = { respawn: 'RESPAWN', battleRoyale: 'BATTLE ROYALE' };
const DIFFICULTY_LABEL = { easy: 'FÁCIL', normal: 'NORMAL', hard: 'DIFÍCIL', insane: 'INSANO' };
const JOIN_ERROR_LABEL = {
  not_found: 'Sala não encontrada', full: 'Sala cheia', already_started: 'Partida já em andamento',
  not_public: 'Sala não é pública', already_in_room: 'Você já está em uma sala', server_full: 'Servidor cheio',
};

const DEFAULT_ROOM_CONFIG = { visibility: 'public', mode: 'coop', players: '4', lifeMode: 'respawn', difficulty: 'normal' };
const roomConfig = { ...DEFAULT_ROOM_CONFIG };
let editingExistingRoom = false;
let latestRoomSettings = null;
let latestRoomVisibility = 'public';
let latestRoomName = '';

function setupOptGroup(selector, axis) {
  const container = document.querySelector(selector);
  if (!container) return;
  container.querySelectorAll('.opt').forEach((opt) => {
    opt.addEventListener('click', () => {
      container.querySelectorAll('.opt').forEach((el) => el.classList.remove('active'));
      opt.classList.add('active');
      roomConfig[axis] = opt.dataset.value;
      if (axis === 'mode') updateVersusScoreHint();
    });
  });
}
setupOptGroup('#opt-visibility', 'visibility');
setupOptGroup('#opt-mode', 'mode');
setupOptGroup('#opt-players', 'players');
setupOptGroup('#opt-lifemode', 'lifeMode');
setupOptGroup('#opt-difficulty', 'difficulty');

function setOptGroupValue(selector, value) {
  const container = document.querySelector(selector);
  if (!container) return;
  container.querySelectorAll('.opt').forEach((el) => el.classList.toggle('active', el.dataset.value === value));
}

// Versus tem um limite de pontos (VERSUS_SCORE_LIMIT no servidor) que encerra
// a campanha antes de cumprir o objetivo do estágio — avisa isso já na tela
// de criação.
function updateVersusScoreHint() {
  const hint = document.querySelector('#versus-score-hint');
  if (hint) hint.style.display = roomConfig.mode === 'versus' ? 'block' : 'none';
}

// Preenche o formulário de criar-sala com uma config existente — reaproveitado
// tanto para resetar aos padrões quanto para abrir "AJUSTAR CONFIGURAÇÕES".
function applySettingsToForm(settings, visibility) {
  roomConfig.visibility = visibility || 'public';
  roomConfig.mode = settings.mode;
  roomConfig.players = String(settings.maxPlayers);
  roomConfig.lifeMode = settings.lifeMode;
  roomConfig.difficulty = settings.difficulty || 'normal';
  setOptGroupValue('#opt-visibility', roomConfig.visibility);
  setOptGroupValue('#opt-mode', roomConfig.mode);
  setOptGroupValue('#opt-players', roomConfig.players);
  setOptGroupValue('#opt-lifemode', roomConfig.lifeMode);
  setOptGroupValue('#opt-difficulty', roomConfig.difficulty);
  updateVersusScoreHint();
}

function requestRoomList() {
  socket.emit('listRooms', {}, (res) => renderRoomList((res && res.rooms) || []));
}

function renderRoomList(rooms) {
  if (!ui.publicRooms) return;
  if (!rooms.length) {
    ui.publicRooms.innerHTML = '<div class="empty-hint">Nenhuma sala pública agora. Crie a primeira!</div>';
    return;
  }
  ui.publicRooms.innerHTML = rooms.map((room) => `
    <div class="room-row">
      <span>${escapeHtml(room.name)}<div class="meta">${room.playerCount}/${room.maxPlayers} · ${MODE_LABEL[room.mode] || room.mode} · ${LIFE_LABEL[room.lifeMode] || room.lifeMode} · ${DIFFICULTY_LABEL[room.difficulty] || ''}</div></span>
      <button data-room="${room.id}" ${room.state !== 'lobby' ? 'disabled' : ''}>${room.state === 'lobby' ? 'ENTRAR' : 'EM ANDAMENTO'}</button>
    </div>`).join('');
  ui.publicRooms.querySelectorAll('button[data-room]').forEach((btn) => {
    btn.addEventListener('click', () => joinPublicRoom(btn.dataset.room));
  });
}

function currentCodename() {
  return (ui.name.value || '').trim().slice(0, 16);
}

function joinPublicRoom(id) {
  socket.emit('joinPublicRoom', { roomId: id, name: currentCodename() }, (res) => {
    if (!res || !res.ok) { showToast(JOIN_ERROR_LABEL[res && res.reason] || 'Não foi possível entrar'); return; }
    enterLobby(res);
  });
}

function attemptJoinByCode() {
  const code = (ui.roomCodeInput.value || '').trim().toUpperCase();
  if (!code) return;
  socket.emit('joinRoom', { code, name: currentCodename() }, (res) => {
    if (!res || !res.ok) { showToast(JOIN_ERROR_LABEL[res && res.reason] || 'Não foi possível entrar'); return; }
    enterLobby(res);
  });
}

function enterLobby(res) {
  roomId = res.roomId;
  roomCode = res.code;
  isHost = !!res.isHost;
  history.replaceState(null, '', `?room=${roomCode}`);
  setClientState('lobby');
}

function renderLobby(data) {
  isHost = data.hostId === selfId;
  latestRoomSettings = data.settings;
  latestRoomVisibility = data.visibility || 'public';
  latestRoomName = data.name || '';
  ui.lobbyLink.value = `${location.origin}${location.pathname}?room=${roomCode || data.code}`;
  ui.lobbyRoomName.textContent = latestRoomName || 'SALA';
  const players = data.players || [];
  // Vagas sem jogador real (estejam ou não ocupadas por um bot nos
  // bastidores) aparecem todas iguais: uma linha centralizada "aguardando
  // jogador", sem revelar que já tem um bot ali.
  ui.lobbyPlayers.innerHTML = players.map((p) => (p.isBot
    ? '<div class="player-row open"><span class="meta">aguardando jogador</span></div>'
    : `<div class="player-row ${p.isHost ? 'host' : ''}"><span>${escapeHtml(p.name)}${p.isHost ? '<span class="tag">HOST</span>' : ''}</span></div>`
  )).join('') || '<div class="empty-hint">Ninguém na sala ainda</div>';
  ui.lobbyStart.style.display = isHost ? 'block' : 'none';
  ui.lobbySettings.style.display = isHost ? 'block' : 'none';
  ui.lobbyStatus.textContent = isHost ? '' : 'AGUARDANDO O HOST INICIAR A PARTIDA';
}

function leaveCurrentRoom() {
  socket.emit('leaveRoom', {}, () => {
    roomId = null; roomCode = null; isHost = false;
    history.replaceState(null, '', location.pathname);
    ui.roundend.style.display = 'none';
    setClientState('landing');
  });
}

ui.btnCreateRoom.addEventListener('click', () => {
  editingExistingRoom = false;
  ui.createRoomTitle.innerHTML = 'CRIAR<br><span>SALA</span>';
  ui.roomCreateSubmit.textContent = 'CRIAR SALA';
  Object.assign(roomConfig, DEFAULT_ROOM_CONFIG);
  applySettingsToForm({ mode: 'coop', lifeMode: 'respawn', maxPlayers: 4, difficulty: 'normal' }, 'public');
  setClientState('createRoom');
});
ui.roomCreateBack.addEventListener('click', () => setClientState(editingExistingRoom ? 'lobby' : 'landing'));
ui.btnJoinByCode.addEventListener('click', attemptJoinByCode);
ui.roomCreateSubmit.addEventListener('click', () => {
  const payload = {
    visibility: roomConfig.visibility,
    mode: roomConfig.mode,
    maxPlayers: Number(roomConfig.players),
    lifeMode: roomConfig.lifeMode,
    difficulty: roomConfig.difficulty,
  };
  if (editingExistingRoom) {
    socket.emit('updateRoomSettings', payload, (res) => {
      if (!res || !res.ok) { showToast('Não foi possível salvar as configurações.'); return; }
      showToast('CONFIGURAÇÕES ATUALIZADAS');
      setClientState('lobby');
    });
  } else {
    payload.name = currentCodename();
    socket.emit('createRoom', payload, (res) => {
      if (!res || !res.ok) { showToast('Não foi possível criar a sala.'); return; }
      enterLobby(res);
    });
  }
});
ui.lobbyStart.addEventListener('click', () => {
  socket.emit('startMatch', {}, (res) => {
    if (res && res.ok === false) showToast('Não foi possível iniciar a partida.');
  });
});
ui.lobbySettings.addEventListener('click', () => {
  if (!latestRoomSettings) return;
  editingExistingRoom = true;
  ui.createRoomTitle.innerHTML = 'AJUSTAR<br><span>SALA</span>';
  ui.roomCreateSubmit.textContent = 'SALVAR ALTERAÇÕES';
  applySettingsToForm(latestRoomSettings, latestRoomVisibility);
  setClientState('createRoom');
});
ui.lobbyCopyLink.addEventListener('click', () => {
  const link = ui.lobbyLink.value || `${location.origin}${location.pathname}?room=${roomCode}`;
  if (navigator.clipboard) navigator.clipboard.writeText(link).then(() => showToast('LINK COPIADO')).catch(() => showToast(link));
  else showToast(link);
});
ui.lobbyLeave.addEventListener('click', leaveCurrentRoom);
ui.roundendLeave.addEventListener('click', leaveCurrentRoom);
ui.roundendLobby.addEventListener('click', () => socket.emit('leaveToLobby'));

socket.on('connect', () => { ui.connection.textContent = 'LINK ESTÁVEL'; });
socket.on('disconnect', () => {
  ui.connection.textContent = 'RECONECTANDO';
  roomId = null; roomCode = null; isHost = false;
  setClientState('landing');
});
socket.on('welcome', (data) => {
  selfId = data.id;
  world = { walls: data.walls, props: data.props, arena: data.arena };
  resetExploredMask(data.arena);
  roomId = data.roomId;
  roomCode = data.code;
  isHost = !!data.isHost;
});
socket.on('lobbyUpdate', (data) => {
  if (!data) return;
  renderLobby(data);
  if (clientState !== 'playing' && clientState !== 'roundEnd') setClientState('lobby');
});
socket.on('hostChanged', ({ hostId }) => {
  isHost = hostId === selfId;
  ui.lobbyStart.style.display = isHost ? 'block' : 'none';
  ui.lobbySettings.style.display = isHost ? 'block' : 'none';
  ui.lobbyStatus.textContent = isHost ? '' : 'AGUARDANDO O HOST INICIAR A PARTIDA';
  ui.roundendLobby.style.display = isHost ? 'block' : 'none';
});
socket.on('roomListUpdate', (data) => { if (clientState === 'landing') renderRoomList((data && data.rooms) || []); });
socket.on('matchStarted', () => {
  ui.roundend.style.display = 'none';
  setClientState('playing');
});
// Troca de estágio dentro da mesma campanha/partida (objetivo cumprido) —
// diferente de `welcome`, que só chega uma vez ao entrar na sala. Limpa todo
// estado visual do estágio anterior pra não sobrar zumbi/sangue "fantasma"
// na tela por um frame antes do próximo snapshot chegar.
socket.on('stageChange', (data) => {
  world = { walls: data.walls, props: data.props, arena: data.arena };
  resetExploredMask(data.arena);
  entities.clear();
  targets.clear();
  pickupsState.length = 0;
  tracers.length = 0;
  explosions.length = 0;
  corpses.length = 0;
  bloodBursts.length = 0;
  stageInfo.index = data.stageIndex;
  stageInfo.count = data.stageCount;
  stageInfo.name = data.stageName;
});
socket.on('snapshot', (snapshot) => {
  if (snapshot.stage) {
    stageInfo.index = snapshot.stage.index;
    stageInfo.count = snapshot.stage.count;
    stageInfo.name = snapshot.stage.name;
    stageInfo.objectiveLabel = snapshot.stage.objectiveLabel;
  }
  const valid = new Set();
  for (const player of snapshot.players) { valid.add(player.id); syncEntity(player.id, 'player', player); }
  for (const zombie of snapshot.zombies) { valid.add(zombie.id); syncEntity(zombie.id, 'zombie', zombie); }
  for (const proj of (snapshot.projectiles || [])) { valid.add(proj.id); syncEntity(proj.id, 'projectile', proj); }
  for (const hazard of (snapshot.hazards || [])) { valid.add(hazard.id); syncEntity(hazard.id, 'hazard', hazard); }
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
});
socket.on('roundEnd', (data) => {
  const titleEl = ui.roundend.querySelector('#roundend-title');
  if (titleEl) titleEl.innerHTML = data.campaignComplete ? 'CAMPANHA<br><span>CONCLUÍDA</span>' : 'FIM DA<br><span>OPERAÇÃO</span>';
  const sorted = [...(data.scores || [])].sort((a, b) => b.score - a.score);
  ui.roundendScoreboard.innerHTML = `<div class="score-head"><span>AGENTE</span><span>PTS</span><span>K</span></div>${sorted.map((p) => `<div class="score-row ${p.id === selfId ? 'self' : ''}"><span>${escapeHtml(p.name)}</span><b>${p.score}</b><span>${p.kills}</span></div>`).join('')}`;
  ui.roundendReady.disabled = false;
  ui.roundendReady.textContent = 'PRÓXIMA PARTIDA';
  ui.roundendStatus.textContent = '';
  ui.roundendLobby.style.display = isHost ? 'block' : 'none';
  ui.roundend.style.display = 'grid';
  clientState = 'roundEnd';
  deployed = false;
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
  showToast(message.label);
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

ui.roundendReady.addEventListener('click', () => {
  socket.emit('readyNext');
  ui.roundendReady.disabled = true;
  ui.roundendReady.textContent = 'AGUARDANDO OUTROS AGENTES...';
});

addEventListener('mousemove', (event) => { mouseX = event.clientX; mouseY = event.clientY; });
addEventListener('mousedown', (event) => { if (event.button === 0) { firing = true; attemptFire(); } });
addEventListener('mouseup', (event) => { if (event.button === 0) firing = false; });
let wheelAccum = 0;
addEventListener('wheel', (event) => {
  if (clientState !== 'playing') return;
  event.preventDefault();
  wheelAccum += event.deltaY;
  const step = 60;
  let guard = 0;
  while (Math.abs(wheelAccum) >= step && guard < 20) {
    cycleWeapon(wheelAccum > 0 ? 1 : -1);
    wheelAccum += wheelAccum > 0 ? -step : step;
    guard += 1;
  }
}, { passive: false });
addEventListener('keydown', (event) => {
  keys.add(event.code);
  if (clientState !== 'playing') return;
  if (event.code === 'Digit1') activateSlot('knife');
  if (event.code === 'Digit2') activateSlot('pistol');
  if (event.code === 'Digit3') activateSlot('rifle');
  if (event.code === 'Digit4') activateSlot('shotgun');
  if (event.code === 'Digit5') activateSlot('rocket');
  if (event.code === 'Digit6') activateSlot('grenade');
  if (event.code === 'KeyG' && availableSlots().includes('grenade')) { activateSlot('grenade', false); attemptGrenade(); }
  if (event.code === 'Escape') leaveCurrentRoom();
});
addEventListener('keyup', (event) => keys.delete(event.code));

// Se a URL trouxer ?room=CODIGO (link compartilhado de sala só-por-link), já
// deixa o código pré-preenchido — leitura same-origin, nada é enviado a
// terceiros com isso.
const urlRoomCode = new URLSearchParams(location.search).get('room');
if (urlRoomCode) ui.roomCodeInput.value = urlRoomCode.toUpperCase();

setClientState('landing');

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
