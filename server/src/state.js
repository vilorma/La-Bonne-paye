// src/state.js
function makeState() {
  return {
    BOARD_SIZE: 32, // cases 0..31 (0 = départ)
    MAX_PLAYERS: 6, // ← limite stricte
    players: {}, // socketId -> { pseudo, position, visited:[] }
    playerOrder: [], // ordre de jeu (socketId[])
    currentTurnIndex: 0,
  };
}

module.exports = { makeState };
