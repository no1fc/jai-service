import { defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
    resolve: { alias: { '@': path.resolve(__dirname, 'src') } },
    test: {
        environment: 'node',
        include: ['src/**/*.test.ts'],
        coverage: {
            provider: 'v8',
            include: [
                'src/lib/analysis/**/*.ts',
                'src/lib/career/**/*.ts',
                'src/lib/eligibility/**/*.ts',
                'src/hooks/useChat.ts',
            ],
            exclude: [
                'src/lib/analysis/**/*.test.ts',
                'src/lib/analysis/pdf/ReportPdf.tsx',
                'src/lib/career/**/*.test.ts',
                'src/lib/eligibility/**/*.test.ts',
            ],
            thresholds: { lines: 80, functions: 80, branches: 70 },
        },
    },
});
