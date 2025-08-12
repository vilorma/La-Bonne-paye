// src/sockets.js
const { nextPositionSkipZero } = require("./move");
const {
  snapshotPlayers,
  envoyerTourActuel,
  registerPlayer,
  removePlayer,
} = require("./players");

function attachSockets(io, state) {
  io.on("connection", (socket) => {
    console.log("🔌 Connexion :", socket.id);

    // État initial pour le nouveau client
    socket.emit("players-state", snapshotPlayers(state));

    // Inscription
    socket.on("register-player", ({ pseudo }) => {
      if (!pseudo || typeof pseudo !== "string") return;
      registerPlayer(io, state, socket, pseudo);
    });

    // Jet de dé
    socket.on("dice-roll", ({ value }) => {
      const p = state.players[socket.id];
      if (!p) return;

      // Respect du tour
      if (socket.id !== state.playerOrder[state.currentTurnIndex]) {
        console.log(`⛔ ${p.pseudo} a tenté de jouer hors de son tour`);
        return;
      }

      const next = nextPositionSkipZero(p.position, value, state.BOARD_SIZE);
      p.position = next;
      p.visited.push(next);

      console.log(`🎲 ${p.pseudo} a lancé ${value} → case ${p.position}`);

      io.emit("dice-roll", { pseudo: p.pseudo, value }); // compat UI
      io.emit("players-state", snapshotPlayers(state)); // source de vérité

      if (state.playerOrder.length > 0) {
        state.currentTurnIndex =
          (state.currentTurnIndex + 1) % state.playerOrder.length;
        envoyerTourActuel(io, state);
      }
    });

    // Reset
    socket.on("reset-game", () => {
      console.log("🔄 Réinitialisation demandée");
      state.players = {};
      state.playerOrder = [];
      state.currentTurnIndex = 0;
      io.emit("update-players", []);
      io.emit("players-state", []);
      io.emit("reset-client");
    });

    // Déconnexion
    socket.on("disconnect", () => {
      console.log("❌ Déconnexion :", socket.id);
      removePlayer(io, state, socket.id);
      io.emit(
        "update-players",
        Object.values(state.players).map((p) => p.pseudo)
      );
      io.emit("players-state", snapshotPlayers(state));
      if (state.playerOrder.length > 0) {
        envoyerTourActuel(io, state);
      }
    });
  });
}

module.exports = { attachSockets };
