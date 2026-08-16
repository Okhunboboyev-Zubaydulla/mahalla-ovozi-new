import { type Config, defineConfig } from "drizzle-kit";

const databaseUrl = process.env["DATABASE_URL"];

if (databaseUrl === undefined) {
  throw new Error("DATABASE_URL is required for database migration commands.");
}

const drizzleConfig: Config = defineConfig({
  dbCredentials: {
    url: databaseUrl,
  },
  dialect: "postgresql",
  out: "./drizzle",
  schema: "./src/adapters/db/schema.ts",
  strict: true,
  verbose: true,
});

export default drizzleConfig;
