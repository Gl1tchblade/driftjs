// @ts-nocheck
import { defineConfig } from 'drizzle-kit'
import { sqliteTable, integer, text } from 'drizzle-orm/sqlite-core'

// Simple example schema
export const users = sqliteTable('users', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  email: text('email').notNull().unique()
})

export default defineConfig({
  schema: './src/schema.ts',
  out: './migrations',
  dialect: 'sqlite',
  dbCredentials: {
    url: './test.db'
  }
}) 