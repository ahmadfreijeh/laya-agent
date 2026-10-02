import {
  deleteBrain as deleteBrainRequest,
  getBrain as getBrainRequest,
  listBrains as listBrainsRequest,
  saveBrain as saveBrainRequest,
  tryBrain as tryBrainRequest,
} from "../api/laya.api.js";
import type { BrainFile, BrainFileList, TryResult } from "../types/brain.js";

export function listBrains(): Promise<BrainFileList> {
  return listBrainsRequest();
}

export function getBrain(key: string): Promise<BrainFile> {
  return getBrainRequest(key);
}

export function saveBrain(key: string, brain: object): Promise<BrainFile> {
  return saveBrainRequest(key, brain);
}

export function tryBrain(body: { message: string; brain: object }): Promise<TryResult> {
  return tryBrainRequest({ message: body.message }, body.brain);
}

export function deleteBrain(key: string): Promise<BrainFile> {
  return deleteBrainRequest(key);
}
