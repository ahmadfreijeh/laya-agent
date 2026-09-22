import { Router } from "express";

import { postAgent } from "../controllers/agent.controller.js";

export const agentRoute = Router();

agentRoute.post("/agent", postAgent);
