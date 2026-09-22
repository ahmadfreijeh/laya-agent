import express from "express";
import swaggerUi from "swagger-ui-express";

import { openapi } from "./openapi.js";
import { agentRoute } from "./routes/agent.route.js";

const PORT = Number(process.env.PORT) || 3000;
const app = express();

app.use(express.json());
app.use("/docs", swaggerUi.serve, swaggerUi.setup(openapi));
app.get("/health", (_req, res) => {
  res.json({ ok: true });
});
app.use(agentRoute);

app.listen(PORT, () => {
  console.log(`agent listening on http://127.0.0.1:${PORT}`);
  console.log(`swagger docs at http://127.0.0.1:${PORT}/docs`);
});
