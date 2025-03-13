<script setup lang="ts">
import { onMounted, provide, ref, watchEffect } from 'vue'
import { toggleTheme, watchSystemTheme } from './composables/AutoCheckMode'

const isDark = ref(false)

onMounted(() => {
  watchSystemTheme((dark) => {
    isDark.value = dark
  })
})
watchEffect(() => {
  toggleTheme(isDark.value)
})
provide('isDark', isDark)
provide('toggleTheme', () => {
  isDark.value = !isDark.value
})
</script>

<template>
  <RouterView />
</template>
