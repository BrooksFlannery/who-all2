import { resolve } from 'path';
import { defineConfig } from 'vitest/config';

export default defineConfig({
    test: {
        globals: true,
        environment: 'node',
        setupFiles: ['dotenv/config', './tests/setup.ts'],
        testTimeout: 30000,
        hookTimeout: 60000,
        teardownTimeout: 30000,
    },
    resolve: {
        alias: {
            '@': resolve(__dirname, './'),
        },
    },
}); 