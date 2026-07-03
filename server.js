const dotenvResult = require("dotenv").config();
console.log("env loaded:", Object.keys(dotenvResult.parsed || {}).length, "vars");

const express = require("express");
const path = require("path");
const multer = require("multer");
const app = express();

const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 25 * 1024 * 1024 } });

app.use(express.json());
app.use(express.static(path.join(__dirname)));

const uploadHandler = require("./api/upload");
const fId = require("./api/f/[id]");

// Upload endpoint (obfuscated name: /api/s, real: /api/upload)
app.post("/api/s", upload.single("file"), (req, res) => uploadHandler(req, res));
app.post("/api/upload", upload.single("file"), (req, res) => uploadHandler(req, res));

// Redirect short link
app.get("/f/:id", (req, res) => {
  req.query = { id: req.params.id };
  fId(req, res);
});
app.get("/api/f/:id", (req, res) => {
  req.query = { id: req.params.id };
  fId(req, res);
});

app.listen(3000, () => console.log("http://localhost:3000"));
