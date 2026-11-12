import { defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
    resolve: { alias: { '@': path.resolve(__dirname, 'src') } },
    test: {
        environment: 'node',
        include: ['src/**/*.test.ts'],
        coverage: {
            provider: 'v8',
            include: ['src/lib/analysis/**/*.ts'],
            exclude: ['src/lib/analysis/**/*.test.ts', 'src/lib/analysis/pdf/ReportPdf.tsx'],
            thresholds: { lines: 80, functions: 80, branches: 70 },
        },
    },
});
