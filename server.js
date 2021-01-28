/* eslint-disable no-console */

const express = require("express");
const compression = require("compression");
const path = require("path");
const Database = require("better-sqlite3");
const fs = require("fs");

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

/**
 * Returns false if the game was abandonded after a few moves.
 * @param {{result: string, notation: string, size: number}} row
 */
// eslint-disable-next-line no-unused-vars
function isGameProper(row) {
  if (row.result !== "1-0" && row.result !== "0-1") {
    // Road, flat wins and accepted draws are always valid
    return true;
  }

  const plyCount = countPlys(row.notation);
  return plyCount > row.size * 2; // Minimum number of plys to warrant a proper game
}

/** @type {Map<number, Database.Statement>} */
const preparedStatements = new Map();

/**
 * @param db {Database.Database}
 * @param playerNames {number}
 */
function getGamesForPlayerStatement(db, playerNames) {
  if (preparedStatements.has(playerNames.length)) {
    return preparedStatements.get(playerNames.length);
  }
  console.log("creatign new statement for", playerNames.length, "player names");

  const placeholder = playerNames.map(() => "?").join(",");
  // eslint-disable-next-line max-len
  const query = `SELECT * FROM games WHERE player_white COLLATE NOCASE IN (${placeholder}) or player_black COLLATE NOCASE IN (${placeholder}) ORDER BY id DESC`;
  const stmt = db.prepare(query);
  preparedStatements.set(playerNames.length, stmt);
  return stmt;
}

/**
 * @param db {Database.Database}
 */
function getGamesForPlayer(db, player) {
  return new Promise((resolve, reject) => {
    const playerNames = player.split(" ");

    const stmt = getGamesForPlayerStatement(db, playerNames);

    const games = stmt.all(...playerNames, ...playerNames);
    if (games) {
      const properGames = games.filter(isGameProper);
      return resolve(properGames);
    }
    return reject();
  });
}

/** @type {Database.Database} */
let db;

function switchToLatestDatabase() {
  if (db) {
    db.close();
    db = undefined;
  }
  const databasePath = getLatestDatabase();
  if (!databasePath) return ("No .db file found in current directory");
  console.log(`Switching to DB at '${databasePath}'`);
  try {
    db = new Database(databasePath, { readonly: true, fileMustExist: true });
  } catch (err) {
    console.error(err);
    return err;
  }
  preparedStatements.clear();
  return null;
}

switchToLatestDatabase();

const hostname = "0.0.0.0";
const port = 8080;
const portDbApp = 8081;

const absoluteRatingPath = path.join(__dirname, "./rating.json");

const app = express();
app.use(compression());
app.use("/", express.static(path.join(__dirname, "www")));
app.use("/rating.json", express.static(absoluteRatingPath));

// This is only because previously the data was served at /static - but now it's under /
app.get("/static*", async (req, res) => {
  res.redirect("/");
});

app.get("/api/rating", async (req, res) => {
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
  const error = switchToLatestDatabase();
  if (error) {
    console.log("! Failed to switch DB", error);
    res.status = 404;
    return res.send(error);
  }
  console.log("! Successfully switched DB");
  return res.send("switched");
});

// This is explicitly only available on localhost,
// so that the rating script can notify the server to connect to the latest DB
appForDb.listen(portDbApp, "localhost", () => {
  console.log(`DB Switching App listening on http://localhost:${portDbApp}`);
});
