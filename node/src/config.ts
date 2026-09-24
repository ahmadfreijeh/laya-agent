import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");

try {
  process.loadEnvFile(path.join(root, ".env"));
} catch {
  // A missing .env is fine. Defaults and the process environment still apply.
}
