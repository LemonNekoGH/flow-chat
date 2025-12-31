import antfu from '@antfu/eslint-config'
import oxlint from 'eslint-plugin-oxlint'

export default antfu(
  {
    unocss: true,
    formatters: true,
    markdown: true,
  },
  {
    rules: {
      'vue/prefer-separate-static-class': 'off',
    },
  },
  ...oxlint.buildFromOxlintConfigFile('./.oxlintrc.json'),
  {
    ignores: [
      'drizzle/**',
    ],
  },
)
