const path = require("path");
const cors = require("cors");
const dotenv = require("dotenv");
const express = require("express");

const uploadRouter = require("./routes/upload");
const chatRouter = require("./routes/chat");
const profileRouter = require("./routes/profile");
const scoreRouter = require("./routes/score");

dotenv.config();

const app = express();
const port = Number(process.env.PORT) || 3001;

const allowedOrigins = ["http://localhost:5173"];

if (process.env.FRONTEND_URL && !allowedOrigins.includes(process.env.FRONTEND_URL)) {
  allowedOrigins.push(process.env.FRONTEND_URL);
}

app.use(
  cors({
    origin: allowedOrigins
  })
);
app.use(express.json());

app.get("/health", (_req, res) => {
  res.json({ status: "ok", service: "backend" });
});

app.use("/api/upload", uploadRouter);
app.use("/api/profile", profileRouter);
app.use("/api/chat", chatRouter);
app.use("/api/score", scoreRouter);

const frontendDist = path.join(__dirname, "../../frontend/dist");
app.use(express.static(frontendDist));
app.get("*", (_req, res) => {
  res.sendFile(path.join(frontendDist, "index.html"));
});

app.use((err, _req, res, next) => {
  console.error(err);

  if (res.headersSent) {
    return next(err);
  }

  return res.status(500).json({
    error: err.message || "Internal server error."
  });
});

app.listen(port, () => {
  console.log(`Backend running on port ${port}`);
});
