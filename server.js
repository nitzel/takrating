// taken from: https://nodejs.org/api/synopsis.html

const express = require("express");
const path = require("path");

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

app.listen(port, hostname, () => {
  // eslint-disable-next-line no-console
  console.log(`Example app listening at http://localhost:${port}`);
});
