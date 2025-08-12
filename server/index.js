const express = require("express");
const http = require("http");
const { Server } = require("socket.io");

const app = express();
const server = http.createServer(app);
const io = new Server(server);

// Sert /public (HTML, JS, images)
app.use(express.static("public"));

const BOARD_SIZE = 32; // cases 0..31 (0 = départ uniquement, on ne retombe jamais dessus après la 1ʳᵉ avancée)

// ⚙️ Avancer en sautant la case 0 quand on boucle
// - Si current == 0 : 1er déplacement va sur [1..31] selon steps.
// - Sinon : on tourne sur l'anneau [1..31] (taille 31), 31 -> 1 -> 2 ...
function nextPositionSkipZero(current, steps, size = BOARD_SIZE) {
  const s = Number(steps) || 0;
  if (s <= 0) return current;
  const ring = size - 1; // 31 cases: 1..31

  if (current === 0) {
    // ex: 0 + 5 -> 5 ; 0 + 32 -> 1
    return ((s - 1) % ring) + 1;
  }
  // ex: 31 + 5 -> 5 ; 5 + 2 -> 7
  return ((current - 1 + s) % ring) + 1;
}

// État du jeu
// socketId -> { pseudo, position, visited:number[] }
const players = {};
let playerOrder = [];
let currentTurnIndex = 0;

io.on("connection", (socket) => {
  console.log("🔌 Connexion :", socket.id);

  // Envoie immédiatement l'état complet au nouveau client
  socket.emit("players-state", snapshotPlayers());

  // Inscription joueur (avec pseudo unique)
  socket.on("register-player", ({ pseudo }) => {
    if (!pseudo || typeof pseudo !== "string") return;

    // garde-fou : pseudo unique
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

      // Compat: liste simple des pseudos
      io.emit(
        "update-players",
        Object.values(players).map((p) => p.pseudo)
      );
      // État complet (positions + historiques)
      io.emit("players-state", snapshotPlayers());

      if (playerOrder.length === 1) {
        currentTurnIndex = 0;
        envoyerTourActuel();
      }
    }
  });

  // Jet de dé -> déplacement -> historiser la case d'arrivée
  socket.on("dice-roll", ({ value }) => {
    const joueur = players[socket.id];
    if (!joueur) return;

    // Respect du tour
    if (socket.id !== playerOrder[currentTurnIndex]) {
      console.log(`⛔ ${joueur.pseudo} a tenté de jouer hors de son tour`);
      return;
    }

    // Nouvelle position avec saut de la case 0 (31 -> 1 -> 2 ...)
    const next = nextPositionSkipZero(joueur.position, value);
    joueur.position = next;
    joueur.visited.push(next);

    console.log(
      `🎲 ${joueur.pseudo} a lancé ${value} → case ${joueur.position}`
    );

    // (Compat) événement existant si l'UI l'utilise encore
    io.emit("dice-roll", { pseudo: joueur.pseudo, value });

    // Nouvel événement : état complet pour l'historique
    io.emit("players-state", snapshotPlayers());

    // Tour suivant
    if (playerOrder.length > 0) {
      currentTurnIndex = (currentTurnIndex + 1) % playerOrder.length;
      envoyerTourActuel();
    }
  });

  // Réinitialisation complète
  socket.on("reset-game", () => {
    console.log("🔄 Réinitialisation demandée");
    for (let id in players) delete players[id];
    playerOrder = [];
    currentTurnIndex = 0;
    io.emit("update-players", []);
    io.emit("players-state", []);
    io.emit("reset-client");
  });

  // Déconnexion
  socket.on("disconnect", () => {
    console.log("❌ Déconnexion :", socket.id);
    const wasIndex = playerOrder.indexOf(socket.id);

    delete players[socket.id];
    playerOrder = playerOrder.filter((id) => id !== socket.id);

    // Réajuste l’index de tour si nécessaire
    if (wasIndex !== -1 && playerOrder.length > 0) {
      if (wasIndex < currentTurnIndex) currentTurnIndex--;
      currentTurnIndex =
        ((currentTurnIndex % playerOrder.length) + playerOrder.length) %
        playerOrder.length;
    } else if (playerOrder.length === 0) {
      currentTurnIndex = 0;
    }

    io.emit(
      "update-players",
      Object.values(players).map((p) => p.pseudo)
    );
    io.emit("players-state", snapshotPlayers());

    if (playerOrder.length > 0) {
      envoyerTourActuel();
    }
  });
});

// --- Helpers ---
function snapshotPlayers() {
  return Object.entries(players).map(([socketId, p]) => ({
    socketId,
    pseudo: p.pseudo,
    position: p.position,
    visited: p.visited,
  }));
}

function envoyerTourActuel() {
  const socketId = playerOrder[currentTurnIndex];
  const pseudo = players[socketId]?.pseudo;
  if (pseudo) {
    console.log(`🔔 C’est au tour de ${pseudo}`);
    io.emit("tour-actuel", { socketId, pseudo });
  }
}

server.listen(3000, () => {
  console.log("🚀 Serveur lancé sur http://localhost:3000");
});
