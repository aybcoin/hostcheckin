import js from '@eslint/js';
import globals from 'globals';
import reactHooks from 'eslint-plugin-react-hooks';
import reactRefresh from 'eslint-plugin-react-refresh';
import tseslint from 'typescript-eslint';

export default tseslint.config(
  { ignores: ['dist'] },
  {
    extends: [js.configs.recommended, ...tseslint.configs.recommended],
    files: ['**/*.{ts,tsx}'],
    languageOptions: {
      ecmaVersion: 2020,
      globals: globals.browser,
    },
    plugins: {
      'react-hooks': reactHooks,
      'react-refresh': reactRefresh,
    },
    rules: {
      ...reactHooks.configs.recommended.rules,
      'react-refresh/only-export-components': [
        'warn',
        { allowConstantExport: true },
      ],
      // Lightweight i18n guardrail: avoid adding new hardcoded UI text in JSX.
      // Existing strings can be migrated incrementally to /lib/i18n/fr.ts.
      'no-restricted-syntax': [
        'warn',
        {
          selector: 'JSXText[value=/[A-Za-zÀ-ÿ]/]',
          message: 'Texte UI hardcodé détecté : externalisez dans /lib/i18n/fr.ts',
        },
        {
          selector:
            "JSXAttribute[name.name=/^(placeholder|title|aria-label)$/][value.type='Literal'][value.value=/[A-Za-zÀ-ÿ]/]",
          message: 'Chaîne UI hardcodée : externalisez dans /lib/i18n/fr.ts',
        },
      ],
    },
  }
);
