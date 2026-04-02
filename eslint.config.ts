import antfu from '@antfu/eslint-config'

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
  {
    ignores: [
      'drizzle/**',
    ],
  },
)
