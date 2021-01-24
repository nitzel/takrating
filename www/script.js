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

function getUTCDateString(dateInMsSince1970) {
  const date = new Date(dateInMsSince1970);
  // eslint-disable-next-line max-len
  return `${date.getUTCFullYear()}-${(date.getUTCMonth() + 1).toString().padStart(2, "0")}-${date.getUTCDate().toString().padStart(2, "0")}`;
}

function getUTCTimeString(dateInMsSince1970) {
  const date = new Date(dateInMsSince1970);
  // eslint-disable-next-line max-len
  return `${date.getUTCHours().toString().padStart(2, "0")}:${date.getUTCMinutes().toString().padStart(2, "0")}`;
}

function getUTCDateAndTimeString(dateInMsSince1970) {
  return `${getUTCDateString(dateInMsSince1970)} ${getUTCTimeString(dateInMsSince1970)}`;
}

// //////////////////////////////////////////
// Overall statistics

function createPlayerRow(template, rank, player) {
  const clone = template.content.cloneNode(true);
  const tds = clone.querySelectorAll("td");
  tds[0].textContent = rank;
  // eslint-disable-next-line prefer-destructuring
  const [mainName, ...alternatives] = player.name.split(" ");
  const mainNameElement = tds[1].querySelector(".main");
  mainNameElement.textContent = mainName;
  mainNameElement.href = `/static/player.html?name=${player.name}`;
  tds[1].querySelector(".alternatives").textContent = alternatives;
  tds[2].textContent = player.displayrating;
  const delta = player.displayrating - player.oldrating;
  tds[3].textContent = delta < 0 ? delta : `+${delta}`;
  if (delta >= 0) {
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

function updateStatistics(statistics) {
  getElement("#lastGame").innerHTML = `${getUTCDateAndTimeString(statistics.timespan.to)} (UTC)`;

  updatePlayerTable(statistics.players);
}

function loadStatistics() {
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

// //////////////////////////////////////////
// Player

function updatePlayerPage(data) {
  function createGameRow(template, game) {
    const clone = template.content.cloneNode(true);
    const tds = clone.querySelectorAll("td");
    const round = (n) => (n ? n.toFixed(0) : n);
    const prefix = (n) => {
      if (n == null) return "";
      return n < 0 ? round(n) : `+${round(n)}`;
    };

    [
      getUTCDateAndTimeString(game.date),
      round(game.white_elo),
      prefix(game.white_elo_delta),
      game.player_white,
      game.result,
      game.player_black,
      round(game.black_elo),
      prefix(game.black_elo_delta),
      game.size,
      `${game.timertime / 60}+${game.timerinc}`,
    ].forEach((text, i) => {
      tds[i].textContent = text;
    });

    [[2, game.white_elo_delta], [7, game.black_elo_delta]].forEach(([i, delta]) => {
      if (delta >= 0) {
        tds[i].classList.add("up");
        tds[i].classList.remove("down");
      } else {
        tds[i].classList.add("down");
        tds[i].classList.remove("up");
      }
    });

    return clone;
  }

  function updateGamesTable(games) {
    const template = getElement("template#game-row");
    const tbody = getElement("#games tbody");
    const gameRows = games.map((game) => createGameRow(template, game));
    tbody.innerHTML = "";
    gameRows.forEach((row) => tbody.appendChild(row));
  }

  console.log("update player page", data);
  updateGamesTable(data);
}

function loadPlayer(playername) {
  const nameElement = getElement("#playername");
  if (!playername) {
    nameElement.innerHTML = "No player name defined, go <a href='/'>back</a>";
    return;
  }
  nameElement.textContent = playername;

  const ratingRequest = window.fetch(`/api/player/${playername}`);
  ratingRequest.then((response) => {
    if (response.status !== 200) {
      console.error("Failed to get player data", response);
    }

    response.json()
      .then((json) => updatePlayerPage(json))
      .catch((err) => console.error("Failed to parse JSON from ratings", err));
  });
}

function genericOnLoad() {
  console.log("Loaded");
  getElement("#js-disabled").remove();

  if (!isBrowserSupported()) {
    console.error("This browser is not supported");
    getElement("#browser-not-supported").classList.remove("hidden");
  }
}

document.onload = genericOnLoad;
document.addEventListener("DOMContentLoaded", () => {
  console.log("dom loaded");
  genericOnLoad();

  const urlParts = window.location.pathname.split("/");
  if (urlParts[urlParts.length - 1] === "player.html") {
    const params = new URLSearchParams(window.location.search);
    const playername = params.get("name");
    loadPlayer(playername);
  } else {
    loadStatistics();
  }
});
