import { drizzle } from "drizzle-orm/node-postgres";
import pg from "pg";
import * as schema from "./schema/index";

const { Pool } = pg;

let pool: any = null;
let db: any = null;

export function getPoolConfig(connectionString?: string): any {
  if (!connectionString) return null;
  try {
    const u = new URL(connectionString);
    if (u.hostname.includes("supabase.co") && u.hostname.startsWith("db.")) {
      const parts = u.hostname.split(".");
      const projectRef = parts[1];
      const password = decodeURIComponent(u.password);
      return {
        host: "aws-0-eu-central-1.pooler.supabase.com",
        port: 6543,
        user: `postgres.${projectRef}`,
        password,
        database: u.pathname.replace(/^\//, "") || "postgres",
        ssl: { rejectUnauthorized: false },
        connectionTimeoutMillis: 10000,
      };
    }
    return {
      connectionString,
      ssl: connectionString.includes("sslmode=disable") ? false : { rejectUnauthorized: false },
      connectionTimeoutMillis: 10000,
    };
  } catch {
    return { connectionString, ssl: { rejectUnauthorized: false } };
  }
}

if (process.env.DATABASE_URL) {
  try {
    const config = getPoolConfig(process.env.DATABASE_URL);
    pool = new Pool(config);
    db = drizzle(pool, { schema });
  } catch (err) {
    console.error('[Database] Connection initialization error:', err);
    if (process.env.NODE_ENV === "production") {
      throw new Error('Database initialization failed');
    }
  }
} else if (process.env.NODE_ENV === "production") {
  throw new Error('DATABASE_URL environment variable is required in production');
}

if (!db) {
  const noOp = {
    findMany: async () => [],
    findFirst: async () => null,
    findUnique: async () => null,
    create: async (d: any) => d?.data ?? {},
    update: async (d: any) => d?.data ?? {},
    delete: async () => ({}),
  };
  db = new Proxy({}, {
    get: (_, prop) => (prop === 'query' ? new Proxy({}, { get: () => noOp }) : async () => []),
  });
}

export { pool, db };
export * from "./schema/index";
