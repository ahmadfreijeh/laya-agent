import { mkdirSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import sqlite3 from "sqlite3";

const dataDir = path.join(path.dirname(fileURLToPath(import.meta.url)), "..", "..", "data");
const databaseFile = process.env.RELAY_DB_PATH || path.join(dataDir, "relay.sqlite");

let database: sqlite3.Database | undefined;
let opening: Promise<sqlite3.Database> | undefined;

export function getDatabase(): Promise<sqlite3.Database> {
  if (database) return Promise.resolve(database);
  if (!opening) {
    mkdirSync(path.dirname(databaseFile), { recursive: true });
    opening = new Promise((resolve, reject) => {
      const connection = new sqlite3.Database(databaseFile, (err) => {
        if (err) {
          opening = undefined;
          reject(err);
          return;
        }
        database = connection;
        resolve(connection);
      });
    });
  }
  return opening;
}

export async function execute(sql: string): Promise<void> {
  const database = await getDatabase();
  await new Promise<void>((resolve, reject) => {
    database.exec(sql, (err) => (err ? reject(err) : resolve()));
  });
}

export async function save(sql: string, params: unknown[]): Promise<void> {
  const database = await getDatabase();
  await new Promise<void>((resolve, reject) => {
    database.run(sql, params, (err) => (err ? reject(err) : resolve()));
  });
}

export async function get<T>(sql: string, params: unknown[]): Promise<T | undefined> {
  const database = await getDatabase();
  return new Promise<T | undefined>((resolve, reject) => {
    database.get<T>(sql, params, (err, row) => (err ? reject(err) : resolve(row)));
  });
}
