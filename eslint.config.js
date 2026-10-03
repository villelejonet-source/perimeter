import js from '@eslint/js';
import tseslint from 'typescript-eslint';
import prettier from 'eslint-config-prettier';
import globals from 'globals';

export default tseslint.config(
  { ignores: ['dist', 'ios', 'node_modules', 'tools/out'] },
  js.configs.recommended,
  ...tseslint.configs.strict,
  prettier,
  {
    languageOptions: { globals: { ...globals.browser, ...globals.node } },
    rules: {
      '@typescript-eslint/no-explicit-any': 'error',
      // With noUncheckedIndexedAccess, `arr[i]!` in bounds-checked hot loops is intentional.
      '@typescript-eslint/no-non-null-assertion': 'off',
    },
  },
  // Architecture rule 1: src/sim is pure TypeScript and must run in Node.
  {
    files: ['src/sim/**/*.ts'],
    languageOptions: { globals: { ...globals.es2022 } },
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            { group: ['phaser', 'phaser/*'], message: 'src/sim must not import Phaser.' },
            { group: ['@capacitor/*'], message: 'src/sim must not import Capacitor.' },
            {
              group: ['**/render/**', '**/ui/**', '**/platform/**', '**/meta/**'],
              message: 'src/sim may only import from src/sim and src/data.',
            },
          ],
        },
      ],
      'no-restricted-globals': ['error', 'window', 'document', 'localStorage', 'navigator'],
      'no-restricted-properties': [
        'error',
        { object: 'Math', property: 'random', message: 'Use the seeded RNG in src/sim/rng.ts.' },
      ],
    },
  },
  // Rule 7: never use raw localStorage.
  {
    files: ['src/**/*.ts'],
    ignores: ['src/sim/**'],
    rules: {
      'no-restricted-globals': ['error', 'localStorage', 'sessionStorage'],
    },
  },
);
