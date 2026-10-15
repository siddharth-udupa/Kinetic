import { config } from "dotenv";
import { defineConfig } from "drizzle-kit";
import path from "path";

import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

config({
  path: path.resolve(
    __dirname,
    "../../apps/web/.env"
  ),
  quiet: true,
});

if (!process.env.DATABASE_URL_DIRECT) {
  throw new Error("DATABASE_URL_DIRECT missing");
}

export default defineConfig({
  schema: "./src/schema.ts",
  out: "./drizzle",
  dialect: "postgresql",
  dbCredentials: {
    url: process.env.DATABASE_URL_DIRECT!,
  },
});