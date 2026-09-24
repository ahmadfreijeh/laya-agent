import { Router } from "express";

import {
  getQuestions,
  listQuestions,
  putQuestions,
  removeQuestions,
  tryQuestions,
} from "../controllers/questions.controller.js";

export const questionsRoute = Router();

questionsRoute.get("/questions", listQuestions);
questionsRoute.post("/questions/try", tryQuestions);
questionsRoute.get("/questions/:key", getQuestions);
questionsRoute.put("/questions/:key", putQuestions);
questionsRoute.delete("/questions/:key", removeQuestions);
