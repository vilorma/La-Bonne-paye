// --- SOCKET & ÉTAT ---
const socket = io();

// joueurs: { [socketId]: { pseudo, position, visited:number[] } }
const joueurs = {};
const CASES_TOTAL = 32;

let joueurActifPseudo = null;

// --- RÉFÉRENCES DOM ---
const plateau = document.getElementById("plateau");
const playersList = document.getElementById("players");

// --- CONST UI (grille existante) ---
const joursSemaine = [
  "Lundi",
  "Mardi",
  "Mercredi",
  "Jeudi",
  "Vendredi",
  "Samedi",
  "Dimanche",
];
const spiralIndices = [
  0, 1, 2, 3, 4, 5, 11, 17, 23, 29, 35, 34, 33, 32, 31, 30, 24, 18, 12, 6, 7, 8,
  9, 10, 16, 22, 28, 27, 26, 25, 19, 13,
];

// --- CONSTRUCTION DU PLATEAU (inchangé) ---
const positions = new Array(CASES_TOTAL);
for (let i = 0; i < 36; i++) {
  const div = document.createElement("div");
  div.classList.add("case");

  if ([14, 15, 20, 21].includes(i)) {
    div.classList.add("centre");
    if (i === 14) div.textContent = "CENTRE";
    else div.style.display = "none";
    plateau.appendChild(div);
    continue;
  }

  const spiralIndex = spiralIndices.indexOf(i);
  if (spiralIndex !== -1) {
    if (spiralIndex === 0) {
      div.innerHTML = "Départ<br>0";
    } else {
      const jour = joursSemaine[(spiralIndex - 1) % 7];
      div.innerHTML = `${jour}<br>${spiralIndex.toString().padStart(2, "0")}`;
    }
    div.dataset.index = spiralIndex;
    positions[spiralIndex] = div;
  }
  plateau.appendChild(div);
}

// --- RENDU DES PIONS SUR LE PLATEAU ---
function afficherPions() {
  // Réaffiche les libellés de cases
  positions.forEach((cell) => {
    if (!cell) return;
    const index = cell.dataset.index;
    if (index === "0") {
      cell.innerHTML = "Départ<br>0";
    } else {
      const jour = joursSemaine[(index - 1) % 7];
      cell.innerHTML = `${jour}<br>${index.toString().padStart(2, "0")}`;
    }
  });

  // Place les pions des joueurs
  let idx = 0;
  for (const id of Object.keys(joueurs)) {
    const joueur = joueurs[id];
    const pos = Number(joueur.position) % CASES_TOTAL;
    const cell = positions[pos];
    if (!cell) continue;

    const pion = document.createElement("div");
    pion.classList.add("pion", `joueur${idx % 6}`);
    pion.style.left = `${(idx % 3) * 20}px`;
    pion.style.top = `${Math.floor(idx / 3) * 20}px`;

    cell.appendChild(pion);
    idx++;
  }
}

// --- LISTE DES JOUEURS + HISTORIQUE DES CASES ---
function majListeJoueurs() {
  playersList.innerHTML = "";

  // Conserver un ordre stable (ordre d'insertion des clés)
  Object.values(joueurs).forEach((joueur) => {
    const li = document.createElement("li");
    li.classList.add("player-item");
    if (joueur.pseudo === joueurActifPseudo) li.classList.add("actif");

    // Nom + position actuelle
    li.textContent = `${joueur.pseudo} (case ${joueur.position})`;

    // Historique des cases visitées
    const visited = Array.isArray(joueur.visited) ? joueur.visited : [];
    const span = document.createElement("span");
    span.classList.add("historique");
    // format: "0 → 5 → 12 → 4"
    span.textContent = visited.join(" → ");
    li.appendChild(span);

    playersList.appendChild(li);
  });
}

// --- MISE À JOUR COMPLÈTE VIA LE SERVEUR ---
socket.on("players-state", (players) => {
  // players: [{ socketId, pseudo, position, visited:[] }, ...]
  // Re-synchronise complètement l’état local
  // 1) nettoie
  for (const k of Object.keys(joueurs)) delete joueurs[k];
  // 2) remplit
  players.forEach((p) => {
    joueurs[p.socketId] = {
      pseudo: p.pseudo,
      position: Number(p.position) || 0,
      visited: Array.isArray(p.visited)
        ? p.visited.slice()
        : [Number(p.position) || 0],
    };
  });

  majListeJoueurs();
  afficherPions();
});

// --- COMPAT : tour actuel (déjà présent côté serveur) ---
socket.on("tour-actuel", ({ pseudo }) => {
  joueurActifPseudo = pseudo;
  majListeJoueurs();
});

// --- COMPAT : anciens événements ---
// On ne se base PLUS sur 'dice-roll' pour l’historique.
// Le serveur renvoie toujours après coup un 'players-state' qui fait foi.
socket.on("dice-roll", ({ pseudo, value }) => {
  // Optionnel: afficher une notification/console pour le dé
  // console.log(`🎲 ${pseudo} a lancé ${value}`);
});

// 'update-players' n’est plus nécessaire pour l’historique, mais on le laisse pour rétro-compat UI si besoin
socket.on("update-players", () => {
  // ignoré: l’info complète arrive via 'players-state'
});

// Reset depuis le serveur
socket.on("reset-client", () => {
  joueurActifPseudo = null;
  for (const id of Object.keys(joueurs)) delete joueurs[id];
  majListeJoueurs();
  afficherPions();
});

// --- RESET (bouton local) ---
const resetBtn = document.getElementById("resetBtn");
if (resetBtn) {
  resetBtn.addEventListener("click", () => {
    socket.emit("reset-game");
  });
}
