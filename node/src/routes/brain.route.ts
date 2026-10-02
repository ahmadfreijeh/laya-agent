import { Router } from "express";

import {
  getBrain,
  listBrains,
  putBrain,
  removeBrain,
  tryBrain,
} from "../controllers/brain.controller.js";
import { brainBodySchema, brainParamsSchema, tryBrainBodySchema } from "../validators/brain.validator.js";
import { validateBody, validateParams } from "../validators/request.validator.js";

export const brainsRoute = Router();

brainsRoute.get("/brains", listBrains);
brainsRoute.post("/brains/try", validateBody(tryBrainBodySchema), tryBrain);
brainsRoute.get("/brains/:key", validateParams(brainParamsSchema), getBrain);
brainsRoute.put("/brains/:key", validateParams(brainParamsSchema), validateBody(brainBodySchema), putBrain);
brainsRoute.delete("/brains/:key", validateParams(brainParamsSchema), removeBrain);
