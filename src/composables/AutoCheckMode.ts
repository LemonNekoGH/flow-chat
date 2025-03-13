const prefersDark = window.matchMedia('(prefers-color-scheme: dark)')

export function watchSystemTheme(callback: (isDark: boolean) => void) {
  const updateTheme = () => {
    callback(prefersDark.matches)
  }
  prefersDark.addEventListener('change', updateTheme)
  updateTheme()
}

export function toggleTheme(isDark: boolean) {
  if (isDark) {
    document.documentElement.classList.add('dark')
  }
  else {
    document.documentElement.classList.remove('dark')
  }
}
