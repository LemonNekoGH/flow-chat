<template>
  <Toaster position="top-right" rich-colors />

  <main class="h-full flex flex-1 flex-col">
    <RouterView />
  </main>
</template>

<style>
#app {
  height: 100vh;
  display: flex;
  flex-direction: column;
}
</style>
