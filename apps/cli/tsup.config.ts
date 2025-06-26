import { defineConfig } from 'tsup'

export default defineConfig({
  entry: ['src/index.ts'],
  format: ['esm'],
  dts: true,
  splitting: false,
  sourcemap: true,
  clean: true,
  minify: false,
  target: 'node18',
  banner: {
    js: '#!/usr/bin/env node',
  },
  external: [
    'pg-native',
    'better-sqlite3',
    'fs-extra',
    'graceful-fs',
    // External database drivers that might be optionally loaded
  ],
  onSuccess: 'chmod +x ./dist/index.js',
}) 