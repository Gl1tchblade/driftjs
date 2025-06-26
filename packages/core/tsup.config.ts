import { defineConfig } from 'tsup'

export default defineConfig({
  entry: ['src/index.ts'],
  format: ['esm', 'cjs'],
  dts: true,
  splitting: false,
  sourcemap: true,
  clean: true,
  target: 'node18',
  // Externalize problematic dependencies to avoid bundling conflicts
  external: [
    'fs-extra',
    'graceful-fs',
  ],
  noExternal: [], // Bundle everything else
}) 