import { Router } from "express";

import { postAgent } from "../controllers/agent.controller.js";
import { validateAgentBody } from "../validators/agent.validator.js";

export const agentRoute = Router();

agentRoute.post("/agent", validateAgentBody, postAgent);
