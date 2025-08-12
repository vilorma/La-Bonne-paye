// src/state.js
function makeState() {
  return {
    BOARD_SIZE: 32, // cases 0..31 (0 = départ)
    players: {}, // socketId -> { pseudo, position, visited:[] }
    playerOrder: [], // ordre de jeu (socketId[])
    currentTurnIndex: 0,
  };
}

module.exports = { makeState };
