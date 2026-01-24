---
description: Automatically translate new text to Finnish and English
---

1. Identify the new hardcoded string in the code that needs translation.
2. Generate a meaningful hierarchical key for the string (e.g., `screen.section.label` or `component.action`).
3. Add the key and the English translation to `src/i18n/translations/en.json`.
   - Ensure you preserve the JSON structure and sorting if applicable.
4. Add the key and the Finnish translation to `src/i18n/translations/fi.json`.
   - Translate the text accurately to Finnish.
5. In the component file where the text appears:
   - add imports: `import { useTranslation } from 'react-i18next';`
   - Initialize the hook: `const { t } = useTranslation();` inside the component.
   - Replace the hardcoded string with the translation function: `{t('screen.section.label')}`.
   - If the string has variables, use interpolation: `{t('key', { variable: value })}`.
