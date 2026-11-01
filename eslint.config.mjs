import { defineConfig, globalIgnores } from 'eslint/config';
import nextVitals from 'eslint-config-next/core-web-vitals';
import nextTs from 'eslint-config-next/typescript';
import prettier from 'eslint-config-prettier';

const eslintConfig = defineConfig([
  {
    linterOptions: {
      reportUnusedDisableDirectives: false,
    },
  },
  ...nextVitals,
  ...nextTs,
  prettier,
  // Override default ignores of eslint-config-next.
  globalIgnores([
    '.next/**',
    'out/**',
    'build/**',
    'next-env.d.ts',
    'generated/**',
    'src/generated/**',
    '.temp/**',
  ]),
  {
    rules: {
      '@typescript-eslint/no-explicit-any': 'off',
      '@typescript-eslint/no-unused-vars': 'off',
      'react-hooks/exhaustive-deps': 'off',
      'prefer-const': 'off',
      'react-hooks/set-state-in-effect': 'off',
      'react-hooks/purity': 'off',
      'react-hooks/immutability': 'off',
      'react/display-name': 'off',
      '@next/next/no-img-element': 'off',
      '@typescript-eslint/no-empty-object-type': 'off',
      'no-debugger': 'off',
      'no-console': 'off',
      'react/no-unescaped-entities': 'off',
      'react-hooks/refs': 'off',
      'react-hooks/static-components': 'off',
      'react-hooks/preserve-manual-memoization': 'off',
      '@typescript-eslint/ban-ts-comment': 'off',
    },
  },
]);

export default eslintConfig;
