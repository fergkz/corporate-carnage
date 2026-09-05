const path = require('path');
const express = require('express');
const { Server } = require('socket.io');

const app = express();
const port = Number(process.env.PORT || 8080);
const httpServer = app.listen(port, '0.0.0.0', () => {
  console.log(`Corporate Carnage disponível em http://localhost:${port}`);
});
const io = new Server(httpServer, { transports: ['websocket', 'polling'] });

app.use(express.static(path.join(__dirname, 'public')));
app.get('/health', (_request, response) => response.json({ ok: true }));

const TICK_RATE = 20;
const PLAYER_RADIUS = 0.46;

// Uma campanha é uma sequência de estágios. Cada estágio carrega seu próprio
// layout (walls colidem, props são só decoração enviada ao cliente), sua
// piscina de posições de pickup, seus pontos de spawn e um objetivo — quando
// o objetivo é cumprido, `applyStage()` avança pro próximo (ou encerra a
// campanha, se for o último). Tudo isso costumava ser `walls`/`props`/`ARENA`/
// `PICKUP_SPAWN_POOL` como constantes globais únicas; virou dado por estágio
// pra dar pra ter mais de um.
const STAGES = [
  {
    id: 'escritorio',
    name: 'Contenção Executiva',
    arena: 30, // mapa mais amplo — o escritório (paredes/móveis) continua no miolo original, sobra mais área aberta na borda
    // Retângulos colidem com jogadores, zumbis e tiros. Coordenadas em "metros" de mundo top-down.
    walls: [
      { x: -8.8, y: 0, w: 1.2, h: 11.5 },
      { x: 8.8, y: 0, w: 1.2, h: 11.5 },
      { x: 0, y: -9.2, w: 8, h: 1.1 },
      { x: 0, y: 9.2, w: 8, h: 1.1 },
      { x: -14.8, y: -10.8, w: 4.2, h: 1 },
      { x: 14.8, y: 10.8, w: 4.2, h: 1 },
      { x: -15, y: -6, w: 4.4, h: 1.55 },
      { x: 15, y: -6, w: 4.4, h: 1.55 },
      { x: -15, y: 6, w: 4.4, h: 1.55 },
      { x: 15, y: 6, w: 4.4, h: 1.55 },
      { x: -15, y: 15, w: 4.4, h: 1.55 },
      { x: 15, y: -15, w: 4.4, h: 1.55 },
      { x: 0, y: 0, w: 6.6, h: 5.2 },
      { x: -14, y: 0, w: 3.6, h: 1.4 },
      { x: 14, y: 0, w: 3.6, h: 1.4 },
      { x: 0, y: 15, w: 5, h: 4 },
      { x: -20, y: -7, w: 1.2, h: 5 },
      { x: 20, y: 7, w: 1.2, h: 5 },
      { x: -4, y: 19, w: 2, h: 1 },
      { x: 4, y: 19, w: 2, h: 1 },

      // Sala de servidores (bolsão livre a sudoeste do centro, porta aberta a leste)
      { x: -6, y: 6.6, w: 6.4, h: 0.5 },
      { x: -8.8, y: 9.8, w: 0.5, h: 6.4 },
      { x: -6, y: 13, w: 6.4, h: 0.5 },

      // Copa (bolsão livre a nordeste do centro, porta aberta ao sul)
      { x: 5.2, y: -8.5, w: 0.5, h: 11.2 },
      { x: 8, y: -14, w: 6, h: 0.5 },
      { x: 10.8, y: -8.5, w: 0.5, h: 11.2 },

      // Divisórias extras no salão aberto, para partir a linha de visão
      { x: -6, y: -7.6, w: 2, h: 0.3 },
      { x: 6, y: 7.6, w: 2, h: 0.3 },
      { x: -6.5, y: -6.8, w: 0.3, h: 2 },
      { x: 6.5, y: 6.8, w: 0.3, h: 2 },
    ],
    // Apenas decoração enviada ao cliente para desenhar o escritório; não colide.
    props: [
      { type: 'reception', x: 0, y: 0, w: 6.6, h: 5.2 },
      { type: 'desk', x: -15, y: -6, rot: 0 },
      { type: 'desk', x: -12.6, y: -6.6, rot: 0 },
      { type: 'desk', x: 15, y: -6, rot: Math.PI },
      { type: 'desk', x: 12.6, y: -5.4, rot: Math.PI },
      { type: 'desk', x: -15, y: 6, rot: Math.PI },
      { type: 'desk', x: -12.6, y: 5.4, rot: Math.PI },
      { type: 'desk', x: 15, y: 6, rot: 0 },
      { type: 'desk', x: 12.6, y: 6.6, rot: 0 },
      { type: 'desk', x: -15, y: 15, rot: 0 },
      { type: 'desk', x: -12.6, y: 14.4, rot: 0 },
      { type: 'desk', x: 15, y: -15, rot: Math.PI },
      { type: 'desk', x: 12.6, y: -15.6, rot: Math.PI },
      { type: 'plant', x: -19, y: -18 },
      { type: 'plant', x: 19, y: -18 },
      { type: 'plant', x: -19, y: 18 },
      { type: 'plant', x: 19, y: 18 },
      { type: 'plant', x: -5, y: -16 },
      { type: 'plant', x: 5, y: 16 },
      { type: 'plant', x: -9.2, y: 12.4 },
      { type: 'plant', x: 6.4, y: -3.2 },
      { type: 'sofa', x: -14, y: 0 },
      { type: 'sofa', x: 14, y: 0 },
      { type: 'table', x: 0, y: 15, w: 5, h: 2 },
      { type: 'cabinet', x: -20, y: -7 },
      { type: 'cabinet', x: 20, y: 7 },
      { type: 'vending', x: -4, y: 19 },
      { type: 'vending', x: 4, y: 19 },
      { type: 'whiteboard', x: -3.4, y: -8.9, rot: 0 },
      { type: 'server_rack', x: -7.6, y: 8.1, rot: 0 },
      { type: 'server_rack', x: -7.6, y: 10, rot: 0 },
      { type: 'server_rack', x: -7.6, y: 11.9, rot: 0 },
      { type: 'break_table', x: 8, y: -6.4 },
      { type: 'water_cooler', x: 9.6, y: -11.2 },
      { type: 'vending', x: 6.4, y: -11.4 },
      { type: 'sign', x: 0, y: -21.6, text: 'HELIX DYNAMICS' },
    ],
    pickupSpawnPool: [
      [-6, -4], [6, 4], [0, -15], [-17, 0], [17, 0], [-13, -15], [13, 15], [7, 15],
      [0, 6.3], [10, 0], [-10, 0], [0, -6.3], [-9.5, 15.5],
      [-4, -11], [4, 11], [-11, 4], [16, -3], [-16, 3], [11, 4],
    ],
    spawnPoints: [[-17, -16], [17, 16], [-18.5, 16], [18.5, -16], [7, 18], [-7, -18]],
    // Alvo escala com o tanto de zumbi configurado pra sala, pra continuar
    // fazendo sentido em salas com zombieBaseCount bem diferente de 14.
    objective: (room) => ({ type: 'eliminate', target: Math.max(10, room.config.zombieBaseCount + 6) }),
  },
  {
    id: 'sala_final',
    name: 'Sala de Reunião — Confronto Final',
    arena: 16,
    walls: [
      { x: 0, y: 0, w: 6, h: 2.6 }, // mesa de reunião central, usada como cobertura
      { x: -9, y: -9, w: 1.2, h: 1.2 },
      { x: 9, y: -9, w: 1.2, h: 1.2 },
      { x: -9, y: 9, w: 1.2, h: 1.2 },
      { x: 9, y: 9, w: 1.2, h: 1.2 },
    ],
    props: [
      { type: 'table', x: 0, y: 0, w: 6, h: 2.6 },
      { type: 'plant', x: -9, y: -9 },
      { type: 'plant', x: 9, y: -9 },
      { type: 'plant', x: -9, y: 9 },
      { type: 'plant', x: 9, y: 9 },
      { type: 'sign', x: 0, y: -14.6, text: 'CONFRONTO FINAL' },
    ],
    pickupSpawnPool: [[-6, -6], [6, 6], [-6, 6], [6, -6], [0, 7], [0, -7]],
    spawnPoints: [[-13, -12], [13, 12], [-13, 12], [13, -12]],
    objective: () => ({ type: 'boss_kill', zombieTypeId: 'tank' }),
  },
];

const weapons = {
  knife: { damage: 42, cooldown: 480, pellets: 1, spread: 0.04, range: 1.85, melee: true },
  pistol: { damage: 28, cooldown: 330, pellets: 1, spread: 0.012, range: 32, ammoCost: 1 },
  rifle: { damage: 18, cooldown: 110, pellets: 1, spread: 0.02, range: 38, ammoCost: 1 },
  shotgun: { damage: 13, cooldown: 720, pellets: 7, spread: 0.12, range: 20, ammoCost: 3 },
  // Arma rara: dispara um míssil que persegue o inimigo vivo mais próximo e
  // explode em área — não é hitscan, é resolvido como projétil em updateRocket().
  rocket: { damage: 95, cooldown: 1600, pellets: 1, spread: 0, range: 24, ammoCost: 10, projectile: true, speed: 7.5, blastRadius: 2.3 },
};

const WEAPON_RANK = { pistol: 1, rifle: 2, shotgun: 3, rocket: 4 };

const SHIELD_CAPACITY = 60;
const HEART_HEAL = 25;
const GRENADE_MAX = 3;
const GRENADE_DAMAGE = 70;
const GRENADE_RADIUS = 2.4;
const GRENADE_RANGE = 7;
const GRENADE_MIN_RANGE = 1.4;
const GRENADE_COOLDOWN = 900;
const VISION_BOOST_MS = 15000;
const REPEL_MS = 12000;
const REPEL_RADIUS = 3.2;
// Zumbis (e bots) não "enxergam no escuro" — só perseguem um alvo dentro
// deste raio, parecido com o alcance de visão do próprio jogador (8 no
// normal). Sem isso, zumbis do mapa inteiro convergiam pra cima de quem
// estivesse mais perto, o tempo todo, mesmo do outro lado do escritório.
const ZOMBIE_SIGHT_RANGE = 11;
const AGGRO_MS = 5000;
const BLADES_DURATION_MS = 10000;
const BLADES_RADIUS = 1.3;
const BLADES_DPS = 22;
const KNIFE_KNOCKBACK = 1.1;

// Tabela de tipos de zumbi: sorteio por peso (proporção fixa e consistente),
// não mais um `Math.random() < X` isolado. `special` é o gatilho de comportamento
// extra tratado em updateZombies()/runStretchLogic()/runAcidLogic()/explodeBomb().
const ZOMBIE_TYPES = [
  { id: 'normal0', weight: 27, hp: 65, speed: [1.45, 2.00], radius: 0.48, meleeDamage: 12, meleeRange: 1.15, meleeCooldownMs: 900 },
  { id: 'normal1', weight: 27, hp: 65, speed: [1.45, 2.00], radius: 0.48, meleeDamage: 12, meleeRange: 1.15, meleeCooldownMs: 900 },
  { id: 'normal2', weight: 27, hp: 65, speed: [1.45, 2.00], radius: 0.48, meleeDamage: 12, meleeRange: 1.15, meleeCooldownMs: 900 },
  { id: 'bomb', weight: 12, hp: 65, speed: [1.45, 2.00], radius: 0.48, special: 'bomb', fuseMs: 550, damage: 55, radiusExplode: 2.6 },
  { id: 'tank', weight: 7, hp: 260, speed: [0.85, 1.05], radius: 0.78, meleeDamage: 26, meleeRange: 1.25, meleeCooldownMs: 1100 },
  { id: 'stretcher', weight: 6, hp: 70, speed: [1.35, 1.75], radius: 0.48, special: 'stretch', meleeDamage: 16, meleeRange: 3.2, windupMs: 650, strikeMs: 180, recoverMs: 650, pullLandingDistance: 1.0, pullSpeed: 6.5, pullMs: 400 },
  { id: 'acid', weight: 6, hp: 55, speed: [1.2, 1.5], radius: 0.48, special: 'acid', range: 8.5, damage: 14, cooldownMs: 2200, projectileSpeed: 9 },
  { id: 'screamer', weight: 5, hp: 55, speed: [1.3, 1.6], radius: 0.48, special: 'scream', screamRange: 6, screamRadius: 7, screamCooldownMs: 4000, meleeDamage: 8, meleeRange: 1.1, meleeCooldownMs: 900 },
  { id: 'crawler', weight: 6, hp: 30, speed: [2.3, 2.8], radius: 0.4, meleeDamage: 8, meleeRange: 1.05, meleeCooldownMs: 700 },
  { id: 'armored', weight: 5, hp: 90, speed: [1.1, 1.4], radius: 0.5, meleeDamage: 14, meleeRange: 1.15, meleeCooldownMs: 900, damageReduction: 0.45 },
  { id: 'leaper', weight: 5, hp: 60, speed: [1.3, 1.6], radius: 0.48, special: 'leap', leapRange: 5, leapCooldownMs: 3000, meleeDamage: 18, meleeRange: 1.2, meleeCooldownMs: 1000 },
  { id: 'gasser', weight: 5, hp: 50, speed: [1.2, 1.5], radius: 0.48, special: 'gasser', meleeDamage: 10, meleeRange: 1.1, meleeCooldownMs: 900 },
];
const ZOMBIE_TYPES_BY_ID = Object.fromEntries(ZOMBIE_TYPES.map((type) => [type.id, type]));

function pickZombieType() {
  const total = ZOMBIE_TYPES.reduce((sum, type) => sum + type.weight, 0);
  let roll = Math.random() * total;
  for (const type of ZOMBIE_TYPES) {
    roll -= type.weight;
    if (roll <= 0) return type;
  }
  return ZOMBIE_TYPES[0];
}

// Crescimento de população no modo "evolução": lotes periódicos até um teto rígido,
// salvaguarda deliberada contra crescimento sem limite degradar a simulação.
const EVOLUTION_INTERVAL_MS = 25000;
const EVOLUTION_BATCH_BASE = 2;
const EVOLUTION_BATCH_MAX = 5;
const EVOLUTION_CAP_MULTIPLIER = 2.5;

const pickupTemplates = [
  { id: 'wp-pistol', kind: 'weapon', weapon: 'pistol', amount: 24 },
  { id: 'wp-rifle', kind: 'weapon', weapon: 'rifle', amount: 45 },
  { id: 'wp-shotgun', kind: 'weapon', weapon: 'shotgun', amount: 14 },
  { id: 'wp-rocket', kind: 'weapon', weapon: 'rocket', amount: 6, respawnMs: 55000 },
  { id: 'ammo-pistol-a', kind: 'ammo', weapon: 'pistol', amount: 18 },
  { id: 'ammo-pistol-b', kind: 'ammo', weapon: 'pistol', amount: 18 },
  { id: 'ammo-rifle-a', kind: 'ammo', weapon: 'rifle', amount: 30 },
  { id: 'ammo-rifle-b', kind: 'ammo', weapon: 'rifle', amount: 30 },
  { id: 'ammo-shotgun-a', kind: 'ammo', weapon: 'shotgun', amount: 8 },
  { id: 'shield-a', kind: 'shield', amount: SHIELD_CAPACITY },
  { id: 'heart-a', kind: 'heart', amount: HEART_HEAL },
  { id: 'heart-b', kind: 'heart', amount: HEART_HEAL },
  { id: 'grenade-a', kind: 'grenade', amount: 1 },
  { id: 'grenade-b', kind: 'grenade', amount: 1 },
  { id: 'vision-a', kind: 'vision', amount: VISION_BOOST_MS },
  { id: 'repel-a', kind: 'repel', amount: REPEL_MS },
  { id: 'aggro-a', kind: 'aggro', amount: 0 },
  { id: 'blades-a', kind: 'blades', amount: BLADES_DURATION_MS },
];

const MAX_ROOMS = 60;
const ROOM_EMPTY_GRACE_MS = 30000;
const LOBBY_BROWSER_ROOM = '__lobby_browser__';
const ROOM_CODE_CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
const BOT_NAMES = ['Ranger', 'Coyote', 'Viper', 'Nomad', 'Falcon', 'Reaper', 'Ghost', 'Sentinel'];

const rooms = new Map(); // roomId (== code) -> Room
const socketRoom = new Map(); // socketId -> roomId

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

function safeAck(ack, payload) {
  if (typeof ack === 'function') ack(payload);
}

function sanitizeName(name) {
  if (typeof name !== 'string') return '';
  return name.trim().slice(0, 16);
}

function sanitizeRoomName(name) {
  if (typeof name !== 'string') return '';
  return name.trim().slice(0, 24);
}

function generateRoomCode() {
  let code;
  let guard = 0;
  do {
    code = Array.from({ length: 5 }, () => ROOM_CODE_CHARS[Math.floor(Math.random() * ROOM_CODE_CHARS.length)]).join('');
    guard += 1;
  } while (rooms.has(code) && guard < 50);
  return code;
}

function collides(room, x, y, radius = PLAYER_RADIUS) {
  const arena = room.arena;
  if (x < -arena + radius || x > arena - radius || y < -arena + radius || y > arena - radius) return true;
  return room.walls.some((wall) =>
    x > wall.x - wall.w / 2 - radius && x < wall.x + wall.w / 2 + radius &&
    y > wall.y - wall.h / 2 - radius && y < wall.y + wall.h / 2 + radius
  );
}

function moveWithCollision(room, entity, dx, dy, radius = PLAYER_RADIUS) {
  const nextX = entity.x + dx;
  if (!collides(room, nextX, entity.y, radius)) entity.x = nextX;
  const nextY = entity.y + dy;
  if (!collides(room, entity.x, nextY, radius)) entity.y = nextY;
}

function spawnPoint(room) {
  const points = room.spawnPoints;
  let [x, y] = points[Math.floor(Math.random() * points.length)];
  let attempts = 0;
  while (collides(room, x, y) && attempts < 12) {
    x += x < 0 ? -0.4 : 0.4;
    y += y < 0 ? -0.4 : 0.4;
    attempts += 1;
  }
  return [x, y];
}

function randomPickupPosition(room, exclude) {
  const taken = new Set(
    [...room.pickups.values()]
      .filter((pickup) => pickup.active && pickup !== exclude)
      .map((pickup) => `${pickup.x},${pickup.y}`)
  );
  const pool = room.pickupSpawnPool;
  let choice = pool[Math.floor(Math.random() * pool.length)];
  let attempts = 0;
  while (taken.has(`${choice[0]},${choice[1]}`) && attempts < 20) {
    choice = pool[Math.floor(Math.random() * pool.length)];
    attempts += 1;
  }
  return choice;
}

function seedPickups(room) {
  for (const template of pickupTemplates) {
    const [x, y] = randomPickupPosition(room, null);
    room.pickups.set(template.id, { ...template, x, y, active: true, respawnAt: 0 });
  }
  // Mais zumbis/NPCs configurados na sala = mais munição e vida espalhadas
  // pelo mapa, pra manter o ritmo com a pressão extra.
  const population = room.config.zombieBaseCount + room.config.npcCount;
  const ammoFlavors = [{ weapon: 'pistol', amount: 16 }, { weapon: 'rifle', amount: 24 }, { weapon: 'shotgun', amount: 8 }];
  const extraAmmo = Math.round(population / 5);
  for (let i = 0; i < extraAmmo; i += 1) {
    const flavor = ammoFlavors[i % ammoFlavors.length];
    const [x, y] = randomPickupPosition(room, null);
    const id = `ammo-extra-${i}`;
    room.pickups.set(id, { id, kind: 'ammo', weapon: flavor.weapon, amount: flavor.amount, x, y, active: true, respawnAt: 0 });
  }
  const extraHearts = Math.round(population / 8);
  for (let i = 0; i < extraHearts; i += 1) {
    const [x, y] = randomPickupPosition(room, null);
    const id = `heart-extra-${i}`;
    room.pickups.set(id, { id, kind: 'heart', amount: HEART_HEAL, x, y, active: true, respawnAt: 0 });
  }
}

function rayCircle(originX, originY, dirX, dirY, centerX, centerY, radius, range) {
  const ox = centerX - originX;
  const oy = centerY - originY;
  const along = ox * dirX + oy * dirY;
  if (along < 0 || along > range) return null;
  const perpendicularSq = ox * ox + oy * oy - along * along;
  if (perpendicularSq > radius * radius) return null;
  return along - Math.sqrt(Math.max(0, radius * radius - perpendicularSq));
}

function rayBox(originX, originY, dirX, dirY, box) {
  const minX = box.x - box.w / 2;
  const maxX = box.x + box.w / 2;
  const minY = box.y - box.h / 2;
  const maxY = box.y + box.h / 2;
  const inverseX = Math.abs(dirX) < 0.00001 ? Infinity : 1 / dirX;
  const inverseY = Math.abs(dirY) < 0.00001 ? Infinity : 1 / dirY;
  const nearX = Math.min((minX - originX) * inverseX, (maxX - originX) * inverseX);
  const farX = Math.max((minX - originX) * inverseX, (maxX - originX) * inverseX);
  const nearY = Math.min((minY - originY) * inverseY, (maxY - originY) * inverseY);
  const farY = Math.max((minY - originY) * inverseY, (maxY - originY) * inverseY);
  const near = Math.max(nearX, nearY);
  const far = Math.min(farX, farY);
  return far >= Math.max(0, near) ? Math.max(0, near) : null;
}

function makePlayer(id, name, extra = {}) {
  return {
    id,
    name,
    x: 0, y: 0, angle: 0, hp: 100, alive: true,
    score: 0, kills: 0, deaths: 0,
    weapon: 'knife', inventory: ['knife'], ammo: 0,
    lastShot: 0, lastGrenade: 0,
    color: Math.floor(Math.random() * 0xffffff),
    input: { x: 0, y: 0 },
    invulnerableUntil: 0, ready: false, wantsNextRound: false,
    grenades: 0, shield: 0, visionBoostUntil: 0, repelUntil: 0, bladesUntil: 0,
    joinedAt: Date.now(),
    ...extra,
  };
}

function resetPlayer(room, player, preserveScore = true) {
  const [x, y] = spawnPoint(room);
  Object.assign(player, {
    x, y, angle: 0, hp: 100, shield: 0, grenades: 0, alive: true, invulnerableUntil: Date.now() + 1800,
    weapon: 'knife', inventory: ['knife'], ammo: 0,
    visionBoostUntil: 0, repelUntil: 0, bladesUntil: 0,
  });
  if (!preserveScore) Object.assign(player, { score: 0, kills: 0, deaths: 0 });
}

function botName(i) {
  return `${BOT_NAMES[i % BOT_NAMES.length]} NPC`;
}

function spawnSingleBot(room, index) {
  const id = `bot-${room.id}-${++room.botSequence}`;
  const bot = makePlayer(id, botName(index), {
    isBot: true,
    botDifficulty: room.config.npcDifficulty,
    botState: {
      nextDecisionAt: 0, targetId: null, wanderAngle: Math.random() * Math.PI * 2, goal: null,
      nextSteerAt: 0, steerAngle: 0, targetAcquiredAt: 0,
    },
  });
  resetPlayer(room, bot, false);
  bot.alive = false;
  bot.ready = true;
  room.players.set(id, bot);
  return bot;
}

function spawnBotsForRoom(room) {
  for (let i = 0; i < room.config.npcCount; i += 1) spawnSingleBot(room, i);
}

// Aplica mudanças de npcCount/npcDifficulty feitas via updateRoomSettings:
// adiciona ou remove bots até bater com a config nova, sem mexer nos humanos.
function syncBotsToConfig(room) {
  const bots = [...room.players.values()].filter((p) => p.isBot);
  const humanCount = room.players.size - bots.length;
  const maxBotsAllowed = Math.max(0, room.config.maxPlayers - humanCount);
  const targetCount = Math.min(room.config.npcCount, maxBotsAllowed);
  if (bots.length > targetCount) {
    for (const bot of bots.slice(targetCount)) room.players.delete(bot.id);
  } else if (bots.length < targetCount) {
    for (let i = bots.length; i < targetCount; i += 1) spawnSingleBot(room, i);
  }
  for (const player of room.players.values()) {
    if (player.isBot) player.botDifficulty = room.config.npcDifficulty;
  }
  room.config.npcCount = targetCount;
}

function buildRoom(hostSocket, config, hostName) {
  const code = generateRoomCode();
  const room = {
    id: code,
    code,
    name: sanitizeRoomName(config.roomName) || `Sala de ${hostName}`,
    visibility: config.visibility === 'private' ? 'private' : 'public',
    hostId: hostSocket.id,
    state: 'lobby',
    config: {
      maxPlayers: clamp(Math.round(Number(config.maxPlayers)) || 8, 2, 16),
      mode: config.mode === 'versus' ? 'versus' : 'coop',
      lifeMode: config.lifeMode === 'battleRoyale' ? 'battleRoyale' : 'respawn',
      zombieSpawnMode: ['fixed', 'constant', 'evolution'].includes(config.zombieSpawnMode) ? config.zombieSpawnMode : 'constant',
      zombieBaseCount: clamp(Math.round(Number(config.zombieBaseCount)) || 14, 0, 60),
      npcCount: clamp(Math.round(Number(config.npcCount)) || 0, 0, 15),
      npcDifficulty: ['low', 'standard', 'high'].includes(config.npcDifficulty) ? config.npcDifficulty : 'standard',
      scoreLimit: clamp(Math.round(Number(config.scoreLimit)) || 0, 0, 500),
    },
    players: new Map(),
    zombies: new Map(),
    projectiles: new Map(),
    hazards: new Map(),
    pickups: new Map(),
    zombieSequence: 0,
    projectileSequence: 0,
    hazardSequence: 0,
    botSequence: 0,
    evolutionState: null,
    createdAt: Date.now(),
    emptySince: null,
    tickHandle: null,
    // Campos de estágio (campanha) — inicializados com o estágio 0 aqui pra
    // já existir algo válido pra desenhar/colidir enquanto a sala ainda está
    // no lobby; `applyStage` reatribui isso quando a partida começa de verdade.
    stageIndex: 0,
    walls: STAGES[0].walls,
    props: STAGES[0].props,
    arena: STAGES[0].arena,
    pickupSpawnPool: STAGES[0].pickupSpawnPool,
    spawnPoints: STAGES[0].spawnPoints,
    stageProgress: null,
  };
  room.config.npcCount = Math.min(room.config.npcCount, Math.max(0, room.config.maxPlayers - 1));
  seedPickups(room);
  rooms.set(room.id, room);
  spawnBotsForRoom(room);
  room.tickHandle = setInterval(() => update(room), 1000 / TICK_RATE);
  return room;
}

function joinRoomSocket(socket, room, name) {
  socket.leave(LOBBY_BROWSER_ROOM);
  socket.join(room.id);
  socketRoom.set(socket.id, room.id);
  const player = makePlayer(socket.id, name, {});
  resetPlayer(room, player, false);
  player.alive = false;
  player.ready = true;
  room.players.set(socket.id, player);
  room.emptySince = null;
  socket.emit('welcome', {
    id: socket.id, walls: room.walls, props: room.props, arena: room.arena, roomId: room.id, code: room.code,
    isHost: room.hostId === socket.id, settings: room.config,
  });
  io.to(room.id).emit('lobbyUpdate', lobbyPayload(room));
}

function attemptJoin(socket, room, name, ack) {
  if (!room) return safeAck(ack, { ok: false, reason: 'not_found' });
  if (room.state !== 'lobby') return safeAck(ack, { ok: false, reason: 'already_started' });
  if (room.players.size >= room.config.maxPlayers) return safeAck(ack, { ok: false, reason: 'full' });
  const humanCount = [...room.players.values()].filter((p) => !p.isBot).length;
  const finalName = sanitizeName(name) || `Agente ${humanCount + 1}`;
  joinRoomSocket(socket, room, finalName);
  safeAck(ack, { ok: true, roomId: room.id, code: room.code, isHost: room.hostId === socket.id, settings: room.config, players: lobbyPlayers(room), name: room.name });
  broadcastRoomListIfPublic(room);
}

function lobbyPlayers(room) {
  return [...room.players.values()].map((p) => ({
    id: p.id, name: p.name, isBot: !!p.isBot, botDifficulty: p.botDifficulty || null, isHost: p.id === room.hostId,
  }));
}

function lobbyPayload(room) {
  return {
    players: lobbyPlayers(room), settings: room.config, hostId: room.hostId, state: room.state,
    name: room.name, code: room.code, visibility: room.visibility,
  };
}

function serializeRoomForList(room) {
  return {
    id: room.id, name: room.name, playerCount: room.players.size, maxPlayers: room.config.maxPlayers,
    mode: room.config.mode, lifeMode: room.config.lifeMode, zombieSpawnMode: room.config.zombieSpawnMode, state: room.state,
  };
}

function publicRoomList() {
  return [...rooms.values()].filter((room) => room.visibility === 'public').map(serializeRoomForList);
}

function broadcastRoomListIfPublic(room) {
  if (room.visibility !== 'public') return;
  io.to(LOBBY_BROWSER_ROOM).emit('roomListUpdate', { rooms: publicRoomList() });
}

function returnToLobby(room) {
  room.state = 'lobby';
  room.zombies.clear();
  room.projectiles.clear();
  room.hazards.clear();
  for (const player of room.players.values()) {
    player.wantsNextRound = false;
    player.alive = false;
  }
  io.to(room.id).emit('lobbyUpdate', lobbyPayload(room));
  broadcastRoomListIfPublic(room);
}

// Texto de progresso do objetivo do estágio atual, reaproveitado no banner
// de anúncio e no `stage` mandado a cada snapshot pro HUD.
function describeObjective(progress) {
  if (!progress) return '';
  if (progress.type === 'eliminate') return `Eliminar infectados — ${progress.count}/${progress.target}`;
  if (progress.type === 'boss_kill') return progress.bossDead ? 'Ameaça neutralizada' : 'Derrotar o zumbi-tanque';
  return '';
}

// Carrega o estágio `stageIndex` da campanha na sala: troca layout/pickups/
// zumbis e (re)posiciona jogadores. `preservePlayers: true` é a transição
// "de verdade" entre estágios (mantém arma/munição/vida/escudo/granadas/
// pontuação, só reposiciona); `preservePlayers: false` é início de partida
// (reset completo, igual ao antigo `resetMatch`).
function applyStage(room, stageIndex, { preservePlayers }) {
  const stage = STAGES[stageIndex];
  room.stageIndex = stageIndex;
  room.walls = stage.walls;
  room.props = stage.props;
  room.arena = stage.arena;
  room.pickupSpawnPool = stage.pickupSpawnPool;
  room.spawnPoints = stage.spawnPoints;

  room.zombies.clear();
  room.projectiles.clear();
  room.hazards.clear();

  for (const [id, pickup] of room.pickups) {
    if (pickup.loot) { room.pickups.delete(id); continue; }
    const [x, y] = randomPickupPosition(room, pickup);
    Object.assign(pickup, { x, y, active: true, respawnAt: 0 });
  }

  const objective = stage.objective(room);
  if (objective.type === 'boss_kill') {
    const boss = spawnZombie(room, { forceTypeId: objective.zombieTypeId });
    boss.isBoss = true;
    for (let i = 0; i < 5; i += 1) spawnZombie(room);
    room.stageProgress = { type: 'boss_kill', bossId: boss.id, bossDead: false };
  } else {
    for (let i = 0; i < room.config.zombieBaseCount; i += 1) spawnZombie(room);
    room.stageProgress = { type: 'eliminate', target: objective.target, count: 0 };
  }

  room.evolutionState = {
    nextSpawnAt: Date.now() + EVOLUTION_INTERVAL_MS,
    batchSize: EVOLUTION_BATCH_BASE,
    currentCap: Math.max(room.config.zombieBaseCount, 1) * EVOLUTION_CAP_MULTIPLIER,
    waveIndex: 0,
  };

  for (const player of room.players.values()) {
    if (preservePlayers) {
      if (!player.alive) continue; // jogador morto segue o fluxo normal de respawn
      const [x, y] = spawnPoint(room);
      Object.assign(player, { x, y, invulnerableUntil: Date.now() + 1800 });
    } else {
      resetPlayer(room, player, false);
      player.wantsNextRound = false;
    }
  }

  io.to(room.id).emit('stageChange', {
    walls: room.walls, props: room.props, arena: room.arena,
    stageIndex, stageCount: STAGES.length, stageName: stage.name,
  });
  io.to(room.id).emit('announcement', { title: stage.name.toUpperCase(), subtitle: describeObjective(room.stageProgress) });
}

function resetMatch(room) {
  applyStage(room, 0, { preservePlayers: false });
}

function startMatch(room) {
  room.state = 'playing';
  resetMatch(room);
  io.to(room.id).emit('matchStarted', {});
  broadcastRoomListIfPublic(room);
}

function roomAlive(room) {
  return rooms.get(room.id) === room;
}

function getRoom(socket) {
  const roomId = socketRoom.get(socket.id);
  return roomId ? rooms.get(roomId) : null;
}

function destroyRoomIfStillEmpty(room) {
  if (!roomAlive(room)) return;
  const humansLeft = [...room.players.values()].filter((p) => !p.isBot).length;
  if (humansLeft > 0) return;
  clearInterval(room.tickHandle);
  rooms.delete(room.id);
  io.to(LOBBY_BROWSER_ROOM).emit('roomListUpdate', { rooms: publicRoomList() });
}

// Compartilhado por 'disconnect' e pelo 'leaveRoom' explícito (sair sem
// derrubar a conexão) — remove o jogador da sala, promove novo host se
// preciso e agenda a destruição da sala se não sobrar nenhum humano.
function removePlayerFromRoom(socket, room) {
  room.players.delete(socket.id);
  socketRoom.delete(socket.id);
  socket.leave(room.id);
  if (room.hostId === socket.id) {
    const nextHost = [...room.players.values()].find((p) => !p.isBot);
    room.hostId = nextHost ? nextHost.id : null;
    io.to(room.id).emit('hostChanged', { hostId: room.hostId });
  }
  const humansLeft = [...room.players.values()].filter((p) => !p.isBot).length;
  if (humansLeft === 0) {
    room.emptySince = Date.now();
    setTimeout(() => destroyRoomIfStillEmpty(room), ROOM_EMPTY_GRACE_MS);
  } else {
    io.to(room.id).emit('lobbyUpdate', lobbyPayload(room));
    broadcastRoomListIfPublic(room);
  }
}

function handleDisconnect(socket) {
  const roomId = socketRoom.get(socket.id);
  if (!roomId) return;
  const room = rooms.get(roomId);
  if (!room) { socketRoom.delete(socket.id); return; }
  removePlayerFromRoom(socket, room);
}

function damageHp(target, amount) {
  let remaining = amount;
  if (target.shield > 0) {
    const absorbed = Math.min(target.shield, remaining);
    target.shield -= absorbed;
    remaining -= absorbed;
  }
  target.hp = Math.max(0, target.hp - remaining);
}

// Ao morrer, larga a arma de fogo equipada (com a munição restante) e as
// granadas como pickups avulsos no chão — coletáveis por qualquer um, e
// que não voltam a nascer sozinhos depois de coletados (loot: true).
function dropLoot(room, target) {
  const drops = [];
  if (target.weapon && weapons[target.weapon] && !weapons[target.weapon].melee) {
    const ammo = target.ammo || 0;
    if (ammo > 0) drops.push({ kind: 'weapon', weapon: target.weapon, amount: ammo });
  }
  if (target.grenades > 0) drops.push({ kind: 'grenade', amount: target.grenades });
  drops.forEach((drop, i) => {
    const id = `loot-${target.id}-${Date.now()}-${i}`;
    room.pickups.set(id, {
      id, ...drop, x: target.x + (Math.random() - 0.5) * 0.8, y: target.y + (Math.random() - 0.5) * 0.8,
      active: true, respawnAt: 0, loot: true,
    });
  });
}

function killPlayer(room, target, attacker) {
  target.alive = false;
  target.deaths += 1;
  if (attacker && attacker.id !== target.id) {
    attacker.score += 5;
    attacker.kills += 1;
  }
  const attackerName = attacker ? attacker.name : 'Um zumbi';
  io.to(room.id).emit('killfeed', `${attackerName} neutralizou ${target.name}`);
  dropLoot(room, target);
  if (room.config.lifeMode === 'respawn') {
    setTimeout(() => {
      if (!roomAlive(room) || room.state !== 'playing') return;
      if (room.players.has(target.id)) resetPlayer(room, target, true);
    }, 2200);
  }
}

function scheduleZombieRespawn(room) {
  if (room.config.zombieSpawnMode === 'fixed' || room.config.zombieSpawnMode === 'evolution') return;
  const delay = 5000 + Math.random() * 10000;
  setTimeout(() => {
    if (!roomAlive(room) || room.state !== 'playing') return;
    spawnZombie(room);
  }, delay);
}

// Recompensa por matar zumbi comum: cura+munição pequenas, chance baixa de
// especial. Zumbis especiais (tanque, bomba, ácido, etc.) sempre garantem um
// especial — recompensa proporcional ao risco extra de enfrentá-los.
function grantRandomSpecial(player, now) {
  const specials = ['vision', 'repel', 'shield', 'blades'];
  const pick = specials[Math.floor(Math.random() * specials.length)];
  if (pick === 'vision') player.visionBoostUntil = now + VISION_BOOST_MS;
  else if (pick === 'repel') player.repelUntil = now + REPEL_MS;
  else if (pick === 'shield') player.shield = SHIELD_CAPACITY;
  else if (pick === 'blades') player.bladesUntil = now + BLADES_DURATION_MS;
}

function grantZombieKillReward(attacker, type) {
  if (!attacker || attacker.hp <= 0) return;
  const now = Date.now();
  attacker.hp = Math.min(100, attacker.hp + 4);
  if (attacker.weapon && weapons[attacker.weapon] && !weapons[attacker.weapon].melee) {
    attacker.ammo = (attacker.ammo || 0) + 2;
  }
  const specialChance = (type && type.special) ? 1 : 0.12;
  if (Math.random() < specialChance) grantRandomSpecial(attacker, now);
}

// Único gatilho de progresso de objetivo de estágio — os 2 pontos do arquivo
// onde um zumbi é removido (aqui e em `explodeBomb`) chamam isso logo após
// o `delete`.
function registerZombieKill(room, zombie) {
  const progress = room.stageProgress;
  if (!progress) return;
  if (progress.type === 'eliminate') progress.count += 1;
  else if (progress.type === 'boss_kill' && zombie.id === progress.bossId) progress.bossDead = true;
}

function applyDamage(room, target, damage, attacker, isZombieTarget) {
  if (target.hp <= 0 || (!isZombieTarget && Date.now() < target.invulnerableUntil)) return false;
  const reduction = isZombieTarget ? (ZOMBIE_TYPES_BY_ID[target.typeId]?.damageReduction || 0) : 0;
  damageHp(target, damage * (1 - reduction));
  if (target.hp > 0) return false;
  if (isZombieTarget) {
    const type = ZOMBIE_TYPES_BY_ID[target.typeId];
    room.zombies.delete(target.id);
    registerZombieKill(room, target);
    if (attacker) {
      attacker.score += 1;
      grantZombieKillReward(attacker, type);
    }
    if (type && type.special === 'gasser') spawnGasCloud(room, target.x, target.y);
    scheduleZombieRespawn(room);
  } else {
    killPlayer(room, target, attacker);
  }
  return true;
}

function handleShot(room, player, data) {
  const weapon = weapons[data?.weapon];
  if (!weapon || !player.alive || !player.ready || !player.inventory.includes(data.weapon)) return;
  const now = Date.now();
  if (now - player.lastShot < weapon.cooldown) return;
  const cost = weapon.ammoCost || 0;
  if (!weapon.melee && player.ammo < cost) return;
  player.lastShot = now;
  player.weapon = data.weapon;
  if (!weapon.melee) player.ammo -= cost;
  const baseAngle = Number.isFinite(data.angle) ? data.angle : player.angle;
  player.angle = baseAngle;

  if (weapon.projectile) {
    const id = `rk${++room.projectileSequence}`;
    const initialTarget = findTargetInDirection(room, player.x, player.y, baseAngle, weapon.range, player.id);
    room.projectiles.set(id, {
      id, kind: 'rocket', x: player.x, y: player.y, angle: baseAngle, speed: weapon.speed, damage: weapon.damage,
      range: weapon.range, blastRadius: weapon.blastRadius, traveled: 0, ownerId: player.id,
      targetId: initialTarget ? initialTarget.id : null,
    });
    io.to(room.id).emit('shot', { id: player.id, weapon: data.weapon, x: player.x, y: player.y, angle: baseAngle, impacts: [] });
    return;
  }

  const impacts = [];

  for (let pellet = 0; pellet < weapon.pellets; pellet += 1) {
    const angle = baseAngle + (Math.random() - 0.5) * weapon.spread * 2;
    const dirX = Math.cos(angle);
    const dirY = Math.sin(angle);
    let closest = { distance: weapon.range, target: null, zombie: false };
    for (const wall of room.walls) {
      const distance = rayBox(player.x, player.y, dirX, dirY, wall);
      if (distance !== null && distance < closest.distance) closest.distance = distance;
    }
    for (const zombie of room.zombies.values()) {
      const hitRadius = (zombie.radius || 0.48) + 0.14;
      const distance = rayCircle(player.x, player.y, dirX, dirY, zombie.x, zombie.y, hitRadius, weapon.range);
      if (distance !== null && distance < closest.distance) closest = { distance, target: zombie, zombie: true };
    }
    if (room.config.mode !== 'coop') {
      for (const other of room.players.values()) {
        if (other.id === player.id || !other.alive) continue;
        const distance = rayCircle(player.x, player.y, dirX, dirY, other.x, other.y, 0.58, weapon.range);
        if (distance !== null && distance < closest.distance) closest = { distance, target: other, zombie: false };
      }
    }
    if (closest.target) {
      applyDamage(room, closest.target, weapon.damage, player, closest.zombie);
      if (weapon.melee) {
        const radius = closest.zombie ? (closest.target.radius || 0.48) : PLAYER_RADIUS;
        moveWithCollision(room, closest.target, dirX * KNIFE_KNOCKBACK, dirY * KNIFE_KNOCKBACK, radius);
      }
    }
    impacts.push({ x: player.x + dirX * closest.distance, y: player.y + dirY * closest.distance });
  }
  io.to(room.id).emit('shot', { id: player.id, weapon: data.weapon, x: player.x, y: player.y, angle: baseAngle, impacts });
}

function collectPickups(room, player, now) {
  for (const pickup of room.pickups.values()) {
    if (!pickup.active || Math.hypot(player.x - pickup.x, player.y - pickup.y) > 1.05) continue;
    // Munição pode ser estocada mesmo sem já possuir a arma — fica guardada
    // pra quando o jogador encontrar a arma correspondente depois.
    if (pickup.kind === 'heart' && player.hp >= 100) continue;
    if (pickup.kind === 'shield' && player.shield >= SHIELD_CAPACITY) continue;
    if (pickup.kind === 'grenade' && player.grenades >= GRENADE_MAX) continue;
    if (pickup.loot) {
      room.pickups.delete(pickup.id);
    } else {
      pickup.active = false;
      pickup.respawnAt = now + (pickup.respawnMs || 15000);
    }
    if (pickup.kind === 'weapon') {
      const isNewWeapon = !player.inventory.includes(pickup.weapon);
      if (isNewWeapon) player.inventory.push(pickup.weapon);
      player.ammo += pickup.amount;
      const currentRank = WEAPON_RANK[player.weapon] || 0;
      const pickupRank = WEAPON_RANK[pickup.weapon] || 0;
      if (player.weapon === 'knife' || pickupRank > currentRank) player.weapon = pickup.weapon;
      io.to(player.id).emit('pickup', { label: `${pickup.weapon.toUpperCase()} COLETADA`, weapon: pickup.weapon });
    } else if (pickup.kind === 'ammo') {
      player.ammo += pickup.amount;
      io.to(player.id).emit('pickup', { label: `+${pickup.amount} MUNIÇÕES`, weapon: pickup.weapon });
    } else if (pickup.kind === 'heart') {
      player.hp = Math.min(100, player.hp + pickup.amount);
      io.to(player.id).emit('pickup', { label: `+${pickup.amount} VIDA`, weapon: null });
    } else if (pickup.kind === 'shield') {
      player.shield = SHIELD_CAPACITY;
      io.to(player.id).emit('pickup', { label: 'ESCUDO ATIVADO', weapon: null });
    } else if (pickup.kind === 'grenade') {
      player.grenades = Math.min(GRENADE_MAX, player.grenades + pickup.amount);
      if (!player.inventory.includes('grenade')) player.inventory.push('grenade');
      io.to(player.id).emit('pickup', { label: `+${pickup.amount} GRANADA`, weapon: null });
    } else if (pickup.kind === 'vision') {
      player.visionBoostUntil = now + VISION_BOOST_MS;
      io.to(player.id).emit('pickup', { label: 'VISÃO AMPLIADA', weapon: null });
    } else if (pickup.kind === 'repel') {
      player.repelUntil = now + REPEL_MS;
      io.to(player.id).emit('pickup', { label: 'ZUMBIS REPELIDOS', weapon: null });
    } else if (pickup.kind === 'aggro') {
      let rival = null;
      let distance = Infinity;
      for (const other of room.players.values()) {
        if (other.id === player.id || !other.alive || !other.ready) continue;
        const candidate = Math.hypot(other.x - player.x, other.y - player.y);
        if (candidate < distance) { distance = candidate; rival = other; }
      }
      if (rival) {
        for (const zombie of room.zombies.values()) {
          zombie.forcedTargetId = rival.id;
          zombie.forcedUntil = now + AGGRO_MS;
        }
      }
      io.to(player.id).emit('pickup', { label: 'ZUMBIS ATRAÍDOS AOS RIVAIS', weapon: null });
    } else if (pickup.kind === 'blades') {
      player.bladesUntil = now + pickup.amount;
      io.to(player.id).emit('pickup', { label: 'LÂMINAS GIRATÓRIAS', weapon: null });
    }
  }
}

function explodeGrenade(room, player, x, y) {
  io.to(room.id).emit('grenade', { x, y, radius: GRENADE_RADIUS });
  for (const zombie of room.zombies.values()) {
    if (Math.hypot(zombie.x - x, zombie.y - y) <= GRENADE_RADIUS) applyDamage(room, zombie, GRENADE_DAMAGE, player, true);
  }
  if (room.config.mode !== 'coop') {
    for (const other of room.players.values()) {
      if (other.id === player.id || !other.alive) continue;
      if (Math.hypot(other.x - x, other.y - y) <= GRENADE_RADIUS) applyDamage(room, other, GRENADE_DAMAGE, player, false);
    }
  }
}

function handleGrenade(room, player, data) {
  if (!player.alive || !player.ready || player.grenades <= 0) return;
  const now = Date.now();
  if (now - (player.lastGrenade || 0) < GRENADE_COOLDOWN) return;
  player.lastGrenade = now;
  player.grenades -= 1;
  player.weapon = 'grenade';
  const angle = Number.isFinite(data?.angle) ? data.angle : player.angle;
  player.angle = angle;
  const dirX = Math.cos(angle);
  const dirY = Math.sin(angle);
  const requested = Number.isFinite(data?.distance) ? data.distance : GRENADE_RANGE;
  let distance = Math.min(GRENADE_RANGE, Math.max(GRENADE_MIN_RANGE, requested));
  for (const wall of room.walls) {
    const hit = rayBox(player.x, player.y, dirX, dirY, wall);
    if (hit !== null && hit < distance) distance = hit;
  }
  explodeGrenade(room, player, player.x + dirX * distance, player.y + dirY * distance);
}

function handleFireIntent(room, player, data) {
  if (data && data.weapon === 'grenade') handleGrenade(room, player, data);
  else handleShot(room, player, data);
}

function spawnZombie(room, opts = {}) {
  const type = (opts.forceTypeId && ZOMBIE_TYPES_BY_ID[opts.forceTypeId]) || pickZombieType();
  let x;
  let y;
  do {
    const edge = Math.floor(Math.random() * 4);
    const edgeOffset = room.arena - 2;
    const span = (room.arena - 3) * 2;
    const value = -(room.arena - 3) + Math.random() * span;
    [x, y] = edge === 0 ? [-edgeOffset, value] : edge === 1 ? [edgeOffset, value] : edge === 2 ? [value, -edgeOffset] : [value, edgeOffset];
  } while (collides(room, x, y, type.radius));
  const id = `z${++room.zombieSequence}`;
  const [minSpeed, maxSpeed] = type.speed || [1.45, 2.0];
  const zombie = {
    id, x, y, angle: 0, hp: type.hp, speed: minSpeed + Math.random() * (maxSpeed - minSpeed), attackAt: 0,
    typeId: type.id, radius: type.radius, wanderAngle: Math.random() * Math.PI * 2, thinkAt: 0,
    forcedTargetId: null, forcedUntil: 0, fuseAt: 0,
    stretchPhase: type.special === 'stretch' ? 'idle' : null, phaseAt: 0, grabTargetId: null,
    nextRangedAttackAt: 0,
  };
  room.zombies.set(id, zombie);
  return zombie;
}

function explodeBomb(room, zombie, type) {
  io.to(room.id).emit('grenade', { x: zombie.x, y: zombie.y, radius: type.radiusExplode });
  for (const player of room.players.values()) {
    if (!player.alive || !player.ready) continue;
    if (Math.hypot(player.x - zombie.x, player.y - zombie.y) > type.radiusExplode) continue;
    applyDamage(room, player, type.damage, null, false);
  }
  room.zombies.delete(zombie.id);
  registerZombieKill(room, zombie);
  scheduleZombieRespawn(room);
}

function chooseSteeringAngle(room, entity, goalX, goalY, avoidList, avoidRadius, radius) {
  const desired = Math.atan2(goalY - entity.y, goalX - entity.x);
  const candidates = [0, .35, -.35, .7, -.7, 1.05, -1.05, 1.4, -1.4, Math.PI];
  let best = { score: -Infinity, angle: desired };
  for (const offset of candidates) {
    const angle = desired + offset;
    const probeX = entity.x + Math.cos(angle) * 1.15;
    const probeY = entity.y + Math.sin(angle) * 1.15;
    if (collides(room, probeX, probeY, radius)) continue;
    let separation = 0;
    for (const other of avoidList) {
      if (other.id === entity.id) continue;
      const distance = Math.hypot(probeX - other.x, probeY - other.y);
      if (distance < avoidRadius) separation -= (avoidRadius - distance) * 1.4;
    }
    const score = Math.cos(offset) * 2.4 + separation + Math.random() * .15;
    if (score > best.score) best = { score, angle };
  }
  return best.angle;
}

function zombieDirection(room, zombie, target, now) {
  if (now < zombie.thinkAt) return zombie.wanderAngle;
  zombie.thinkAt = now + 320 + Math.random() * 220;
  zombie.wanderAngle = chooseSteeringAngle(room, zombie, target.x, target.y, [...room.zombies.values()], 1.2, zombie.radius || 0.48);
  return zombie.wanderAngle;
}

function runStretchLogic(room, zombie, type, target, now, dt) {
  if (!zombie.stretchPhase || zombie.stretchPhase === 'idle') {
    if (now < zombie.attackAt) return;
    zombie.angle = Math.atan2(target.y - zombie.y, target.x - zombie.x);
    zombie.stretchPhase = 'windup';
    zombie.phaseAt = now + type.windupMs;
    return;
  }
  if (zombie.stretchPhase === 'windup') {
    if (now < zombie.phaseAt) return;
    zombie.stretchPhase = 'strike';
    zombie.phaseAt = now + type.strikeMs;
    const distance = Math.hypot(target.x - zombie.x, target.y - zombie.y);
    if (distance <= type.meleeRange) {
      applyDamage(room, target, type.meleeDamage, null, false);
      zombie.grabTargetId = target.id;
    }
    return;
  }
  if (zombie.stretchPhase === 'strike') {
    if (now < zombie.phaseAt) return;
    if (zombie.grabTargetId && type.pullLandingDistance > 0) {
      zombie.stretchPhase = 'pull';
      zombie.phaseAt = now + (type.pullMs || 400);
    } else {
      zombie.stretchPhase = 'recover';
      zombie.phaseAt = now + type.recoverMs;
    }
    return;
  }
  if (zombie.stretchPhase === 'pull') {
    // Puxão sustentado (ao estilo Smoker de L4D): para automaticamente se o
    // alvo agarrado morrer/desconectar/sair de jogo no meio do caminho — não
    // é um teleporte instantâneo, então dá margem pra um resgate. O timeout
    // de pullMs também cobre o caso raro de mais de um stretcher agarrar o
    // mesmo alvo ao mesmo tempo puxando em direções diferentes.
    const grabbed = room.players.get(zombie.grabTargetId);
    if (!grabbed || !grabbed.alive || !grabbed.ready) {
      zombie.grabTargetId = null;
      zombie.stretchPhase = 'recover';
      zombie.phaseAt = now + type.recoverMs;
      return;
    }
    const distance = Math.hypot(grabbed.x - zombie.x, grabbed.y - zombie.y);
    if (distance <= type.pullLandingDistance || now >= zombie.phaseAt) {
      zombie.grabTargetId = null;
      zombie.stretchPhase = 'recover';
      zombie.phaseAt = now + type.recoverMs;
      return;
    }
    const angle = Math.atan2(zombie.y - grabbed.y, zombie.x - grabbed.x);
    const step = Math.min(type.pullSpeed * dt, distance - type.pullLandingDistance);
    moveWithCollision(room, grabbed, Math.cos(angle) * step, Math.sin(angle) * step, PLAYER_RADIUS);
    return;
  }
  if (zombie.stretchPhase === 'recover') {
    if (now < zombie.phaseAt) return;
    zombie.stretchPhase = 'idle';
    zombie.attackAt = now;
  }
}

function runAcidLogic(room, zombie, type, target, now) {
  if (now < zombie.nextRangedAttackAt) return;
  zombie.nextRangedAttackAt = now + type.cooldownMs;
  const angle = Math.atan2(target.y - zombie.y, target.x - zombie.x);
  zombie.angle = angle;
  const id = `p${++room.projectileSequence}`;
  room.projectiles.set(id, {
    id, x: zombie.x, y: zombie.y, dirX: Math.cos(angle), dirY: Math.sin(angle),
    speed: type.projectileSpeed, damage: type.damage, range: type.range, traveled: 0,
    ownerId: zombie.id, spawnAt: now,
  });
}

// Gritador: não bate forte, mas periodicamente convoca outros zumbis num
// raio pra também perseguirem o mesmo alvo — reaproveita o forcedTargetId/
// forcedUntil que já existe pro pickup de "aggro".
function runScreamLogic(room, zombie, type, target, now) {
  if (now < (zombie.nextRangedAttackAt || 0)) return;
  zombie.nextRangedAttackAt = now + (type.screamCooldownMs || 4000);
  for (const other of room.zombies.values()) {
    if (other.id === zombie.id) continue;
    if (Math.hypot(other.x - zombie.x, other.y - zombie.y) <= (type.screamRadius || 7)) {
      other.forcedTargetId = target.id;
      other.forcedUntil = now + AGGRO_MS;
    }
  }
}

function updateZombies(room, now, dt) {
  const living = [...room.players.values()].filter((player) => player.alive && player.ready);
  for (const zombie of room.zombies.values()) {
    const type = ZOMBIE_TYPES_BY_ID[zombie.typeId] || ZOMBIE_TYPES[0];
    let target = null;

    if (zombie.forcedTargetId && now < zombie.forcedUntil) {
      const forced = room.players.get(zombie.forcedTargetId);
      if (forced && forced.alive && forced.ready) target = forced;
    }
    if (!target) {
      zombie.forcedTargetId = null;
      zombie.forcedUntil = 0;
      let distance = Infinity;
      for (const player of living) {
        if (player.repelUntil && now < player.repelUntil) continue;
        const candidate = Math.hypot(player.x - zombie.x, player.y - zombie.y);
        if (candidate > ZOMBIE_SIGHT_RANGE) continue;
        if (candidate < distance) { distance = candidate; target = player; }
      }
    }

    for (const player of living) {
      if (!player.repelUntil || now >= player.repelUntil) continue;
      const distanceToPlayer = Math.hypot(zombie.x - player.x, zombie.y - player.y);
      if (distanceToPlayer > 0 && distanceToPlayer < REPEL_RADIUS) {
        const pushAngle = Math.atan2(zombie.y - player.y, zombie.x - player.x);
        const pushSpeed = zombie.speed * 1.4 * dt;
        moveWithCollision(room, zombie, Math.cos(pushAngle) * pushSpeed, Math.sin(pushAngle) * pushSpeed, zombie.radius);
      }
    }

    if (!target) {
      // Ninguém à vista: vagueia devagar em vez de ficar parado feito estátua.
      if (now >= zombie.thinkAt) {
        zombie.thinkAt = now + 800 + Math.random() * 600;
        zombie.wanderAngle += (Math.random() - 0.5) * 1.4;
      }
      const wanderSpeed = zombie.speed * 0.35 * dt;
      zombie.angle = zombie.wanderAngle;
      moveWithCollision(room, zombie, Math.cos(zombie.wanderAngle) * wanderSpeed, Math.sin(zombie.wanderAngle) * wanderSpeed, zombie.radius);
      continue;
    }

    if (type.special === 'stretch' && zombie.stretchPhase && zombie.stretchPhase !== 'idle') {
      runStretchLogic(room, zombie, type, target, now, dt);
      continue;
    }

    if (type.special === 'acid') {
      zombie.angle = Math.atan2(target.y - zombie.y, target.x - zombie.x);
      const distance = Math.hypot(target.x - zombie.x, target.y - zombie.y);
      if (distance > type.range) {
        const speed = zombie.speed * dt;
        const direction = zombieDirection(room, zombie, target, now);
        zombie.angle = direction;
        moveWithCollision(room, zombie, Math.cos(direction) * speed, Math.sin(direction) * speed, zombie.radius);
      } else {
        runAcidLogic(room, zombie, type, target, now);
      }
      continue;
    }

    if (type.special === 'scream') {
      zombie.angle = Math.atan2(target.y - zombie.y, target.x - zombie.x);
      const distance = Math.hypot(target.x - zombie.x, target.y - zombie.y);
      if (distance > (type.screamRange || 6)) {
        const speed = zombie.speed * dt;
        const direction = zombieDirection(room, zombie, target, now);
        zombie.angle = direction;
        moveWithCollision(room, zombie, Math.cos(direction) * speed, Math.sin(direction) * speed, zombie.radius);
        continue;
      }
      runScreamLogic(room, zombie, type, target, now);
      // depois de gritar, ainda pode fechar pra cima do alvo com o melee comum
    }

    const engageRange = type.meleeRange || 1.15;
    const distance = Math.hypot(target.x - zombie.x, target.y - zombie.y);
    if (distance > engageRange) {
      if (type.special === 'leap' && distance <= (type.leapRange || 5) && now >= (zombie.nextRangedAttackAt || 0)) {
        zombie.nextRangedAttackAt = now + (type.leapCooldownMs || 3000);
        zombie.angle = Math.atan2(target.y - zombie.y, target.x - zombie.x);
        const dashDist = Math.min(distance - engageRange * 0.6, 2.6);
        moveWithCollision(room, zombie, Math.cos(zombie.angle) * dashDist, Math.sin(zombie.angle) * dashDist, zombie.radius);
        continue;
      }
      const speed = zombie.speed * dt;
      const direction = zombieDirection(room, zombie, target, now);
      zombie.angle = direction;
      moveWithCollision(room, zombie, Math.cos(direction) * speed, Math.sin(direction) * speed, zombie.radius);
      continue;
    }

    if (type.special === 'bomb') {
      zombie.angle = Math.atan2(target.y - zombie.y, target.x - zombie.x);
      if (!zombie.fuseAt) zombie.fuseAt = now + type.fuseMs;
      if (now >= zombie.fuseAt) explodeBomb(room, zombie, type);
    } else if (type.special === 'stretch') {
      runStretchLogic(room, zombie, type, target, now, dt);
    } else if (now > zombie.attackAt && now > target.invulnerableUntil) {
      zombie.angle = Math.atan2(target.y - zombie.y, target.x - zombie.x);
      zombie.attackAt = now + (type.meleeCooldownMs || 900);
      applyDamage(room, target, type.meleeDamage || 12, null, false);
    }
  }
}

function lerpAngleServer(a, b, t) {
  const diff = ((b - a + Math.PI * 3) % (Math.PI * 2)) - Math.PI;
  return a + diff * t;
}

const ROCKET_LOCK_RADIUS = 1.6; // "cone" de travamento — não precisa acertar em cheio

// Alvo na direção pra onde o míssil está apontado (disparo ou reaquisição em
// pleno voo), não o mais próximo do mapa — usa a mesma rayCircle das armas
// hitscan pra achar "o que está à minha frente, dentro do alcance restante".
function findTargetInDirection(room, originX, originY, angle, range, excludeId) {
  const dirX = Math.cos(angle);
  const dirY = Math.sin(angle);
  let best = null;
  let bestAlong = range;
  for (const zombie of room.zombies.values()) {
    const along = rayCircle(originX, originY, dirX, dirY, zombie.x, zombie.y, ROCKET_LOCK_RADIUS, range);
    if (along !== null && along < bestAlong) { bestAlong = along; best = zombie; }
  }
  if (room.config.mode !== 'coop') {
    for (const player of room.players.values()) {
      if (player.id === excludeId || !player.alive) continue;
      const along = rayCircle(originX, originY, dirX, dirY, player.x, player.y, ROCKET_LOCK_RADIUS, range);
      if (along !== null && along < bestAlong) { bestAlong = along; best = player; }
    }
  }
  return best;
}

function explodeRocket(room, proj, x, y) {
  io.to(room.id).emit('grenade', { x, y, radius: proj.blastRadius });
  const owner = room.players.get(proj.ownerId) || null;
  for (const zombie of room.zombies.values()) {
    if (Math.hypot(zombie.x - x, zombie.y - y) <= proj.blastRadius) applyDamage(room, zombie, proj.damage, owner, true);
  }
  if (room.config.mode !== 'coop') {
    for (const other of room.players.values()) {
      if (other.id === proj.ownerId || !other.alive) continue;
      if (Math.hypot(other.x - x, other.y - y) <= proj.blastRadius) applyDamage(room, other, proj.damage, owner, false);
    }
  }
}

// Míssil perseguidor: curva suavemente em direção ao inimigo vivo mais
// próximo (não gruda instantaneamente, dá pra desviar se for ágil) e explode
// em área ao encostar, bater numa parede ou esgotar o alcance.
function updateRocket(room, proj, now, dt) {
  const currentTarget = proj.targetId ? (room.zombies.get(proj.targetId) || room.players.get(proj.targetId)) : null;
  const remainingRange = Math.max(0, proj.range - proj.traveled);
  const liveTarget = (currentTarget && currentTarget.alive !== false)
    ? currentTarget
    : findTargetInDirection(room, proj.x, proj.y, proj.angle, remainingRange, proj.ownerId);
  proj.targetId = liveTarget ? liveTarget.id : null;
  if (liveTarget) {
    const desiredAngle = Math.atan2(liveTarget.y - proj.y, liveTarget.x - proj.x);
    proj.angle = lerpAngleServer(proj.angle, desiredAngle, Math.min(1, 3.2 * dt));
  }
  const step = proj.speed * dt;
  const nextX = proj.x + Math.cos(proj.angle) * step;
  const nextY = proj.y + Math.sin(proj.angle) * step;
  proj.traveled += step;
  if (collides(room, nextX, nextY, 0.2)) { explodeRocket(room, proj, proj.x, proj.y); room.projectiles.delete(proj.id); return; }
  proj.x = nextX;
  proj.y = nextY;
  if (liveTarget && Math.hypot(liveTarget.x - proj.x, liveTarget.y - proj.y) <= 0.6) {
    explodeRocket(room, proj, proj.x, proj.y);
    room.projectiles.delete(proj.id);
    return;
  }
  if (proj.traveled > proj.range) {
    explodeRocket(room, proj, proj.x, proj.y);
    room.projectiles.delete(proj.id);
  }
}

function updateProjectiles(room, now, dt) {
  for (const proj of room.projectiles.values()) {
    if (proj.kind === 'rocket') { updateRocket(room, proj, now, dt); continue; }
    const step = proj.speed * dt;
    const nextX = proj.x + proj.dirX * step;
    const nextY = proj.y + proj.dirY * step;
    if (collides(room, nextX, nextY, 0.15)) { room.projectiles.delete(proj.id); continue; }
    proj.traveled += step;
    if (proj.traveled > proj.range) { room.projectiles.delete(proj.id); continue; }
    proj.x = nextX;
    proj.y = nextY;
    let hit = false;
    for (const player of room.players.values()) {
      if (!player.alive || player.id === proj.ownerId) continue;
      if (Math.hypot(player.x - proj.x, player.y - proj.y) > 0.5) continue;
      applyDamage(room, player, proj.damage, null, false);
      hit = true;
      break;
    }
    if (hit) room.projectiles.delete(proj.id);
  }
}

// Lâminas giratórias (especial temporário): dano contínuo e modesto em raio
// curto ao redor de quem estiver com o buff ativo — limpa zumbis fracos sem
// precisar mirar.
function updateBlades(room, now, dt) {
  for (const player of room.players.values()) {
    if (!player.alive || !(player.bladesUntil > now)) continue;
    for (const zombie of room.zombies.values()) {
      if (Math.hypot(zombie.x - player.x, zombie.y - player.y) <= BLADES_RADIUS) {
        applyDamage(room, zombie, BLADES_DPS * dt, player, true);
      }
    }
  }
}

// Nuvem de gás deixada pelo zumbi "gasser" ao morrer — dano leve contínuo
// pra quem ficar dentro, some sozinha depois de alguns segundos.
function spawnGasCloud(room, x, y) {
  const id = `gas${++room.hazardSequence}`;
  room.hazards.set(id, { id, x, y, radius: 2.1, damagePerTick: 3, expiresAt: Date.now() + 6000 });
}

function updateHazards(room, now, dt) {
  for (const hazard of room.hazards.values()) {
    if (now >= hazard.expiresAt) { room.hazards.delete(hazard.id); continue; }
    for (const player of room.players.values()) {
      if (!player.alive) continue;
      if (Math.hypot(player.x - hazard.x, player.y - hazard.y) <= hazard.radius) {
        applyDamage(room, player, hazard.damagePerTick * dt, null, false);
      }
    }
  }
}

function updateEvolutionSpawns(room, now) {
  if (room.config.zombieSpawnMode !== 'evolution' || !room.evolutionState) return;
  const state = room.evolutionState;
  if (now < state.nextSpawnAt) return;
  const spawnCount = Math.max(0, Math.min(state.batchSize, state.currentCap - room.zombies.size));
  for (let i = 0; i < spawnCount; i += 1) spawnZombie(room);
  state.nextSpawnAt = now + EVOLUTION_INTERVAL_MS;
  state.waveIndex += 1;
  if (state.waveIndex % 3 === 0) state.batchSize = Math.min(EVOLUTION_BATCH_MAX, state.batchSize + 1);
}

function finishRound(room, reason) {
  const ranked = [...room.players.values()].filter((player) => player.ready).sort((a, b) => b.score - a.score);
  const winner = ranked[0];
  const title = reason === 'wipe' ? 'EQUIPE ELIMINADA'
    : reason === 'campaignComplete' ? 'CAMPANHA CONCLUÍDA'
    : winner ? `${winner.name.toUpperCase()} VENCEU` : 'FIM DA RODADA';
  io.to(room.id).emit('announcement', { title, subtitle: winner ? `${winner.score} pontos` : 'Aguardando agentes' });
  io.to(room.id).emit('roundEnd', {
    scores: ranked.map(({ id, name, score, kills, deaths }) => ({ id, name, score, kills, deaths })),
    campaignComplete: reason === 'campaignComplete',
  });
  room.state = 'roundEnd';
}

// Substitui o antigo estágio da campanha pelo próximo quando o objetivo do
// estágio atual é cumprido; encerra a campanha (finishRound) se era o último.
function checkStageObjective(room, now) {
  const progress = room.stageProgress;
  if (!progress) return;
  const done = progress.type === 'eliminate' ? progress.count >= progress.target : progress.bossDead;
  if (!done) return;
  if (room.stageIndex + 1 < STAGES.length) {
    applyStage(room, room.stageIndex + 1, { preservePlayers: true });
  } else {
    finishRound(room, 'campaignComplete');
  }
}

// Condições de fim de partida que não vêm de objetivo de estágio (continuam
// existindo como antes): limite de pontuação e battle royale. O antigo fim
// por cronômetro (MATCH_SECONDS/matchEndsAt) foi removido — quem encerra a
// campanha agora é o objetivo do último estágio, via checkStageObjective.
function checkRoundEnd(room, now) {
  if (room.config.scoreLimit > 0 && [...room.players.values()].some((p) => p.ready && p.score >= room.config.scoreLimit)) {
    finishRound(room, 'score');
    return;
  }
  if (room.config.lifeMode === 'battleRoyale') {
    const humans = [...room.players.values()].filter((p) => p.ready);
    if (humans.length > 1) {
      const living = humans.filter((p) => p.alive);
      if (room.config.mode === 'versus' && living.length <= 1) { finishRound(room, 'lastStanding'); return; }
      if (room.config.mode === 'coop' && living.length === 0) { finishRound(room, 'wipe'); return; }
    }
  }
  checkStageObjective(room, now);
}

// Dificuldades bem mais brandas do que a primeira versão — a "baixa" reage
// devagar, erra bastante e só atira metade das vezes; mesmo a "alta" tem um
// pequeno atraso de reação ao adquirir um alvo novo, pra não parecer que
// mira instantaneamente. `sightRange` limita até onde o bot "enxerga" um
// alvo, igual à visão limitada dos zumbis (ver ZOMBIE_SIGHT_RANGE).
const BOT_TUNING = {
  low: { decisionIntervalMs: 1400, decisionJitterMs: 500, aimErrorRad: 0.55, preferredEngageRange: 4.0, retreatHpRatio: 0.15, retreatDistance: 2.5, pickupSeekRadius: 5.0, grenadeUseChance: 0, targetSwitchStickiness: 0.5, sightRange: 7, fireChance: 0.45, reactionDelayMs: 900 },
  standard: { decisionIntervalMs: 750, decisionJitterMs: 300, aimErrorRad: 0.28, preferredEngageRange: 5.5, retreatHpRatio: 0.3, retreatDistance: 3.0, pickupSeekRadius: 7.0, grenadeUseChance: 0.1, targetSwitchStickiness: 1.5, sightRange: 9, fireChance: 0.75, reactionDelayMs: 400 },
  high: { decisionIntervalMs: 400, decisionJitterMs: 150, aimErrorRad: 0.12, preferredEngageRange: 4.0, retreatHpRatio: 0.45, retreatDistance: 4.5, pickupSeekRadius: 9.0, grenadeUseChance: 0.25, targetSwitchStickiness: 2.5, sightRange: 11, fireChance: 0.95, reactionDelayMs: 150 },
};

function pickBotTarget(room, bot, tuning) {
  const candidates = [];
  if (room.config.mode === 'coop') {
    candidates.push(...room.zombies.values());
  } else {
    for (const other of room.players.values()) {
      if (other.id === bot.id || !other.alive) continue;
      candidates.push(other);
    }
    if (bot.botDifficulty === 'high') candidates.push(...room.zombies.values());
  }
  let best = null;
  let bestDistance = Infinity;
  const currentTarget = bot.botState.targetId
    ? (room.players.get(bot.botState.targetId) || room.zombies.get(bot.botState.targetId))
    : null;
  for (const candidate of candidates) {
    if (candidate.alive === false) continue;
    const distance = Math.hypot(candidate.x - bot.x, candidate.y - bot.y);
    if (distance > tuning.sightRange) continue;
    if (distance < bestDistance) { bestDistance = distance; best = candidate; }
  }
  if (currentTarget && currentTarget.alive !== false && candidates.includes(currentTarget)) {
    const currentDistance = Math.hypot(currentTarget.x - bot.x, currentTarget.y - bot.y);
    if (currentDistance <= tuning.sightRange && currentDistance <= bestDistance + tuning.targetSwitchStickiness) return currentTarget;
  }
  if (best && best.id !== bot.botState.targetId) bot.botState.targetAcquiredAt = Date.now();
  return best;
}

function nearestUsefulPickup(room, bot, radius) {
  let best = null;
  let bestDistance = radius;
  for (const pickup of room.pickups.values()) {
    if (!pickup.active) continue;
    if (pickup.kind === 'heart' && bot.hp >= 80) continue;
    if (pickup.kind === 'shield' && bot.shield >= SHIELD_CAPACITY) continue;
    const distance = Math.hypot(pickup.x - bot.x, pickup.y - bot.y);
    if (distance < bestDistance) { bestDistance = distance; best = pickup; }
  }
  return best;
}

function planBotAction(room, bot, tuning) {
  const target = pickBotTarget(room, bot, tuning);
  bot.botState.targetId = target ? target.id : null;
  let goalX = bot.x;
  let goalY = bot.y;
  if (target) {
    const distance = Math.hypot(target.x - bot.x, target.y - bot.y);
    const isMeleeOnly = bot.weapon === 'knife' && bot.inventory.every((w) => w === 'knife' || w === 'grenade');
    const preferred = isMeleeOnly ? 1.2 : tuning.preferredEngageRange;
    const lowHp = bot.hp / 100 <= tuning.retreatHpRatio;
    if (lowHp && tuning.retreatDistance > 0 && distance < tuning.retreatDistance) {
      const away = Math.atan2(bot.y - target.y, bot.x - target.x);
      goalX = bot.x + Math.cos(away) * 3;
      goalY = bot.y + Math.sin(away) * 3;
    } else if (distance > preferred) {
      goalX = target.x;
      goalY = target.y;
    }
  } else if (tuning.pickupSeekRadius > 0) {
    const pickup = nearestUsefulPickup(room, bot, tuning.pickupSeekRadius);
    if (pickup) {
      goalX = pickup.x;
      goalY = pickup.y;
    } else {
      bot.botState.wanderAngle += (Math.random() - 0.5) * 1.2;
      goalX = bot.x + Math.cos(bot.botState.wanderAngle) * 4;
      goalY = bot.y + Math.sin(bot.botState.wanderAngle) * 4;
    }
  } else {
    bot.botState.wanderAngle += (Math.random() - 0.5) * 1.2;
    goalX = bot.x + Math.cos(bot.botState.wanderAngle) * 4;
    goalY = bot.y + Math.sin(bot.botState.wanderAngle) * 4;
  }
  bot.botState.goal = { x: goalX, y: goalY };
}

function maybeSwitchBotWeapon(bot, distance) {
  if (distance < 2 && bot.inventory.includes('knife')) { bot.weapon = 'knife'; return; }
  const owned = bot.inventory.filter((w) => w !== 'knife' && w !== 'grenade' && weapons[w] && (bot.ammo || 0) >= (weapons[w].ammoCost || 1));
  if (owned.length) { bot.weapon = owned[owned.length - 1]; return; }
  bot.weapon = 'knife';
}

function executeBotAction(room, bot, tuning, now) {
  const goal = bot.botState.goal || { x: bot.x, y: bot.y };
  const dx = goal.x - bot.x;
  const dy = goal.y - bot.y;
  const dist = Math.hypot(dx, dy);
  if (dist > 0.4) {
    // O ângulo de direção só é recalculado (colisão + separação, o cálculo caro)
    // a cada ~150-250ms, igual ao `thinkAt` dos zumbis — recalcular isso a cada
    // tick a 20Hz para cada bot era o principal gargalo de CPU do servidor.
    if (now >= bot.botState.nextSteerAt) {
      bot.botState.nextSteerAt = now + 150 + Math.random() * 100;
      const avoid = [...room.players.values(), ...room.zombies.values()].filter((entity) => entity.id !== bot.id);
      bot.botState.steerAngle = chooseSteeringAngle(room, bot, goal.x, goal.y, avoid, 1.0, PLAYER_RADIUS);
    }
    bot.input.x = Math.cos(bot.botState.steerAngle);
    bot.input.y = Math.sin(bot.botState.steerAngle);
  } else {
    bot.input.x = 0;
    bot.input.y = 0;
  }

  const target = bot.botState.targetId
    ? (room.players.get(bot.botState.targetId) || room.zombies.get(bot.botState.targetId))
    : null;
  if (!target || target.alive === false) return;
  const trueAngle = Math.atan2(target.y - bot.y, target.x - bot.x);
  bot.angle = trueAngle + (Math.random() - 0.5) * tuning.aimErrorRad * 2;
  const distance = Math.hypot(target.x - bot.x, target.y - bot.y);
  // Atraso de reação: acabou de "perceber" o alvo, ainda não atira nele.
  if (now - (bot.botState.targetAcquiredAt || 0) < tuning.reactionDelayMs) return;
  maybeSwitchBotWeapon(bot, distance);
  const weapon = weapons[bot.weapon];
  if (!weapon || distance > weapon.range + 0.5) return;
  if (Math.random() > tuning.fireChance) return;
  if (bot.grenades > 0 && distance >= GRENADE_MIN_RANGE && distance <= GRENADE_RANGE && Math.random() < tuning.grenadeUseChance * 0.05) {
    handleFireIntent(room, bot, { weapon: 'grenade', angle: bot.angle, distance });
  } else {
    handleFireIntent(room, bot, { weapon: bot.weapon, angle: bot.angle });
  }
}

function updateBotAI(room, bot, now) {
  if (!bot.alive || !bot.ready) return;
  const tuning = BOT_TUNING[bot.botDifficulty] || BOT_TUNING.standard;
  if (now >= bot.botState.nextDecisionAt) {
    bot.botState.nextDecisionAt = now + tuning.decisionIntervalMs + Math.random() * tuning.decisionJitterMs;
    planBotAction(room, bot, tuning);
  }
  executeBotAction(room, bot, tuning, now);
}

io.on('connection', (socket) => {
  socket.on('listRooms', (_data, ack) => {
    socket.join(LOBBY_BROWSER_ROOM);
    safeAck(ack, { rooms: publicRoomList() });
  });

  socket.on('createRoom', (data = {}, ack) => {
    if (socketRoom.has(socket.id)) return safeAck(ack, { ok: false, reason: 'already_in_room' });
    if (rooms.size >= MAX_ROOMS) return safeAck(ack, { ok: false, reason: 'server_full' });
    const name = sanitizeName(data.name) || 'Agente';
    const room = buildRoom(socket, data, name);
    joinRoomSocket(socket, room, name);
    safeAck(ack, { ok: true, roomId: room.id, code: room.code, isHost: true, settings: room.config, players: lobbyPlayers(room), name: room.name });
    broadcastRoomListIfPublic(room);
  });

  socket.on('joinRoom', (data = {}, ack) => {
    if (socketRoom.has(socket.id)) return safeAck(ack, { ok: false, reason: 'already_in_room' });
    const code = (data.code || '').toString().trim().toUpperCase();
    const room = [...rooms.values()].find((candidate) => candidate.code === code);
    attemptJoin(socket, room, data.name, ack);
  });

  socket.on('joinPublicRoom', (data = {}, ack) => {
    if (socketRoom.has(socket.id)) return safeAck(ack, { ok: false, reason: 'already_in_room' });
    const room = rooms.get(data.roomId);
    if (!room || room.visibility !== 'public') return safeAck(ack, { ok: false, reason: 'not_public' });
    attemptJoin(socket, room, data.name, ack);
  });

  socket.on('startMatch', (_data, ack) => {
    const room = getRoom(socket);
    if (!room) return safeAck(ack, { ok: false, reason: 'no_room' });
    if (room.hostId !== socket.id) return safeAck(ack, { ok: false, reason: 'not_host' });
    if (room.state !== 'lobby') return safeAck(ack, { ok: false, reason: 'already_started' });
    startMatch(room);
    safeAck(ack, { ok: true });
  });

  socket.on('leaveToLobby', () => {
    const room = getRoom(socket);
    if (!room || room.hostId !== socket.id) return;
    returnToLobby(room);
  });

  socket.on('leaveRoom', (_data, ack) => {
    const room = getRoom(socket);
    if (!room) return safeAck(ack, { ok: true });
    removePlayerFromRoom(socket, room);
    safeAck(ack, { ok: true });
  });

  socket.on('updateRoomSettings', (data = {}, ack) => {
    const room = getRoom(socket);
    if (!room) return safeAck(ack, { ok: false, reason: 'no_room' });
    if (room.hostId !== socket.id) return safeAck(ack, { ok: false, reason: 'not_host' });
    if (room.state !== 'lobby') return safeAck(ack, { ok: false, reason: 'not_lobby' });
    if (typeof data.roomName === 'string') room.name = sanitizeRoomName(data.roomName) || room.name;
    if (data.visibility === 'public' || data.visibility === 'private') room.visibility = data.visibility;
    if (data.mode === 'coop' || data.mode === 'versus') room.config.mode = data.mode;
    if (data.lifeMode === 'respawn' || data.lifeMode === 'battleRoyale') room.config.lifeMode = data.lifeMode;
    if (['fixed', 'constant', 'evolution'].includes(data.zombieSpawnMode)) room.config.zombieSpawnMode = data.zombieSpawnMode;
    if (Number.isFinite(Number(data.maxPlayers))) room.config.maxPlayers = clamp(Math.round(Number(data.maxPlayers)), 2, 16);
    if (Number.isFinite(Number(data.zombieBaseCount))) room.config.zombieBaseCount = clamp(Math.round(Number(data.zombieBaseCount)), 0, 60);
    if (Number.isFinite(Number(data.npcCount))) room.config.npcCount = clamp(Math.round(Number(data.npcCount)), 0, 15);
    if (['low', 'standard', 'high'].includes(data.npcDifficulty)) room.config.npcDifficulty = data.npcDifficulty;
    if (Number.isFinite(Number(data.scoreLimit))) room.config.scoreLimit = clamp(Math.round(Number(data.scoreLimit)), 0, 500);
    syncBotsToConfig(room);
    io.to(room.id).emit('lobbyUpdate', lobbyPayload(room));
    broadcastRoomListIfPublic(room);
    safeAck(ack, { ok: true, settings: room.config });
  });

  socket.on('input', (data = {}) => {
    const room = getRoom(socket);
    if (!room) return;
    const player = room.players.get(socket.id);
    if (!player || !player.ready) return;
    player.input.x = clamp(Number(data.x) || 0, -1, 1);
    player.input.y = clamp(Number(data.y) || 0, -1, 1);
    if (Number.isFinite(data.angle)) player.angle = data.angle;
  });

  socket.on('fire', (data) => {
    const room = getRoom(socket);
    if (!room) return;
    const player = room.players.get(socket.id);
    if (!player) return;
    handleFireIntent(room, player, data);
  });

  socket.on('readyNext', () => {
    const room = getRoom(socket);
    if (!room || room.state !== 'roundEnd') return;
    const player = room.players.get(socket.id);
    if (!player) return;
    player.wantsNextRound = true;
    const humans = [...room.players.values()].filter((p) => !p.isBot);
    const confirmed = humans.filter((p) => p.wantsNextRound).length;
    io.to(room.id).emit('readyUpdate', { ready: confirmed, total: humans.length });
    if (humans.length > 0 && confirmed === humans.length) startMatch(room);
  });

  socket.on('weapon', (weapon) => {
    const room = getRoom(socket);
    if (!room) return;
    const player = room.players.get(socket.id);
    if (!player) return;
    if ((weapons[weapon] || weapon === 'grenade') && player.inventory.includes(weapon)) player.weapon = weapon;
  });

  socket.on('rename', (name) => {
    const room = getRoom(socket);
    const player = room ? room.players.get(socket.id) : null;
    if (player && typeof name === 'string') player.name = sanitizeName(name) || player.name;
  });

  socket.on('disconnect', () => handleDisconnect(socket));
});

function update(room) {
  if (!roomAlive(room)) return;
  if (room.state === 'lobby') return;
  const now = Date.now();
  const dt = 1 / TICK_RATE;

  if (room.state === 'playing') checkRoundEnd(room, now);
  if (room.state !== 'playing') return;

  for (const player of room.players.values()) {
    if (player.isBot) updateBotAI(room, player, now);
    if (!player.alive || !player.ready) continue;
    const magnitude = Math.hypot(player.input.x, player.input.y) || 1;
    const nx = player.input.x / magnitude;
    const ny = player.input.y / magnitude;
    moveWithCollision(room, player, nx * 5.8 * dt, ny * 5.8 * dt);
    collectPickups(room, player, now);
  }

  for (const pickup of room.pickups.values()) {
    if (!pickup.active && pickup.respawnAt && now >= pickup.respawnAt) {
      const [x, y] = randomPickupPosition(room, pickup);
      Object.assign(pickup, { x, y, active: true, respawnAt: 0 });
    }
  }

  updateZombies(room, now, dt);
  updateProjectiles(room, now, dt);
  updateEvolutionSpawns(room, now);
  updateBlades(room, now, dt);
  updateHazards(room, now, dt);

  io.to(room.id).emit('snapshot', {
    now,
    stage: {
      index: room.stageIndex, count: STAGES.length, name: STAGES[room.stageIndex].name,
      objectiveLabel: describeObjective(room.stageProgress),
    },
    players: [...room.players.values()].filter((player) => player.ready).map(
      ({ input, lastShot, lastGrenade, invulnerableUntil, ready, botState, ...player }) => player
    ),
    zombies: [...room.zombies.values()].map(
      ({ attackAt, thinkAt, wanderAngle, forcedTargetId, forcedUntil, nextRangedAttackAt, ...zombie }) => zombie
    ),
    projectiles: [...room.projectiles.values()].map(({ id, x, y, kind, angle }) => ({ id, x, y, kind: kind || 'acid', angle })),
    hazards: [...room.hazards.values()].map(({ id, x, y, radius }) => ({ id, x, y, radius })),
    pickups: [...room.pickups.values()].filter((pickup) => pickup.active).map(({ respawnAt, ...pickup }) => pickup),
  });
}
