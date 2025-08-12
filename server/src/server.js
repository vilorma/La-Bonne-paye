// src/server.js
const path = require("path");
const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const { attachSockets } = require("./sockets");
const { makeState } = require("./state");

function start(port = 3000) {
  const app = express();
  const server = http.createServer(app);
  const io = new Server(server);

  // Sert /public
  app.use(express.static(path.join(__dirname, "..", "public")));

  // État central
  const state = makeState();

  // Branche les événements Socket.IO
  attachSockets(io, state);

  server.listen(port, () => {
    console.log(`🚀 Serveur lancé sur http://localhost:${port}`);
  });

  return { app, server, io, state };
}

module.exports = { start };
