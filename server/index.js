const express = require("express");
const http = require("http");
const { Server } = require("socket.io");

const app = express();
const server = http.createServer(app);
const io = new Server(server);

app.use(express.static("public"));

const players = {};
let playerOrder = [];
let currentTurnIndex = 0;

io.on("connection", (socket) => {
  console.log("🔌 Connexion :", socket.id);

  socket.on("register-player", ({ pseudo }) => {
    if (!players[socket.id]) {
      players[socket.id] = { pseudo, position: 0 };
      playerOrder.push(socket.id);
      console.log(`✅ Joueur enregistré : ${pseudo}`);
      socket.emit("player-registered", pseudo);
      io.emit(
        "update-players",
        Object.values(players).map((p) => p.pseudo)
      );

      if (playerOrder.length === 1) {
        currentTurnIndex = 0;
        envoyerTourActuel();
      }
    }
  });

  socket.on("dice-roll", ({ value }) => {
    const joueur = players[socket.id];
    if (!joueur) return;

    if (socket.id !== playerOrder[currentTurnIndex]) {
      console.log(`⛔ ${joueur.pseudo} a tenté de jouer hors de son tour`);
      return;
    }

    joueur.position = (joueur.position + value) % 32;
    console.log(`🎲 ${joueur.pseudo} a lancé un ${value}`);
    io.emit("dice-roll", { pseudo: joueur.pseudo, value });

    currentTurnIndex = (currentTurnIndex + 1) % playerOrder.length;
    envoyerTourActuel();
  });

  socket.on("reset-game", () => {
    console.log("🔄 Réinitialisation demandée");
    for (let id in players) delete players[id];
    playerOrder = [];
    currentTurnIndex = 0;
    io.emit("update-players", []);
    io.emit("reset-client");
  });

  socket.on("disconnect", () => {
    console.log("❌ Déconnexion :", socket.id);
    delete players[socket.id];
    playerOrder = playerOrder.filter((id) => id !== socket.id);
    io.emit(
      "update-players",
      Object.values(players).map((p) => p.pseudo)
    );
  });
});

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
