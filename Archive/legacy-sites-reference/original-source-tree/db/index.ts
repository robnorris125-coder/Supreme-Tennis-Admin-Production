import { drizzle } from "drizzle-orm/d1";
import * as schema from "./schema";

declare global {
  var __SUPREME_TENNIS_DB: D1Database | undefined;
  var __SUPREME_TENNIS_ENV: {
    TENNIS_GROWTH_GOOGLE_CLIENT_ID?: string;
    TENNIS_GROWTH_GOOGLE_CLIENT_SECRET?: string;
    GOOGLE_GMAIL_CLIENT_ID?: string;
    GOOGLE_GMAIL_CLIENT_SECRET?: string;
    GMAIL_TOKEN_KEY?: string;
    TENNIS_GROWTH_MICROSOFT_CLIENT_ID?: string;
    TENNIS_GROWTH_MICROSOFT_CLIENT_SECRET?: string;
  } | undefined;
}

export function getDb() {
  if (!globalThis.__SUPREME_TENNIS_DB) {
    throw new Error(
      "Cloudflare D1 binding `DB` is unavailable. Set the `d1` field in .openai/hosting.json to `DB` or let your control plane inject the real binding values before using the database."
    );
  }

  return drizzle(globalThis.__SUPREME_TENNIS_DB, { schema });
}

export function getD1() {
  if (!globalThis.__SUPREME_TENNIS_DB) {
    throw new Error("Cloudflare D1 binding `DB` is unavailable.");
  }

  return globalThis.__SUPREME_TENNIS_DB;
}

export function getRuntimeEnv() {
  return globalThis.__SUPREME_TENNIS_ENV ?? {};
}
