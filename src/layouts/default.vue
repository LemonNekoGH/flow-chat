<script setup lang="ts">
import { Toaster } from 'vue-sonner'
import HeaderMenu from '~/components/HeaderMenu.vue'
import Sidebar from '~/components/Sidebar.vue'
</script>

<template>
  <Toaster position="top-right" rich-colors />

  <div class="h-screen w-full flex overflow-hidden bg-light-100 dark:bg-dark-900">
    <Sidebar />

    <div class="h-full flex flex-1 flex-col overflow-hidden">
      <div class="h-42px flex items-center justify-center border-b border-b-black/10 bg-white dark:border-b-white/10 dark:bg-dark-800">
        <HeaderMenu />
      </div>

      <main class="flex flex-1 flex-col overflow-hidden bg-light-100 dark:bg-dark-900">
        <RouterView />
      </main>
    </div>
  </div>
</template>

<style>
#app {
  height: 100dvh;
  display: flex;
  flex-direction: column;
}
*:focus,
*:focus-visible {
  outline: none !important;
}
.i-carbon-logo-github {
  @apply dark:bg-black;
}
</style>
