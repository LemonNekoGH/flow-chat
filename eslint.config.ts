import antfu from '@antfu/eslint-config'
import oxlint from 'eslint-plugin-oxlint'

export default antfu(
  {
    unocss: true,
    formatters: true,
  },
  ...oxlint.buildFromOxlintConfigFile('./.oxlintrc.json'),
)
