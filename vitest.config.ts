import { defineConfig } from 'vitest/config';

// Longboard arrives as TypeScript source in node_modules; it has to go
// through the same transform as this repository's own files.
export default defineConfig({
  test: {
    include: ['test/**/*.test.ts'],
    server: { deps: { inline: ['longboard'] } },
  },
});
