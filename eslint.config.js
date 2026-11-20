// Minimal flat config shared by both workspaces. The project relies on
// runtime tests and the compiler for deeper checks; this keeps `npm run lint`
// operational under ESLint 9 while leaving a clean place to add rule sets.
export default [
  { ignores: ['**/dist/**', '**/node_modules/**', '**/coverage/**'] },
  {
    files: ['**/*.js', '**/*.jsx', '**/*.mjs'],
    languageOptions: {
      ecmaVersion: 'latest',
      sourceType: 'module',
      parserOptions: { ecmaFeatures: { jsx: true } },
    },
    plugins: {
      // Placeholder so existing disable comments remain valid until the real
      // react-hooks plugin is added.
      'react-hooks': {
        rules: {
          'exhaustive-deps': () => ({}),
        },
      },
    },
  },
];
