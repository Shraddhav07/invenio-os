import { drizzle } from 'drizzle-orm/neon-http'
import { neon } from '@neondatabase/serverless'
import * as schema from './schema.ts'

export const db = drizzle(neon(import.meta.env.VITE_DATABASE_URL as string), {
    schema,
});