/* eslint-disable no-console */

const express = require("express");
const compression = require("compression");
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

  const latestFile = dbFilesStats.reduce((a, b) => (a.stats.mtimeMs > b.stats.mtimeMs ? a : b));
  return latestFile.name;
}

function isGameProper(row) {
  if (row.result !== "1-0" && row.result !== "0-1") {
    // Road, flat wins and accepted draws are always valid
    return true;
  }

  const plyCount = countPlys(row.notation);
  const size = parseInt(row.size, 10);

  return plyCount > size * 2; // Minimum number of plys to warrant a proper game
}

function getGamesForPlayer(db, player) {
  return new Promise((resolve, reject) => {
    // todo support multiple player names
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

/** @type {import("sqlite3").Database} */
let db;

function switchToLatestDatabase() {
  return new Promise((resolve, reject) => {
    if (db) {
      return db.close((err) => (err ? reject(err) : resolve()));
    }
    return resolve();
  })
    .then(() => new Promise((resolve, reject) => {
      const databasePath = getLatestDatabase();
      if (!databasePath) exit("No .db file found in current directory");
      console.log(`Switching to DB at '${databasePath}'`);
      db = new sqlite3.Database(databasePath, sqlite3.OPEN_READONLY, (err) => {
        if (err) {
          return reject(new Error(`Error while loading database from '${databasePath}': ${err.message}`));
        }
        console.log(`Successfully switched to DB at '${databasePath}'`);
        return resolve();
      });
    }));
}

switchToLatestDatabase();

const hostname = "0.0.0.0";
const port = 8080;
const portDbApp = 8081;

const absoluteRatingPath = path.join(__dirname, "./rating.json");

const app = express();
app.use(compression());
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
  console.log(`Tak rating app listening at http://${hostname}:${port}`);
});

const appForDb = express();
appForDb.get("/db/switch", async (req, res) => {
  console.log("! Received request to switch to latest DB");
  await switchToLatestDatabase();
  console.log("! Switched to latest DB");
  res.send();
});

// This is explicitly only available on localhost,
// so that the rating script can notify the server to connect to the latest DB
appForDb.listen(portDbApp, "localhost", () => {
  console.log(`DB Switching App listening on http://localhost:${portDbApp}`);
});
