const socket = io();
const joueurs = {};
const historiqueDes = {};
const plateau = document.getElementById("plateau");
const playersList = document.getElementById("players");
const CASES_TOTAL = 32;
const positions = new Array(CASES_TOTAL);
let joueurActifPseudo = null;

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

function afficherPions() {
  positions.forEach((cell) => {
    if (cell) {
      const index = cell.dataset.index;
      if (index === "0") {
        cell.innerHTML = "Départ<br>0";
      } else {
        const jour = joursSemaine[(index - 1) % 7];
        cell.innerHTML = `${jour}<br>${index.toString().padStart(2, "0")}`;
      }
    }
  });

  let index = 0;
  for (let id in joueurs) {
    const joueur = joueurs[id];
    const pos = joueur.position;
    const cell = positions[pos];

    const pion = document.createElement("div");
    pion.classList.add("pion", `joueur${index % 6}`);
    pion.style.left = `${(index % 3) * 20}px`;
    pion.style.top = `${Math.floor(index / 3) * 20}px`;

    if (cell) cell.appendChild(pion);
    index++;
  }
}

function majListeJoueurs() {
  playersList.innerHTML = "";
  Object.values(joueurs).forEach((joueur, i) => {
    const li = document.createElement("li");
    li.classList.add("player-item");
    if (joueur.pseudo === joueurActifPseudo) li.classList.add("actif");
    li.textContent = joueur.pseudo;

    const hist = historiqueDes[joueur.pseudo] || [];
    const span = document.createElement("span");
    span.classList.add("historique");
    span.textContent = hist.join("; ");
    li.appendChild(span);

    playersList.appendChild(li);
  });
}

socket.on("update-players", (playerList) => {
  playerList.forEach((pseudo, i) => {
    const socketId = `fake-${i}`;
    if (!joueurs[socketId]) {
      joueurs[socketId] = { pseudo, position: 0 };
    }
    if (!historiqueDes[pseudo]) {
      historiqueDes[pseudo] = [];
    }
  });
  majListeJoueurs();
  afficherPions();
});

socket.on("dice-roll", ({ pseudo, value }) => {
  for (let id in joueurs) {
    if (joueurs[id].pseudo === pseudo) {
      joueurs[id].position = (joueurs[id].position + value) % CASES_TOTAL;
      break;
    }
  }
  historiqueDes[pseudo].push(value);
  majListeJoueurs();
  afficherPions();
});

socket.on("tour-actuel", ({ pseudo }) => {
  joueurActifPseudo = pseudo;
  majListeJoueurs();
});

document.getElementById("resetBtn").addEventListener("click", () => {
  socket.emit("reset-game");
  joueurActifPseudo = null;
  for (let id in joueurs) delete joueurs[id];
  for (let p in historiqueDes) delete historiqueDes[p];
  majListeJoueurs();
  afficherPions();
});
