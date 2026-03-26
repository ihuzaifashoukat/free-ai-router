// tsup.config.ts — Build config for ESM + CJS dual output
import { defineConfig } from 'tsup';

export default defineConfig({
    entry: ['src/index.ts'],
    format: ['esm', 'cjs'],
    dts: true,
    clean: true,
    splitting: false,
    sourcemap: true,
    minify: false,
    treeshake: true,
    target: 'node18',
    outDir: 'dist',
});
