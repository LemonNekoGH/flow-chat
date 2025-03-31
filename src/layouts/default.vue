<template>
  <Toaster position="top-right" rich-colors />

  <main class="h-full flex flex-1 flex-col">
    <RouterView />
  </main>
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
