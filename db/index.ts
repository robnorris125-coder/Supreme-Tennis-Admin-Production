import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema";

type RuntimeEnv = {
  TENNIS_GROWTH_GOOGLE_CLIENT_ID?: string;
  TENNIS_GROWTH_GOOGLE_CLIENT_SECRET?: string;
  GOOGLE_GMAIL_CLIENT_ID?: string;
  GOOGLE_GMAIL_CLIENT_SECRET?: string;
  GMAIL_TOKEN_KEY?: string;
  TENNIS_GROWTH_MICROSOFT_CLIENT_ID?: string;
  TENNIS_GROWTH_MICROSOFT_CLIENT_SECRET?: string;
};

declare global {
  var __TENNIS_GROWTH_SQL: ReturnType<typeof postgres> | undefined;
  var __TENNIS_GROWTH_DB: ReturnType<typeof drizzle<typeof schema>> | undefined;
}

function databaseUrl() {
  const url = process.env.SUPABASE_DB_URL;
  if (!url) throw new Error("SUPABASE_DB_URL is not configured");
  return url;
}

function sqlClient() {
  if (!globalThis.__TENNIS_GROWTH_SQL) {
    globalThis.__TENNIS_GROWTH_SQL = postgres(databaseUrl(), {
      max: 1,
      prepare: false,
      ssl: "require",
      idle_timeout: 20,
      connect_timeout: 15,
    });
  }
  return globalThis.__TENNIS_GROWTH_SQL;
}

export function getDb() {
  if (!globalThis.__TENNIS_GROWTH_DB) {
    globalThis.__TENNIS_GROWTH_DB = drizzle(sqlClient(), { schema });
  }
  return globalThis.__TENNIS_GROWTH_DB;
}

type BoundStatement = {
  query: string;
  parameters: unknown[];
  bind: (...parameters: unknown[]) => BoundStatement;
  first: <T>() => Promise<T | null>;
  all: <T>() => Promise<{ results: T[] }>;
  run: () => Promise<{ success: true }>;
};

function postgresPlaceholders(query: string) {
  let index = 0;
  return query.replace(/\?/g, () => `$${++index}`);
}

function prepared(query: string, parameters: unknown[] = []): BoundStatement {
  const execute = async () => sqlClient().unsafe(postgresPlaceholders(query), parameters as never[]);
  return {
    query,
    parameters,
    bind: (...next) => prepared(query, next),
    first: async <T>() => ((await execute())[0] as T | undefined) ?? null,
    all: async <T>() => ({ results: [...await execute()] as T[] }),
    run: async () => { await execute(); return { success: true }; },
  };
}

// Compatibility adapter for the small number of parameterised SQL operations
// in the proven invoice workflow. It preserves the current application logic
// while running those statements against Supabase Postgres.
export function getD1() {
  return {
    prepare: (query: string) => prepared(query),
    batch: async (statements: BoundStatement[]) => {
      for (const statement of statements) await statement.run();
      return statements.map(() => ({ success: true }));
    },
  };
}

export function getRuntimeEnv(): RuntimeEnv {
  return {
    TENNIS_GROWTH_GOOGLE_CLIENT_ID: process.env.TENNIS_GROWTH_GOOGLE_CLIENT_ID,
    TENNIS_GROWTH_GOOGLE_CLIENT_SECRET: process.env.TENNIS_GROWTH_GOOGLE_CLIENT_SECRET,
    GOOGLE_GMAIL_CLIENT_ID: process.env.GOOGLE_GMAIL_CLIENT_ID,
    GOOGLE_GMAIL_CLIENT_SECRET: process.env.GOOGLE_GMAIL_CLIENT_SECRET,
    GMAIL_TOKEN_KEY: process.env.GMAIL_TOKEN_KEY,
    TENNIS_GROWTH_MICROSOFT_CLIENT_ID: process.env.TENNIS_GROWTH_MICROSOFT_CLIENT_ID,
    TENNIS_GROWTH_MICROSOFT_CLIENT_SECRET: process.env.TENNIS_GROWTH_MICROSOFT_CLIENT_SECRET,
  };
}
