const path = require('path');
const express = require('express');
const { Server } = require('socket.io');

const app = express();
const players = new Map();
const port = Number(process.env.PORT || 8080);

app.use(express.static(path.join(__dirname, 'public')));
app.get('/health', (_request, response) => response.json({ ok: true }));

const httpServer = app.listen(port, '0.0.0.0', () => {
  console.log(`Jogo disponível em http://localhost:${port}`);
});
const io = new Server(httpServer);

function state() {
  return Object.fromEntries(players);
}

io.on('connection', (socket) => {
  const player = {
    id: socket.id,
    name: `Jogador ${players.size + 1}`,
    x: 50 + Math.round(Math.random() * 500),
    y: 50 + Math.round(Math.random() * 280),
    color: `hsl(${Math.round(Math.random() * 360)} 80% 60%)`
  };
  players.set(socket.id, player);
  socket.emit('state', state());
  socket.broadcast.emit('player-joined', player);

  socket.on('move', ({ x, y }) => {
    const current = players.get(socket.id);
    if (!current || !Number.isFinite(x) || !Number.isFinite(y)) return;
    current.x = Math.max(18, Math.min(622, x));
    current.y = Math.max(18, Math.min(342, y));
    socket.broadcast.emit('player-moved', current);
  });

  socket.on('rename', (name) => {
    const current = players.get(socket.id);
    if (!current || typeof name !== 'string') return;
    current.name = name.trim().slice(0, 18) || current.name;
    io.emit('player-moved', current);
  });

  socket.on('disconnect', () => {
    players.delete(socket.id);
    socket.broadcast.emit('player-left', socket.id);
  });
});
