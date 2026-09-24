import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

type PackageJson = {
  name?: string;
  displayName?: string;
  version?: string;
};

const pkg = JSON.parse(
  readFileSync(path.join(path.dirname(fileURLToPath(import.meta.url)), "../package.json"), "utf8"),
) as PackageJson;

function titleCase(value: string): string {
  return value.replace(/[-_]+/g, " ").replace(/\b\w/g, (char) => char.toUpperCase());
}

const slug = pkg.name?.trim() || "app";

export const platform = {
  slug,
  name: pkg.displayName?.trim() || titleCase(slug),
  version: pkg.version?.trim() || "0.0.0",
};
