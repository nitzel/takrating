/* eslint-disable no-console */

// The game id of the last game of the last update:
const lastgameid = 100191;

// Rating calculation parameters:
const initialrating = 1000;
const bonusrating = 550;
const bonusfactor = 60;
const participationlimit = 10;
const participationcutoff = 1500;

// File names:
const databasepath = process.argv[2] || "games_anon.db";
const resultfile = "ratings.csv";
const resultfileTournament = "tournament_ratings.csv";

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

function main(error) {
  // db.all("SELECT name FROM sqlite_master WHERE type='table';",tables)
  db.all("SELECT * FROM games ORDER BY date ASC, id ASC;", datacb);
  function datacb(error, data) {
    const players = {};
    let a;
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
    for (a = 0; a < 200; a++) {
      ratingsum[a] = 0;
      ratingcount[a] = 0;
    }
    let cheatcount = 0;
    for (a = 0; a < data.length; a += 1) {
      data[a].player_black = nametranslate.get(data[a].player_black) || data[a].player_black;
      data[a].player_white = nametranslate.get(data[a].player_white) || data[a].player_white;
      const cheatsurrender = (data[a].result === "1-0" && blankexcepted.has(data[a].player_black)) || (data[a].result === "0-1" && blankexcepted.has(data[a].player_white));
      cheatcount += cheatsurrender;
      if (cheatsurrender) {
        // console.log(data[a].player_black+" "+data[a].player_white+" "+data[a].notation)
      }
      if (includeplayer(data[a].player_white) && includeplayer(data[a].player_black) && data[a].size >= 5 && (data[a].notation !== "" || cheatsurrender) && data[a].result !== "0-0") {// && isbot(data[a].player_white)+isbot(data[a].player_black)!=3){
        if (data[a].date % 86400000 < lasttime % 86400000) {
          for (const player in players) {
            players[player].participation = Math.min(players[player].participation * .995, 20);
          }
          console.log("day");
        }
        let hiccup = false;
        if (data[a].date - lasttime < 1000 && data[a].player_white === data[a - 1].player_white) {
          hiccup = true;
          // console.log("Hiccup2 "+data[a].result+" "+data[a].date)
        }
        if (a + 1 !== data.length && data[a + 1].date - data[a].date < 1000 && data[a + 1].player_white === data[a].player_white) {
          if (data[a + 1].result.indexOf("0") !== data[a].result.indexOf("0")) {
            hiccup = true;
            // console.log("Hiccup1 "+data[a].result+" "+data[a].date)
          }
          else {
            // console.log("Nohiccup1 "+data[a].result+" "+data[a].date)
          }
        }
        firsttime = Math.min(firsttime, data[a].date);
        lasttime = Math.max(lasttime, data[a].date);
        lastid = data[a].id;
        if (!hiccup && data[a].player_white !== data[a].player_black) {
          games += 1;
          addplayer(data[a].player_white);
          addplayer(data[a].player_black);
          const result = { "1-0": 1, "R-0": 1, "F-0": 1, "1/2-1/2": 0.5, "0-1": 0, "0-R": 0, "0-F": 0 }[data[a].result];
          const sw = strength(data[a].player_white); // * 10**(0/400); - What is that for?
          const sb = strength(data[a].player_black);
          const expected = sw / (sw + sb);
          const fairness = expected * (1 - expected);
          if (sw > 10 ** (goodlimit / 400)
            && sb > 10 ** (goodlimit / 400)
            && !isbot(data[a].player_white)
            && !isbot(data[a].player_black)
            && data[a].size === 5) {
            flatcount += (data[a].result === "F-0" || data[a].result === "0-F");
            roadcount += (data[a].result === "R-0" || data[a].result === "0-R");
            drawcount += (data[a].result === "1/2-1/2");
            othercount += (data[a].result === "1-0" || data[a].result === "0-1");
            goodcount += 1;
            whitecount += (result === 1);
            blackcount += (result === 0);
            whiteexpected += sw * Math.pow(10, whiteadvantage / 400) / (sw * Math.pow(10, whiteadvantage / 400) + sb);
          }
          adjustplayer(data[a].player_white, result - expected, fairness);
          adjustplayer(data[a].player_black, expected - result, fairness);
          if (data[a].player_white === playerhistory) {
            printcurrentscore(data[a].player_white, data[a].player_black);
          }
          if (data[a].player_black === playerhistory) {
            printcurrentscore(data[a].player_black, data[a].player_white);
          }
        }
        if (data[a].id === lastgameid) {
          updatedisplayrating();
          for (const name in players) {
            players[name].oldrating = players[name].displayrating;
          }
        }
      }
    }
    console.log(data[data.length - 1]);
    // console.log(players.TreffnonX)
    delete players["!TreffnonX"];

    const playerlist = Object.values(players);

    updatedisplayrating();
    playerlist.sort(function (a, b) { return b.displayrating - a.displayrating; });
    let out = "";
    let outTournament = "";
    let ratingsumt = 0;
    let hiddensum = 0;
    for (a = 0; a < playerlist.length; a += 1) {
      const player = playerlist[a];
      ratingsumt += player.rating;
      hiddensum += player.hidden;
      if (/bot/i.test(player.name)) {
        console.log(`Bot: ${player.name}`);
      }
      const playerIsBot = isbot(player.name);
      const listname = playerIsBot ? `*${player.name}*` : player.name;
      const line = `${[
        (a + 1),
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
    fs.writeFileSync(resultfile, out);
    fs.writeFileSync(resultfileTournament, outTournament);
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
      for (a = 0; a < 200; a += 1) {
        virtrating += ratingsum[a] / ratingcount[a];
        console.log(`${a + 1}: ${virtrating}`);
      }
    }

    function strength(name) {
      return 10 ** (players[`!${name}`].rating / 400);
    }

    function adjustplayer(playerName, amount, fairness) {
      const player = players[`!${playerName}`];
      const bonus = Math.max(0, amount * player.hidden * bonusfactor / bonusrating);
      player.hidden -= bonus;
      const k = 10
        + 15 * (0.5 ** (player.games / 200))
        + 15 * (0.5 ** ((player.maxrating - 1000) / 300));
      player.rating += amount * k + bonus;
      if (player.games < 200) {
        ratingcount[player.games] += 1;
        ratingsum[player.games] += amount * k + bonus;
      }
      player.participation += fairness;
      player.games += 1;
      player.maxrating = Math.max(player.maxrating, player.rating);
    }

    function addplayer(playerName) {
      const name = `!${playerName}`;
      if (!players[name]) {
        players[name] = {
          rating: initialrating,
          hidden: bonusrating,
          oldrating: initialrating,
          name: playerName,
          games: 0,
          maxrating:
          initialrating,
          participation:
          participationlimit,
          displayrating: initialrating,
        };
        /* if(name==="IntuitionBot"){
          players["!"+name].hidden=0
          players["!"+name].rating=1700
        } */
      }
    }

    function includeplayer(name) {
      return name !== "Anon" && name !== "FriendlyBot" && name !== "cutak_bot" && name !== "antakonistbot" && !/^Guest[0-9]+$/.test(name); // && isbot(name)!==1
    }

    function isbot(name) {
      return botNames.has(name);
    }

    function printcurrentscore(playerName, opponent) {
      const player = players[`!${playerName}`];
      console.log(`${player.rating} ${opponent}`);
    }

    function updatedisplayrating() {
      for (const player in players) {
        players[player].displayrating = players[player].rating;
        if (players[player].participation < participationlimit && players[player].rating > participationcutoff) {
          players[player].displayrating = participationcutoff + (players[player].rating - participationcutoff) * players[player].participation / participationlimit;
        }
      }
    }
  }
}

function sign(number) {
  return (number > 0 ? "+" : "") + number;
}