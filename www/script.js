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

const round = (n) => (n ? n.toFixed(0) : n);

const formatRatingChange = (change) => {
  if (change == null || change === -1000) return "";
  if (change === 0) return "-";
  const delta = (change / 10).toFixed(1); // rating_change is stored multiplied by 10
  return change < 0 ? delta : `+${delta}`;
};

// //////////////////////////////////////////
// Overall statistics

function createPlayerRow(template, rank, player) {
  const [names, adjustedRating, rating, ratedGames, isBot] = player;
  const clone = template.content.cloneNode(true);
  const tr = clone.firstElementChild;
  const tds = tr.children;

  const inactive = adjustedRating !== rating;

  if (isBot) {
    tr.classList.add("bot");
  }

  tds[0].textContent = rank;

  const [mainName, ...alternatives] = names.split(" ");
  const mainNameElement = tds[1].querySelector(".main");
  mainNameElement.textContent = mainName;
  mainNameElement.href = `./player.html?name=${names}`;
  tds[1].querySelector(".alternatives").textContent = alternatives;

  tds[2].textContent = adjustedRating;
  if (inactive) {
    tds[2].title = `This player's rating has been lowered from ${rating} to ${adjustedRating} because they haven't played in a while.`;
    tr.classList.add("inactive");
  }

  tds[3].textContent = ratedGames;

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
  console.log(statistics);

  updatePlayerTable(statistics);
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

const resultToClassMapping = new Map([
  ["1-0", 1],
  ["F-0", 1],
  ["R-0", 1],
  ["0-1", -1],
  ["0-R", -1],
  ["0-F", -1],
  ["1/2-1/2", 0],
]);

function updatePlayerPage(data, playerName) {
  const playerNames = playerName.split(" ").map((name) => name.toLowerCase());
  function isCurrentPlayer(name) {
    return playerNames.includes(name.toLowerCase());
  }

  function getClassForResult(playerWhite, result) {
    const r = resultToClassMapping.get(result) * (isCurrentPlayer(playerWhite) ? 1 : -1);
    switch (r) {
      case 1: return "table-success";
      case -1: return "table-danger";
      case 0: return "table-warning";
      default: return "";
    }
  }

  function createGameRow(template, game) {
    const clone = template.content.cloneNode(true);
    const tds = [...clone.querySelectorAll("td")];

    const classForResult = getClassForResult(game.player_white, game.result);
    if (classForResult) {
      tds[4].classList.add(classForResult);
    }

    tds[0] = tds[0].querySelector("a");
    tds[0].href = `https://www.playtak.com/games/${game.id}/ninjaviewer`;
    [
      getUTCDateAndTimeString(game.date),
      round(game.rating_white),
      formatRatingChange(game.rating_change_white),
      game.player_white,
      game.result,
      game.player_black,
      round(game.rating_black),
      formatRatingChange(game.rating_change_black),
      game.size,
      `${game.timertime / 60}+${game.timerinc}`,
    ].forEach((text, i) => {
      tds[i].textContent = text;
    });

    if (isCurrentPlayer(game.player_white)) {
      tds[3].classList.add("current");
    } else {
      tds[5].classList.add("current");
    }

    [[2, game.rating_change_white], [7, game.rating_change_black]].forEach(([i, delta]) => {
      if (delta > 0) {
        tds[i].classList.add("up");
      } else if (delta < 0) {
        tds[i].classList.add("down");
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
      .then((json) => updatePlayerPage(json, playername))
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
