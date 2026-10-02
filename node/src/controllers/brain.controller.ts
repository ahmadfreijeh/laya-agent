import type { Request, Response } from "express";

import {
  deleteBrain as deleteBrainService,
  getBrain as getBrainService,
  listBrains as listBrainsService,
  saveBrain as saveBrainService,
  tryBrain as tryBrainService,
} from "../services/brain.service.js";
import { sendError, sendSuccess } from "../utils/response.util.js";

export async function listBrains(_req: Request, res: Response): Promise<void> {
  try {
    sendSuccess(res, await listBrainsService());
  } catch (err) {
    sendError(res, err, 502);
  }
}

export async function getBrain(req: Request, res: Response): Promise<void> {
  try {
    sendSuccess(res, await getBrainService(req.params.key as string));
  } catch (err) {
    sendError(res, err, 502);
  }
}

export async function putBrain(req: Request, res: Response): Promise<void> {
  try {
    sendSuccess(res, await saveBrainService(req.params.key as string, req.body));
  } catch (err) {
    sendError(res, err, 502);
  }
}

export async function tryBrain(req: Request, res: Response): Promise<void> {
  try {
    sendSuccess(res, await tryBrainService(req.body));
  } catch (err) {
    sendError(res, err, 502);
  }
}

export async function removeBrain(req: Request, res: Response): Promise<void> {
  try {
    sendSuccess(res, await deleteBrainService(req.params.key as string));
  } catch (err) {
    sendError(res, err, 502);
  }
}
