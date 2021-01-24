// taken from: https://nodejs.org/api/synopsis.html

const express = require("express");
const path = require("path");
const sqlite3 = require("sqlite3").verbose();
const fs = require("fs");
const { exit } = require("process");

function countPlys(notation) {
  return notation.split(",").length;
}

function getLatestDatabase(directory = ".") {
  const dirContent = fs.readdirSync(path.resolve(directory));
  const dbFilesStats = dirContent
    .filter((file) => file.endsWith(".db"))
    .map((name) => ({ name, stats: fs.statSync(name) }))
    .filter((file) => file && file.stats.isFile());

  if (dbFilesStats.length === 0) {
    return null;
  }

  const latestFile = dbFilesStats.reduce((a, b) => (a.stats.ctimeMs > b.stats.ctimeMs ? a : b));
  return latestFile.name;
}

function isGameProper(row) {
  if (row.result !== "1-0" && row.result !== "0-1") {
    // Road, flat wins and accepted draws are always valid
    return true;
  }

  const plyCount = countPlys(row.notation);
  const size = parseInt(row.size, 10);
  // console.log(plyCount, size);
  return plyCount < size * 2; // Not enough moves to warrant a game
}

function getGamesForPlayer(db, player) {
  return new Promise((resolve, reject) => {
    // todo support multiple player names
    // eslint-disable-next-line max-len
    const playerNames = player.split(" ");
    const placeholder = playerNames.map(() => "?").join(",");
    // eslint-disable-next-line max-len
    const query = `SELECT * FROM games WHERE player_white COLLATE NOCASE IN (${placeholder}) or player_black COLLATE NOCASE IN (${placeholder}) ORDER BY id DESC`;
    db.all(
      query,
      [...playerNames, ...playerNames],
      (err, rows) => {
        if (err) {
          return reject(err);
        }
        return resolve(rows.filter(isGameProper));
      },
    );
  });
}

const databasePath = getLatestDatabase();
if (!databasePath) exit("No .db file found in current directory");
const db = new sqlite3.Database(databasePath, sqlite3.OPEN_READONLY, (err) => {
  if (err) {
    exit(`Error while loading database from '${databasePath}'`, err.message);
  }
});

const hostname = "0.0.0.0";
const port = 8080;

const absoluteRatingPath = path.join(__dirname, "./rating.json");

const app = express();
app.use("/static", express.static(path.join(__dirname, "www")));
app.use("/rating.json", express.static(absoluteRatingPath));

app.get("/", (req, res) => {
  res.redirect("/static");
});

app.get("/api/rating", (req, res) => {
  // res.statusCode = 200;
  res.sendFile(absoluteRatingPath);
});
app.get("/api/player/:playername", async (req, res) => {
  const { playername } = req.params;
  getGamesForPlayer(db, playername).then((games) => {
    // eslint-disable-next-line no-param-reassign
    games.forEach((game) => { delete game.notation; }); // save ca 60% data
    res.send(games);
  }).catch((error) => {
    res.send({ error });
  });
});

app.listen(port, hostname, () => {
  // eslint-disable-next-line no-console
  console.log(`Example app listening at http://localhost:${port}`);
});
