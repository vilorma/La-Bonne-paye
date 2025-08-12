// src/move.js
// Avance en sautant la case 0 après la première avance
function nextPositionSkipZero(current, steps, size) {
  const s = Number(steps) || 0;
  if (s <= 0) return current;
  const ring = size - 1; // 1..31

  if (current === 0) {
    // 0 + s -> [1..31]
    return ((s - 1) % ring) + 1;
  }
  // 1..31 + s -> 1..31 (31 -> 1)
  return ((current - 1 + s) % ring) + 1;
}

module.exports = { nextPositionSkipZero };
