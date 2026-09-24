import "./config.js";
import path from "node:path";
import { fileURLToPath } from "node:url";

import express from "express";
import swaggerUi from "swagger-ui-express";

import { openapi } from "./openapi.js";
import { agentRoute } from "./routes/agent.route.js";

const PORT = Number(process.env.PORT) || 3000;
const publicDir = path.join(path.dirname(fileURLToPath(import.meta.url)), "../public");
const app = express();

app.use((_req, res, next) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  if (_req.method === "OPTIONS") {
    res.sendStatus(204);
    return;
  }
  next();
});
app.use(express.json());
app.use(express.static(publicDir));
app.use("/docs", swaggerUi.serve, swaggerUi.setup(openapi));
app.get("/health", (_req, res) => {
  res.json({ ok: true });
});
app.use(agentRoute);

app.listen(PORT, () => {
  console.log(`agent listening on http://127.0.0.1:${PORT}`);
  console.log(`swagger docs at http://127.0.0.1:${PORT}/docs`);
  console.log(`chat widget at http://127.0.0.1:${PORT}/widget.js`);
  console.log(`demo page at http://127.0.0.1:${PORT}/demo.html`);
});
