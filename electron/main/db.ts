import { createRequire } from "node:module";
import type { PrismaClient as PrismaClientType } from "@prisma/client";
import { app } from "electron";
import path from "path";
import fs from "fs";
import crypto from "crypto";

let prisma: PrismaClientType | null = null;

function loadPrismaClient(): typeof import("@prisma/client").PrismaClient {
  if (app.isPackaged) {
    const resourcesNodeModules = path.join(
      process.resourcesPath,
      "node_modules",
    );
    const existingPaths = (process.env.NODE_PATH || "")
      .split(path.delimiter)
      .filter(Boolean);
    if (!existingPaths.includes(resourcesNodeModules)) {
      process.env.NODE_PATH = [resourcesNodeModules, ...existingPaths].join(
        path.delimiter,
      );
      // Prisma's generated client resolves its hidden `.prisma` package through NODE_PATH.
      (require("node:module") as { _initPaths: () => void })._initPaths();
    }
  }
  const requireFromMain = createRequire(__filename);
  return requireFromMain("@prisma/client").PrismaClient;
}

export function getDatabasePath(): string {
  if (!app.isPackaged && process.env.COTIZFY_DATABASE_PATH) {
    const isolatedPath = path.resolve(process.env.COTIZFY_DATABASE_PATH);
    fs.mkdirSync(path.dirname(isolatedPath), { recursive: true });
    return isolatedPath;
  }
  if (app.isPackaged) {
    const userDataPath = app.getPath("userData");
    if (!fs.existsSync(userDataPath)) {
      fs.mkdirSync(userDataPath, { recursive: true });
    }
    return path.join(userDataPath, "cotizfy.db");
  }

  // Development database path (inside prisma folder)
  const devDir = path.resolve(process.cwd(), "prisma");
  if (!fs.existsSync(devDir)) {
    fs.mkdirSync(devDir, { recursive: true });
  }
  return path.join(devDir, "dev.db");
}

export function getMigrationsPath(): string {
  if (app.isPackaged) {
    return path.join(process.resourcesPath, "prisma", "migrations");
  }
  return path.resolve(process.cwd(), "prisma", "migrations");
}

/**
 * Executes pending Prisma migrations offline using SQLite transactions
 * and updates the official _prisma_migrations tracking table.
 */
async function applyPendingMigrations(client: PrismaClient): Promise<void> {
  // 1. Ensure official _prisma_migrations table exists
  await client.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS "_prisma_migrations" (
      "id"                    TEXT PRIMARY KEY NOT NULL,
      "checksum"              TEXT NOT NULL,
      "finished_at"           DATETIME,
      "migration_name"        TEXT NOT NULL,
      "logs"                  TEXT,
      "rolled_back_at"        DATETIME,
      "started_at"            DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "applied_steps_count"   INTEGER NOT NULL DEFAULT 0
    );
  `);

  const migrationsDir = getMigrationsPath();
  if (!fs.existsSync(migrationsDir)) {
    console.warn(
      `[Prisma Migrate] Migrations directory not found at: ${migrationsDir}`,
    );
    return;
  }

  // 2. Read migration subdirectories in alphabetical order
  const migrationFolders = fs
    .readdirSync(migrationsDir, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name)
    .sort();

  for (const folderName of migrationFolders) {
    const migrationFile = path.join(migrationsDir, folderName, "migration.sql");
    if (!fs.existsSync(migrationFile)) continue;

    // Check if migration has already been applied
    const applied = await client.$queryRawUnsafe<Array<{ id: string }>>(
      `SELECT id FROM "_prisma_migrations" WHERE "migration_name" = ? AND "finished_at" IS NOT NULL AND "rolled_back_at" IS NULL LIMIT 1;`,
      folderName,
    );

    if (applied && applied.length > 0) {
      continue; // Already applied
    }

    console.log(`[Prisma Migrate] Applying pending migration: ${folderName}`);
    const sqlContent = fs.readFileSync(migrationFile, "utf-8");
    const checksum = crypto
      .createHash("sha256")
      .update(fs.readFileSync(migrationFile))
      .digest("hex");
    const migrationId = crypto.randomUUID();

    // Record migration start
    await client.$executeRawUnsafe(
      `INSERT INTO "_prisma_migrations" ("id", "checksum", "migration_name", "started_at") VALUES (?, ?, ?, CURRENT_TIMESTAMP);`,
      migrationId,
      checksum,
      folderName,
    );

    try {
      // Split SQL script into individual executable statements
      const statements = sqlContent
        .replace(/--.*$/gm, "") // Remove single-line comments
        .split(";")
        .map((s) => s.trim())
        .filter((s) => s.length > 0);

      for (const statement of statements) {
        await client.$executeRawUnsafe(statement);
      }

      // Mark migration as finished
      await client.$executeRawUnsafe(
        `UPDATE "_prisma_migrations" SET "finished_at" = CURRENT_TIMESTAMP, "applied_steps_count" = 1 WHERE "id" = ?;`,
        migrationId,
      );
      console.log(
        `[Prisma Migrate] Migration ${folderName} applied successfully.`,
      );
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : String(err);
      console.error(
        `[Prisma Migrate] Error executing migration ${folderName}:`,
        errorMsg,
      );
      await client.$executeRawUnsafe(
        `UPDATE "_prisma_migrations" SET "logs" = ?, "rolled_back_at" = CURRENT_TIMESTAMP WHERE "id" = ?;`,
        errorMsg,
        migrationId,
      );
      throw err;
    }
  }
}

export function getPrismaClient(): PrismaClient {
  if (!prisma) {
    const PrismaClient = loadPrismaClient();
    const dbPath = getDatabasePath();
    const dbUrl = `file:${dbPath}`;

    prisma = new PrismaClient({
      datasources: {
        db: {
          url: dbUrl,
        },
      },
      log:
        process.env.NODE_ENV === "development" ? ["warn", "error"] : ["error"],
    });
  }

  return prisma;
}

export async function initDatabase(): Promise<{
  success: boolean;
  message: string;
}> {
  try {
    const client = getPrismaClient();

    // 1. Run all pending migrations
    await applyPendingMigrations(client);

    // 2. Test connectivity
    await client.$queryRaw`SELECT 1;`;

    return {
      success: true,
      message: "Database initialized and migrated successfully",
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error("[Cotizfy] Database initialization failed:", message);
    return { success: false, message };
  }
}
