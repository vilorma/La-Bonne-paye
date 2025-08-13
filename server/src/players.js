// src/players.js
function snapshotPlayers(state) {
  const list = Object.entries(state.players).map(([socketId, p]) => ({
    socketId,
    pseudo: p.pseudo,
    position: p.position,
    visited: p.visited,
  }));
  return {
    players: list,
    count: list.length,
    max: state.MAX_PLAYERS, // ← on expose la limite côté serveur
  };
}

function envoyerTourActuel(io, state) {
  const { playerOrder, currentTurnIndex, players } = state;
  const socketId = playerOrder[currentTurnIndex];
  const pseudo = players[socketId]?.pseudo;
  if (pseudo) {
    console.log(`🔔 C’est au tour de ${pseudo}`);
    io.emit("tour-actuel", { socketId, pseudo });
  }
}

function registerPlayer(io, state, socket, pseudo) {
  const { players, playerOrder, MAX_PLAYERS } = state;

  // Limite dure : 6 joueurs max
  if (playerOrder.length >= MAX_PLAYERS) {
    socket.emit("register-denied", {
      reason: `Partie pleine (${MAX_PLAYERS} joueurs max).`,
    });
    return;
  }

  // Pseudo unique
  const pseudoPris = Object.values(players).some((p) => p.pseudo === pseudo);
  if (pseudoPris) {
    socket.emit("register-denied", {
      reason: "Ce pseudo est déjà utilisé. Choisis-en un autre.",
    });
    return;
  }

  if (!players[socket.id]) {
    players[socket.id] = { pseudo, position: 0, visited: [0] };
    playerOrder.push(socket.id);
    console.log(`✅ Joueur enregistré : ${pseudo}`);
    socket.emit("player-registered", pseudo);

    io.emit(
      "update-players",
      Object.values(players).map((p) => p.pseudo)
    );
    io.emit("players-state", snapshotPlayers(state));

    if (playerOrder.length === 1) {
      state.currentTurnIndex = 0;
      envoyerTourActuel(io, state);
    }
  }
}

function removePlayer(io, state, socketId) {
  const { playerOrder } = state;
  const wasIndex = playerOrder.indexOf(socketId);

  delete state.players[socketId];
  state.playerOrder = playerOrder.filter((id) => id !== socketId);

  if (wasIndex !== -1 && state.playerOrder.length > 0) {
    if (wasIndex < state.currentTurnIndex) state.currentTurnIndex--;
    state.currentTurnIndex =
      ((state.currentTurnIndex % state.playerOrder.length) +
        state.playerOrder.length) %
      state.playerOrder.length;
  } else if (state.playerOrder.length === 0) {
    state.currentTurnIndex = 0;
  }
}

module.exports = {
  snapshotPlayers,
  envoyerTourActuel,
  registerPlayer,
  removePlayer,
};
