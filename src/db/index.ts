import { drizzle } from "drizzle-orm/node-postgres";
import { z } from "zod";
import * as schema from "./schema.ts";

export const db = drizzle(z.string().parse(process.env.DATABASE_URL), {
  schema,
});
