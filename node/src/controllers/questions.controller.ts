import type { Request, Response } from "express";

import {
  deleteQuestionFile,
  getQuestionFile,
  listQuestionFiles,
  saveQuestionFile,
  tryQuestionFile,
} from "../api/laya.api.js";

const KEY = /^[A-Za-z0-9][A-Za-z0-9_-]{0,63}(\.json)?$/i;

function fail(res: Response, err: unknown): void {
  const status = err && typeof err === "object" && "status" in err && typeof err.status === "number" ? err.status : 502;
  const message = err instanceof Error ? err.message : "request failed";
  res.status(status >= 400 && status < 600 ? status : 502).json({ error: message });
}

function keyFrom(req: Request, res: Response): string | null {
  const key = req.params.key;
  if (typeof key !== "string" || !KEY.test(key)) {
    res.status(400).json({ error: "key must be a file name like support or support.json" });
    return null;
  }
  return key;
}

export async function listQuestions(_req: Request, res: Response): Promise<void> {
  try {
    res.json(await listQuestionFiles());
  } catch (err) {
    fail(res, err);
  }
}

export async function getQuestions(req: Request, res: Response): Promise<void> {
  const key = keyFrom(req, res);
  if (!key) return;
  try {
    res.json(await getQuestionFile(key));
  } catch (err) {
    fail(res, err);
  }
}

export async function putQuestions(req: Request, res: Response): Promise<void> {
  const key = keyFrom(req, res);
  if (!key) return;
  if (req.body == null || typeof req.body !== "object" || Array.isArray(req.body)) {
    res.status(400).json({ error: "question file must be a JSON object" });
    return;
  }
  try {
    res.json(await saveQuestionFile(key, req.body));
  } catch (err) {
    fail(res, err);
  }
}

export async function tryQuestions(req: Request, res: Response): Promise<void> {
  const { message, questions } = req.body ?? {};
  if (typeof message !== "string" || !message.trim()) {
    res.status(400).json({ error: "message is required" });
    return;
  }
  if (questions == null || typeof questions !== "object" || Array.isArray(questions)) {
    res.status(400).json({ error: "question file must be a JSON object" });
    return;
  }
  try {
    res.json(await tryQuestionFile({ message: message.trim() }, questions));
  } catch (err) {
    fail(res, err);
  }
}

export async function removeQuestions(req: Request, res: Response): Promise<void> {
  const key = keyFrom(req, res);
  if (!key) return;
  try {
    res.json(await deleteQuestionFile(key));
  } catch (err) {
    fail(res, err);
  }
}
