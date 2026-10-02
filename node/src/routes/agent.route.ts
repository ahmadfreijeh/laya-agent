import { Router } from "express";

import { postAgent } from "../controllers/agent.controller.js";
import { agentBodySchema } from "../validators/agent.validator.js";
import { validateBody } from "../validators/request.validator.js";

export const agentRoute = Router();

agentRoute.post("/agent", validateBody(agentBodySchema), postAgent);
