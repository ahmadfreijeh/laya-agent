import express from "express";

import { agentRoute } from "./routes/agent.route.js";

const PORT = Number(process.env.PORT) || 3000;
const app = express();

app.use(express.json());
app.get("/health", (_req, res) => {
  res.json({ ok: true });
});
app.use(agentRoute);

app.listen(PORT, () => {
  console.log(`agent listening on http://127.0.0.1:${PORT}`);
});
