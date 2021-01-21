/* eslint-disable no-console */
function isBrowserSupported() {
  return !!window.fetch
    && ("content" in document.createElement("template"));
}

function getElement(selector) {
  return document.querySelector(selector);
}

// eslint-disable-next-line no-unused-vars
function getElements(selector) {
  return document.querySelectorAll(selector);
}

let statistics = {};

function createPlayerRow(template, rank, player) {
  const clone = template.content.cloneNode(true);
  const tds = clone.querySelectorAll("td");
  tds[0].textContent = rank;
  // eslint-disable-next-line prefer-destructuring
  const [mainName, ...alternatives] = player.name.split(" ");
  tds[1].querySelector(".main").textContent = mainName;
  tds[1].querySelector(".alternatives").textContent = alternatives;
  tds[2].textContent = player.displayrating;
  const delta = player.displayrating - player.oldrating;
  tds[3].textContent = delta < 0 ? delta : `+${delta}`;
  if (delta > 0) {
    tds[3].classList.add("up");
    tds[3].classList.remove("down");
  } else {
    tds[3].classList.add("down");
    tds[3].classList.remove("up");
  }

  tds[4].textContent = player.games;

  return clone;
}

function updatePlayerTable(players) {
  const template = getElement("template#player-row");
  const tbody = getElement("#rating tbody");
  const playerRows = players.map((player, index) => createPlayerRow(template, index + 1, player));
  tbody.innerHTML = "";
  playerRows.forEach((row) => tbody.appendChild(row));
}

function updateStatistics(newStatistics) {
  statistics = newStatistics;

  getElement("#lastGame").innerHTML = new Date(statistics.timespan.to).toISOString();

  updatePlayerTable(statistics.players);
}

function onLoad() {
  console.log("Loaded");
  getElement("#js-disabled").remove();

  if (!isBrowserSupported()) {
    console.error("This browser is not supported");
    getElement("#browser-not-supported").classList.remove("hidden");
  }

  const ratingRequest = window.fetch("/api/rating");
  ratingRequest.then((response) => {
    if (response.status !== 200) {
      console.error("Failed to get ratings");
    }

    response.json()
      .then((json) => updateStatistics(json))
      .catch((err) => console.error("Failed to parse JSON from ratings", err));
  });
}

document.onload = onLoad;
document.addEventListener("DOMContentLoaded", () => {
  console.log("dom loaded");
  onLoad();
});
window.addEventListener("load", () => {
  console.log("window laoded");
});
