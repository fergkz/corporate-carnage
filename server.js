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
const MATCH_SECONDS = 180;
const ARENA = 22;
const PLAYER_RADIUS = 0.55;
const players = new Map();
const zombies = new Map();
let zombieSequence = 0;
let matchEndsAt = Date.now() + MATCH_SECONDS * 1000;

// Retângulos colidem com jogadores, zumbis e tiros. Coordenadas em "metros" de mundo top-down.
const walls = [
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
];

// Apenas decoração enviada ao cliente para desenhar o escritório; não colide.
const props = [
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
];

const weapons = {
  knife: { damage: 42, cooldown: 480, pellets: 1, spread: 0.04, range: 1.85, melee: true },
  pistol: { damage: 28, cooldown: 330, pellets: 1, spread: 0.012, range: 32 },
  rifle: { damage: 18, cooldown: 110, pellets: 1, spread: 0.02, range: 38 },
  shotgun: { damage: 13, cooldown: 720, pellets: 7, spread: 0.12, range: 20 },
};

const WEAPON_RANK = { pistol: 1, rifle: 2, shotgun: 3 };

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
const AGGRO_MS = 5000;
const KNIFE_KNOCKBACK = 1.1;
const ZOMBIE_COUNT = 14; // 11 + 30%
const BOMB_ZOMBIE_CHANCE = 0.12;
const BOMB_FUSE_MS = 550;
const BOMB_DAMAGE = 55;
const BOMB_RADIUS = 2.6;

const PICKUP_SPAWN_POOL = [
  [-6, -4], [6, 4], [0, -15], [-17, 0], [17, 0], [-13, -15], [13, 15], [7, 15],
  [0, 6.3], [10, 0], [-10, 0], [0, -6.3], [-9.5, 15.5],
  [-4, -11], [4, 11], [-11, 4], [16, -3], [-16, 3], [11, 4],
];

const pickupTemplates = [
  { id: 'wp-pistol', kind: 'weapon', weapon: 'pistol', amount: 24 },
  { id: 'wp-rifle', kind: 'weapon', weapon: 'rifle', amount: 45 },
  { id: 'wp-shotgun', kind: 'weapon', weapon: 'shotgun', amount: 14 },
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
];

function randomPickupPosition(exclude) {
  const taken = new Set(
    [...pickups.values()]
      .filter((pickup) => pickup.active && pickup !== exclude)
      .map((pickup) => `${pickup.x},${pickup.y}`)
  );
  let choice = PICKUP_SPAWN_POOL[Math.floor(Math.random() * PICKUP_SPAWN_POOL.length)];
  let attempts = 0;
  while (taken.has(`${choice[0]},${choice[1]}`) && attempts < 20) {
    choice = PICKUP_SPAWN_POOL[Math.floor(Math.random() * PICKUP_SPAWN_POOL.length)];
    attempts += 1;
  }
  return choice;
}

const pickups = new Map();
for (const template of pickupTemplates) {
  const [x, y] = randomPickupPosition(null);
  pickups.set(template.id, { ...template, x, y, active: true, respawnAt: 0 });
}

function spawnPoint() {
  const points = [[-17, -16], [17, 16], [-18.5, 16], [18.5, -16], [7, 18], [-7, -18]];
  let [x, y] = points[Math.floor(Math.random() * points.length)];
  // Rede de segurança: se um ajuste futuro no mapa deixar algum ponto colado
  // numa parede, empurra para fora do centro em vez de deixar o jogador travado.
  let attempts = 0;
  while (collides(x, y) && attempts < 12) {
    x += x < 0 ? -0.4 : 0.4;
    y += y < 0 ? -0.4 : 0.4;
    attempts += 1;
  }
  return [x, y];
}

function collides(x, y, radius = PLAYER_RADIUS) {
  if (x < -ARENA + radius || x > ARENA - radius || y < -ARENA + radius || y > ARENA - radius) return true;
  return walls.some((wall) =>
    x > wall.x - wall.w / 2 - radius && x < wall.x + wall.w / 2 + radius &&
    y > wall.y - wall.h / 2 - radius && y < wall.y + wall.h / 2 + radius
  );
}

function moveWithCollision(entity, dx, dy, radius = PLAYER_RADIUS) {
  const nextX = entity.x + dx;
  if (!collides(nextX, entity.y, radius)) entity.x = nextX;
  const nextY = entity.y + dy;
  if (!collides(entity.x, nextY, radius)) entity.y = nextY;
}

function resetPlayer(player, preserveScore = true) {
  const [x, y] = spawnPoint();
  Object.assign(player, {
    x, y, angle: 0, hp: 100, shield: 0, grenades: 0, alive: true, invulnerableUntil: Date.now() + 1800,
    weapon: 'knife', inventory: ['knife'], ammo: { pistol: 0, rifle: 0, shotgun: 0 },
    visionBoostUntil: 0, repelUntil: 0,
  });
  if (!preserveScore) Object.assign(player, { score: 0, kills: 0, deaths: 0 });
}

function spawnZombie() {
  let x;
  let y;
  do {
    const edge = Math.floor(Math.random() * 4);
    const value = -19 + Math.random() * 38;
    [x, y] = edge === 0 ? [-20, value] : edge === 1 ? [20, value] : edge === 2 ? [value, -20] : [value, 20];
  } while (collides(x, y, 0.48));
  const id = `z${++zombieSequence}`;
  const variant = Math.random() < BOMB_ZOMBIE_CHANCE ? 3 : Math.floor(Math.random() * 3);
  zombies.set(id, {
    id, x, y, angle: 0, hp: 65, speed: 1.45 + Math.random() * 0.55, attackAt: 0,
    variant, wanderAngle: Math.random() * Math.PI * 2, thinkAt: 0,
    forcedTargetId: null, forcedUntil: 0, fuseAt: 0,
  });
}

function explodeBomb(zombie) {
  io.emit('grenade', { x: zombie.x, y: zombie.y, radius: BOMB_RADIUS });
  for (const player of players.values()) {
    if (!player.alive || !player.ready) continue;
    if (Math.hypot(player.x - zombie.x, player.y - zombie.y) > BOMB_RADIUS) continue;
    damageHp(player, BOMB_DAMAGE);
    if (player.hp === 0) {
      player.alive = false;
      player.deaths += 1;
      setTimeout(() => { if (players.has(player.id)) resetPlayer(player, true); }, 2200);
    }
  }
  zombies.delete(zombie.id);
  setTimeout(spawnZombie, 850);
}

function resetMatch() {
  matchEndsAt = Date.now() + MATCH_SECONDS * 1000;
  zombies.clear();
  for (const pickup of pickups.values()) {
    const [x, y] = randomPickupPosition(pickup);
    Object.assign(pickup, { x, y, active: true, respawnAt: 0 });
  }
  for (let i = 0; i < ZOMBIE_COUNT; i += 1) spawnZombie();
  for (const player of players.values()) {
    resetPlayer(player, false);
    player.wantsNextRound = false;
  }
  io.emit('announcement', { title: 'NOVA RODADA', subtitle: 'Sobreviva. Supere. Domine.' });
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

function damageHp(target, amount) {
  let remaining = amount;
  if (target.shield > 0) {
    const absorbed = Math.min(target.shield, remaining);
    target.shield -= absorbed;
    remaining -= absorbed;
  }
  target.hp = Math.max(0, target.hp - remaining);
}

function applyDamage(target, damage, attacker, isZombie) {
  if (target.hp <= 0 || (!isZombie && Date.now() < target.invulnerableUntil)) return false;
  damageHp(target, damage);
  if (target.hp > 0) return false;
  if (isZombie) {
    zombies.delete(target.id);
    attacker.score += 1;
    setTimeout(spawnZombie, 850);
  } else {
    target.alive = false;
    target.deaths += 1;
    attacker.score += 5;
    attacker.kills += 1;
    io.emit('killfeed', `${attacker.name} neutralizou ${target.name}`);
    setTimeout(() => {
      if (players.has(target.id)) resetPlayer(target, true);
    }, 2200);
  }
  return true;
}

function handleShot(player, data) {
  const weapon = weapons[data?.weapon];
  if (!weapon || !player.alive || !player.ready || !player.inventory.includes(data.weapon)) return;
  const now = Date.now();
  if (now - player.lastShot < weapon.cooldown) return;
  if (!weapon.melee && player.ammo[data.weapon] <= 0) return;
  player.lastShot = now;
  player.weapon = data.weapon;
  if (!weapon.melee) player.ammo[data.weapon] -= 1;
  const baseAngle = Number.isFinite(data.angle) ? data.angle : player.angle;
  player.angle = baseAngle;
  const impacts = [];

  for (let pellet = 0; pellet < weapon.pellets; pellet += 1) {
    const angle = baseAngle + (Math.random() - 0.5) * weapon.spread * 2;
    const dirX = Math.cos(angle);
    const dirY = Math.sin(angle);
    let closest = { distance: weapon.range, target: null, zombie: false };
    for (const wall of walls) {
      const distance = rayBox(player.x, player.y, dirX, dirY, wall);
      if (distance !== null && distance < closest.distance) closest.distance = distance;
    }
    for (const zombie of zombies.values()) {
      const distance = rayCircle(player.x, player.y, dirX, dirY, zombie.x, zombie.y, 0.62, weapon.range);
      if (distance !== null && distance < closest.distance) closest = { distance, target: zombie, zombie: true };
    }
    for (const other of players.values()) {
      if (other.id === player.id || !other.alive) continue;
      const distance = rayCircle(player.x, player.y, dirX, dirY, other.x, other.y, 0.58, weapon.range);
      if (distance !== null && distance < closest.distance) closest = { distance, target: other, zombie: false };
    }
    if (closest.target) {
      applyDamage(closest.target, weapon.damage, player, closest.zombie);
      if (weapon.melee) {
        const radius = closest.zombie ? 0.48 : PLAYER_RADIUS;
        moveWithCollision(closest.target, dirX * KNIFE_KNOCKBACK, dirY * KNIFE_KNOCKBACK, radius);
      }
    }
    impacts.push({ x: player.x + dirX * closest.distance, y: player.y + dirY * closest.distance });
  }
  io.emit('shot', { id: player.id, weapon: data.weapon, x: player.x, y: player.y, angle: baseAngle, impacts });
}

function collectPickups(player, now) {
  for (const pickup of pickups.values()) {
    if (!pickup.active || Math.hypot(player.x - pickup.x, player.y - pickup.y) > 1.05) continue;
    if (pickup.kind === 'ammo' && !player.inventory.includes(pickup.weapon)) continue;
    if (pickup.kind === 'heart' && player.hp >= 100) continue;
    if (pickup.kind === 'shield' && player.shield >= SHIELD_CAPACITY) continue;
    if (pickup.kind === 'grenade' && player.grenades >= GRENADE_MAX) continue;
    pickup.active = false;
    pickup.respawnAt = now + 15000;
    if (pickup.kind === 'weapon') {
      const isNewWeapon = !player.inventory.includes(pickup.weapon);
      if (isNewWeapon) player.inventory.push(pickup.weapon);
      player.ammo[pickup.weapon] += pickup.amount;
      const currentRank = WEAPON_RANK[player.weapon] || 0;
      const pickupRank = WEAPON_RANK[pickup.weapon] || 0;
      if (player.weapon === 'knife' || pickupRank > currentRank) player.weapon = pickup.weapon;
      io.to(player.id).emit('pickup', { label: `${pickup.weapon.toUpperCase()} COLETADA`, weapon: pickup.weapon });
    } else if (pickup.kind === 'ammo') {
      player.ammo[pickup.weapon] += pickup.amount;
      io.to(player.id).emit('pickup', { label: `+${pickup.amount} MUNIÇÕES`, weapon: pickup.weapon });
    } else if (pickup.kind === 'heart') {
      player.hp = Math.min(100, player.hp + pickup.amount);
      io.to(player.id).emit('pickup', { label: `+${pickup.amount} VIDA`, weapon: null });
    } else if (pickup.kind === 'shield') {
      player.shield = SHIELD_CAPACITY;
      io.to(player.id).emit('pickup', { label: 'ESCUDO ATIVADO', weapon: null });
    } else if (pickup.kind === 'grenade') {
      player.grenades = Math.min(GRENADE_MAX, player.grenades + pickup.amount);
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
      for (const other of players.values()) {
        if (other.id === player.id || !other.alive || !other.ready) continue;
        const candidate = Math.hypot(other.x - player.x, other.y - player.y);
        if (candidate < distance) { distance = candidate; rival = other; }
      }
      if (rival) {
        for (const zombie of zombies.values()) {
          zombie.forcedTargetId = rival.id;
          zombie.forcedUntil = now + AGGRO_MS;
        }
      }
      io.to(player.id).emit('pickup', { label: 'ZUMBIS ATRAÍDOS AOS RIVAIS', weapon: null });
    }
  }
}

function explodeGrenade(player, x, y) {
  io.emit('grenade', { x, y, radius: GRENADE_RADIUS });
  for (const zombie of zombies.values()) {
    if (Math.hypot(zombie.x - x, zombie.y - y) <= GRENADE_RADIUS) applyDamage(zombie, GRENADE_DAMAGE, player, true);
  }
  for (const other of players.values()) {
    if (other.id === player.id || !other.alive) continue;
    if (Math.hypot(other.x - x, other.y - y) <= GRENADE_RADIUS) applyDamage(other, GRENADE_DAMAGE, player, false);
  }
}

function handleGrenade(player, data) {
  if (!player.alive || !player.ready || player.grenades <= 0) return;
  const now = Date.now();
  if (now - (player.lastGrenade || 0) < GRENADE_COOLDOWN) return;
  player.lastGrenade = now;
  player.grenades -= 1;
  const angle = Number.isFinite(data?.angle) ? data.angle : player.angle;
  const dirX = Math.cos(angle);
  const dirY = Math.sin(angle);
  const requested = Number.isFinite(data?.distance) ? data.distance : GRENADE_RANGE;
  let distance = Math.min(GRENADE_RANGE, Math.max(GRENADE_MIN_RANGE, requested));
  for (const wall of walls) {
    const hit = rayBox(player.x, player.y, dirX, dirY, wall);
    if (hit !== null && hit < distance) distance = hit;
  }
  explodeGrenade(player, player.x + dirX * distance, player.y + dirY * distance);
}

function zombieDirection(zombie, target, now) {
  const desired = Math.atan2(target.y - zombie.y, target.x - zombie.x);
  if (now < zombie.thinkAt) return zombie.wanderAngle;
  zombie.thinkAt = now + 320 + Math.random() * 220;
  const candidates = [0, .35, -.35, .7, -.7, 1.05, -1.05, 1.4, -1.4, Math.PI];
  let best = { score: -Infinity, angle: desired };
  for (const offset of candidates) {
    const angle = desired + offset;
    const probeX = zombie.x + Math.cos(angle) * 1.15;
    const probeY = zombie.y + Math.sin(angle) * 1.15;
    if (collides(probeX, probeY, .48)) continue;
    let separation = 0;
    for (const other of zombies.values()) {
      if (other.id === zombie.id) continue;
      const distance = Math.hypot(probeX - other.x, probeY - other.y);
      if (distance < 1.2) separation -= (1.2 - distance) * 1.4;
    }
    const score = Math.cos(offset) * 2.4 + separation + Math.random() * .15;
    if (score > best.score) best = { score, angle };
  }
  zombie.wanderAngle = best.angle;
  return zombie.wanderAngle;
}

io.on('connection', (socket) => {
  const player = {
    id: socket.id,
    name: `Agente ${players.size + 1}`,
    x: 0, y: 0, angle: 0, hp: 100, alive: true,
    score: 0, kills: 0, deaths: 0, weapon: 'knife', inventory: ['knife'], ammo: { pistol: 0, rifle: 0, shotgun: 0 }, lastShot: 0,
    color: Math.floor(Math.random() * 0xffffff), input: { x: 0, y: 0 }, invulnerableUntil: 0, ready: false,
    wantsNextRound: false,
  };
  resetPlayer(player, false);
  player.alive = false;
  players.set(socket.id, player);
  socket.emit('welcome', { id: socket.id, walls, props, arena: ARENA, matchEndsAt });

  socket.on('ready', (name) => {
    if (player.ready) return;
    const wasEmpty = ![...players.values()].some((candidate) => candidate.ready);
    player.ready = true;
    if (typeof name === 'string') player.name = name.trim().slice(0, 16) || player.name;
    if (wasEmpty) resetMatch(); else resetPlayer(player, false);
    const readyCount = [...players.values()].filter((candidate) => candidate.ready).length;
    io.emit('announcement', { title: `${player.name} ENTROU`, subtitle: `${readyCount} agente(s) na operação`, brief: true });
  });

  socket.on('input', (data = {}) => {
    const current = players.get(socket.id);
    if (!current || !current.ready) return;
    current.input.x = Math.max(-1, Math.min(1, Number(data.x) || 0));
    current.input.y = Math.max(-1, Math.min(1, Number(data.y) || 0));
    if (Number.isFinite(data.angle)) current.angle = data.angle;
  });
  socket.on('shoot', (data) => handleShot(player, data));
  socket.on('throwGrenade', (data) => handleGrenade(player, data));
  socket.on('readyNext', () => {
    if (!player.ready) return;
    player.wantsNextRound = true;
    const readyPlayers = [...players.values()].filter((candidate) => candidate.ready);
    const confirmed = readyPlayers.filter((candidate) => candidate.wantsNextRound).length;
    io.emit('readyUpdate', { ready: confirmed, total: readyPlayers.length });
    if (readyPlayers.length > 0 && confirmed === readyPlayers.length) resetMatch();
  });
  socket.on('weapon', (weapon) => { if (weapons[weapon] && player.inventory.includes(weapon)) player.weapon = weapon; });
  socket.on('rename', (name) => {
    if (typeof name === 'string') player.name = name.trim().slice(0, 16) || player.name;
  });
  socket.on('disconnect', () => players.delete(socket.id));
});

function update() {
  const now = Date.now();
  if (now >= matchEndsAt) {
    const ranked = [...players.values()].filter((player) => player.ready).sort((a, b) => b.score - a.score);
    const winner = ranked[0];
    io.emit('announcement', { title: winner ? `${winner.name.toUpperCase()} VENCEU` : 'FIM DA RODADA', subtitle: winner ? `${winner.score} pontos` : 'Aguardando agentes' });
    io.emit('roundEnd', { scores: ranked.map(({ id, name, score, kills, deaths }) => ({ id, name, score, kills, deaths })) });
    matchEndsAt = Number.MAX_SAFE_INTEGER;
  }

  const dt = 1 / TICK_RATE;
  for (const player of players.values()) {
    if (!player.alive || !player.ready) continue;
    const magnitude = Math.hypot(player.input.x, player.input.y) || 1;
    const nx = player.input.x / magnitude;
    const ny = player.input.y / magnitude;
    moveWithCollision(player, nx * 5.8 * dt, ny * 5.8 * dt);
    collectPickups(player, now);
  }

  for (const pickup of pickups.values()) {
    if (!pickup.active && pickup.respawnAt && now >= pickup.respawnAt) {
      const [x, y] = randomPickupPosition(pickup);
      Object.assign(pickup, { x, y, active: true, respawnAt: 0 });
    }
  }

  const living = [...players.values()].filter((player) => player.alive && player.ready);
  for (const zombie of zombies.values()) {
    let target = null;

    if (zombie.forcedTargetId && now < zombie.forcedUntil) {
      const forced = players.get(zombie.forcedTargetId);
      if (forced && forced.alive && forced.ready) target = forced;
    }
    if (!target) {
      zombie.forcedTargetId = null;
      zombie.forcedUntil = 0;
      let distance = Infinity;
      for (const player of living) {
        if (player.repelUntil && now < player.repelUntil) continue;
        const candidate = Math.hypot(player.x - zombie.x, player.y - zombie.y);
        if (candidate < distance) { distance = candidate; target = player; }
      }
    }

    for (const player of living) {
      if (!player.repelUntil || now >= player.repelUntil) continue;
      const distanceToPlayer = Math.hypot(zombie.x - player.x, zombie.y - player.y);
      if (distanceToPlayer > 0 && distanceToPlayer < REPEL_RADIUS) {
        const pushAngle = Math.atan2(zombie.y - player.y, zombie.x - player.x);
        const pushSpeed = zombie.speed * 1.4 * dt;
        moveWithCollision(zombie, Math.cos(pushAngle) * pushSpeed, Math.sin(pushAngle) * pushSpeed, 0.48);
      }
    }

    if (!target) continue;
    const distance = Math.hypot(target.x - zombie.x, target.y - zombie.y);
    if (distance > 1.15) {
      const speed = zombie.speed * dt;
      const direction = zombieDirection(zombie, target, now);
      zombie.angle = direction;
      moveWithCollision(zombie, Math.cos(direction) * speed, Math.sin(direction) * speed, 0.48);
    } else if (zombie.variant === 3) {
      zombie.angle = Math.atan2(target.y - zombie.y, target.x - zombie.x);
      if (!zombie.fuseAt) zombie.fuseAt = now + BOMB_FUSE_MS;
      if (now >= zombie.fuseAt) explodeBomb(zombie);
    } else if (now > zombie.attackAt && now > target.invulnerableUntil) {
      zombie.angle = Math.atan2(target.y - zombie.y, target.x - zombie.x);
      zombie.attackAt = now + 900;
      damageHp(target, 12);
      if (target.hp === 0) {
        target.alive = false;
        target.deaths += 1;
        setTimeout(() => { if (players.has(target.id)) resetPlayer(target, true); }, 2200);
      }
    }
  }

  io.emit('snapshot', {
    now,
    matchEndsAt,
    players: [...players.values()].filter((player) => player.ready).map(({ input, lastShot, lastGrenade, invulnerableUntil, ready, ...player }) => player),
    zombies: [...zombies.values()].map(({ attackAt, thinkAt, wanderAngle, forcedTargetId, forcedUntil, ...zombie }) => zombie),
    pickups: [...pickups.values()].filter((pickup) => pickup.active).map(({ respawnAt, ...pickup }) => pickup),
  });
}

resetMatch();
setInterval(update, 1000 / TICK_RATE);
