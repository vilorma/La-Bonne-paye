// --- SOCKET & ÉTAT ---
const socket = io();

// joueurs: { [socketId]: { pseudo, position, visited:number[] } }
const joueurs = {};
const CASES_TOTAL = 32;

let joueurActifPseudo = null;

// --- RÉFÉRENCES DOM ---
const plateau = document.getElementById("plateau");
const playersList = document.getElementById("players");
const counterEl = document.getElementById("counter");
const resetBtn = document.getElementById("resetBtn");
const errBox = document.getElementById("err");

// --- CONST UI (grille -> index de case) ---
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

// --- CONSTRUCTION DU PLATEAU : 100% images ---
const positions = new Array(CASES_TOTAL);
(function buildPlateau() {
  plateau.innerHTML = "";
  for (let i = 0; i < 36; i++) {
    const div = document.createElement("div");
    div.classList.add("case");

    // centre (2x2)
    if ([14, 15, 20, 21].includes(i)) {
      div.classList.add("centre");

      if (i === 14) {
        // ⚠️ espace dans le nom de fichier → encoder l’URL
        const urlCentre = encodeURI("/Images/case-centrale.png");
        div.style.backgroundImage = `url('${urlCentre}')`;
        div.style.backgroundSize = "cover";
        div.style.backgroundPosition = "center";
      } else {
        // on masque les 3 autres cases du carré
        div.style.display = "none";
      }

      plateau.appendChild(div);
      continue;
    }

    // map grille -> indice de case 0..31
    const spiralIndex = spiralIndices.indexOf(i);
    if (spiralIndex !== -1) {
      div.style.backgroundImage = `url('/Images/case ${spiralIndex}.png')`;
      div.style.backgroundSize = "cover";
      div.style.backgroundPosition = "center";
      div.dataset.index = spiralIndex;
      positions[spiralIndex] = div;
    }

    plateau.appendChild(div);
  }
})();

// --- AFFICHER LES PIONS : ne jamais toucher aux backgrounds ---
function afficherPions() {
  // Nettoyer uniquement les pions
  positions.forEach((cell) => {
    if (!cell) return;
    const pions = cell.querySelectorAll(".pion");
    pions.forEach((p) => p.remove());
  });

  // Replacer les pions
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

// --- LISTE DES JOUEURS + HISTORIQUE ---
function majListeJoueurs() {
  playersList.innerHTML = "";

  Object.values(joueurs).forEach((joueur) => {
    const li = document.createElement("li");
    li.classList.add("player-item");
    if (joueur.pseudo === joueurActifPseudo) li.classList.add("actif");

    // Titre: pseudo + case actuelle
    const title = document.createElement("div");
    title.textContent = `${joueur.pseudo} (case ${joueur.position})`;
    li.appendChild(title);

    // Historique "dernier déplacement" uniquement
    const span = document.createElement("span");
    span.classList.add("historique");

    const visited = Array.isArray(joueur.visited) ? joueur.visited : [];
    let texte = "—";
    if (visited.length >= 2) {
      const from = visited[visited.length - 2];
      const to = visited[visited.length - 1];
      texte = `${from} → ${to}`;
    } else if (visited.length === 1) {
      // première avancée depuis le départ
      texte = `0 → ${visited[0]}`;
    }
    span.textContent = texte;

    li.appendChild(span);
    playersList.appendChild(li);
  });
}

// --- NORMALISATION players-state (nouveau/ancien format) ---
function normalizePlayersState(payload) {
  if (Array.isArray(payload))
    return { players: payload, count: payload.length, max: 6 };
  return {
    players: Array.isArray(payload.players) ? payload.players : [],
    count: Number(payload.count) || 0,
    max: Number(payload.max) || 6,
  };
}

// --- ÉCOUTES SOCKET ---
socket.on("players-state", (payload) => {
  try {
    const { players, count, max } = normalizePlayersState(payload);

    // re-sync état local
    for (const k of Object.keys(joueurs)) delete joueurs[k];
    players.forEach((p) => {
      joueurs[p.socketId] = {
        pseudo: p.pseudo,
        position: Number(p.position) || 0,
        visited: Array.isArray(p.visited)
          ? p.visited.slice()
          : [Number(p.position) || 0],
      };
    });

    if (counterEl) counterEl.textContent = `${count} / ${max} joueurs`;

    majListeJoueurs();
    afficherPions();
    hideError();
  } catch (e) {
    showError("Erreur d'affichage de l'état : " + (e?.message || e));
  }
});

socket.on("tour-actuel", ({ pseudo }) => {
  joueurActifPseudo = pseudo;
  majListeJoueurs();
});

// compat — non utilisé pour l’état
socket.on("dice-roll", () => {});
socket.on("update-players", () => {});

// --- RESET ---
if (resetBtn) {
  resetBtn.addEventListener("click", () => {
    socket.emit("reset-game");
  });
}

socket.on("reset-client", () => {
  joueurActifPseudo = null;
  for (const id of Object.keys(joueurs)) delete joueurs[id];
  if (counterEl) counterEl.textContent = `0 / 6 joueurs`;
  majListeJoueurs();
  afficherPions();
});

// --- Helpers UI ---
function showError(msg) {
  if (!errBox) return;
  errBox.textContent = msg;
  errBox.style.display = "block";
}
function hideError() {
  if (!errBox) return;
  errBox.style.display = "none";
}

// --- Chargement des images (log si manquantes) ---
(function preflightImages() {
  for (let i = 0; i < CASES_TOTAL; i++) {
    const img = new Image();
    img.onload = () => {};
    img.onerror = () => console.warn(`Image manquante: /Images/case ${i}.png`);
    img.src = `/Images/case ${i}.png`;
  }
})();
