import "./config.js";
import path from "node:path";
import { fileURLToPath } from "node:url";

import express from "express";
import swaggerUi from "swagger-ui-express";

import { openapi } from "./openapi.js";
import { agentRoute } from "./routes/agent.route.js";
import { questionsRoute } from "./routes/questions.route.js";
import { themeRoute } from "./routes/theme.route.js";

const PORT = Number(process.env.PORT) || 3000;
const rootDir = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const publicDir = path.join(rootDir, "public");
const app = express();

app.set("views", path.join(rootDir, "views"));
app.set("view engine", "ejs");

app.use((_req, res, next) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  if (_req.method === "OPTIONS") {
    res.sendStatus(204);
    return;
  }
  next();
});
app.use(express.json({ limit: "1mb" }));
app.use(express.static(publicDir));
app.use("/docs", swaggerUi.serve, swaggerUi.setup(openapi));
app.get("/health", (_req, res) => {
  res.json({ ok: true });
});
app.get("/brain", (_req, res) => {
  res.render("brain");
});
app.get("/test", (_req, res) => {
  res.render("test");
});
app.get("/theme", (_req, res) => {
  res.render("theme");
});
app.get("/questions.html", (_req, res) => {
  res.redirect(301, "/brain");
});
app.get(["/demo", "/demo.html"], (_req, res) => {
  res.redirect(301, "/test");
});
app.use(agentRoute);
app.use(questionsRoute);
app.use(themeRoute);

app.listen(PORT, () => {
  console.log(`agent listening on http://127.0.0.1:${PORT}`);
  console.log(`swagger docs at http://127.0.0.1:${PORT}/docs`);
  console.log(`chat widget at http://127.0.0.1:${PORT}/widget.js`);
  console.log(`widget page at http://127.0.0.1:${PORT}/test`);
  console.log(`brain at http://127.0.0.1:${PORT}/brain`);
  console.log(`widget theme at http://127.0.0.1:${PORT}/theme`);
});
