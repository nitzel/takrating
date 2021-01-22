/* eslint-disable no-param-reassign */
/* eslint-disable no-console */
/* eslint-disable no-mixed-operators */
/* eslint-disable no-use-before-define */

// The game id of the last game of the last update:
const lastgameid = 100191;

// Rating calculation parameters:
const initialrating = 1000;
const bonusrating = 550;
const bonusfactor = 60;
const participationlimit = 10;
const participationcutoff = 1500;

// File names:
const argDatabasePath = process.argv[2];
const databasepath = argDatabasePath || "games_anon.db";
const resultfile = "ratings.csv";
const resultfileTournament = "tournament_ratings.csv";
const outputCsv = false;
const resultsJsonFile = "rating.json";

// Tournament
const tournamentParticipants = new Set([
  "alpacascreed",
  "christopher", // not in db
  "dFruh",
  "thedodo",
  "ETSD", // not in db
  "Fela",
  "Ineria",
  "BicuspidMass88",
  "ken10naka", // not in db
  "KitKat",
  "LucidTak",
  "matthewrivers",
  "MikeInQA", // not in db
  "pwhaug",
  "Schmoop555",
  "T0afer",
  "Asceric",
  "Ziji",
]);

// Statistics parameters, does not affect rating calculation:
const goodlimit = 1600;
const whiteadvantage = 100;
const showratingprogression = false;
const playerhistory = "IntuitionBot";

const sqlite3 = require("sqlite3");
const fs = require("fs");

const db = new sqlite3.Database(databasepath, sqlite3.OPEN_READONLY, main);

// eslint-disable-next-line no-unused-vars
function main(sqlError) {
  if (sqlError) {
    console.error(`Error while loading database from ${databasepath}:`, sqlError);
    if (!argDatabasePath) {
      console.log("Consider specifying the path to the database");
    }
    return;
  }

  // db.all("SELECT name FROM sqlite_master WHERE type='table';",tables)
  db.all("SELECT * FROM games ORDER BY date ASC, id ASC;", datacb);
  function datacb(error, data) {
    const players = new Map();
    let games = 0;
    let firsttime = 1e20;
    let lasttime = 0;
    let lastid = 0;
    let flatcount = 0;
    let roadcount = 0;
    let drawcount = 0;
    let othercount = 0;
    let goodcount = 0;
    let whitecount = 0;
    let blackcount = 0;
    let whiteexpected = 0;
    const ratingsum = [];
    const ratingcount = [];

    const scoreMapping = new Map([
      ["1-0", 1],
      ["R-0", 1],
      ["F-0", 1],
      ["1/2-1/2", 0.5],
      ["0-1", 0],
      ["0-R", 0],
      ["0-F", 0],
    ]);

    const botNames = new Set([
      "TakticianBot",
      "alphatak_bot",
      "alphabot",
      "cutak_bot",
      "TakticianBotDev",
      "takkybot",
      "ShlktBot",
      "AlphaTakBot_5x5",
      "BeginnerBot",
      "alphatak_bot alphabot",
      "TakticianBot TakticianBotDev",
      "TakkerusBot",
      "IntuitionBot",
      "TakkenBot",
    ]);

    const nametranslate = new Map([
      ["alphabot", "alphatak_bot alphabot"],
      ["alphatak_bot", "alphatak_bot alphabot"],
      ["TakticianBot", "TakticianBot TakticianBotDev"],
      ["TakticianBotDev", "TakticianBot TakticianBotDev"],
      ["sectenor", "Turing sectenor"],
      ["Turing", "Turing sectenor"],
      ["SultanPepper", "SultanPepper KingSultan PrinceSultan SultanTheGreat FuhrerSultan MaerSultan"],
      ["KingSultan", "SultanPepper KingSultan PrinceSultan SultanTheGreat FuhrerSultan MaerSultan"],
      ["PrinceSultan", "SultanPepper KingSultan PrinceSultan SultanTheGreat FuhrerSultan MaerSultan"],
      ["SultanTheGreat", "SultanPepper KingSultan PrinceSultan SultanTheGreat FuhrerSultan MaerSultan"],
      ["FuhrerSultan", "SultanPepper KingSultan PrinceSultan SultanTheGreat FuhrerSultan MaerSultan"],
      ["MaerSultan", "SultanPepper KingSultan PrinceSultan SultanTheGreat FuhrerSultan MaerSultan"],
      ["tarontos", "Tarontos tarontos"],
      ["Tarontos", "Tarontos tarontos"],
      ["Ally", "Ally Luffy"],
      ["Luffy", "Ally Luffy"],
      ["Archerion", "Archerion Archerion2"],
      ["Archerion2", "Archerion Archerion2"],
      ["Simmon", "Simmon Manet"],
      ["Manet", "Simmon Manet"],
      ["Alexc997", "Doodles Alexc997"],
      ["Doodles", "Doodles Alexc997"],
      ["dylandragon", "dylandragon DragonTakerDG"],
      ["DragonTakerDG", "dylandragon DragonTakerDG"],
      ["Abyss", "Abyss Bullet"],
      ["Bullet", "Abyss Bullet"],
      ["Syme", "Syme Saemon"],
      ["Saemon", "Syme Saemon"],
    ]);
    const blankexcepted = new Set(["Simmon Manet"]);
    for (let i = 0; i < 200; i += 1) {
      ratingsum[i] = 0;
      ratingcount[i] = 0;
    }
    let cheatcount = 0;
    for (let i = 0; i < data.length; i += 1) {
      data[i].player_black = nametranslate.get(data[i].player_black) || data[i].player_black;
      data[i].player_white = nametranslate.get(data[i].player_white) || data[i].player_white;
      const cheatsurrender = (data[i].result === "1-0" && blankexcepted.has(data[i].player_black))
        || (data[i].result === "0-1" && blankexcepted.has(data[i].player_white));
      cheatcount += cheatsurrender ? 1 : 0;
      if (cheatsurrender) {
        // console.log(data[a].player_black+" "+data[a].player_white+" "+data[a].notation)
      }
      if (includePlayer(data[i].player_white)
        && includePlayer(data[i].player_black)
        && data[i].size >= 5 && (data[i].notation !== "" || cheatsurrender)
        && data[i].result !== "0-0") { // && isbot(data[a].player_white)+isbot(data[a].player_black)!=3){
        if (data[i].date % 86400000 < lasttime % 86400000) {
          players.forEach((player) => {
            player.participation = Math.min(player.participation * 0.995, 20);
          });
          console.log("day");
        }
        let hiccup = false;
        if (data[i].date - lasttime < 1000 && data[i].player_white === data[i - 1].player_white) {
          hiccup = true;
          // console.log("Hiccup2 "+data[a].result+" "+data[a].date)
        }
        if (i + 1 !== data.length && data[i + 1].date - data[i].date < 1000 && data[i + 1].player_white === data[i].player_white) {
          if (data[i + 1].result.indexOf("0") !== data[i].result.indexOf("0")) {
            hiccup = true;
            // console.log("Hiccup1 "+data[a].result+" "+data[a].date)
          } else {
            // console.log("Nohiccup1 "+data[a].result+" "+data[a].date)
          }
        }
        firsttime = Math.min(firsttime, data[i].date);
        lasttime = Math.max(lasttime, data[i].date);
        lastid = data[i].id;
        if (!hiccup && data[i].player_white !== data[i].player_black) {
          games += 1;
          addPlayer(data[i].player_white);
          addPlayer(data[i].player_black);
          const result = scoreMapping.get(data[i].result);
          const sw = strength(data[i].player_white); // * 10**(0/400); - What is that for?
          const sb = strength(data[i].player_black);
          const expected = sw / (sw + sb);
          const fairness = expected * (1 - expected);
          if (sw > 10 ** (goodlimit / 400)
            && sb > 10 ** (goodlimit / 400)
            && !isBot(data[i].player_white)
            && !isBot(data[i].player_black)
            && data[i].size === 5) {
            flatcount += (data[i].result === "F-0" || data[i].result === "0-F");
            roadcount += (data[i].result === "R-0" || data[i].result === "0-R");
            drawcount += (data[i].result === "1/2-1/2");
            othercount += (data[i].result === "1-0" || data[i].result === "0-1");
            goodcount += 1;
            whitecount += (result === 1);
            blackcount += (result === 0);
            whiteexpected += sw * (10 ** (whiteadvantage / 400)) / (sw * (10 ** (whiteadvantage / 400)) + sb);
          }
          const whiteDelta = adjustPlayer(data[i].player_white, result - expected, fairness);
          const blackDelta = adjustPlayer(data[i].player_black, expected - result, fairness);

          if (data[i].player_white === playerhistory || data[i].player_black === playerhistory) {
            printGameScoreChange(data[i].player_white, data[i].player_black, whiteDelta, blackDelta);
          }
        }
        if (data[i].id === lastgameid) {
          updateDisplayRating();
          players.forEach((player) => { player.oldrating = player.displayrating; });
        }
      }
    }
    console.log("Last game in the database:", data[data.length - 1]);
    // console.log(players.TreffnonX)
    players.delete("TreffnonX");

    const playerlist = [...players.values()];

    updateDisplayRating();
    playerlist.sort((a, b) => b.displayrating - a.displayrating);
    let out = "";
    let outTournament = "";
    let ratingsumt = 0;
    let hiddensum = 0;
    for (let i = 0; i < playerlist.length; i += 1) {
      const player = playerlist[i];
      ratingsumt += player.rating;
      hiddensum += player.hidden;
      if (/bot/i.test(player.name)) {
        console.log(`Bot: ${player.name}`);
      }
      const playerIsBot = isBot(player.name);
      const listname = playerIsBot ? `*${player.name}*` : player.name;
      const line = `${[
        (i + 1),
        listname,
        playerIsBot,
        Math.floor(player.rating),
        Math.floor(player.displayrating),
        Math.floor(player.oldrating),
        Math.floor(player.games),
      ].join(",")}\n`;

      out += line;
      if (tournamentParticipants.has(player.name)) {
        outTournament += line;
      }
    }
    if (outputCsv) {
      fs.writeFileSync(resultfile, out);
      fs.writeFileSync(resultfileTournament, outTournament);
    }

    // Reduce amount of data stored in .json file
    playerlist.forEach((player) => {
      player.rating = Math.floor(player.rating);
      player.hidden = Math.floor(player.hidden);
      player.oldrating = Math.floor(player.oldrating);
      player.maxrating = Math.floor(player.maxrating);
      player.displayrating = Math.floor(player.displayrating);
    });
    const statistics = {
      games,
      accounts: playerlist.length,
      timespan: {
        from: firsttime,
        to: lasttime,
      },
      lastGameId: lastid,
      goodPlayerStatistics: {
        minimumRating: goodlimit,
        games: goodcount,
        endings: {
          flat: flatcount,
          road: roadcount,
          draw: drawcount,
          other: othercount,
          white: whitecount,
          black: blackcount,
        },
        whiteScore: {
          expected: whiteexpected / goodcount,
          actual: whitecount / goodcount + drawcount / goodcount / 2,
        },
        ratings: {
          average: ratingsumt / playerlist.length,
          averageBonusLeft: hiddensum / playerlist.length,
        },
        cheatCount: cheatcount,
      },
      players: playerlist,
    };
    fs.writeFileSync(resultsJsonFile, JSON.stringify(statistics));

    console.log(`Games: ${games}`);
    console.log(`Accounts: ${playerlist.length}`);
    console.log("Timespan:");
    console.log(new Date(firsttime));
    console.log(new Date(lasttime));
    console.log(`Last game: ${lastid}`);
    console.log("");
    console.log("Good player game statistics:");
    console.log(`Flat wins: ${flatcount / goodcount}`);
    console.log(`Road wins: ${roadcount / goodcount}`);
    console.log(`Drawn: ${drawcount / goodcount}`);
    console.log(`Forfeited or interrupted: ${othercount / goodcount}`);
    console.log(`White wins: ${whitecount / goodcount}`);
    console.log(`Black wins: ${blackcount / goodcount}`);
    console.log(`Expected score for white, with a white advantage of ${whiteadvantage} rating points: ${whiteexpected / goodcount}`);
    console.log(`White score: ${whitecount / goodcount + drawcount / goodcount / 2}`);
    console.log(`Based on ${goodcount} games with both players rated above ${goodlimit}.`);
    console.log("");
    console.log(`Average rating: ${ratingsumt / playerlist.length}`);
    console.log(`Average bonus left: ${hiddensum / playerlist.length}`);
    console.log(cheatcount);
    if (showratingprogression) {
      console.log("");
      console.log("Average rating progression:");
      let virtrating = initialrating;
      for (let i = 0; i < 200; i += 1) {
        virtrating += ratingsum[i] / ratingcount[i];
        console.log(`${i + 1}: ${virtrating}`);
      }
    }

    function strength(name) {
      return 10 ** (players.get(name).rating / 400);
    }

    function adjustPlayer(playerName, amount, fairness) {
      const player = players.get(playerName);
      const bonus = Math.max(0, amount * player.hidden * bonusfactor / bonusrating);
      player.hidden -= bonus;
      const k = 10
        + 15 * (0.5 ** (player.games / 200))
        + 15 * (0.5 ** ((player.maxrating - 1000) / 300));
      const delta = amount * k + bonus;
      player.rating += delta;
      if (player.games < 200) {
        ratingcount[player.games] += 1;
        ratingsum[player.games] += delta;
      }
      player.participation += fairness;
      player.games += 1;
      player.maxrating = Math.max(player.maxrating, player.rating);

      return delta;
    }

    function addPlayer(playerName) {
      if (!players.has(playerName)) {
        players.set(playerName, {
          rating: initialrating,
          hidden: bonusrating,
          oldrating: initialrating,
          name: playerName,
          games: 0,
          maxrating: initialrating,
          participation: participationlimit,
          displayrating: initialrating,
        });
        /* if(name==="IntuitionBot"){
          players["!"+name].hidden=0
          players["!"+name].rating=1700
        } */
      }
    }

    function includePlayer(name) {
      return name !== "Anon"
        && name !== "FriendlyBot"
        && name !== "cutak_bot"
        && name !== "antakonistbot"
        && !/^Guest[0-9]+$/.test(name); // && isbot(name)!==1
    }

    function isBot(name) {
      return botNames.has(name);
    }

    function printGameScoreChange(whiteName, blackName, whiteDelta, blackDelta) {
      const white = players.get(whiteName);
      const black = players.get(blackName);
      console.log(`${white.name}(${round(white.rating)}${signDelta(whiteDelta)})`
        + " vs "
        + `${black.name}(${round(black.rating)}${signDelta(blackDelta)})`);
    }

    function updateDisplayRating() {
      players.forEach((player) => {
        player.displayrating = player.rating;
        if (player.participation < participationlimit && player.rating > participationcutoff) {
          player.displayrating = participationcutoff + ((player.rating - participationcutoff) * player.participation) / participationlimit;
        }
      });
    }
  }
}

function round(number) {
  return Math.round(number);
}

function signDelta(delta) {
  const rounded = Math.round(delta);
  if (delta >= 0) return `+${rounded}`;
  if (rounded === 0) return `-${rounded}`;
  return `${rounded}`;
}
