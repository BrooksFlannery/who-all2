import { resolve } from 'path';
import { defineConfig } from 'vitest/config';

export default defineConfig({
    test: {
        globals: true,
        environment: 'node',
        setupFiles: ['dotenv/config'],
    },
    resolve: {
        alias: {
            '@': resolve(__dirname, './'),
        },
    },
}); 